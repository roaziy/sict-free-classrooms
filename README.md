# sict-free-classrooms

which rooms are free right now at SICT. that's it.

built this because checking the school website every time is annoying.

---

**features**

- shows free rooms for current period
- peek at next 2 periods
- filter by floor
- click a room → full weekly schedule
- dark mode

---

**how it works**

SICT's website (sict.edu.mn) runs on PayloadCMS which exposes a public REST API — no auth needed. the app hits `/api/schedule-entries`, `/api/rooms`, and `/api/semesters` to figure out what's happening right now. cross-references the current UB time (UTC+8) with the semester's week parity (odd/even weeks) and today's schedule entries to determine which rooms are occupied. if a room has no entry for the current period — it's free.

---

**dev:** [@roaziy](https://github.com/roaziy)

**fully vibe-coded with [Claude Code](https://claude.ai/code)**
