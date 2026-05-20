# SICT Schedule API — Discovery Report

**Site:** https://www.sict.edu.mn  
**Stack:** Next.js (App Router, RSC) + PayloadCMS  
**Date:** 2026-05-20

---

## Primary Endpoint

```
GET https://www.sict.edu.mn/api/schedule-entries
```

PayloadCMS REST API. Supports `where`, `limit`, `page`, `sort`, `depth` query params.

---

## Room 401

- **Room ID:** `15`
- **Slug:** `6-401`

### Get room 401 full schedule:
```
GET https://www.sict.edu.mn/api/schedule-entries?where[room][equals]=15&limit=100
```

### Active semester only (semester ID = 1):
```
GET https://www.sict.edu.mn/api/schedule-entries?where[room][equals]=15&where[semester][equals]=1&limit=100
```

---

## Response Shape

```json
{
  "docs": [
    {
      "id": 880,
      "day": "fri",             // mon|tue|wed|thu|fri
      "period": 4,              // 1–7 (maps to time slots below)
      "lessonType": "lecture",  // lecture|lab|seminar
      "weekParity": "all",      // all|odd|even
      "groupCode": "201",
      "stream": "2",
      "studentCount": 24,
      "semester": {
        "id": 1,
        "name": "Хавар 2025-2026",
        "season": "spring",
        "academicYear": "2025-2026",
        "startDate": "2026-01-25T16:00:00.000Z",
        "endDate": "2026-06-14T16:00:00.000Z",
        "isActive": true,
        "weekParityRule": "start-odd"
      },
      "room": {
        "id": 15,
        "number": "401",
        "slug": "6-401",
        "roomType": "lecture",
        "building": { "id": 1, "name": "6-р байр", "code": "6" }
      },
      "subject": {
        "id": 58,
        "code": "S.SLM301",
        "name": "Subject name",
        "credits": 2,
        "defaultType": "lecture"
      },
      "teacher": null,                        // teacher object or null
      "teacherNameFallback": "Л.МӨНХЖАРГАЛ" // string fallback
    }
  ],
  "totalDocs": 880,
  "limit": 10,
  "page": 1,
  "totalPages": 88,
  "pagingCounter": 1,
  "hasPrevPage": false,
  "hasNextPage": true
}
```

---

## Period → Time Slot Map

| Period | Start | End   |
|--------|-------|-------|
| 1      | 08:00 | 09:30 |
| 2      | 09:40 | 11:10 |
| 3      | 11:20 | 12:50 |
| 4      | 13:20 | 14:50 |
| 5      | 15:00 | 16:30 |
| 6      | 16:40 | 18:10 |
| 7      | 18:20 | 19:50 |

---

## All Discovered Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/schedule-entries` | **Schedule entries (main)** |
| `GET /api/rooms` | All rooms with IDs, slugs, building |
| `GET /api/semesters` | Semesters (active flag, date ranges) |
| `GET /api/subjects` | Subjects/courses (code, name, credits) |
| `GET /api/teachers` | Teachers (name, department, slug) |
| `GET /api/buildings` | Buildings |
| `GET /api/events` | News/events (not schedule) |

---

## Useful Queries

```bash
# All rooms
curl https://www.sict.edu.mn/api/rooms?limit=100

# Active semester
curl "https://www.sict.edu.mn/api/semesters?where[isActive][equals]=true"

# Room 401 schedule, full depth
curl "https://www.sict.edu.mn/api/schedule-entries?where[room][equals]=15&where[semester][equals]=1&limit=100&depth=2"

# Filter by day (Monday)
curl "https://www.sict.edu.mn/api/schedule-entries?where[room][equals]=15&where[day][equals]=mon"

# All rooms list page source
# https://www.sict.edu.mn/mn/schedule
curl https://www.sict.edu.mn/api/rooms?limit=100
```

---

## Notes

- No auth required — public read access
- Schedule data is server-rendered via RSC; client does not fetch it directly
- `weekParity` `odd`/`even` relative to semester `weekParityRule: "start-odd"`
- `teacher` field can be null; use `teacherNameFallback` string instead
