'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { FreeRoomsResponse, Room, RoomScheduleResponse } from '@/lib/sict';
import { PERIODS, resolvePeriod } from '@/lib/sict';
import { Moon, Sun, ExternalLink } from 'lucide-react';

// ── Constants ──
const DEFAULT_FLOORS = [1, 2, 4];
const FLOOR_LABELS: Record<number, string> = { 1: '1-р давхар', 2: '2-р давхар', 3: '3-р давхар', 4: '4-р давхар' };
const TYPE_LABELS: Record<string, string> = { lecture: 'Лекц', lab: 'Лаб', seminar: 'Семинар', computer: 'Компьютер' };
const DAY_MN: Record<string, string> = { mon: 'Да', tue: 'Мя', wed: 'Лх', thu: 'Пү', fri: 'Ба' };
const DAY_MN_FULL: Record<string, string> = { mon: 'Даваа', tue: 'Мягмар', wed: 'Лхагва', thu: 'Пүрэв', fri: 'Баасан', sat: 'Бямба', sun: 'Ням' };
const LESSON_TYPE_MN: Record<string, string> = { lecture: 'Лекц', lab: 'Лаб', seminar: 'Сем', computer: 'Комп' };
const PARITY_MN: Record<string, string> = { odd: 'Тэгш бус', even: 'Тэгш', all: '' };
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const;

function getPeriodLabel(state: string, period: { n: number; start: string; end: string }): string {
  if (state === 'active' || state === 'preview') return `${period.n}-р пар · ${period.start}–${period.end}`;
  if (state === 'break') return `Завсарлага · ${period.n}-р пар дөхөж байна`;
  if (state === 'upcoming') return `Хичээл эхлээгүй · ${period.n}-р пар ${period.start}-д`;
  if (state === 'done') return 'Хичээл дууссан';
  return `${period.n}-р пар`;
}

// ── Theme ──
function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const isDark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }
  return { dark, toggle };
}

// ── Room card ──
function RoomCard({ room, onClick }: { room: Room; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border p-3 transition-all duration-100 hover:-translate-y-0.5 hover:shadow-md active:scale-95',
        room.free
          ? 'bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-900'
          : 'bg-card border-border hover:border-foreground/20'
      )}
    >
      <div className={cn('text-xl font-bold leading-none', room.free ? 'text-green-700 dark:text-green-400' : 'text-foreground/70')}>
        {room.number}
      </div>
      <div className={cn('text-[10px] mt-1 font-medium', room.free ? 'text-green-600 dark:text-green-500' : 'text-muted-foreground/70')}>
        {TYPE_LABELS[room.type] || room.type || ''}
      </div>
      {room.free ? (
        <Badge variant="outline" className="mt-1.5 text-[10px] h-auto py-0 px-1.5 text-green-700 border-green-300 bg-green-100 dark:text-green-400 dark:border-green-800 dark:bg-green-950/60">
          Сул
        </Badge>
      ) : room.class ? (
        <div className="mt-1.5 text-[10px] text-muted-foreground/70 truncate">
          {[room.class.groupCode, room.class.teacher].filter(Boolean).join(' · ') || 'Хичээлтэй'}
        </div>
      ) : null}
    </button>
  );
}

// ── Room schedule sheet ──
function RoomSheet({ room, open, onClose }: { room: Room | null; open: boolean; onClose: () => void }) {
  const [schedule, setSchedule] = useState<RoomScheduleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!room || !open) return;
    setSchedule(null);
    setError(null);
    setLoading(true);
    fetch(`/api/room-schedule?number=${room.number}`)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => setSchedule(d))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [room, open]);

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn('flex flex-col p-0 gap-0 overflow-hidden', isMobile ? 'h-[85vh] rounded-t-2xl' : 'w-[42vw]')}
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <div>
            <SheetTitle className="text-2xl font-bold">{room?.number}-р танхим</SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {TYPE_LABELS[room?.type ?? ''] || room?.type || ''} · {room?.slug}
            </p>
          </div>
        </SheetHeader>

        {/* Schedule body */}
        <ScrollArea className="flex-1 min-h-0">
        <div className="px-5 py-4 space-y-4">
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</div>
          )}

          {schedule && !loading && (
            <div className="overflow-x-auto -mx-5 px-5">
              <div className="min-w-[560px] sm:min-w-0 sm:w-full space-y-1">
                {/* Day header row */}
                <div className="grid grid-cols-[44px_repeat(5,100px)] sm:grid-cols-[44px_repeat(5,1fr)] gap-1 mb-2">
                  <div />
                  {DAYS.map(d => (
                    <div key={d} className="text-center text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {DAY_MN[d]}
                    </div>
                  ))}
                </div>

                {/* Period rows */}
                {(() => {
                  const { period: cur, state } = resolvePeriod();
                  const curN = state === 'done' ? -1 : cur.n;
                  const ubNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
                  const todayCode = ['sun','mon','tue','wed','thu','fri','sat'][ubNow.getUTCDay()];
                  return PERIODS.map(p => {
                  const isPeriodCurrent = p.n === curN;
                  return (
                  <div key={p.n} className={cn('grid grid-cols-[44px_repeat(5,100px)] sm:grid-cols-[44px_repeat(5,1fr)] gap-1 rounded-lg', isPeriodCurrent && 'bg-red-500/8')}>
                    <div className={cn('flex flex-col justify-center pr-1 pl-1', isPeriodCurrent && 'border-l-2 border-red-500')}>
                      <span className={cn('text-xs font-semibold', isPeriodCurrent ? 'text-red-500' : 'text-muted-foreground')}>{p.n}-р</span>
                      <span className="text-[10px] text-muted-foreground/50">{p.start}</span>
                    </div>
                    {DAYS.map(day => {
                      const entries = (schedule.schedule[day] ?? []).filter(e => e.period === p.n);
                      const isNow = isPeriodCurrent && day === todayCode;
                      if (entries.length === 0) {
                        return <div key={day} className={cn('rounded-md border min-h-[56px]', isNow ? 'bg-green-50 border-green-200 dark:bg-green-950/40 dark:border-green-900' : 'bg-muted/20 border-border/50')} />;
                      }
                      return (
                        <div key={day} className={cn(
                          'rounded-md border min-h-[56px] p-2 space-y-1.5',
                          isNow
                            ? 'bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-900'
                            : 'bg-card border-border'
                        )}>
                          {entries.map((e, i) => (
                            <div key={i} className={cn(i > 0 && 'pt-1.5 border-t', isNow ? 'border-red-200 dark:border-red-900' : 'border-border/50')}>
                              <div className={cn('text-[11px] font-semibold leading-tight', isNow ? 'text-red-700 dark:text-red-400' : 'text-foreground')}>
                                {e.subject ?? e.subjectCode ?? '—'}
                              </div>
                              {e.teacher && (
                                <div className={cn('text-[10px] truncate', isNow ? 'text-red-500/70 dark:text-red-400/70' : 'text-muted-foreground')}>{e.teacher}</div>
                              )}
                              <div className="flex items-center gap-0.5 mt-0.5 flex-wrap">
                                {e.weekParity !== 'all' && (
                                  <span className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1 rounded">
                                    {PARITY_MN[e.weekParity]}
                                  </span>
                                )}
                                {e.lessonType && (
                                  <span className={cn('text-[9px] px-1 rounded', isNow ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-muted text-muted-foreground')}>
                                    {LESSON_TYPE_MN[e.lessonType] ?? e.lessonType}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                  );
                });})()}
              </div>
            </div>
          )}
        </div>
        </ScrollArea>

        {/* Footer button */}
        {room && (
          <div className="px-5 py-4 border-t border-border shrink-0">
            <a
              href={`https://sict.edu.mn/class/${room.number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Сургуулийн сайтаар үзэх
              <ExternalLink size={14} />
            </a>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Main page ──
export default function Home() {
  const { dark, toggle } = useTheme();
  const [data, setData] = useState<FreeRoomsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [activeFloors, setActiveFloors] = useState(new Set(DEFAULT_FLOORS));
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [sheetRoom, setSheetRoom] = useState<Room | null>(null);
  const cacheRef = useRef<Record<string, FreeRoomsResponse>>({});

  const fetchData = useCallback(async (period: number | null, all: boolean) => {
    const key = `${period ?? 'auto'}:${all ? '1' : '0'}`;
    if (cacheRef.current[key]) { setData(cacheRef.current[key]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (all) params.set('all', '1');
      if (period) params.set('period', String(period));
      const res = await fetch('/api/free-rooms' + (params.toString() ? '?' + params : ''));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: FreeRoomsResponse = await res.json();
      cacheRef.current[key] = json;
      setData(json);
    } catch (e) { setError(String(e)); }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData(null, false);
    const id = setInterval(() => { cacheRef.current = {}; fetchData(null, false); }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchData]);

  const toggleAllRooms = () => {
    const next = !showAll;
    setShowAll(next);
    setActiveFloors(new Set(next ? [1, 2, 3, 4] : DEFAULT_FLOORS));
    fetchData(selectedPeriod, next);
  };

  const toggleFloor = (f: number) => {
    setActiveFloors(prev => {
      const next = new Set(prev);
      if (next.has(f) && next.size > 1) next.delete(f);
      else next.add(f);
      return next;
    });
  };

  const selectPeriod = (n: number | null) => { setSelectedPeriod(n); fetchData(n, showAll); };

  const autoPeriod = data?.autoPeriod ?? null;
  const periodTabs = autoPeriod ? PERIODS.filter(p => p.n >= autoPeriod && p.n <= autoPeriod + 2) : [];
  const filteredRooms = (data?.rooms ?? []).filter(r => activeFloors.has(Math.floor(parseInt(r.number) / 100)));
  const floorGroups = filteredRooms.reduce<Record<number, Room[]>>((acc, r) => {
    const f = Math.floor(parseInt(r.number) / 100);
    (acc[f] ??= []).push(r);
    return acc;
  }, {});
  const freeCount = filteredRooms.filter(r => r.free).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between gap-3">
        <span className="font-bold tracking-tight text-sm whitespace-nowrap">
          SICT <span className="text-primary">//</span> Сул Танхимууд
        </span>
        <div className="flex items-center gap-2 min-w-0 flex-wrap justify-end">
          {data && (
            <>
              <Badge variant="outline" className="text-xs shrink-0">
                {DAY_MN_FULL[data.day] ?? data.day}, {data.time}
              </Badge>
              <Badge variant="secondary" className="text-xs hidden sm:inline-flex shrink-0">
                {getPeriodLabel(data.periodState, data.period)}
              </Badge>
              {!loading && (
                <Badge className="text-xs shrink-0 bg-green-900 text-green-300 border-green-800 hover:bg-green-900">
                  {freeCount} / {filteredRooms.length} сул
                </Badge>
              )}
            </>
          )}
          <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={toggle}>
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-3">
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm">
            Алдаа: {error}
          </div>
        )}

        {data && (
          <p className="sm:hidden text-xs text-muted-foreground">
            {getPeriodLabel(data.periodState, data.period)}
          </p>
        )}

        {/* Period tabs */}
        {periodTabs.length > 0 && (
          <ScrollArea>
          <div className="flex gap-2 pb-1">
            {periodTabs.map(p => {
              const isAuto = p.n === autoPeriod;
              const isActive = selectedPeriod === null ? isAuto : selectedPeriod === p.n;
              return (
                <button
                  key={p.n}
                  onClick={() => selectPeriod(isAuto ? null : p.n)}
                  className={cn(
                    'shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap',
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/30'
                  )}
                >
                  {isAuto ? `${p.n}-р пар · Одоо` : `${p.n}-р пар · ${p.start}`}
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}

        {/* Filters */}
        <ScrollArea>
        <div className="flex items-center gap-2 pb-1">
          <Button
            variant={showAll ? 'default' : 'outline'}
            size="sm"
            className="shrink-0 h-7 text-xs rounded-full px-3"
            onClick={toggleAllRooms}
          >
            Бүх танхим
          </Button>
          <div className="w-px h-4 bg-border shrink-0" />
          {(showAll ? [1, 2, 3, 4] : DEFAULT_FLOORS).map(f => (
            <button
              key={f}
              onClick={() => toggleFloor(f)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap',
                activeFloors.has(f)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:text-foreground'
              )}
            >
              {FLOOR_LABELS[f]}
            </button>
          ))}
        </div>
        {/* <ScrollBar orientation="horizontal" /> */}
        </ScrollArea>

        {/* Weekend */}
        {data?.isWeekend && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-xl font-semibold">Амралтын өдөр</p>
            <p className="text-sm mt-1">Өнөөдөр хичээл байхгүй</p>
          </div>
        )}

        {/* Rooms */}
        {!data?.isWeekend && (
          <div className="space-y-5">
            {loading ? (
              [0, 1].map(g => (
                <div key={g}>
                  <Skeleton className="h-2.5 w-20 mb-3 rounded" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                    {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-[84px] rounded-xl" />)}
                  </div>
                </div>
              ))
            ) : (
              Object.entries(floorGroups)
                .sort((a, b) => +a[0] - +b[0])
                .map(([f, rooms]) => (
                  <div key={f}>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">
                      {FLOOR_LABELS[+f] ?? `${f}-р давхар`}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                      {rooms.map(r => (
                        <RoomCard key={r.number} room={r} onClick={() => setSheetRoom(r)} />
                      ))}
                    </div>
                  </div>
                ))
            )}
          </div>
        )}
      </main>

      {/* Room schedule sheet */}
      <RoomSheet room={sheetRoom} open={!!sheetRoom} onClose={() => setSheetRoom(null)} />
    </div>
  );
}
