// Управление учётными записями сотрудников. Вызывает только руководитель.
// Секретный ключ Supabase есть лишь здесь, внутри функции, и наружу не выходит.
import { withSupabase } from "npm:@supabase/server@1.8.0";

type Body =
  | { action: "list" }
  | { action: "create"; email: string; password: string; fullName: string; role: "supervisor" | "specialist" }
  | { action: "reset_password"; userId: string; password: string }
  | { action: "set_active"; userId: string; active: boolean };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fail = (status: number, message: string) => Response.json({ error: message }, { status });

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return fail(405, "method not allowed");

    const callerId = ctx.userClaims?.id;
    if (!callerId) return fail(401, "unauthorized");

    const { data: caller } = await ctx.supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .maybeSingle();
    if (caller?.role !== "supervisor") return fail(403, "forbidden");

    let body: Body;
    try {
      body = await req.json();
    } catch {
      return fail(400, "bad json");
    }

    const admin = ctx.supabaseAdmin.auth.admin;

    switch (body.action) {
      case "list": {
        const [{ data: users, error }, { data: profiles }] = await Promise.all([
          admin.listUsers({ perPage: 1000 }),
          ctx.supabaseAdmin.from("profiles").select("id, full_name, role"),
        ]);
        if (error) return fail(500, "list failed");
        const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
        const staff = users.users
          .filter((u) => byId.has(u.id))
          .map((u) => ({
            id: u.id,
            email: u.email ?? "",
            fullName: byId.get(u.id)!.full_name,
            role: byId.get(u.id)!.role,
            active: !u.banned_until || new Date(u.banned_until) < new Date(),
            lastSignInAt: u.last_sign_in_at ?? null,
          }));
        return Response.json({ staff });
      }

      case "create": {
        const email = String(body.email ?? "").trim().toLowerCase();
        const fullName = String(body.fullName ?? "").trim();
        const password = String(body.password ?? "");
        if (!EMAIL.test(email)) return fail(400, "email");
        if (fullName.length < 2 || fullName.length > 100) return fail(400, "name");
        if (password.length < 10) return fail(400, "password");
        if (body.role !== "supervisor" && body.role !== "specialist") return fail(400, "role");

        const { error } = await admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
          // Роль — только в app_metadata: сам пользователь её поменять не может.
          app_metadata: { staff_role: body.role },
        });
        if (error) return fail(error.status === 422 ? 409 : 500, error.status === 422 ? "exists" : "create failed");
        return Response.json({ ok: true });
      }

      case "reset_password": {
        if (!UUID.test(String(body.userId)) || String(body.password ?? "").length < 10) return fail(400, "bad input");
        const { error } = await admin.updateUserById(body.userId, { password: body.password });
        return error ? fail(500, "reset failed") : Response.json({ ok: true });
      }

      case "set_active": {
        if (!UUID.test(String(body.userId))) return fail(400, "bad input");
        if (body.userId === callerId) return fail(400, "self");
        const { error } = await admin.updateUserById(body.userId, {
          ban_duration: body.active ? "none" : "876000h",
        });
        return error ? fail(500, "update failed") : Response.json({ ok: true });
      }

      default:
        return fail(400, "unknown action");
    }
  }),
};
