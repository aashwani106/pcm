import { AdminAttendanceCalendarDay } from '../../services/backend';

export type CalendarDayType = 'present' | 'absent' | 'holiday' | 'future';

export interface CalendarCell {
  dateISO: string;
  dayNumber: number;
  inMonth: boolean;
}

export function toLocalISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toYearMonth(date: Date) {
  return toLocalISODate(date).slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [yearRaw, monthRaw] = month.split('-');
  const d = new Date(Number(yearRaw), Number(monthRaw) - 1 + delta, 1);
  return toYearMonth(d);
}

export function formatMonthLabel(month: string) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function buildMonthGrid(month: string): CalendarCell[] {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const cells: CalendarCell[] = [];

  for (let i = 0; i < first.getDay(); i += 1) {
    cells.push({ dateISO: '', dayNumber: 0, inMonth: false });
  }
  for (let day = 1; day <= last.getDate(); day += 1) {
    const d = new Date(y, m - 1, day);
    cells.push({ dateISO: toLocalISODate(d), dayNumber: day, inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ dateISO: '', dayNumber: 0, inMonth: false });
  }
  return cells;
}

export function getCellType(
  dateISO: string,
  holidaysSet: Set<string>,
  attendance: Record<string, AdminAttendanceCalendarDay>,
  todayISO: string
): CalendarDayType {
  if (dateISO > todayISO) return 'future';
  if (holidaysSet.has(dateISO)) return 'holiday';
  if (attendance[dateISO]?.status === 'present') return 'present';
  return 'absent';
}

export function formatMarkedTime(iso: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
