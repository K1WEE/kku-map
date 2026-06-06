-- KKU Maps: zones aliases + cleanup
--
-- Two changes:
--   1. `aliases` column on zones, mirroring the one places already has.
--      Search now treats zones as first-class hits, so admins want
--      "วิศวะ" → engineering polygon to work the same way EN04 → place
--      already does.
--   2. Drop the now-orphaned `category = 'faculty'` place(s) — that
--      category is going away in the client, and the engineering place
--      was a duplicate of the engineering zone anyway. Safe to delete:
--      zones carry the polygon, search finds the zone instead.

alter table public.zones
  add column if not exists aliases jsonb not null default '[]'::jsonb;

delete from public.places where category = 'faculty';

-- Seed the existing two zones with Thai/Latin abbreviations so search hits
-- without an admin having to fill them in by hand. New zones still default
-- to '[]' and admin can populate via the editor.
update public.zones set aliases = '["วิศวะ","Engineering","EN","วิศวกรรม"]'::jsonb
  where id = 'engineering';
update public.zones set aliases = '["เกษตร","Agriculture","AG","เกษตรศาสตร์"]'::jsonb
  where id = 'agriculture';
