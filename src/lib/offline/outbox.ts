// Очередь записей на сервер. Всё, что специалист отмечает на занятии, сначала
// ложится в память телефона, потом по порядку уходит в базу. Нет связи —
// ждём и пробуем снова. Каждая запись имеет свой id, поэтому повторная
// отправка ничего не задваивает.

import { useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";
import { all, append, OUTBOX, remove } from "./store";

export type Op =
  | { type: "lesson.start"; row: TablesInsert<"lessons"> & { id: string } }
  | { type: "lesson.update"; id: string; patch: TablesUpdate<"lessons"> }
  | { type: "session.add"; row: TablesInsert<"target_sessions"> & { id: string } }
  | { type: "target.update"; id: string; patch: TablesUpdate<"child_targets"> }
  | { type: "event.add"; row: TablesInsert<"target_events"> & { id: string } };

type Entry = { seq: number; op: Op };

export type SyncState = "synced" | "pending" | "offline" | "error";
type Status = { state: SyncState; pending: number; online: boolean };

let status: Status = { state: "synced", pending: 0, online: true };
const listeners = new Set<() => void>();

function setStatus(patch: Partial<Status>) {
  const next = { ...status, ...patch };
  if (next.state === status.state && next.pending === status.pending && next.online === status.online) return;
  status = next;
  listeners.forEach((l) => l());
}

class NetworkError extends Error {}

async function send(op: Op) {
  const supabase = createClient();
  const result = await (() => {
    switch (op.type) {
      case "lesson.start":
        return supabase.from("lessons").upsert(op.row, { onConflict: "id", ignoreDuplicates: true });
      case "lesson.update":
        return supabase.from("lessons").update(op.patch).eq("id", op.id);
      case "session.add":
        return supabase.from("target_sessions").upsert(op.row, { onConflict: "id", ignoreDuplicates: true });
      case "target.update":
        return supabase.from("child_targets").update(op.patch).eq("id", op.id);
      case "event.add":
        return supabase.from("target_events").upsert(op.row, { onConflict: "id", ignoreDuplicates: true });
    }
  })();

  if (result.error) {
    // status 0 — запрос не дошёл до сервера.
    if (result.status === 0 || !navigator.onLine) throw new NetworkError(result.error.message);
    throw new Error(result.error.message);
  }
}

let flushing: Promise<void> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryDelay = 2000;

function scheduleRetry() {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flush();
  }, retryDelay);
  retryDelay = Math.min(retryDelay * 2, 60_000);
}

export function flush(): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    try {
      // Пока отправляем, могут добавиться новые записи — крутимся до пустой очереди.
      for (;;) {
        const entries = await all<Entry>(OUTBOX);
        if (entries.length === 0) break;
        let left = entries.length;
        for (const entry of entries) {
          setStatus({ state: status.state === "synced" ? "pending" : status.state, pending: left });
          await send(entry.op);
          await remove(OUTBOX, entry.seq);
          left -= 1;
        }
      }
      retryDelay = 2000;
      setStatus({ state: "synced", pending: 0, online: true });
    } catch (e) {
      const pending = (await all<Entry>(OUTBOX)).length;
      const offline = e instanceof NetworkError;
      setStatus({ state: offline ? "offline" : "error", pending, online: !offline && status.online });
      scheduleRetry();
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

export async function enqueue(...ops: Op[]) {
  for (const op of ops) await append(OUTBOX, { op });
  setStatus({ state: status.state === "synced" ? "pending" : status.state, pending: status.pending + ops.length });
  void flush();
}

let started = false;

// Запускается один раз на странице: досылает то, что осталось с прошлого раза.
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  setStatus({ online: navigator.onLine });
  window.addEventListener("online", () => {
    setStatus({ online: true });
    retryDelay = 2000;
    void flush();
  });
  window.addEventListener("offline", () => setStatus({ online: false }));
  void flush();
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const serverStatus: Status = { state: "synced", pending: 0, online: true };

export function useSyncStatus(): Status {
  return useSyncExternalStore(subscribe, () => status, () => serverStatus);
}

// Сколько записей ещё не дошло до сервера.
export async function pendingCount(): Promise<number> {
  return (await all<Entry>(OUTBOX)).length;
}
