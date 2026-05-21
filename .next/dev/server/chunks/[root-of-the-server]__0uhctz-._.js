module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/lib/sict.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PERIODS",
    ()=>PERIODS,
    "getFreeRooms",
    ()=>getFreeRooms,
    "getRoomSchedule",
    ()=>getRoomSchedule,
    "resolvePeriod",
    ()=>resolvePeriod
]);
const BASE = 'https://www.sict.edu.mn';
const PERIODS = [
    {
        n: 1,
        start: '08:00',
        end: '09:30'
    },
    {
        n: 2,
        start: '09:40',
        end: '11:10'
    },
    {
        n: 3,
        start: '11:20',
        end: '12:50'
    },
    {
        n: 4,
        start: '13:20',
        end: '14:50'
    },
    {
        n: 5,
        start: '15:00',
        end: '16:30'
    },
    {
        n: 6,
        start: '16:40',
        end: '18:10'
    },
    {
        n: 7,
        start: '18:20',
        end: '19:50'
    }
];
// ── Target rooms ──
function isTargetRoom(number) {
    const n = parseInt(number, 10);
    return n >= 102 && n <= 129 || n >= 202 && n <= 208 || n === 229 || n >= 401 && n <= 406 || n === 409 || n === 410;
}
// ── Time helpers (UB = UTC+8) ──
function ubNow() {
    return new Date(Date.now() + 8 * 60 * 60 * 1000);
}
function currentTimeHHMM() {
    const d = ubNow();
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}
function currentDayCode() {
    return [
        'sun',
        'mon',
        'tue',
        'wed',
        'thu',
        'fri',
        'sat'
    ][ubNow().getUTCDay()];
}
function resolvePeriod() {
    const t = currentTimeHHMM();
    const active = PERIODS.find((p)=>t >= p.start && t <= p.end);
    if (active) return {
        period: active,
        state: 'active'
    };
    if (t < PERIODS[0].start) return {
        period: PERIODS[0],
        state: 'upcoming'
    };
    if (t > PERIODS[PERIODS.length - 1].end) return {
        period: PERIODS[PERIODS.length - 1],
        state: 'done'
    };
    const next = PERIODS.find((p)=>p.start > t);
    if (next) return {
        period: next,
        state: 'break'
    };
    return {
        period: PERIODS[PERIODS.length - 1],
        state: 'done'
    };
}
function getWeekParity(semesterStartISO, weekParityRule) {
    const ub = ubNow();
    const today = Date.UTC(ub.getUTCFullYear(), ub.getUTCMonth(), ub.getUTCDate());
    const semRaw = new Date(semesterStartISO);
    const semUB = new Date(semRaw.getTime() + 8 * 60 * 60 * 1000);
    const semStart = Date.UTC(semUB.getUTCFullYear(), semUB.getUTCMonth(), semUB.getUTCDate());
    const weekNum = Math.floor((today - semStart) / (1000 * 60 * 60 * 24 * 7)) + 1;
    const isOdd = weekNum % 2 === 1;
    return weekParityRule === 'start-odd' ? isOdd ? 'odd' : 'even' : isOdd ? 'even' : 'odd';
}
// ── SICT API ──
async function apiFetch(path) {
    const res = await fetch(`${BASE}/api${path}`, {
        next: {
            revalidate: 0
        }
    });
    if (!res.ok) throw new Error(`SICT API ${res.status}: ${path}`);
    return res.json();
}
async function fetchAllPages(path) {
    const first = await apiFetch(`${path}&limit=500&page=1`);
    let docs = first.docs;
    let page = 1;
    while(first.totalPages > page){
        page++;
        const next = await apiFetch(`${path}&limit=500&page=${page}`);
        docs = docs.concat(next.docs);
    }
    return docs;
}
// ── In-process cache (survives across requests in same worker) ──
const cache = {};
const TTL = 5 * 60 * 1000;
async function cached(key, fn) {
    if (cache[key] && Date.now() - cache[key].ts < TTL) return cache[key].data;
    const data = await fn();
    cache[key] = {
        ts: Date.now(),
        data
    };
    return data;
}
async function getAllRoomsRaw() {
    return cached('rooms:raw', async ()=>{
        const data = await apiFetch('/rooms?limit=100');
        return data.docs;
    });
}
async function getTargetRooms() {
    return cached('rooms:target', async ()=>{
        const all = await getAllRoomsRaw();
        return all.filter((r)=>isTargetRoom(r.number));
    });
}
async function getAllRooms() {
    return cached('rooms:all', async ()=>{
        const all = await getAllRoomsRaw();
        return all.filter((r)=>/^\d+$/.test(r.number));
    });
}
async function getActiveSemester() {
    return cached('semester', async ()=>{
        const data = await apiFetch('/semesters?where[isActive][equals]=true&limit=1');
        return data.docs[0] ?? null;
    });
}
async function getTodayEntries(semesterId, day) {
    return cached(`entries:${semesterId}:${day}`, ()=>fetchAllPages(`/schedule-entries?where[semester][equals]=${semesterId}&where[day][equals]=${day}&depth=1`));
}
async function getFreeRooms(includeAll = false, overridePeriod = null) {
    const semester = await getActiveSemester();
    if (!semester) throw new Error('No active semester found');
    const day = currentDayCode();
    const { period: autoPeriod, state: autoPeriodState } = resolvePeriod();
    const weekParity = getWeekParity(semester.startDate, semester.weekParityRule);
    const period = overridePeriod ? PERIODS.find((p)=>p.n === overridePeriod) ?? autoPeriod : autoPeriod;
    const periodState = overridePeriod ? 'preview' : autoPeriodState;
    const [rooms, entries] = await Promise.all([
        includeAll ? getAllRooms() : getTargetRooms(),
        day === 'sat' || day === 'sun' ? Promise.resolve([]) : getTodayEntries(semester.id, day)
    ]);
    const busyIds = new Set();
    const busyInfo = {};
    for (const entry of entries){
        if (entry.period !== period.n) continue;
        if (entry.weekParity !== 'all' && entry.weekParity !== weekParity) continue;
        const roomId = typeof entry.room === 'object' && entry.room !== null ? entry.room.id : entry.room;
        busyIds.add(roomId);
        const subj = entry.subject;
        const teacher = entry.teacher;
        busyInfo[roomId] = {
            subject: subj?.name ?? subj?.code ?? null,
            subjectCode: subj?.code ?? null,
            groupCode: entry.groupCode ?? null,
            teacher: teacher?.name ?? entry.teacherNameFallback ?? null,
            lessonType: entry.lessonType ?? null
        };
    }
    const result = rooms.map((r)=>({
            id: r.id,
            number: r.number,
            slug: r.slug,
            type: r.roomType,
            free: !busyIds.has(r.id),
            class: busyIds.has(r.id) ? busyInfo[r.id] : null
        })).sort((a, b)=>parseInt(a.number) - parseInt(b.number));
    return {
        time: currentTimeHHMM(),
        day,
        period: {
            n: period.n,
            start: period.start,
            end: period.end
        },
        periodState,
        autoPeriod: autoPeriod.n,
        weekParity,
        semester: semester.name,
        isWeekend: day === 'sat' || day === 'sun',
        freeCount: result.filter((r)=>r.free).length,
        totalCount: result.length,
        rooms: result
    };
}
async function getRoomSchedule(roomNumber) {
    const [allRooms, semester] = await Promise.all([
        getAllRoomsRaw(),
        getActiveSemester()
    ]);
    const room = allRooms.find((r)=>r.number === roomNumber);
    if (!room) throw new Error(`Room ${roomNumber} not found`);
    if (!semester) throw new Error('No active semester');
    const entries = await cached(`room-schedule:${room.id}:${semester.id}`, ()=>fetchAllPages(`/schedule-entries?where[room][equals]=${room.id}&where[semester][equals]=${semester.id}&depth=1`));
    const DAYS = [
        'mon',
        'tue',
        'wed',
        'thu',
        'fri'
    ];
    const schedule = Object.fromEntries(DAYS.map((d)=>[
            d,
            []
        ]));
    for (const e of entries){
        const day = e.day;
        if (!DAYS.includes(day)) continue;
        const subj = e.subject;
        const teacher = e.teacher;
        schedule[day].push({
            period: e.period,
            weekParity: e.weekParity,
            subject: subj?.name ?? subj?.code ?? null,
            subjectCode: subj?.code ?? null,
            teacher: teacher?.name ?? e.teacherNameFallback ?? null,
            groupCode: e.groupCode ?? null,
            lessonType: e.lessonType ?? null
        });
    }
    for (const day of DAYS)schedule[day].sort((a, b)=>a.period - b.period);
    return {
        number: room.number,
        slug: room.slug,
        type: room.roomType,
        semester: semester.name,
        schedule
    };
}
}),
"[project]/app/api/room-schedule/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "dynamic",
    ()=>dynamic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sict$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/sict.ts [app-route] (ecmascript)");
;
;
const dynamic = 'force-dynamic';
async function GET(req) {
    const number = req.nextUrl.searchParams.get('number');
    if (!number) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        error: 'Missing number'
    }, {
        status: 400
    });
    try {
        const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sict$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getRoomSchedule"])(number);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(data);
    } catch (err) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: String(err)
        }, {
            status: 502
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0uhctz-._.js.map