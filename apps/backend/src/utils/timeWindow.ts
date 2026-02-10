const START_HOUR = Number(process.env.ATTENDANCE_START_HOUR ?? 0);
const START_MIN = Number(process.env.ATTENDANCE_START_MINUTE ?? 20);
const END_HOUR = Number(process.env.ATTENDANCE_END_HOUR ?? 23);
const END_MIN = Number(process.env.ATTENDANCE_END_MINUTE ?? 15);

export function isWithinTimeWindow(now = new Date()): boolean {
  const start = new Date(now);
  start.setHours(START_HOUR, START_MIN, 0, 0);

  const end = new Date(now);
  end.setHours(END_HOUR, END_MIN, 0, 0);

  return now >= start && now <= end;
}
