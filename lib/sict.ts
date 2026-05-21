const BASE = 'https://www.sict.edu.mn';

export const PERIODS = [
  { n: 1, start: '08:00', end: '09:30' },
  { n: 2, start: '09:40', end: '11:10' },
  { n: 3, start: '11:20', end: '12:50' },
  { n: 4, start: '13:20', end: '14:50' },
  { n: 5, start: '15:00', end: '16:30' },
  { n: 6, start: '16:40', end: '18:10' },
  { n: 7, start: '18:20', end: '19:50' },
] as const;

export type PeriodState = 'active' | 'break' | 'upcoming' | 'done' | 'preview';

export interface RoomClass {
  subject: string | null;
  subjectCode: string | null;
  groupCode: string | null;
  teacher: string | null;
  lessonType: string | null;
}

export interface Room {
  id: number;
  number: string;
  slug: string;
  type: string;
  free: boolean;
  class: RoomClass | null;
}

export interface ScheduleEntry {
  period: number;
  weekParity: 'all' | 'odd' | 'even';
  subject: string | null;
  subjectCode: string | null;
  teacher: string | null;
  groupCode: string | null;
  lessonType: string | null;
}

export interface RoomScheduleResponse {
  number: string;
  slug: string;
  type: string;
  semester: string;
  schedule: Record<string, ScheduleEntry[]>; // day -> entries
}

export interface FreeRoomsResponse {
  time: string;
  day: string;
  period: { n: number; start: string; end: string };
  periodState: PeriodState;
  autoPeriod: number;
  weekParity: string;
  semester: string;
  isWeekend: boolean;
  freeCount: number;
  totalCount: number;
  rooms: Room[];
}

// ── Target rooms ──
function isTargetRoom(number: string): boolean {
  const n = parseInt(number, 10);
  return (
    (n >= 102 && n <= 129) ||
    (n >= 202 && n <= 208) ||
    n === 229 ||
    (n >= 401 && n <= 406) ||
    n === 409 ||
    n === 410
  );
}

// ── Time helpers (UB = UTC+8) ──
function ubNow(): Date {
  return new Date(Date.now() + 8 * 60 * 60 * 1000);
}

function currentTimeHHMM(): string {
  const d = ubNow();
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

function currentDayCode(): string {
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][ubNow().getUTCDay()];
}

export function resolvePeriod(): { period: typeof PERIODS[number]; state: PeriodState } {
  const t = currentTimeHHMM();
  const active = PERIODS.find(p => t >= p.start && t <= p.end);
  if (active) return { period: active, state: 'active' };
  if (t < PERIODS[0].start) return { period: PERIODS[0], state: 'upcoming' };
  if (t > PERIODS[PERIODS.length - 1].end) return { period: PERIODS[PERIODS.length - 1], state: 'done' };
  const next = PERIODS.find(p => p.start > t);
  if (next) return { period: next, state: 'break' };
  return { period: PERIODS[PERIODS.length - 1], state: 'done' };
}

function getWeekParity(semesterStartISO: string, weekParityRule: string): string {
  const ub = ubNow();
  const today = Date.UTC(ub.getUTCFullYear(), ub.getUTCMonth(), ub.getUTCDate());
  const semRaw = new Date(semesterStartISO);
  const semUB = new Date(semRaw.getTime() + 8 * 60 * 60 * 1000);
  const semStart = Date.UTC(semUB.getUTCFullYear(), semUB.getUTCMonth(), semUB.getUTCDate());
  const weekNum = Math.floor((today - semStart) / (1000 * 60 * 60 * 24 * 7)) + 1;
  const isOdd = weekNum % 2 === 1;
  return weekParityRule === 'start-odd' ? (isOdd ? 'odd' : 'even') : (isOdd ? 'even' : 'odd');
}

// ── SICT API ──
async function apiFetch(path: string) {
  const res = await fetch(`${BASE}/api${path}`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`SICT API ${res.status}: ${path}`);
  return res.json();
}

async function fetchAllPages(path: string): Promise<unknown[]> {
  const first = await apiFetch(`${path}&limit=500&page=1`);
  let docs = first.docs;
  let page = 1;
  while (first.totalPages > page) {
    page++;
    const next = await apiFetch(`${path}&limit=500&page=${page}`);
    docs = docs.concat(next.docs);
  }
  return docs;
}

// ── In-process cache (survives across requests in same worker) ──
const cache: Record<string, { ts: number; data: unknown }> = {};
const TTL = 5 * 60 * 1000;

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (cache[key] && Date.now() - cache[key].ts < TTL) return cache[key].data as T;
  const data = await fn();
  cache[key] = { ts: Date.now(), data };
  return data;
}

interface SictRoom { id: number; number: string; roomType: string; slug: string }

async function getAllRoomsRaw(): Promise<SictRoom[]> {
  return cached('rooms:raw', async () => {
    const data = await apiFetch('/rooms?limit=100');
    return data.docs;
  });
}

async function getTargetRooms(): Promise<SictRoom[]> {
  return cached('rooms:target', async () => {
    const all = await getAllRoomsRaw();
    return all.filter((r: SictRoom) => isTargetRoom(r.number));
  });
}

async function getAllRooms(): Promise<SictRoom[]> {
  return cached('rooms:all', async () => {
    const all = await getAllRoomsRaw();
    return all.filter((r: SictRoom) => /^\d+$/.test(r.number));
  });
}

async function getActiveSemester() {
  return cached('semester', async () => {
    const data = await apiFetch('/semesters?where[isActive][equals]=true&limit=1');
    return data.docs[0] ?? null;
  });
}

async function getTodayEntries(semesterId: number, day: string): Promise<unknown[]> {
  return cached(`entries:${semesterId}:${day}`, () =>
    fetchAllPages(`/schedule-entries?where[semester][equals]=${semesterId}&where[day][equals]=${day}&depth=1`)
  );
}

// ── Main ──
export async function getFreeRooms(
  includeAll = false,
  overridePeriod: number | null = null
): Promise<FreeRoomsResponse> {
  const semester = await getActiveSemester();
  if (!semester) throw new Error('No active semester found');

  const day = currentDayCode();
  const { period: autoPeriod, state: autoPeriodState } = resolvePeriod();
  const weekParity = getWeekParity(semester.startDate, semester.weekParityRule);

  const period = overridePeriod
    ? (PERIODS.find(p => p.n === overridePeriod) ?? autoPeriod)
    : autoPeriod;
  const periodState: PeriodState = overridePeriod ? 'preview' : autoPeriodState;

  const [rooms, entries] = await Promise.all([
    includeAll ? getAllRooms() : getTargetRooms(),
    day === 'sat' || day === 'sun' ? Promise.resolve([]) : getTodayEntries(semester.id, day),
  ]);

  const busyIds = new Set<number>();
  const busyInfo: Record<number, RoomClass> = {};

  for (const entry of entries as Record<string, unknown>[]) {
    if (entry.period !== period.n) continue;
    if (entry.weekParity !== 'all' && entry.weekParity !== weekParity) continue;
    const roomId = typeof entry.room === 'object' && entry.room !== null
      ? (entry.room as { id: number }).id
      : (entry.room as number);
    busyIds.add(roomId);
    const subj = entry.subject as Record<string, string> | null;
    const teacher = entry.teacher as Record<string, string> | null;
    busyInfo[roomId] = {
      subject: subj?.name ?? subj?.code ?? null,
      subjectCode: subj?.code ?? null,
      groupCode: (entry.groupCode as string) ?? null,
      teacher: teacher?.name ?? (entry.teacherNameFallback as string) ?? null,
      lessonType: (entry.lessonType as string) ?? null,
    };
  }

  const result: Room[] = rooms
    .map((r: SictRoom) => ({
      id: r.id,
      number: r.number,
      slug: r.slug,
      type: r.roomType,
      free: !busyIds.has(r.id),
      class: busyIds.has(r.id) ? busyInfo[r.id] : null,
    }))
    .sort((a, b) => parseInt(a.number) - parseInt(b.number));

  return {
    time: currentTimeHHMM(),
    day,
    period: { n: period.n, start: period.start, end: period.end },
    periodState,
    autoPeriod: autoPeriod.n,
    weekParity,
    semester: semester.name,
    isWeekend: day === 'sat' || day === 'sun',
    freeCount: result.filter(r => r.free).length,
    totalCount: result.length,
    rooms: result,
  };
}

export async function getRoomSchedule(roomNumber: string): Promise<RoomScheduleResponse> {
  const [allRooms, semester] = await Promise.all([getAllRoomsRaw(), getActiveSemester()]);
  const room = allRooms.find((r: SictRoom) => r.number === roomNumber);
  if (!room) throw new Error(`Room ${roomNumber} not found`);
  if (!semester) throw new Error('No active semester');

  const entries = await cached(`room-schedule:${room.id}:${semester.id}`, () =>
    fetchAllPages(`/schedule-entries?where[room][equals]=${room.id}&where[semester][equals]=${semester.id}&depth=1`)
  ) as Record<string, unknown>[];

  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
  const schedule: Record<string, ScheduleEntry[]> = Object.fromEntries(DAYS.map(d => [d, []]));

  for (const e of entries) {
    const day = e.day as string;
    if (!DAYS.includes(day)) continue;
    const subj = e.subject as Record<string, string> | null;
    const teacher = e.teacher as Record<string, string> | null;
    schedule[day].push({
      period: e.period as number,
      weekParity: e.weekParity as 'all' | 'odd' | 'even',
      subject: subj?.name ?? subj?.code ?? null,
      subjectCode: subj?.code ?? null,
      teacher: teacher?.name ?? (e.teacherNameFallback as string) ?? null,
      groupCode: (e.groupCode as string) ?? null,
      lessonType: (e.lessonType as string) ?? null,
    });
  }

  for (const day of DAYS) schedule[day].sort((a, b) => a.period - b.period);

  return { number: room.number, slug: room.slug, type: room.roomType, semester: semester.name, schedule };
}
