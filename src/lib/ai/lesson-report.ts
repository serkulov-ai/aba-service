import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

// Черновики после занятия: рекомендации специалисту и отчёт родителям.
// Только черновик — специалист читает, правит и сам решает, что отправить.

const MODEL = "claude-sonnet-5";

const client = new Anthropic({ timeout: 60_000 });

export type LessonFacts = {
  childFirstName: string; // без фамилии: модели она не нужна
  childAge: string;
  parentPresent: boolean;
  withAssistant: boolean;
  targets: {
    name: string;
    skill: string | null;
    domain: string | null;
    sessions: { delay: number; trials: string; correctPct: number; independentPct: number }[];
    delayChange: string | null; // «2 → 4 сек (по совету сервиса)»
    mastered: boolean;
  }[];
  notes: { skills: string; behavior: string; general: string; homework: string };
};

const Draft = z.object({
  recommendations: z.string(),
  parent_report: z.string(),
});

const SYSTEM = `Ты помогаешь специалисту по АВА-терапии в коррекционном центре оформить итоги занятия с ребёнком.

Как устроены данные занятия:
- Цель отрабатывается сессиями по 9 проб. Каждая проба: С — ребёнок сделал сам, + — сделал с подсказкой специалиста, − — сделал неверно.
- «Правильных» — доля С и + вместе, «самостоятельных» — только С.
- Задержка — сколько секунд специалист ждёт ответа, прежде чем подсказать: 0, 2 или 4 сек. На 0 сек подсказка даётся сразу, это обучающий этап.
- Правила центра: задержку повышают после 3 сессий подряд с правильными ≥ 90% (с 0 на 2 сек — после 3 сессий по 100%), понижают после 2 сессий подряд меньше 90%; цель освоена после 2 сессий подряд со 100% самостоятельных.

Напиши два текста на русском языке.

recommendations — для специалиста. 3–6 коротких пунктов, каждый с новой строки и начинается с «— ». Опирайся только на цифры и заметки: что получается, где ошибки и подсказки, на что обратить внимание на следующем занятии, к чему идёт каждая цель по правилам центра. Профессиональный язык допустим.

parent_report — сообщение родителю в WhatsApp. 4–8 предложений, тёплый и честный тон, простые слова, без терминов (не «проба», «задержка», «такт», «интравербальный» — говори, что ребёнок делал и чему учится). Начни с «Здравствуйте!». Упомяни успехи и то, над чем продолжаем работать. Если специалист дал домашнее задание — перескажи его понятно в конце. Без эмодзи, без подписи.

Не придумывай того, чего нет в данных. Не ставь диагнозов и не давай медицинских советов. Если данных мало, пиши коротко.`;

function describe(f: LessonFacts): string {
  const lines: string[] = [
    `Ребёнок: ${f.childFirstName}, ${f.childAge}.`,
    `Родитель на занятии: ${f.parentPresent ? "да" : "нет"}. Ассистент (фея): ${f.withAssistant ? "да" : "нет"}.`,
    "",
    "Цели занятия:",
  ];
  for (const t of f.targets) {
    const where = [t.domain, t.skill].filter(Boolean).join(" · ");
    lines.push(`• ${t.name}${where ? ` (${where})` : ""}`);
    t.sessions.forEach((s, i) =>
      lines.push(
        `  круг ${i + 1}: задержка ${s.delay} сек, пробы ${s.trials}, правильных ${s.correctPct}%, самостоятельных ${s.independentPct}%`,
      ),
    );
    if (t.delayChange) lines.push(`  задержка изменена: ${t.delayChange}`);
    if (t.mastered) lines.push("  цель отмечена освоенной");
  }
  const notes: [string, string][] = [
    ["По навыкам", f.notes.skills],
    ["По поведению", f.notes.behavior],
    ["Общий комментарий", f.notes.general],
    ["Домашнее задание", f.notes.homework],
  ];
  const filled = notes.filter(([, v]) => v.trim());
  lines.push("", "Заметки специалиста:");
  if (filled.length === 0) lines.push("нет");
  for (const [k, v] of filled) lines.push(`${k}: ${v.trim()}`);
  return lines.join("\n");
}

export type DraftResult =
  | { ok: true; recommendations: string; parentReport: string }
  | { ok: false };

export async function draftLessonReport(facts: LessonFacts): Promise<DraftResult> {
  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: "user", content: describe(facts) }],
      output_config: { effort: "medium", format: zodOutputFormat(Draft) },
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      console.error("lesson draft: no output", response.stop_reason);
      return { ok: false };
    }
    return {
      ok: true,
      recommendations: response.parsed_output.recommendations.trim(),
      parentReport: response.parsed_output.parent_report.trim(),
    };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      console.error("lesson draft: rate limited");
    } else if (error instanceof Anthropic.APIConnectionError) {
      console.error("lesson draft: connection error", error.message);
    } else if (error instanceof Anthropic.APIError) {
      console.error(`lesson draft: API error ${error.status}`, error.message);
    } else {
      // Только тип ошибки: в журнал не должно попасть ничего из занятия.
      console.error("lesson draft: unexpected error", error instanceof Error ? error.name : typeof error);
    }
    return { ok: false };
  }
}
