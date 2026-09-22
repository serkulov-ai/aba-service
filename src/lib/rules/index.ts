// Правила методики (DESIGN.md, раздел 3). Считаются только здесь.

export type Trial = "S" | "P" | "M"; // С — сам, + — с подсказкой, − — неверно
export type Delay = 0 | 2 | 4;

export const TRIALS_PER_SESSION = 9;
export const DELAYS: readonly Delay[] = [0, 2, 4];

// ---------------------------------------------------------------------------
// Проценты
// ---------------------------------------------------------------------------

// 9 проб = 100%, каждая «плохая» проба снимает 10%, все 9 плохих = 0%.
export function percentFromBad(bad: number): number {
  if (bad <= 0) return 100;
  if (bad >= TRIALS_PER_SESSION) return 0;
  return 100 - 10 * bad;
}

export function scoreSession(trials: readonly Trial[]) {
  const incorrect = trials.filter((t) => t === "M").length;
  const notIndependent = trials.filter((t) => t !== "S").length;
  return {
    correctPct: percentFromBad(incorrect), // С и + вместе
    independentPct: percentFromBad(notIndependent), // только С
  };
}

// ---------------------------------------------------------------------------
// Совет по задержке и освоению
// ---------------------------------------------------------------------------

export type SessionResult = {
  delay: Delay;
  correctPct: number;
  independentPct: number;
};

export type Suggestion =
  | { kind: "mastered" }
  | { kind: "increase"; to: Delay }
  | { kind: "decrease"; to: Delay };

const MASTERY_STREAK = 2; // 2 сессии подряд 100% самостоятельных
const INCREASE_STREAK = 3; // 3 сессии подряд: на 0 сек — 100%, дальше — ≥ 90%
const DECREASE_STREAK = 2; // 2 сессии подряд < 90%

function lastN<T>(items: readonly T[], n: number): T[] | null {
  return items.length >= n ? items.slice(-n) : null;
}

// history — все сессии цели по времени, последняя — только что законченная.
// Считаются только идущие подряд последние сессии на текущей задержке.
export function suggest(
  history: readonly SessionResult[],
  currentDelay: Delay,
): Suggestion | null {
  const mastery = lastN(history, MASTERY_STREAK);
  if (mastery?.every((s) => s.independentPct === 100)) {
    return { kind: "mastered" };
  }

  const atCurrent: SessionResult[] = [];
  for (let i = history.length - 1; i >= 0 && history[i].delay === currentDelay; i--) {
    atCurrent.unshift(history[i]);
  }

  const failing = lastN(atCurrent, DECREASE_STREAK);
  if (currentDelay > 0 && failing?.every((s) => s.correctPct < 90)) {
    return { kind: "decrease", to: currentDelay === 4 ? 2 : 0 };
  }

  const passing = lastN(atCurrent, INCREASE_STREAK);
  if (currentDelay === 0 && passing?.every((s) => s.correctPct === 100)) {
    return { kind: "increase", to: 2 };
  }
  if (currentDelay === 2 && passing?.every((s) => s.correctPct >= 90)) {
    return { kind: "increase", to: 4 };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Ротация стимулов (бланк «Ротация стимулов», три таблицы = три занятия)
// ---------------------------------------------------------------------------

export type StimulusKey = "A" | "B" | "C"; // А, Б, В
export type Position = "L" | "C" | "R"; // слева, в центре, справа — со стороны специалиста

export const STIMULUS_LETTER: Record<StimulusKey, string> = { A: "А", B: "Б", C: "В" };
export const POSITION_LABEL: Record<Position, string> = { L: "Слева", C: "В центре", R: "Справа" };

// Раскладка карточек повторяется по кругу во всех трёх таблицах.
const LAYOUTS: readonly (readonly StimulusKey[])[] = [
  ["A", "B", "C"],
  ["C", "A", "B"],
  ["B", "C", "A"],
];

// Какой стимул просим на каждой из 9 проб — по таблицам 1, 2, 3.
const ASKED: readonly (readonly StimulusKey[])[] = [
  ["A", "B", "C", "B", "C", "A", "C", "A", "B"],
  ["B", "C", "A", "C", "A", "B", "A", "B", "C"],
  ["C", "A", "B", "A", "B", "C", "B", "C", "A"],
];

export type RotationStep = {
  asked: StimulusKey;
  layout: readonly StimulusKey[]; // по позициям Л, С, П
  position: Position; // где лежит нужная карточка
};

// table — 1, 2 или 3; trial — номер пробы с 0.
export function rotationStep(table: number, trial: number): RotationStep {
  const asked = ASKED[(table - 1) % 3][trial % TRIALS_PER_SESSION];
  const layout = LAYOUTS[trial % 3];
  const position = (["L", "C", "R"] as const)[layout.indexOf(asked)];
  return { asked, layout, position };
}

// Таблица для очередной сессии: по кругу 1 → 2 → 3 → 1 …
export function rotationTableFor(previousSessions: number): number {
  return (previousSessions % 3) + 1;
}
