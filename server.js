require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE = 'https://www.sict.edu.mn';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Constants ---

const PERIODS = [
  { n: 1, start: '08:00', end: '09:30' },
  { n: 2, start: '09:40', end: '11:10' },
  { n: 3, start: '11:20', end: '12:50' },
  { n: 4, start: '13:20', end: '14:50' },
  { n: 5, start: '15:00', end: '16:30' },
  { n: 6, start: '16:40', end: '18:10' },
  { n: 7, start: '18:20', end: '19:50' },
];

// Rooms the user cares about (ranges: 102-129, 202-208, 229, 401-406, 409, 410)
function isTargetRoom(number) {
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

// --- Time helpers (all in UB = UTC+8) ---

function ubNow() {
  const now = new Date();
  return new Date(now.getTime() + 8 * 60 * 60 * 1000);
}

function currentTimeHHMM() {
  const d = ubNow();
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function currentDayCode() {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return days[ubNow().getUTCDay()];
}

function resolvePeriod() {
  const t = currentTimeHHMM();
  const active = PERIODS.find(p => t >= p.start && t <= p.end);
  if (active) return { period: active, state: 'active' };

  // Before first period
  if (t < PERIODS[0].start) return { period: PERIODS[0], state: 'upcoming' };

  // After last period
  if (t > PERIODS[PERIODS.length - 1].end) return { period: PERIODS[PERIODS.length - 1], state: 'done' };

  // Break between periods — find next
  const next = PERIODS.find(p => p.start > t);
  if (next) return { period: next, state: 'break' };

  return { period: PERIODS[PERIODS.length - 1], state: 'done' };
}

function getWeekParity(semesterStartISO, weekParityRule) {
  const ub = ubNow();
  const today = Date.UTC(ub.getUTCFullYear(), ub.getUTCMonth(), ub.getUTCDate());

  const semRaw = new Date(semesterStartISO);
  const semUB = new Date(semRaw.getTime() + 8 * 60 * 60 * 1000);
  const semStart = Date.UTC(semUB.getUTCFullYear(), semUB.getUTCMonth(), semUB.getUTCDate());

  const diffDays = Math.floor((today - semStart) / (1000 * 60 * 60 * 24));
  const weekNum = Math.floor(diffDays / 7) + 1;
  const isOdd = weekNum % 2 === 1;

  if (weekParityRule === 'start-odd') return isOdd ? 'odd' : 'even';
  return isOdd ? 'even' : 'odd';
}

// --- SICT API client ---

async function apiFetch(path) {
  const res = await fetch(`${BASE}/api${path}`);
  if (!res.ok) throw new Error(`SICT API ${res.status}: ${path}`);
  return res.json();
}

async function fetchAllPages(path) {
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

// --- Cache ---

const cache = {};
const TTL = 5 * 60 * 1000;

async function cached(key, fn) {
  if (cache[key] && Date.now() - cache[key].ts < TTL) return cache[key].data;
  const data = await fn();
  cache[key] = { ts: Date.now(), data };
  return data;
}

async function getActiveSemester() {
  return cached('semester', async () => {
    const data = await apiFetch('/semesters?where[isActive][equals]=true&limit=1');
    return data.docs[0] || null;
  });
}

async function getTargetRooms() {
  return cached('rooms:target', async () => {
    const data = await apiFetch('/rooms?limit=100');
    return data.docs
      .filter(r => isTargetRoom(r.number))
      .map(r => ({ id: r.id, number: r.number, type: r.roomType }));
  });
}

async function getAllRooms() {
  return cached('rooms:all', async () => {
    const data = await apiFetch('/rooms?limit=100');
    return data.docs
      .filter(r => /^\d+$/.test(r.number))
      .map(r => ({ id: r.id, number: r.number, type: r.roomType }));
  });
}

async function getTodayEntries(semesterId, day) {
  return cached(`entries:${semesterId}:${day}`, async () => {
    return fetchAllPages(
      `/schedule-entries?where[semester][equals]=${semesterId}&where[day][equals]=${day}&depth=1`
    );
  });
}

// --- Main logic ---

async function getFreeRooms(includeAll = false) {
  const semester = await getActiveSemester();
  if (!semester) throw new Error('No active semester found');

  const day = currentDayCode();
  const { period, state: periodState } = resolvePeriod();
  const weekParity = getWeekParity(semester.startDate, semester.weekParityRule);

  const [targetRooms, entries] = await Promise.all([
    includeAll ? getAllRooms() : getTargetRooms(),
    (day === 'sat' || day === 'sun') ? Promise.resolve([]) : getTodayEntries(semester.id, day),
  ]);

  // Build set of busy room IDs for resolved period
  const busyRoomIds = new Set();
  const busyInfo = {};

  for (const entry of entries) {
      if (entry.period !== period.n) continue;
      if (entry.weekParity !== 'all' && entry.weekParity !== weekParity) continue;

      const roomId = typeof entry.room === 'object' ? entry.room.id : entry.room;
      busyRoomIds.add(roomId);

      const teacher = entry.teacher?.name || entry.teacherNameFallback || null;
      busyInfo[roomId] = {
        subject: entry.subject?.name || entry.subject?.code || null,
        subjectCode: entry.subject?.code || null,
        groupCode: entry.groupCode || null,
        teacher,
        lessonType: entry.lessonType || null,
      };
    }

  const rooms = targetRooms.map(room => ({
    number: room.number,
    type: room.type,
    free: !busyRoomIds.has(room.id),
    class: busyRoomIds.has(room.id) ? busyInfo[room.id] : null,
  }));

  rooms.sort((a, b) => parseInt(a.number) - parseInt(b.number));

  return {
    time: currentTimeHHMM(),
    day,
    period: { n: period.n, start: period.start, end: period.end },
    periodState,
    weekParity,
    semester: semester.name,
    isWeekend: day === 'sat' || day === 'sun',
    freeCount: rooms.filter(r => r.free).length,
    totalCount: rooms.length,
    rooms,
  };
}

// --- Routes ---

app.get('/api/free-rooms', async (req, res) => {
  try {
    const data = await getFreeRooms(req.query.all === '1');
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: String(err) });
  }
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = app;
