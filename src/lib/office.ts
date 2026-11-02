const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

type Weekday = (typeof WEEKDAYS)[number] | "Sat" | "Sun" | "";

const FULL: Record<string, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
};

function weekdayOf(now: Date): { weekday: Weekday; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const raw = read("weekday").toLowerCase().replace(".", "");
  const weekday: Weekday = raw.startsWith("mon")
    ? "Mon"
    : raw.startsWith("tue")
      ? "Tue"
      : raw.startsWith("wed")
        ? "Wed"
        : raw.startsWith("thu")
          ? "Thu"
          : raw.startsWith("fri")
            ? "Fri"
            : raw.startsWith("sat")
              ? "Sat"
              : raw.startsWith("sun")
                ? "Sun"
                : "";
  const minutes = Number(read("hour")) * 60 + Number(read("minute"));
  return { weekday, minutes: Number.isFinite(minutes) ? minutes : -1 };
}

function nextOpen(weekday: Weekday, minutes: number): string {
  const opens = "8:00 am CT";
  if (WEEKDAYS.includes(weekday as (typeof WEEKDAYS)[number]) && minutes >= 0 && minutes < 8 * 60) {
    return `today ${opens}`;
  }
  if (weekday === "Mon" || weekday === "Tue" || weekday === "Wed" || weekday === "Thu") {
    const order = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const next = order[order.indexOf(weekday) + 1];
    return `${FULL[next]} ${opens}`;
  }
  return `Monday ${opens}`;
}

export function officeStatus(now: Date): { open: boolean; label: string } {
  const { weekday, minutes } = weekdayOf(now);
  const isWeekday = WEEKDAYS.includes(weekday as (typeof WEEKDAYS)[number]);
  const close = weekday === "Fri" ? 15 * 60 : 17 * 60;
  const open = isWeekday && minutes >= 8 * 60 && minutes < close;
  if (open) {
    const until = weekday === "Fri" ? "3:00 pm" : "5:00 pm";
    return { open: true, label: `Open now · until ${until} CT` };
  }
  return { open: false, label: `Closed · Opens ${nextOpen(weekday, minutes)}` };
}
