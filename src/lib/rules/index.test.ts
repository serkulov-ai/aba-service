import { describe, expect, it } from "vitest";
import {
  percentFromBad,
  rotationStep,
  rotationTableFor,
  scoreSession,
  suggest,
  type Delay,
  type SessionResult,
  type Trial,
} from "./index";

// «С + −» как на бланке → S/P/M
function trials(row: string): Trial[] {
  const map: Record<string, Trial> = { С: "S", "+": "P", "−": "M", "-": "M" };
  return row.split(" ").map((c) => map[c]);
}

function s(delay: Delay, correctPct: number, independentPct = 0): SessionResult {
  return { delay, correctPct, independentPct };
}

describe("проценты", () => {
  it("строки с бланка «Чек-лист с результатами»", () => {
    expect(scoreSession(trials("С + + С − С С С С"))).toEqual({ correctPct: 90, independentPct: 70 });
    expect(scoreSession(trials("+ С С − С − С − +"))).toEqual({ correctPct: 70, independentPct: 50 });
    expect(scoreSession(trials("− С − С + + + С С"))).toEqual({ correctPct: 80, independentPct: 50 });
    expect(scoreSession(trials("С С С + С С С С С"))).toEqual({ correctPct: 100, independentPct: 90 });
  });

  it("все самостоятельно — 100% и 100%", () => {
    expect(scoreSession(trials("С С С С С С С С С"))).toEqual({ correctPct: 100, independentPct: 100 });
  });

  it("на 0 сек всё с подсказкой — 100% правильных, 0% самостоятельных", () => {
    expect(scoreSession(trials("+ + + + + + + + +"))).toEqual({ correctPct: 100, independentPct: 0 });
  });

  it("4 минуса — 60% (пример Аружан), 9 минусов — 0%", () => {
    expect(percentFromBad(4)).toBe(60);
    expect(percentFromBad(1)).toBe(90);
    expect(percentFromBad(8)).toBe(20);
    expect(percentFromBad(9)).toBe(0);
  });
});

describe("совет по задержке", () => {
  it("0 → 2 сек после 3 сессий по 100% правильных", () => {
    expect(suggest([s(0, 100), s(0, 100), s(0, 100)], 0)).toEqual({ kind: "increase", to: 2 });
    expect(suggest([s(0, 100), s(0, 100)], 0)).toBeNull();
    expect(suggest([s(0, 100), s(0, 90), s(0, 100)], 0)).toBeNull();
  });

  it("2 → 4 сек после 3 сессий ≥ 90% (как на бланке: 100, 100, 90)", () => {
    expect(suggest([s(2, 100), s(2, 100), s(2, 90)], 2)).toEqual({ kind: "increase", to: 4 });
    expect(suggest([s(2, 100), s(2, 80), s(2, 90)], 2)).toBeNull();
  });

  it("выше 4 сек не повышаем", () => {
    expect(suggest([s(4, 100), s(4, 100), s(4, 100)], 4)).toBeNull();
  });

  it("понижаем после 2 сессий подряд < 90%", () => {
    expect(suggest([s(4, 80), s(4, 70)], 4)).toEqual({ kind: "decrease", to: 2 });
    expect(suggest([s(2, 80), s(2, 70)], 2)).toEqual({ kind: "decrease", to: 0 });
    expect(suggest([s(2, 80), s(2, 90)], 2)).toBeNull();
  });

  it("на 0 сек ниже некуда", () => {
    expect(suggest([s(0, 60), s(0, 50)], 0)).toBeNull();
  });

  it("считаются только сессии на текущей задержке", () => {
    // Две сессии на 2 сек, потом перешли на 4 — одной сессии на 4 сек мало.
    expect(suggest([s(2, 100), s(2, 100), s(4, 100)], 4)).toBeNull();
    // Провал на 2 сек и одна неудача на 4 сек — это не «2 подряд на 4 сек».
    expect(suggest([s(2, 80), s(4, 80)], 4)).toBeNull();
  });

  it("цель освоена: 2 сессии подряд 100% самостоятельных", () => {
    expect(suggest([s(2, 100, 90), s(2, 100, 100), s(2, 100, 100)], 2)).toEqual({ kind: "mastered" });
    expect(suggest([s(2, 100, 100), s(2, 100, 90)], 2)).toBeNull();
  });

  it("освоение важнее повышения задержки", () => {
    expect(suggest([s(2, 100, 100), s(2, 100, 100), s(2, 100, 100)], 2)).toEqual({ kind: "mastered" });
  });
});

describe("ротация стимулов — клетки с фото бланка", () => {
  // Выделенная клетка в каждой строке: где лежит нужная карточка.
  const expected: Record<number, string> = {
    1: "L R C C L R R C L",
    2: "C L R R C L L R C",
    3: "R C L L R C C L R",
  };
  const asked: Record<number, string> = {
    1: "A B C B C A C A B",
    2: "B C A C A B A B C",
    3: "C A B A B C B C A",
  };

  for (const table of [1, 2, 3]) {
    it(`таблица ${table}`, () => {
      const steps = Array.from({ length: 9 }, (_, i) => rotationStep(table, i));
      expect(steps.map((st) => st.position).join(" ")).toBe(expected[table]);
      expect(steps.map((st) => st.asked).join(" ")).toBe(asked[table]);
      // нужная карточка действительно лежит на выделенной позиции
      for (const st of steps) {
        expect(st.layout[["L", "C", "R"].indexOf(st.position)]).toBe(st.asked);
      }
    });
  }

  it("первая строка таблицы 1: Л=А, С=Б, П=В", () => {
    expect(rotationStep(1, 0).layout).toEqual(["A", "B", "C"]);
  });

  it("таблицы по кругу: 1 → 2 → 3 → 1", () => {
    expect([0, 1, 2, 3, 4].map(rotationTableFor)).toEqual([1, 2, 3, 1, 2]);
  });
});
