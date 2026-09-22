// Подписи и форматирование, общие для всех экранов.

export const METHOD_LABEL: Record<string, string> = {
  aba: "АВА-терапия",
  denver: "Денверская модель",
  schieringer: "Протокол Ширингера",
  pecs: "PECS",
  other: "Другое",
};

function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

// «5 лет», «3 года»; до года — в месяцах.
export function ageLabel(birthDate: string, today = new Date()) {
  const birth = new Date(birthDate);
  let months =
    (today.getFullYear() - birth.getFullYear()) * 12 +
    (today.getMonth() - birth.getMonth());
  if (today.getDate() < birth.getDate()) months -= 1;

  if (months < 12) {
    return `${months} ${plural(months, "месяц", "месяца", "месяцев")}`;
  }
  const years = Math.floor(months / 12);
  return `${years} ${plural(years, "год", "года", "лет")}`;
}

export function fullName(child: {
  last_name: string;
  first_name: string;
  patronymic?: string | null;
}) {
  return [child.last_name, child.first_name, child.patronymic]
    .filter(Boolean)
    .join(" ");
}

// Даты — по времени Алматы, где работает центр.
const DATE_TIME = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Asia/Almaty",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});
const DATE = new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Almaty", day: "numeric", month: "long", year: "numeric" });
const SHORT_DATE = new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Almaty", day: "numeric", month: "long" });

export const dateTimeLabel = (iso: string) => DATE_TIME.format(new Date(iso));
export const dateLabel = (iso: string) => DATE.format(new Date(iso));
export const shortDateLabel = (iso: string) => SHORT_DATE.format(new Date(iso));

export const TARGET_STATUS_LABEL: Record<string, string> = {
  in_progress: "В работе",
  mastered: "Освоено",
  paused: "Отложено",
};
