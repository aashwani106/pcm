const START_HOUR = 7;
const START_MIN = 30;
const END_HOUR = 18;
const END_MIN = 15;

export function isWithinTimeWindow(now = new Date()) {
  const start = new Date(now);
  start.setHours(START_HOUR, START_MIN, 0, 0);

  const end = new Date(now);
  end.setHours(END_HOUR, END_MIN, 0, 0);

  return now >= start && now <= end;
}
