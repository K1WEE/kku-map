# User Contributions: Location Suggestions with Admin Review — Design Spec

**Date:** 2026-06-05
**Scope:** ระบบให้ผู้ใช้ทั่วไป (login ด้วย Google) เสนอเพิ่ม/แก้ไขสถานที่บนแผนที่ KKU โดยมีคิวให้ admin รีวิวก่อน publish
**Audience:** ผู้ใช้ปลายทาง (freshmen + ทั่วไป) + project owner ในฐานะ admin

---

## 1. Goals & Non-Goals

**Goals**
- เปิดให้ครอบครัวมหาวิทยาลัยช่วยกัน grow data บนแผนที่ (crowdsourced)
- มีกำแพง moderation ก่อนข้อมูลขึ้น production
- รักษา UX เดิมของหน้า map (anonymous browse ได้ ไม่บังคับ login)
- ย้าย source of truth จาก JSON file → Supabase Postgres เพื่อรองรับ runtime mutation

**Non-Goals (MVP — กันไว้ทำ phase ต่อไป)**
- Upload รูปภาพแนบ submission
- Comment / thread บน place
- ลบ place (report-as-incorrect → admin ลบเอง)
- User profile page / following / leaderboard
- Email notification (status update — ดูใน `/contribute/mine` แทน)
- Approved-but-pending visibility (badge pending บน map)

---

## 2. Architectural Shift

ของเดิม → ของใหม่

| | ของเดิม | ของใหม่ |
|---|---|---|
| Data | `data/*.json` (static, commit ลง git) | Supabase Postgres (runtime, mutable) |
| Auth | ไม่มี | Supabase Auth (Google OAuth) |
| /admin | dev-only, filesystem write | production, role-gated (is_admin) |
| Storage | — | (กันไว้ — ไม่ใช้ใน MVP) |

CLAUDE.md ต้อง update หลัง implement: บรรทัด "No authentication, no backend; data is shipped as JSON files." ใช้ไม่ได้แล้ว

---

## 3. Stack & Layout

```
Supabase
├── Auth        ← Google OAuth provider
├── Postgres    ← source of truth (places, zones, submissions, profiles)
└── Realtime    ← live update map ทุก client

Next.js (App Router)
├── /                       ← map; anonymous-friendly
├── /contribute/new         ← form เสนอ place ใหม่ (login required)
├── /contribute/edit/:id    ← form pre-filled เสนอแก้ไข place เดิม
├── /contribute/mine        ← list submission ของตัวเอง + status
├── /admin                  ← tabs: คิวรีวิว / จุด / โซน (is_admin only)
├── /login                  ← Google sign-in landing
└── /api/auth/callback      ← Supabase OAuth code → cookie session

lib/supabase/
  client.ts, server.ts, middleware.ts
```

**Libs ใหม่:** `@supabase/supabase-js`, `@supabase/ssr` — ไม่ใช้ NextAuth

---

## 4. Data Model (Postgres + RLS)

### 4.1 Tables

```sql
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

create table places (
  id          text primary key,
  name        text not null,
  name_en     text,
  faculty     text,
  category    text not null,
  lat         double precision not null,
  lng         double precision not null,
  description text,
  image       text,
  aliases     jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table zones (
  id         text primary key,
  name       text not null,
  name_en    text,
  color      text not null,
  polygon    jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type submission_type   as enum ('add', 'edit');
create type submission_status as enum ('pending', 'approved', 'rejected');

create table submissions (
  id              uuid primary key default gen_random_uuid(),
  type            submission_type not null,
  target_place_id text references places(id),
  payload         jsonb not null,
  note            text,
  status          submission_status not null default 'pending',
  submitter_id    uuid not null references profiles(id),
  reviewer_id     uuid references profiles(id),
  reviewer_note   text,
  final_payload   jsonb,                       -- payload ที่ admin edit ก่อน approve
  created_at      timestamptz not null default now(),
  reviewed_at     timestamptz,
  check (type = 'add' or target_place_id is not null)
);

create index on submissions(status, created_at desc);
create index on submissions(submitter_id, created_at desc);
```

### 4.2 Profile auto-create trigger

```sql
create function handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into profiles(id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

### 4.3 RLS policies

```sql
-- profiles
alter table profiles enable row level security;
create policy "read own profile" on profiles for select using (auth.uid() = id);
create policy "admin reads all" on profiles for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

-- places / zones: public read, admin write
alter table places enable row level security;
create policy "anyone reads places" on places for select using (true);
create policy "admin writes places" on places for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

alter table zones enable row level security;
-- (เหมือน places)

-- submissions
alter table submissions enable row level security;
create policy "user inserts own" on submissions for insert
  with check (auth.uid() = submitter_id);
create policy "user reads own" on submissions for select
  using (auth.uid() = submitter_id);
create policy "admin reads all submissions" on submissions for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));
create policy "admin updates submissions" on submissions for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));
```

### 4.4 Rate limit (DB-level)

```sql
create function enforce_submission_limit() returns trigger
language plpgsql as $$
begin
  if (select count(*) from submissions
      where submitter_id = new.submitter_id and status = 'pending') >= 10 then
    raise exception 'submission_limit_exceeded';
  end if;
  return new;
end; $$;

create trigger limit_pending
  before insert on submissions
  for each row execute function enforce_submission_limit();
```

---

## 5. Auth Flow

- `@supabase/ssr` — supports App Router (server reads session via cookie, client subscribes)
- Sign in → `signInWithOAuth({ provider: 'google', redirectTo: /api/auth/callback })` → Supabase exchanges code → session cookie
- Server components / route handlers: `supabase.auth.getUser()`
- Client components: `useUser()` hook + `onAuthStateChange` listener
- Middleware refreshes expired tokens

**Admin guard pattern:**
```ts
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect('/login?next=/admin');
const { data: profile } = await supabase
  .from('profiles').select('is_admin').eq('id', user.id).single();
if (!profile?.is_admin) notFound();   // ซ่อนการมีอยู่ ไม่ใช่ 403
```

**Anonymous viewing:** `/` ไม่ guard → fetch ผ่าน anon key + RLS

---

## 6. User Submission UX

### 6.1 Entry points
1. **"เสนอแก้ไข"** ใน `PlaceSheet.tsx` — ปุ่มเล็กล่างสุด → `/contribute/edit/:id`
2. **"เสนอสถานที่ใหม่"** — FAB มุมขวาล่างหน้า `/` → `/contribute/new`
3. ทั้ง 2 ทาง: ถ้ายังไม่ login → modal "เข้าสู่ระบบเพื่อช่วยปรับปรุงแผนที่" → Google → กลับมา resume

### 6.2 Form (reuse จาก /admin)
- Reuse `PlaceForm`, `CoordPicker`, `AdminMap` แทบทั้งหมด
- ปิดการแก้ field `id` (server auto-generate slug จาก name)
- เพิ่ม textarea `note` (optional "อยากบอก admin อะไรเพิ่มไหม")
- ปุ่ม submit เปลี่ยน label เป็น "ส่งให้ admin รีวิว"
- สำหรับ edit: pre-fill + diff highlight (เขียว = เปลี่ยน, เทา = เดิม)

### 6.3 Layout (mobile-first)
- Top bar (ปุ่มกลับ + title)
- แผนที่ครึ่งบน (interactive)
- ฟอร์มครึ่งล่าง (scroll)
- ปุ่ม submit sticky bottom

### 6.4 After submit
- POST `/api/submissions` → insert row pending
- Toast: "ส่งเรียบร้อย! รอ admin รีวิว (ปกติ 1-3 วัน)"
- Redirect `/contribute/mine`

### 6.5 `/contribute/mine`
- Card list: ชื่อสถานที่ + status badge (`รอรีวิว` / `อนุมัติแล้ว` / `ไม่อนุมัติ — เหตุผล`)
- กด card → preview payload + reviewer_note

### 6.6 Anti-spam (UI)
- Disable submit ระหว่าง pending request
- Honeypot field `website` (bot กรอก, คนไม่กรอก → reject ฝั่ง API)
- DB throw `submission_limit_exceeded` → toast Thai-friendly
- Bbox warning (ไม่ block): ถ้าหลุด ~16.46–16.49, 102.81–102.84 → เตือนสีเหลือง

---

## 7. Admin Review UX (`/admin`)

### 7.1 Tabs
```
[ คิวรีวิว (N) ]  [ จุด ]  [ โซน ]
```
- N = realtime badge นับ pending
- Default tab = คิวรีวิว ถ้า N > 0

### 7.2 Queue list
- Row: type badge (🆕 / ✏️) + ชื่อสถานที่ + category + submitter email + relative time
- Sort: `created_at desc`
- Filter: `ทั้งหมด` / `เพิ่มใหม่` / `แก้ไข`
- Empty: "ไม่มี submission รอ review 🎉"

### 7.3 Detail view
1. **ข้อมูล submission** (panel ขวา) — submitter avatar, email, จำนวน approve/reject history (trust signal), note, timestamp; สำหรับ edit แสดง diff side-by-side
2. **Map preview** (กลาง) — add: marker ใหม่ + bbox warning; edit: marker เก่า (เทา) + ใหม่ (น้ำเงิน) มีเส้นต่อ
3. **Actions** (sticky bottom) — `✓ อนุมัติ`, `✏️ แก้ไขก่อนอนุมัติ`, `✕ ไม่อนุมัติ` (ขอเหตุผล optional)

### 7.4 Approve
```
POST /api/admin/submissions/:id/approve
  ↓ (server, role-checked, service-role client)
  begin tx
    if type='add':  insert into places(...) from final_payload or payload
    if type='edit': update places set ... where id = target_place_id
    update submissions set status='approved', reviewer_id, reviewed_at
  commit
  ↓
Supabase Realtime push → map ของทุก client refresh
```

### 7.5 Reject
- Update submission status='rejected' + `reviewer_note`
- ไม่แตะ places table
- User เห็นใน `/contribute/mine`

### 7.6 Edit-before-approve
- เปิด PlaceForm pre-filled จาก payload
- Admin ปรับช่อง → save → ค่าใหม่ไปลง `final_payload` (เก็บ payload เดิมไว้ audit)
- Approve ใช้ `final_payload` (fallback `payload`)

### 7.7 Realtime
- `/admin` queue: subscribe `submissions` table
- `/` map: subscribe `places` + `zones`
- ไม่ต้อง polling

### 7.8 Audit
- Submissions row คือ history สมบูรณ์ — ไม่ลบแม้ reject
- กันมาเถียงทีหลังว่าเคยส่งอะไร

---

## 8. Migration จากระบบเดิม

### 8.1 Setup steps (one-time)
1. สร้าง Supabase project → copy URL + anon key + service_role key
2. Enable Google OAuth provider ใน Supabase dashboard
3. รัน `supabase/migrations/0001_init.sql` (Section 4 ทั้งก้อน)
4. `npm run seed` → script อ่าน `data/{places,zones}.json` ใช้ service_role upsert
5. SQL ตั้ง `is_admin=true` ให้ owner
6. Enable Realtime per-table: dashboard → Database → Replication → toggle ON

### 8.2 Code changes

| ไฟล์ | เปลี่ยน |
|---|---|
| `components/Map.tsx` | เลิก static JSON import → รับ `places`/`zones` เป็น prop |
| `app/page.tsx` | server fetch + client realtime subscribe |
| `lib/search.ts` | Fuse index จาก fetched data |
| `lib/admin/dataStore.ts` | **ลบ** — filesystem write ใช้บน Vercel ไม่ได้ |
| `app/api/admin/{places,zones}/route.ts` | rewrite → Supabase query |
| `components/admin/*` | reuse logic ได้ |

### 8.3 Vercel deployment
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Supabase Auth → URL Configuration → เพิ่ม production domain + `http://localhost:3100`

---

## 9. Gotchas

1. **CLAUDE.md update** หลัง implement: บรรทัด "No authentication, no backend" ต้องแก้
2. **Static JSON import หาย** — หลังย้ายเป็น runtime fetch จะ live update เลย ไม่ต้อง redeploy
3. **Realtime per-table** ต้อง enable ใน dashboard
4. **Triggers ต้องเป็น `security definer`** ไม่งั้น insert จะติด RLS ตัวเอง
5. **Service role key เด็ดขาดอย่า leak** — gitignore env, server-only
6. **Cookie size** — Supabase ssr ใช้ cookie เก็บ JWT; ถ้า Google metadata ใหญ่อาจชนขีดจำกัด — strip ที่ไม่ใช้
7. **Realtime quota free tier** — 200 concurrent; วันเปิดเทอมอาจชน → fallback polling/debounce
8. **Diff drift** — ระหว่าง user รอ review, ถ้า admin แก้ place ตรงๆ → diff ดูแปลก → แสดง warning
9. **Free tier auto-pause** — DB ไม่ใช้ 7 วันโดน pause; ไม่กระทบ prod ที่มี traffic

---

## 10. Testing (manual smoke)

- [ ] Anonymous เปิด `/` เห็น places จาก DB
- [ ] Login Google → profile auto-create
- [ ] "เสนอแก้ไข" บน place → form pre-fill ถูก
- [ ] FAB "เสนอใหม่" → fill + submit → เห็นใน `/contribute/mine` pending
- [ ] Admin login → `/admin` คิวรีวิวมี submission
- [ ] Approve add → place ขึ้น map ทันที (realtime)
- [ ] Approve edit → place ขยับ/เปลี่ยนชื่อ ทันที
- [ ] Reject → user เห็น status + reason
- [ ] Non-admin → `/admin` → 404
- [ ] Direct POST `/api/admin/submissions/:id/approve` จาก non-admin → 403
- [ ] Submit 11 ครั้ง → ครั้งที่ 11 ถูก reject ("submission_limit_exceeded")

---

## 11. Phase ถัดไป (out of scope ของ MVP นี้)

- **Image upload** — เพิ่ม Supabase Storage bucket + RLS, field รูปใน submission, image moderation
- **Comments** — ตาราง `comments` + thread + report
- **Delete-place submissions** — type='delete' + admin confirms
- **Notification** — email/web push เมื่อ submission ถูก review
- **User trust score** — แสดง approved/rejected count, อาจ auto-approve user ที่มี trust สูง
