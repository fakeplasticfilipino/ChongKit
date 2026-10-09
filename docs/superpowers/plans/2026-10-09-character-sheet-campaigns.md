# Character Sheet Campaigns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Players and the GM of a campaign see each other's characters in the Character Sheet's Characters menu and open them read-only, refreshed every ~30 s.

**Architecture:** Supabase gets two tables (`campaigns`, `campaign_members`), a `campaign_id` column on `character_sheets`, a membership-based read policy and `security definer` functions for every campaign change. The page polls with plain `fetch` (no Realtime): `sheet.js` holds the pure diff / merge / view logic (tested), `cloud.js` the REST calls, a new `campaigns.js` draws the campaign sections and dialogs, `menu.js` shares its card, and `ui.js` adds a read-only "viewing" mode.

**Tech Stack:** Plain HTML + vanilla JS (no build), `node:test`, Supabase (Postgres RLS, PostgREST RPC) via the Supabase MCP tools, project ref `fmkbvoukbrxjbzlexjhu`.

**Spec:** `docs/superpowers/specs/2026-10-09-character-sheet-campaigns-design.md`

## Global Constraints

- Read `CLAUDE.md` first. Character Sheet rules apply: flat v4 look (`sheet.css`, `body.cs-flat` tokens: `--frame` #4a4a4a, `--band` #6f6f6f, white fields, 3 px corners), labels only (no helper text), user text set only as text/value (never `innerHTML` with user data), CSP unchanged (`connect-src` is only the Supabase project).
- Zero-install: no libraries, no build, no new hosts. `campaigns.js` follows the `notes.js` / `menu.js` pattern: an IIFE defining `window.SheetCampaigns = function (ui) { … }` that receives `ui.js`'s helpers.
- `Cloud.list()` must read **only your own rows** (`user_id=eq.<you>`); otherwise friends' characters merge into your own list.
- `campaign_id` is never sent by normal sync, and `authenticated` has no INSERT/UPDATE privilege on that column; it changes only through `set_character_campaign`, `leave_campaign` and `delete_my_account`.
- A friend's character is never written into `chongkit.sheets`, never uploaded and never goes through undo.
- Codes: 6 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, shown `K7Q-3MD`.
- Limits: 10 campaigns per account, 12 members per campaign. Refresh every 30 000 ms while the menu or a friend's sheet is on screen and the tab is visible.
- UI text exactly: "Your characters", "+ New campaign", "Join with code", "+ Add character", "Add to <campaign>", "Copy code", "Rename", "New code", "Leave", "Remove from campaign", "No campaign with that code", "Sign in to join a campaign", toast "Left <campaign>" (no Undo button).
- Workflow per CLAUDE.md: `git pull --rebase origin main` before work and before pushing; commit and push straight to `main`; no branches. Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Run `npm test` (repo root) before every commit.

**User decisions (already made):**
- Several campaigns per person; each character in at most one campaign.
- Players pick characters from inside the campaign ("+ Add character"), not a "Share" option on the character.
- No roles: everyone equal; each player removes only their own characters; last member leaving deletes the campaign; "New code" retires an old code.
- A shared character shows twice: in "Your characters" (with a campaign tag) and in its campaign (foot "You").
- Not real time: poll every ~30 s; must stay within the Supabase free plan.
- Campaigns need an account.
- Approach 1: mark characters in `character_sheets` (no copies, no Realtime).

---

## File structure

| File | Change | Responsibility |
|---|---|---|
| Supabase migration `campaigns` | new (applied with the MCP `apply_migration`) | tables, RLS, grants, functions |
| `character-sheet/sheet.js` | modify | pure: codes, REST paths, `campaignDiff`, `campaignMerge`, `campaignView` |
| `character-sheet/tests/sheet.test.js` | modify | tests for the above |
| `character-sheet/cloud.js` | modify | own-rows `list()`, campaign REST/RPC calls, per-account campaign cache |
| `character-sheet/menu.js` | modify | shared `card(c, opts)`, "Your characters" heading, campaign tag, "Remove from campaign" |
| `character-sheet/campaigns.js` | create | campaign sections, ⋯ menu, picker, New/Join dialogs, refresh loop |
| `character-sheet/ui.js` | modify | viewing mode, band, wiring, `upload`, toast without Undo, `dialog().done` |
| `character-sheet/notes.js` | modify | free box read-only while viewing |
| `character-sheet/index.html` | modify | `#viewband`, `#cards` container class, `campaigns.js` script |
| `character-sheet/sheet.css` | modify | section headings, code chip, tag, picker, band |
| `CLAUDE.md`, `README.md`, `TRACKER.md` | modify | docs |

---

### Task 1: Database — campaigns tables, rules and functions

**Goal:** The Supabase project has campaigns, memberships, a membership read rule on `character_sheets`, and functions for every campaign change, proven by SQL checks acting as fake users.

**Files:**
- Create: Supabase migration `campaigns` (via `mcp__…__apply_migration`, project `fmkbvoukbrxjbzlexjhu`)

**Acceptance Criteria:**
- [ ] `public.campaigns`, `public.campaign_members` exist with RLS on; `character_sheets.campaign_id` exists.
- [ ] The check block below ends with the error text `ALL CAMPAIGN CHECKS PASSED` (and nothing is left behind: it rolls back).
- [ ] `get_advisors` (security) reports nothing new about the campaign tables or functions.

**Verify:** run the Step 3 check block with `execute_sql` → error message `ALL CAMPAIGN CHECKS PASSED`

**Steps:**

- [ ] **Step 1: Look at what's there** (so the migration matches the live state)

Run with `execute_sql`:

```sql
select policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'character_sheets';
```

Expected: four policies, including `Read own sheets` (SELECT). If the SELECT policy has another name, use that name in the `drop policy` line of Step 2.

- [ ] **Step 2: Apply the migration** — `apply_migration` with name `campaigns` and this SQL:

```sql
-- Campaigns: players of one campaign can read each other's characters (Character Sheet).
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  created_at timestamptz not null default now()
);
create table public.campaign_members (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 60),
  joined_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);
create index campaign_members_user on public.campaign_members (user_id);
alter table public.character_sheets add column campaign_id uuid references public.campaigns(id) on delete set null;
create index character_sheets_campaign on public.character_sheets (campaign_id) where campaign_id is not null;

alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;

-- Membership check for policies (security definer, so the policies don't recurse).
create function public.is_campaign_member(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.campaign_members m where m.campaign_id = c and m.user_id = (select auth.uid()))
$$;

create policy "Read my campaigns" on public.campaigns for select to authenticated
  using (public.is_campaign_member(id));
create policy "Read my campaigns' members" on public.campaign_members for select to authenticated
  using (public.is_campaign_member(campaign_id));
drop policy "Read own sheets" on public.character_sheets;
create policy "Read own and campaign sheets" on public.character_sheets for select to authenticated
  using ((select auth.uid()) = user_id or (campaign_id is not null and public.is_campaign_member(campaign_id)));

-- Signed-in users only read the campaign tables; every change goes through the functions below.
revoke all on public.campaigns, public.campaign_members from anon, authenticated;
grant select on public.campaigns, public.campaign_members to authenticated;
-- campaign_id can't be written directly: only set_character_campaign / leave_campaign change it.
revoke insert, update on public.character_sheets from authenticated;
grant insert (user_id, id, data, updated_at), update (user_id, id, data, updated_at) on public.character_sheets to authenticated;

-- A fresh, unused join code (6 characters, no look-alikes), from gen_random_uuid's random bytes.
create function public.new_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  a constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  b bytea;
  c text;
begin
  loop
    b := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    c := '';
    for i in 0..5 loop
      c := c || substr(a, 1 + (get_byte(b, i) % 32), 1);
    end loop;
    exit when not exists (select 1 from public.campaigns where code = c);
  end loop;
  return c;
end $$;

create function public.create_campaign(p_name text, p_member text) returns public.campaigns
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  n text := left(btrim(coalesce(p_name, '')), 60);
  c public.campaigns;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if n = '' then raise exception 'Name the campaign'; end if;
  if (select count(*) from public.campaign_members where user_id = me) >= 10 then
    raise exception 'Campaign limit reached (10)';
  end if;
  insert into public.campaigns (name, code) values (n, public.new_code()) returning * into c;
  insert into public.campaign_members (campaign_id, user_id, name) values (c.id, me, left(coalesce(p_member, ''), 60));
  return c;
end $$;

create function public.join_campaign(p_code text, p_member text) returns public.campaigns
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  k text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  c public.campaigns;
begin
  if me is null then raise exception 'Not signed in'; end if;
  select * into c from public.campaigns where code = k;
  if not found then raise exception 'No campaign with that code'; end if;
  if exists (select 1 from public.campaign_members where campaign_id = c.id and user_id = me) then
    update public.campaign_members set name = left(coalesce(p_member, ''), 60) where campaign_id = c.id and user_id = me;
    return c;
  end if;
  if (select count(*) from public.campaign_members where user_id = me) >= 10 then
    raise exception 'Campaign limit reached (10)';
  end if;
  if (select count(*) from public.campaign_members where campaign_id = c.id) >= 12 then
    raise exception 'This campaign is full (12)';
  end if;
  insert into public.campaign_members (campaign_id, user_id, name) values (c.id, me, left(coalesce(p_member, ''), 60));
  return c;
end $$;

create function public.leave_campaign(p_campaign uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not signed in'; end if;
  update public.character_sheets set campaign_id = null where user_id = me and campaign_id = p_campaign;
  delete from public.campaign_members where campaign_id = p_campaign and user_id = me;
  delete from public.campaigns c where c.id = p_campaign
    and not exists (select 1 from public.campaign_members m where m.campaign_id = p_campaign);
end $$;

create function public.rename_campaign(p_campaign uuid, p_name text) returns public.campaigns
language plpgsql security definer set search_path = '' as $$
declare
  n text := left(btrim(coalesce(p_name, '')), 60);
  c public.campaigns;
begin
  if not public.is_campaign_member(p_campaign) then raise exception 'Not in that campaign'; end if;
  if n = '' then raise exception 'Name the campaign'; end if;
  update public.campaigns set name = n where id = p_campaign returning * into c;
  return c;
end $$;

create function public.new_campaign_code(p_campaign uuid) returns public.campaigns
language plpgsql security definer set search_path = '' as $$
declare c public.campaigns;
begin
  if not public.is_campaign_member(p_campaign) then raise exception 'Not in that campaign'; end if;
  update public.campaigns set code = public.new_code() where id = p_campaign returning * into c;
  return c;
end $$;

create function public.set_character_campaign(p_character text, p_campaign uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not signed in'; end if;
  if p_campaign is not null and not public.is_campaign_member(p_campaign) then
    raise exception 'Not in that campaign';
  end if;
  update public.character_sheets set campaign_id = p_campaign where user_id = me and id = p_character;
  if not found then raise exception 'Sync this character first'; end if;
end $$;

-- Deleting an account also leaves every campaign (the last member out deletes the campaign).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  perform public.leave_campaign(m.campaign_id) from public.campaign_members m where m.user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.is_campaign_member(uuid), public.new_code(),
  public.create_campaign(text, text), public.join_campaign(text, text), public.leave_campaign(uuid),
  public.rename_campaign(uuid, text), public.new_campaign_code(uuid), public.set_character_campaign(text, uuid)
  from public, anon, authenticated;
grant execute on function public.is_campaign_member(uuid),
  public.create_campaign(text, text), public.join_campaign(text, text), public.leave_campaign(uuid),
  public.rename_campaign(uuid, text), public.new_campaign_code(uuid), public.set_character_campaign(text, uuid)
  to authenticated;
```

- [ ] **Step 3: Prove it as fake users** — `execute_sql` with this block. It raises at the end on purpose so everything rolls back; success is the error text `ALL CAMPAIGN CHECKS PASSED`. Any other error names the check that failed.

```sql
do $$
declare
  u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); u3 uuid := gen_random_uuid();
  extra uuid[] := array(select gen_random_uuid() from generate_series(1, 11));
  c public.campaigns; c2 public.campaigns; old text; n int; ok boolean; x uuid;
begin
  insert into auth.users (id, aud, role, email)
    select id, 'authenticated', 'authenticated', id || '@example.test' from unnest(array[u1, u2, u3] || extra) as id;

  -- u1: a synced character, a campaign, the character added
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.character_sheets (id, data) values ('c1', '{"updated": 5, "name": "Brakka"}');
  c := public.create_campaign('Iron Hills', 'Sam');
  assert c.code ~ '^[A-HJ-NP-Z2-9]{6}$', 'code shape';
  perform public.set_character_campaign('c1', c.id);
  begin
    update public.character_sheets set campaign_id = null where id = 'c1';
    raise exception 'FAIL: plain update changed campaign_id';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.character_sheets (id, data, campaign_id) values ('c9', '{}', c.id);
    raise exception 'FAIL: plain insert set campaign_id';
  exception when insufficient_privilege then null; end;
  -- a normal sync upsert keeps campaign_id
  insert into public.character_sheets (id, data, updated_at) values ('c1', '{"updated": 6, "name": "Brakka"}', now())
    on conflict (user_id, id) do update set data = excluded.data, updated_at = excluded.updated_at;
  select campaign_id is not distinct from c.id into ok from public.character_sheets where user_id = u1 and id = 'c1';
  assert ok, 'sync upsert kept campaign_id';

  -- u2, not a member: sees nothing; a wrong code reveals nothing
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  select count(*) into n from public.character_sheets where user_id = u1; assert n = 0, 'non-member reads no sheets';
  select count(*) into n from public.campaigns; assert n = 0, 'non-member sees no campaign';
  begin
    perform public.join_campaign('ZZZZZZ', 'Jo');
    raise exception 'FAIL: wrong code joined';
  exception when others then if sqlerrm <> 'No campaign with that code' then raise; end if; end;

  -- u2 joins (lower case with a dash), reads Brakka, can't edit it or take it out
  perform public.join_campaign(lower(substr(c.code, 1, 3)) || '-' || substr(c.code, 4), 'Jo');
  select count(*) into n from public.character_sheets where user_id = u1; assert n = 1, 'member reads the campaign sheet';
  update public.character_sheets set data = '{"updated": 99}' where user_id = u1;
  get diagnostics n = row_count; assert n = 0, 'member cannot edit a friend''s sheet';
  begin
    perform public.set_character_campaign('c1', null);
    raise exception 'FAIL: removed a friend''s character';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  insert into public.character_sheets (id, data) values ('j1', '{"updated": 1}');
  perform public.set_character_campaign('j1', c.id);

  -- u3 makes another campaign; u2 can't add to it or read it
  perform set_config('request.jwt.claims', json_build_object('sub', u3, 'role', 'authenticated')::text, true);
  c2 := public.create_campaign('Saltmarsh', 'Alex');
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  begin
    perform public.set_character_campaign('j1', c2.id);
    raise exception 'FAIL: added to a campaign not in';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  select count(*) into n from public.campaign_members where campaign_id = c2.id; assert n = 0, 'cannot read another campaign''s members';
  begin
    insert into public.campaign_members (campaign_id, user_id) values (c2.id, u2);
    raise exception 'FAIL: joined by a plain insert';
  exception when insufficient_privilege then null; end;

  -- u1: still in the campaign; rename; new code
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  select campaign_id is not distinct from c.id into ok from public.character_sheets where user_id = u1 and id = 'c1';
  assert ok, 'a friend could not take my character out';
  perform public.rename_campaign(c.id, 'Iron Hills 2');
  old := c.code;
  c := public.new_campaign_code(c.id);
  assert c.code <> old and c.name = 'Iron Hills 2', 'rename and new code';

  -- u1 leaves: their character leaves too; the campaign stays (u2 is in it)
  perform public.leave_campaign(c.id);
  select campaign_id is null into ok from public.character_sheets where user_id = u1 and id = 'c1';
  assert ok, 'leaving clears my characters';
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  select count(*) into n from public.character_sheets where user_id = u1; assert n = 0, 'left player''s sheets are hidden';
  select count(*) into n from public.campaign_members where campaign_id = c.id; assert n = 1, 'campaign stays with one member';

  -- limits: 12 members per campaign (u3 + 11 extras would be 12; one more fails)
  foreach x in array extra loop
    perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
    perform public.join_campaign(c2.code, 'x');
  end loop;
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  begin
    perform public.join_campaign(c2.code, 'Jo');
    raise exception 'FAIL: 13th member joined';
  exception when others then if sqlerrm <> 'This campaign is full (12)' then raise; end if; end;
  -- limits: 10 campaigns per account (u2 is in 1)
  for i in 1..9 loop perform public.create_campaign('C' || i, 'Jo'); end loop;
  begin
    perform public.create_campaign('C10', 'Jo');
    raise exception 'FAIL: 11th campaign';
  exception when others then if sqlerrm <> 'Campaign limit reached (10)' then raise; end if; end;

  -- u2 deletes their account: every campaign they were last in is gone
  perform public.delete_my_account();
  reset role;
  select count(*) into n from public.campaigns where id = c.id; assert n = 0, 'last member out deletes the campaign';
  select count(*) into n from public.campaigns where name like 'C_' ; assert n = 0, 'account delete cleans up campaigns';
  select count(*) into n from public.campaigns where id = c2.id; assert n = 1, 'other campaigns stay';

  raise exception 'ALL CAMPAIGN CHECKS PASSED';
end $$;
```

If `set local role` or the `auth.users` insert is refused, fix the check block (not the migration) so it can act as the fake users, and rerun. If a check fails, fix the migration with a follow-up migration (`campaigns_fix_<what>`), never by editing the applied one, and rerun.

- [ ] **Step 4: Security advisor** — `get_advisors` with type `security`. Expected: no new warnings about `campaigns`, `campaign_members` or the new functions. (`is_campaign_member` being `security definer` and executable by `authenticated` is intended; if the advisor flags it, note it in the commit message and move on.)

- [ ] **Step 5: Record and push**

There's no migrations folder in the repo; the SQL lives in the plan and in Supabase's migration history. Add one line to `TRACKER.md` under "📋 Campaigns" — `- [x] Database: campaigns, members, read rule, functions (migration \`campaigns\`)` — then:

```bash
git pull --rebase origin main
git add TRACKER.md
git commit -m "Character Sheet campaigns: database (migration campaigns)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin main
```

---

### Task 2: Pure campaign logic in sheet.js

**Goal:** `sheet.js` exports tested helpers for codes, REST paths, the refresh diff/merge and the menu's campaign sections.

**Files:**
- Modify: `character-sheet/sheet.js` (new section before `const api = {`, and the `api` object)
- Test: `character-sheet/tests/sheet.test.js` (append)

**Acceptance Criteria:**
- [ ] `formatCode`, `parseCode`, `ownRowsPath`, `CAMPAIGN_INDEX_PATH`, `campaignCharsPath`, `campaignKey`, `campaignDiff`, `campaignMerge`, `campaignView` are exported.
- [ ] The five new tests pass and every existing test still passes.

**Verify:** `npm test` (repo root) → `ℹ fail 0` in the Node summary and Chong Die's suites pass

**Steps:**

- [ ] **Step 1: Write the failing tests** — append to `character-sheet/tests/sheet.test.js`:

```js
test('campaign codes: six characters with no look-alikes, shown with a dash', () => {
  assert.strictEqual(S.formatCode('K7Q3MD'), 'K7Q-3MD');
  assert.strictEqual(S.parseCode('k7q-3md'), 'K7Q3MD');
  assert.strictEqual(S.parseCode(' K7Q 3MD '), 'K7Q3MD');
  assert.strictEqual(S.parseCode('K7Q3M'), null);
  assert.strictEqual(S.parseCode('K7Q3M0'), null, '0 is a look-alike');
  assert.strictEqual(S.parseCode(null), null);
});

test('REST paths: only your own characters; the campaign index; downloads by id', () => {
  assert.strictEqual(S.ownRowsPath('u-1'), 'character_sheets?select=id,data&user_id=eq.u-1');
  assert.strictEqual(S.CAMPAIGN_INDEX_PATH, 'character_sheets?select=id,user_id,campaign_id,updated_at&campaign_id=not.is.null');
  assert.strictEqual(S.campaignCharsPath(['u2/a', 'u3/b', 'u4/a']),
    'character_sheets?select=id,user_id,data&campaign_id=not.is.null&id=in.(a,b)');
  assert.strictEqual(S.campaignKey('u2', 'a'), 'u2/a');
});

const row = (user_id, id, campaign_id, updated_at) => ({ user_id, id, campaign_id, updated_at });
const cachedChars = () => ({
  'u2/a': { id: 'a', owner: 'u2', campaign: 'c1', updated: 't1', data: { name: 'Ilsa' } },
  'u3/b': { id: 'b', owner: 'u3', campaign: 'c1', updated: 't1', data: { name: 'Pockets' } },
  'u4/z': { id: 'z', owner: 'u4', campaign: 'c1', updated: 't1', data: { name: 'Gone' } },
});

test('campaign refresh: download only new or edited characters', () => {
  const cache = { campaigns: [], own: {}, chars: cachedChars() };
  const index = [row('me', 'm', 'c1', 't0'), row('u2', 'a', 'c1', 't1'), row('u3', 'b', 'c1', 't2'), row('u5', 'n', 'c2', 't1')];
  assert.deepStrictEqual(S.campaignDiff(cache, index, 'me'), { fetch: ['u3/b', 'u5/n'], gone: ['u4/z'] });
  assert.deepStrictEqual(S.campaignDiff(null, [row('u2', 'a', 'c1', 't1')], 'me'), { fetch: ['u2/a'], gone: [] });
});

test('campaign refresh: merge keeps unchanged copies, takes downloads, drops the gone, learns your own', () => {
  const cache = { campaigns: [], own: { old: 'c9' }, chars: cachedChars() };
  const campaigns = [{ id: 'c1', name: 'Iron Hills', code: 'K7Q3MD', campaign_members: [] }];
  const index = [row('me', 'm', 'c1', 't0'), row('u2', 'a', 'c2', 't1'), row('u3', 'b', 'c1', 't2'), row('u5', 'n', 'c2', 't1')];
  const fetched = [{ id: 'b', user_id: 'u3', data: { name: 'Pockets 2' } }, { id: 'n', user_id: 'u5', data: { name: 'New' } }];
  const m = S.campaignMerge(cache, campaigns, index, fetched, 'me');
  assert.strictEqual(m.campaigns, campaigns);
  assert.deepStrictEqual(m.own, { m: 'c1' });
  assert.deepStrictEqual(Object.keys(m.chars).sort(), ['u2/a', 'u3/b', 'u5/n']);
  assert.deepStrictEqual(m.chars['u2/a'], { id: 'a', owner: 'u2', campaign: 'c2', updated: 't1', data: { name: 'Ilsa' } }, 'moved campaign without an edit');
  assert.deepStrictEqual(m.chars['u3/b'], { id: 'b', owner: 'u3', campaign: 'c1', updated: 't2', data: { name: 'Pockets 2' } });
  assert.deepStrictEqual(m.chars['u5/n'], { id: 'n', owner: 'u5', campaign: 'c2', updated: 't1', data: { name: 'New' } });
  const missing = S.campaignMerge(null, [], [row('u6', 'q', 'c1', 't1')], [], 'me');
  assert.deepStrictEqual(missing.chars, {}, 'not downloaded yet: left for the next refresh');
});

test('campaign sections: by name; your cards first (this browser\'s copy), then friends by last edit', () => {
  const brakka = { ...S.blank('Brakka'), id: 'm', owner: 'me' };
  const local = { m: brakka, w: { ...S.blank('Wren'), id: 'w', owner: 'me' }, x: { ...S.blank('Theirs'), id: 'x', owner: 'other' } };
  const cache = {
    campaigns: [
      { id: 'c2', name: 'Saltmarsh', code: 'ABCDEF', campaign_members: [{ user_id: 'me', name: 'Sam' }] },
      { id: 'c1', name: 'Iron Hills', code: 'K7Q3MD', campaign_members: [{ user_id: 'me', name: 'Sam' }, { user_id: 'u2', name: 'Jo' }, { user_id: 'u3', name: 'Alex' }] },
    ],
    own: { m: 'c1', x: 'c1' },
    chars: {
      'u2/a': { id: 'a', owner: 'u2', campaign: 'c1', updated: 't1', data: { ...S.blank('Ilsa'), updated: 100 } },
      'u3/b': { id: 'b', owner: 'u3', campaign: 'c1', updated: 't2', data: { ...S.blank('Pockets'), updated: 200 } },
    },
  };
  const v = S.campaignView(cache, local, 'me');
  assert.deepStrictEqual(v.map((x) => x.name), ['Iron Hills', 'Saltmarsh']);
  const [iron, salt] = v;
  assert.deepStrictEqual([iron.id, iron.code, iron.players], ['c1', 'K7Q3MD', 3]);
  assert.deepStrictEqual(iron.cards.map((k) => [k.key, k.mine, k.player, k.char.name]),
    [['me/m', true, '', 'Brakka'], ['u3/b', false, 'Alex', 'Pockets'], ['u2/a', false, 'Jo', 'Ilsa']]);
  assert.strictEqual(iron.cards[0].char, brakka, 'your own card is your local copy');
  assert.strictEqual(iron.cards[1].char.id, 'b', 'a friend\'s character keeps its id');
  assert.strictEqual(iron.cards[1].updated, 't2');
  assert.deepStrictEqual(salt.cards, []);
  assert.deepStrictEqual(S.campaignView(null, local, 'me'), []);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test character-sheet/tests` (repo root)
Expected: the five new tests FAIL with `S.formatCode is not a function` (and similar).

- [ ] **Step 3: Implement** — in `character-sheet/sheet.js`, insert before `const api = {`:

```js
  // --- Campaigns ---------------------------------------------------------------------------
  // Players of one campaign see each other's characters (cloud.js reads them, campaigns.js draws
  // them). A campaign's join code: 6 characters without look-alikes (no 0 / O, 1 / I), shown K7Q-3MD.
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function parseCode(text) {
    const c = str(text).toUpperCase().replace(/[\s-]+/g, '');
    return c.length === 6 && [...c].every((ch) => CODE_CHARS.includes(ch)) ? c : null;
  }
  const formatCode = (code) => { const c = str(code); return c.length === 6 ? `${c.slice(0, 3)}-${c.slice(3)}` : c; };
  // REST paths. Campaign members can read each other's rows, so your own list must ask for your
  // own rows only, or friends' characters would merge into yours.
  const ownRowsPath = (user) => `character_sheets?select=id,data&user_id=eq.${encodeURIComponent(user)}`;
  const CAMPAIGN_INDEX_PATH = 'character_sheets?select=id,user_id,campaign_id,updated_at&campaign_id=not.is.null';
  const campaignKey = (owner, id) => `${owner}/${id}`;
  function campaignCharsPath(keys) {
    const ids = [...new Set(keys.map((k) => k.slice(k.indexOf('/') + 1)))];
    return `character_sheets?select=id,user_id,data&campaign_id=not.is.null&id=in.(${ids.map(encodeURIComponent).join(',')})`;
  }
  // The campaign cache (per account): { campaigns: [{ id, name, code, campaign_members: [{ user_id,
  // name }] }], chars: { 'owner/id': { id, owner, campaign, updated, data } }, own: { id: campaign } }.
  // One refresh reads the index (every campaign character's id, owner, campaign and server edit
  // time, [{ id, user_id, campaign_id, updated_at }]), then downloads only friends' characters that
  // are new or edited (`fetch`); cached ones no longer in the index are `gone`.
  function campaignDiff(cache, index, me) {
    const chars = (cache && cache.chars) || {};
    const fetch = [];
    const seen = new Set();
    for (const r of index || []) {
      if (r.user_id === me) continue;
      const key = campaignKey(r.user_id, r.id);
      seen.add(key);
      const c = chars[key];
      if (!c || !c.data || c.updated !== r.updated_at) fetch.push(key);
    }
    return { fetch, gone: Object.keys(chars).filter((k) => !seen.has(k)) };
  }
  // The new cache after a refresh: `fetched` is the downloaded rows ([{ id, user_id, data }]).
  function campaignMerge(cache, campaigns, index, fetched, me) {
    const old = (cache && cache.chars) || {};
    const got = new Map((fetched || []).map((r) => [campaignKey(r.user_id, r.id), r.data]));
    const chars = {};
    const own = {};
    for (const r of index || []) {
      if (r.user_id === me) { own[r.id] = r.campaign_id; continue; }
      const key = campaignKey(r.user_id, r.id);
      const fresh = got.has(key);
      const data = fresh ? got.get(key) : old[key] && old[key].data;
      if (!data) continue; // not downloaded yet: the next refresh asks again
      chars[key] = { id: r.id, owner: r.user_id, campaign: r.campaign_id, updated: fresh ? r.updated_at : old[key].updated, data };
    }
    return { campaigns: campaigns || [], chars, own };
  }
  // The Characters menu's campaign sections, by name. Each card: { key, mine, player, updated,
  // char }. Your own cards come first and are this browser's copy (the freshest); friends' follow,
  // most recently edited first.
  function campaignView(cache, local, me) {
    const c = cache || {};
    const own = c.own || {};
    return (c.campaigns || []).slice().sort((a, b) => str(a.name).localeCompare(str(b.name))).map((camp) => {
      const members = camp.campaign_members || [];
      const player = (u) => (members.find((m) => m.user_id === u) || {}).name || 'Player';
      const mine = Object.values(local || {})
        .filter((ch) => own[ch.id] === camp.id && (!ch.owner || ch.owner === me))
        .map((ch) => ({ key: campaignKey(me, ch.id), mine: true, player: '', updated: '', char: ch }));
      const theirs = Object.entries(c.chars || {})
        .filter(([, x]) => x.campaign === camp.id)
        .map(([key, x]) => ({ key, mine: false, player: player(x.owner), updated: x.updated, char: normalize({ ...x.data, id: x.id }) }))
        .sort((a, b) => (b.char.updated || 0) - (a.char.updated || 0));
      return { id: camp.id, name: str(camp.name), code: str(camp.code), players: members.length, cards: [...mine, ...theirs] };
    });
  }
```

And extend the `api` object's last line:

```js
    loadAll, saveAll, exportJson, importJson, mergeChars, content,
    formatCode, parseCode, ownRowsPath, CAMPAIGN_INDEX_PATH, campaignCharsPath, campaignKey, campaignDiff, campaignMerge, campaignView,
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `node --test character-sheet/tests`
Expected: all pass (`ℹ fail 0`).

- [ ] **Step 5: Commit**

```bash
npm test
git pull --rebase origin main
git add character-sheet/sheet.js character-sheet/tests/sheet.test.js
git commit -m "Character Sheet campaigns: codes, refresh diff and sections (sheet.js, tested)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin main
```

---

### Task 3: cloud.js — own rows only, campaign calls, campaign cache

**Goal:** `Cloud.list()` reads only your own rows, and `Cloud` has the campaign REST/RPC calls and a per-account campaign cache.

**Files:**
- Modify: `character-sheet/cloud.js` (header comment; `deleteAccount`; `list`; new methods after `flushDeletes`)

**Acceptance Criteria:**
- [ ] `Cloud.list()` requests `Sheet.ownRowsPath(Cloud.userId)`.
- [ ] `Cloud.campaigns`, `campaignIndex`, `campaignChars`, `createCampaign`, `joinCampaign`, `leaveCampaign`, `renameCampaign`, `newCode`, `setCampaign`, `campaignCache`, `setCampaignCache` exist.
- [ ] `deleteAccount` clears `chongkit.campaigns.<user>`.
- [ ] `node --check character-sheet/cloud.js` passes; `npm test` passes.

**Verify:** `node --check character-sheet/cloud.js && npm test` → no syntax error, `ℹ fail 0`

**Steps:**

- [ ] **Step 1: Header comment** — replace the `// Data: one row per character …` lines (3 lines) with:

```js
// Data: one row per character in `character_sheets` (user_id, id, data, updated_at, campaign_id);
// row-level security lets each account write only its own rows, and read its own plus those in
// campaigns it's a member of (so `list` asks for its own rows only). Campaign changes go through
// database functions (rpc/*). The database also refuses characters over 256 KB, more than 50 per
// account, and older versions over newer ones.
```

- [ ] **Step 2: `list()` reads only your own rows** — replace

```js
    async list() { return (await rest('GET', 'character_sheets?select=id,data')) || []; },
```

with

```js
    // Your own characters only: campaign members can read each other's rows too.
    async list() { return (await rest('GET', window.Sheet.ownRowsPath(Cloud.userId))) || []; },
```

- [ ] **Step 3: `deleteAccount` clears the campaign cache** — in `deleteAccount`, after `put(userKey('deletes'), null);` add:

```js
      put(userKey('campaigns'), null);
```

- [ ] **Step 4: Campaign calls** — after the `flushDeletes` method (before the closing `};` of `const Cloud`), add:

```js

    // --- Campaigns (campaigns.js; the diff and merge are Sheet.campaignDiff / campaignMerge) ---
    async campaigns() { return (await rest('GET', 'campaigns?select=id,name,code,campaign_members(user_id,name)')) || []; },
    async campaignIndex() { return (await rest('GET', window.Sheet.CAMPAIGN_INDEX_PATH)) || []; },
    async campaignChars(keys) { return keys.length ? (await rest('GET', window.Sheet.campaignCharsPath(keys))) || [] : []; },
    createCampaign: (name) => rest('POST', 'rpc/create_campaign', { p_name: name, p_member: Cloud.name() }),
    joinCampaign: (code) => rest('POST', 'rpc/join_campaign', { p_code: code, p_member: Cloud.name() }),
    leaveCampaign: (id) => rest('POST', 'rpc/leave_campaign', { p_campaign: id }),
    renameCampaign: (id, name) => rest('POST', 'rpc/rename_campaign', { p_campaign: id, p_name: name }),
    newCode: (id) => rest('POST', 'rpc/new_campaign_code', { p_campaign: id }),
    // null takes the character out of its campaign. It must be in the account first.
    setCampaign: (charId, campaignId) => rest('POST', 'rpc/set_character_campaign', { p_character: charId, p_campaign: campaignId }),
    // The last refresh, per account, so the cards still show offline.
    campaignCache: () => get(userKey('campaigns')),
    setCampaignCache: (c) => { const k = userKey('campaigns'); if (k) put(k, c); },
```

- [ ] **Step 5: Check and commit**

```bash
node --check character-sheet/cloud.js
npm test
git pull --rebase origin main
git add character-sheet/cloud.js
git commit -m "Character Sheet campaigns: own rows only in list(), campaign calls and cache (cloud.js)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin main
```

---

### Task 4: Campaign sections, picker, viewing mode and refresh (menu.js, campaigns.js, ui.js, notes.js, index.html, sheet.css)

**Goal:** The Characters menu shows "Your characters" and a section per campaign with + Add character, + New campaign and Join with code; a friend's card opens their sheet read-only under a grey band; everything refreshes every 30 s.

**Files:**
- Create: `character-sheet/campaigns.js`
- Modify: `character-sheet/menu.js` (whole file), `character-sheet/ui.js` (several places, listed in the steps), `character-sheet/notes.js:84-85`, `character-sheet/index.html:26-43,48`, `character-sheet/sheet.css` (after the Characters menu block, and `.cs-cards`)

**Acceptance Criteria:**
- [ ] Signed out, the menu shows "Your characters" with the cards as before, then a dashed "Sign in to join a campaign".
- [ ] Signed in, each campaign shows its name, `K7Q-3MD`-style code, "N players", a ⋯ with Copy code / Rename / New code / Leave, its cards, and "+ Add character"; then "+ New campaign" and "Join with code".
- [ ] A friend's card opens their sheet: grey band "<name> — <player>'s character · <campaign>" + "Edited …", Customize hidden, every field and the free box read-only, wound circles disabled, nothing written to `chongkit.sheets`.
- [ ] Your own character in a campaign shows a tag with the campaign name in "Your characters", and its ⋯ has "Remove from campaign".
- [ ] `node --check` passes on every changed script; `npm test` passes.

**Verify:** `for f in campaigns menu ui notes; do node --check character-sheet/$f.js; done && npm test` → no output from the checks, `ℹ fail 0`. (The browser check is Task 5.)

**Steps:**

- [ ] **Step 1: `menu.js` — shared card, headings, tag** — replace the whole file with:

```js
// Character Sheet: the Characters menu. "Your characters": a card per character (its name, its
// filled-in details, the first Current / Max pair and the Armor box, when it was last edited and
// whether it's synced; a tag when it's in a campaign), most recently edited first; click a card to
// open that character. Each card's ⋯ has Copy, Export file, Print, Reset character, Remove from
// campaign (when it's in one) and Delete; + New character starts one. Then the campaigns
// (campaigns.js), which reuse `card`. ui.js hands over its helpers and the actions, and draws this
// into #cards.
(function () {
  const S = window.Sheet;
  window.SheetMenu = function (ui) {
    const { h } = ui;
    let open = null; // the key of the card whose ⋯ menu is open
    document.addEventListener('pointerdown', (ev) => {
      if (open && !ev.target.closest('.cs-cmore, .cs-cpop')) { open = null; ui.renderMenu(); }
    });

    const ACTIONS = [['Copy', 'copy'], ['Export file', 'export'], ['Print', 'print'], ['Reset character', 'reset'], ['Delete', 'delete']];
    const stat = (label, value) => h('div', { class: 'cs-cstat' }, h('b', {}, value || '—'), h('span', {}, label));
    // A card. opts: key (default c.id), open (click), foot (text), who (bold foot), tag (campaign
    // name), current, actions ([label, run, danger]; none = no ⋯).
    function card(c, opts = {}) {
      const key = opts.key || c.id;
      const name = c.name || 'Unnamed';
      const details = c.details.filter((d) => d.value.trim()).map((d) => `${d.label} ${d.value}`.trim()).join(' · ');
      const pair = c.pairs[0];
      const armor = c.boxes.find((b) => /armor/i.test(b.label));
      const stats = [];
      if (pair) stats.push(stat(pair.label || 'Current', pair.cur || pair.max ? `${pair.cur || '—'}/${pair.max || '—'}` : ''));
      if (armor) stats.push(stat(armor.label, armor.value));
      const actions = opts.actions || [];
      const more = actions.length ? h('button', { type: 'button', class: 'cs-cmore', 'aria-label': `More for ${name}`, 'aria-expanded': String(open === key),
        onclick: (ev) => { ev.stopPropagation(); open = open === key ? null : key; ui.renderMenu(); } }, '⋯') : null;
      const pop = more && open === key ? h('div', { class: 'cs-cpop', role: 'menu' }, actions.map(([label, run, danger]) => h('button', {
        type: 'button', role: 'menuitem', class: danger ? 'danger' : null,
        onclick: (ev) => { ev.stopPropagation(); open = null; ui.renderMenu(); run(); },
      }, label))) : null;
      return h('div', {
        class: 'cs-ccard' + (opts.current ? ' current' : ''), role: 'button', tabIndex: 0, 'aria-label': `Open ${name}`,
        onclick: opts.open,
        onkeydown: (ev) => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target === ev.currentTarget) { ev.preventDefault(); opts.open(); } },
      },
      h('div', { class: 'cs-cname' }, name),
      details ? h('div', { class: 'cs-cmeta' }, details) : null,
      stats.length ? h('div', { class: 'cs-cstats' }, stats) : null,
      h('div', { class: 'cs-cfoot' + (opts.who ? ' who' : '') }, opts.foot || '', opts.tag ? h('span', { class: 'cs-ctag' }, opts.tag) : null),
      more, pop);
    }
    function ownCard(c) {
      const camp = ui.campaignOf(c.id);
      const actions = ACTIONS.map(([label, k]) => [label, () => ui.act(k, c), k === 'delete']);
      if (camp) actions.splice(actions.length - 1, 0, ['Remove from campaign', () => ui.act('uncampaign', c)]);
      return card(c, {
        current: c.id === ui.current, open: () => ui.open(c), actions, tag: camp && camp.name,
        foot: `${S.edited(c.updated)} · ${ui.synced(c) ? 'Synced' : 'This browser only'}`,
      });
    }
    function render() {
      const list = Object.values(ui.chars()).sort((a, b) => (b.updated || 0) - (a.updated || 0));
      return [
        h('div', { class: 'cs-msec' }, h('h2', {}, 'Your characters')),
        h('div', { class: 'cs-cards' }, list.map(ownCard), h('button', { type: 'button', class: 'cs-cnew', onclick: () => ui.act('new') }, '+ New character')),
        ...ui.campaignSections(),
      ];
    }
    return { render, card };
  };
})();
```

- [ ] **Step 2: `campaigns.js`** — create `character-sheet/campaigns.js`:

```js
// Character Sheet: campaigns. Players and the GM of one campaign see each other's characters:
// someone makes a campaign and shares its code, the others join with it, and each adds the
// characters they choose (one campaign per character). The Characters menu gets a section per
// campaign, made of the same cards; a friend's opens read-only. No roles: anyone can rename, copy
// the code or make a new one; each player adds and removes only their own characters.
// Refreshes every 30 s while the menu or a friend's sheet is on screen (no Realtime): campaigns,
// then the index, then only the characters that changed (Sheet.campaignDiff / campaignMerge). The
// last copy is kept per account (Cloud.campaignCache). Needs an account. ui.js hands over its
// helpers and draws this into the Characters menu.
(function () {
  const S = window.Sheet;
  const EVERY = 30000;
  const EMPTY = () => ({ campaigns: [], chars: {}, own: {} });
  window.SheetCampaigns = function (ui) {
    const { h } = ui;
    const C = window.Cloud;
    const on = () => !!(C && C.signedIn);
    let cache = (on() && C.campaignCache()) || EMPTY();
    let timer = null;
    let busy = false;
    let active = false;
    let open = null; // the campaign whose ⋯ menu is open
    document.addEventListener('pointerdown', (ev) => {
      if (open && !ev.target.closest('.cs-cmore, .cs-cpop')) { open = null; ui.renderMenu(); }
    });
    if (C) C.onChange(() => { cache = (on() && C.campaignCache()) || EMPTY(); });

    const sections = () => (on() ? S.campaignView(cache, ui.chars(), C.userId) : []);
    function campaignOf(id) {
      const cid = on() && cache.own[id];
      return (cid && cache.campaigns.find((x) => x.id === cid)) || null;
    }

    async function refresh() {
      if (!on() || busy) return;
      busy = true;
      try {
        const campaigns = await C.campaigns();
        const index = await C.campaignIndex();
        const d = S.campaignDiff(cache, index, C.userId);
        const want = new Set(d.fetch);
        const fetched = (await C.campaignChars(d.fetch)).filter((r) => want.has(S.campaignKey(r.user_id, r.id)));
        cache = S.campaignMerge(cache, campaigns, index, fetched, C.userId);
        C.setCampaignCache(cache);
        ui.campaignsChanged();
      } catch {
        if (on()) ui.status('Not synced', true);
      } finally {
        busy = false;
      }
    }
    // On while the menu or a friend's sheet shows; a hidden tab skips its turns.
    function setActive(a) {
      active = !!a && on();
      clearInterval(timer);
      timer = active ? setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, EVERY) : null;
      if (active) refresh();
    }
    document.addEventListener('visibilitychange', () => { if (active && document.visibilityState === 'visible') refresh(); });

    // A campaign change: call the database, then refresh at once. Offline it just fails.
    async function run(fn, done) {
      try { await fn(); await refresh(); if (done) ui.notify(done); } catch (e) { alert(e.message); }
    }
    function remove(c) { return run(() => C.setCampaign(c.id, null)); }

    // A one-field dialog (New campaign, Join, Rename).
    function ask(title, label, value, button, submit) {
      const d = ui.dialog();
      const inp = h('input', { class: 'cs-auth-in', value, required: true, maxLength: 60, 'aria-label': label, spellcheck: false });
      d.show(h('h2', {}, title), h('form', { class: 'cs-auth-form', onsubmit: async (ev) => {
        ev.preventDefault();
        if (!inp.reportValidity()) return;
        d.say('…');
        try { await submit(inp.value.trim()); d.done(); await refresh(); } catch (e) { d.say(e.message, true); }
      } }, h('label', {}, h('span', { class: 'label' }, label), inp), h('button', { type: 'submit', class: 'btn primary' }, button)));
      setTimeout(() => inp.focus(), 0);
    }
    function join(text) {
      const code = S.parseCode(text);
      if (!code) throw new Error('No campaign with that code');
      return C.joinCampaign(code);
    }
    // + Add character: your characters; one already in a campaign is greyed with its name.
    function pick(v) {
      const d = ui.dialog();
      const names = new Map(cache.campaigns.map((x) => [x.id, x.name]));
      const mine = Object.values(ui.chars()).filter((c) => !c.owner || c.owner === C.userId)
        .sort((a, b) => (b.updated || 0) - (a.updated || 0));
      const rows = mine.map((c) => {
        const inCamp = cache.own[c.id];
        const first = c.details.find((x) => x.value.trim());
        const sub = inCamp ? `in ${names.get(inCamp) || 'a campaign'}` : first ? `${first.label} ${first.value}`.trim() : '';
        return h('button', { type: 'button', class: 'cs-pick' + (inCamp ? ' off' : ''), disabled: !!inCamp, onclick: async () => {
          d.say('…');
          try { await ui.upload(c); await C.setCampaign(c.id, v.id); d.done(); await refresh(); } catch (e) { d.say(e.message, true); }
        } }, h('span', {}, c.name || 'Unnamed'), h('span', { class: 'cs-pick-sub' }, sub));
      });
      d.show(h('h2', {}, `Add to ${v.name}`),
        h('div', { class: 'cs-picks' }, rows, h('button', { type: 'button', class: 'cs-pick cancel', onclick: d.done }, 'Cancel')));
    }

    function section(v) {
      const actions = [
        ['Copy code', () => { if (navigator.clipboard) navigator.clipboard.writeText(S.formatCode(v.code)).then(() => ui.notify('Code copied'), () => {}); }],
        ['Rename', () => ask('Rename campaign', 'Name', v.name, 'Save', (name) => C.renameCampaign(v.id, name))],
        ['New code', () => run(() => C.newCode(v.id))],
        ['Leave', () => { if (confirm(`Leave ${v.name}?`)) run(() => C.leaveCampaign(v.id), `Left ${v.name}`); }],
      ];
      const more = h('button', { type: 'button', class: 'cs-cmore', 'aria-label': `More for ${v.name}`, 'aria-expanded': String(open === v.id),
        onclick: (ev) => { ev.stopPropagation(); open = open === v.id ? null : v.id; ui.renderMenu(); } }, '⋯');
      const pop = open === v.id ? h('div', { class: 'cs-cpop', role: 'menu' }, actions.map(([label, fn]) => h('button', {
        type: 'button', role: 'menuitem', class: label === 'Leave' ? 'danger' : null,
        onclick: (ev) => { ev.stopPropagation(); open = null; ui.renderMenu(); fn(); },
      }, label))) : null;
      const cards = v.cards.map((k) => (k.mine
        ? ui.card(k.char, { key: k.key, open: () => ui.open(k.char), foot: 'You', who: true, actions: [['Remove from campaign', () => remove(k.char)]] })
        : ui.card(k.char, { key: k.key, open: () => ui.openFriend(k, v), foot: `${k.player} · ${S.edited(k.char.updated)}`, who: true })));
      return [
        h('div', { class: 'cs-msec' }, h('h2', {}, v.name), h('span', { class: 'cs-code' }, S.formatCode(v.code)),
          h('span', { class: 'cs-msub' }, `${v.players} player${v.players === 1 ? '' : 's'}`), h('span', { class: 'cs-smenu' }, more, pop)),
        h('div', { class: 'cs-cards' }, cards, h('button', { type: 'button', class: 'cs-cnew', onclick: () => pick(v) }, '+ Add character')),
      ];
    }
    function render() {
      if (!C) return [];
      if (!on()) return [h('div', { class: 'cs-crow' }, h('button', { type: 'button', class: 'cs-cnew', onclick: () => ui.openAccount() }, 'Sign in to join a campaign'))];
      return [...sections().flatMap(section), h('div', { class: 'cs-crow' },
        h('button', { type: 'button', class: 'cs-cnew', onclick: () => ask('New campaign', 'Name', '', 'Create', (name) => C.createCampaign(name)) }, '+ New campaign'),
        h('button', { type: 'button', class: 'cs-cnew', onclick: () => ask('Join a campaign', 'Code', '', 'Join', join) }, 'Join with code'))];
    }
    return { render, sections, campaignOf, remove, refresh, setActive };
  };
})();
```

- [ ] **Step 3: `ui.js` — viewing state and guards.** Make these edits:

(a) After `let printing = false; …` (line 18) add:

```js
  // A friend's character from a campaign, open read-only: { key, player, campaign, updated }.
  // While it's open `s` is that character; nothing is saved, synced or undone.
  let viewing = null;
  let syncLater = false; // a sync asked for while viewing runs when you go back
```

(b) First line inside `function commit() {` add `if (viewing) return;`. First line inside `function save() {` add `if (viewing) return;`.

(c) In the `storage` listener, after `if (ev.key !== S.STORE || ev.newValue == null) return;` add `if (viewing) return; // taken in when you go back (stopViewing)`.

(d) First line inside `async function syncAll() {` change `if (!C || !C.signedIn) return;` to:

```js
    if (!C || !C.signedIn) return;
    if (viewing) { syncLater = true; return; }
```

(e) In `function field(…)`, add `readOnly: !!viewing,` to the input's props (after `inputMode: 'text',`), and change `if (opts.step) stepper(…)` to `if (opts.step && !viewing) stepper(inp, (v) => { obj[key] = v; commit(); });`.

(f) In `function wounds()`, add `disabled: !!viewing,` to both the wound button props and the extra-wound button props.

(g) Replace `function toast(label) {` and its first line with a version that can leave out Undo:

```js
  function toast(label, canUndo = true) {
    const t = $('toast');
    t.replaceChildren(...[h('span', {}, label),
      canUndo ? h('button', { type: 'button', class: 'cs-undo', onclick: undo }, icon('undo', 'cs-ic sm'), 'Undo') : null].filter(Boolean));
```

(keep the rest of `toast` as is).

(h) Pass `viewing` to the notes: in the `window.SheetNotes({ … })` call add `get viewing() { return !!viewing; },`.

- [ ] **Step 4: `ui.js` — menu, campaigns, viewing.** Replace the block from `let view = 'sheet';` through `function names() { if (view === 'menu') renderMenu(); }` with:

```js
  let view = 'sheet'; // 'sheet' or 'menu'
  function showView(v) {
    if (v === 'menu') stopViewing();
    view = v;
    if (v === 'menu' && editing) { editing = false; $('edit').setAttribute('aria-pressed', 'false'); $('edit').textContent = 'Customize'; }
    $('menu').hidden = v !== 'menu';
    $('sheetbar').hidden = v === 'menu';
    $('sheet').hidden = v === 'menu';
    viewBand();
    hideToast();
    camps.setActive(v === 'menu' || !!viewing);
    if (v === 'menu') { save(); renderMenu(); } else render(); // save first, so the card shows the last edit
    window.scrollTo(0, 0);
  }
  $('tomenu').addEventListener('click', () => showView('menu'));
  const synced = (c) => !!(C && C.signedIn && (c.owner === C.userId || C.synced().includes(c.id)));
  const menu = window.SheetMenu({
    h, icon, chars: () => all.chars, get current() { return s.id; }, synced,
    open: (c) => show(c), act: (k, c) => act(k, c), renderMenu: () => renderMenu(),
    campaignOf: (id) => camps.campaignOf(id), campaignSections: () => camps.render(),
  });
  const camps = window.SheetCampaigns({
    h, dialog: () => dialog(), status, notify: (t) => toast(t, false), chars: () => all.chars,
    card: (c, o) => menu.card(c, o), open: (c) => show(c), openFriend: (k, v) => openFriend(k, v),
    upload: (c) => upload(c), renderMenu: () => renderMenu(), campaignsChanged: () => campaignsChanged(),
    openAccount: () => openAccount(),
  });
  function renderMenu() { $('cards').replaceChildren(...menu.render()); }
  // Keeps the Characters menu current after a rename, a sync or another tab's save.
  function names() { if (view === 'menu') renderMenu(); }

  // --- A friend's character (campaigns.js) ---------------------------------------------------
  // Drawn like yours, read-only, under a grey band; Customize is hidden.
  function openFriend(k, v) {
    viewing = { key: k.key, player: k.player, campaign: v.name, updated: k.updated };
    s = k.char;
    renaming = null;
    history = [];
    showView('sheet');
  }
  function stopViewing() {
    if (!viewing) return;
    viewing = null;
    s = all.chars[all.current] || Object.values(all.chars)[0];
    adopt(store.getItem(S.STORE)); // what other tabs saved meanwhile
    if (syncLater) { syncLater = false; syncAll(); }
  }
  function viewBand() {
    const b = $('viewband');
    b.hidden = !viewing || view === 'menu';
    $('edit').hidden = !!viewing;
    if (viewing) b.replaceChildren(h('span', {}, `${s.name || 'Unnamed'} — ${viewing.player}'s character · ${viewing.campaign}`),
      h('span', { class: 'cs-vwhen' }, S.edited(s.updated)));
  }
  // After a campaign refresh: redraw the menu, or the friend's sheet if it changed (back to the
  // menu if it left the campaign).
  function campaignsChanged() {
    if (view === 'menu') { renderMenu(); return; }
    if (!viewing) return;
    let found = null;
    for (const v of camps.sections()) {
      const k = v.cards.find((x) => x.key === viewing.key);
      if (k) { found = { k, v }; break; }
    }
    if (!found) { showView('menu'); return; }
    if (found.k.updated !== viewing.updated) {
      const tab = s.tab;
      s = found.k.char;
      if (s.tabs.some((t) => t.id === tab)) s.tab = tab;
      viewing = { ...viewing, updated: found.k.updated, campaign: found.v.name };
      render();
    }
    viewBand();
  }
  // A character has to be in the account before it can join a campaign.
  async function upload(c) {
    save();
    if (synced(c) && !dirty.has(c.id)) return;
    c.owner = C.userId;
    await C.push([c]);
    dirty.delete(c.id);
    C.setSynced([...C.synced(), c.id]);
    S.saveAll(store, all);
  }
```

- [ ] **Step 5: `ui.js` — the rest of the wiring.**

(a) In `function act(key, c)`, before `else if (key === 'delete') removeChar(c);` add `else if (key === 'uncampaign') camps.remove(c);`.

(b) In `function dialog(msg)`, change the returned object to include `done`:

```js
    return { close, note, say, done: () => dlg.close(), show: (...body) => { dlg.replaceChildren(close, ...body.filter(Boolean), note); if (!dlg.open) dlg.showModal(); } };
```

(c) In `function leaveAccount(removeHere)`, first line inside `if (removeHere) {` add `C.setCampaignCache(null);`.

(d) In the `C.onChange((session, why) => { … })` callback, after the `if (why === 'expired') …` line add:

```js
      // Signed out while looking at a friend's character: back to the menu. Signed in or out with
      // the menu open: its campaigns follow.
      if (!C.signedIn && viewing) showView('menu');
      else if (view === 'menu') { camps.setActive(true); renderMenu(); }
```

(e) Update the file's header comment: after the first sentence add ` A friend's character from a campaign (campaigns.js) opens read-only ("viewing"): nothing is saved.`

- [ ] **Step 6: `notes.js` — the free box is read-only while viewing.** In `freeBox`, change the textarea props to add `readOnly: !!ui.viewing,`:

```js
        : h('textarea', { class: 'cs-free', value: box.text, 'aria-label': box.title || 'Notes', spellcheck: true, readOnly: !!ui.viewing,
          oninput: (ev) => { box.text = ev.target.value; commit(); } });
```

and change its comment to `// The free box: plain text, typed straight in at any time (playing or in Customize; not a friend's).`

- [ ] **Step 7: `index.html`.** After the `#sheetbar` div's closing `</div>` and before `<div id="sheet" class="cs"></div>` add:

```html
  <div id="viewband" class="cs-viewband" hidden></div>
```

Change `<div id="cards" class="cs-cards"></div>` to `<div id="cards" class="cs-menu"></div>`, change the menu comment to `<!-- The Characters menu: your characters, the campaigns, and everything that isn't the sheet itself. -->`, and add `<script src="campaigns.js"></script>` between `menu.js` and `ui.js`.

- [ ] **Step 8: `sheet.css`.** After the `.cs-cnew:hover { … }` rule add:

```css
/* Campaigns: the menu's sections (yours, then one per campaign), the picker, the band over a friend's sheet */
.cs-msec { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px 12px; margin: 26px 0 12px; padding-bottom: 6px; border-bottom: 2px solid var(--frame); }
.cs-menu > .cs-msec:first-child { margin-top: 4px; }
.cs-msec h2 { margin: 0; font: 800 24px var(--body); overflow-wrap: anywhere; }
.cs-code { padding: 1px 8px; background: var(--band); color: var(--band-t); font: 700 15px var(--body); letter-spacing: .08em; }
.cs-msub { color: var(--muted); font-weight: 600; }
.cs-smenu { position: relative; margin-left: auto; align-self: center; }
.cs-smenu .cs-cmore { position: static; display: block; }
.cs-smenu .cs-cpop { top: 38px; right: 0; }
.cs-cfoot.who { font-style: normal; font-weight: 700; color: var(--ink-soft); }
.cs-ctag { display: inline-block; margin-left: 6px; padding: 0 6px; border: 1px solid var(--rule); background: var(--bar); color: var(--ink-soft); font: normal 700 12px var(--body); }
.cs-crow { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 26px; }
.cs-crow .cs-cnew { flex: 1 1 250px; min-height: 64px; }
.cs-picks { display: flex; flex-direction: column; gap: 8px; }
.cs-pick { display: flex; justify-content: space-between; gap: 10px; padding: 9px 12px; border: 1.5px solid var(--frame); background: #fff; font: 700 17px var(--body); color: var(--ink); text-align: left; cursor: pointer; }
.cs-pick:hover { background: var(--bar); }
.cs-pick-sub { color: var(--muted); font-weight: 600; }
.cs-pick.off { border-style: dashed; background: transparent; color: var(--muted); cursor: default; }
.cs-pick.cancel { justify-content: center; border-style: dashed; background: transparent; color: var(--muted); }
.cs-viewband { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; margin: 0 0 12px; padding: 7px 14px; background: var(--band); color: var(--band-t); font: 700 17px var(--body); }
.cs-vwhen { margin-left: auto; font-weight: 500; font-style: italic; }
.cs-in[readonly], .cs-free[readonly] { cursor: default; }
.cs-w:disabled { cursor: default; }
```

(`.cs-cards` stays as is: each section has its own `.cs-cards` grid now.)

- [ ] **Step 9: Check and commit**

```bash
for f in campaigns menu ui notes; do node --check character-sheet/$f.js; done
npm test
git pull --rebase origin main
git add character-sheet/campaigns.js character-sheet/menu.js character-sheet/ui.js character-sheet/notes.js character-sheet/index.html character-sheet/sheet.css
git commit -m "Character Sheet campaigns: sections in the Characters menu, add a character, friends' sheets read-only

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin main
```

---

### Task 5: Browser check with made-up campaign data

**Goal:** The campaign UI works in the local preview against a stubbed `Cloud` (no real accounts), shown with screenshots.

**Files:**
- Create: `<scratchpad>/campaign-stub.js` (not in the repo)
- Modify: whatever Tasks 2–4 files a found bug lives in

**Acceptance Criteria:**
- [ ] Signed out: "Your characters" then "Sign in to join a campaign"; no console errors.
- [ ] With the stub: "Iron Hills" section with code `K7Q-3MD`, "3 players", cards Ilsa Venn (Jo) and Pockets (Alex); "+ New campaign" and "Join with code".
- [ ] + Add character → picker "Add to Iron Hills" → picking your character adds it: it shows in Iron Hills with foot "You" and in Your characters with the "Iron Hills" tag.
- [ ] Opening Ilsa Venn: band "Ilsa Venn — Jo's character · Iron Hills", Customize hidden, inputs `readOnly`, `localStorage['chongkit.sheets']` has no character named Ilsa Venn.
- [ ] Join with code "zzz-zzz" shows "No campaign with that code" in the dialog.
- [ ] Phone width (375 px): sections wrap, no horizontal scroll.

**Verify:** screenshots of the menu, the picker and the viewing band, plus `read_console_messages` with `onlyErrors: true` → no errors

**Steps:**

- [ ] **Step 1: Start the preview** — `preview_start` with name `chongkit-pages`, then `navigate` to `http://localhost:8000/character-sheet/`. Click ☰ Characters. Check: "Your characters", the cards, then "Sign in to join a campaign". `read_console_messages` (`onlyErrors: true`) → none.

- [ ] **Step 2: Write the stub** — `<scratchpad>/campaign-stub.js` (run its contents with `javascript_tool`). It fakes a signed-in account and Supabase in memory; nothing leaves the browser:

```js
(() => {
  const C = window.Cloud;
  const me = 'me-test';
  const def = (k, v) => Object.defineProperty(C, k, { get: () => v, configurable: true });
  def('signedIn', true); def('userId', me); def('user', { id: me, email: 'sam@example.test' });
  C.name = () => 'Sam';
  const blank = (name, extra) => ({ ...Sheet.blank(name), ...extra });
  const ilsa = blank('Ilsa Venn', { id: 'a', updated: Date.now() - 60000 });
  ilsa.details[0].value = 'd6'; ilsa.details[1].value = '3'; ilsa.pairs[0].cur = '9'; ilsa.pairs[0].max = '18';
  const pockets = blank('Pockets', { id: 'b', updated: Date.now() - 1200000 });
  const db = {
    campaigns: [{ id: 'c1', name: 'Iron Hills', code: 'K7Q3MD', campaign_members: [{ user_id: me, name: 'Sam' }, { user_id: 'u2', name: 'Jo' }, { user_id: 'u3', name: 'Alex' }] }],
    rows: [{ id: 'a', user_id: 'u2', campaign_id: 'c1', updated_at: 't1', data: ilsa }, { id: 'b', user_id: 'u3', campaign_id: 'c1', updated_at: 't1', data: pockets }],
  };
  let cache = null;
  C.list = async () => db.rows.filter((r) => r.user_id === me).map((r) => ({ id: r.id, data: r.data }));
  C.push = async (chars) => chars.forEach((c) => {
    const r = db.rows.find((x) => x.user_id === me && x.id === c.id);
    if (r) { r.data = c; r.updated_at = String(Date.now()); } else db.rows.push({ id: c.id, user_id: me, campaign_id: null, updated_at: String(Date.now()), data: c });
  });
  C.flushDeletes = async () => {}; C.pendingDeletes = () => []; C.synced = () => db.rows.filter((r) => r.user_id === me).map((r) => r.id); C.setSynced = () => {};
  C.campaigns = async () => db.campaigns;
  C.campaignIndex = async () => db.rows.filter((r) => r.campaign_id).map(({ id, user_id, campaign_id, updated_at }) => ({ id, user_id, campaign_id, updated_at }));
  C.campaignChars = async (keys) => db.rows.filter((r) => keys.includes(`${r.user_id}/${r.id}`));
  C.setCampaign = async (id, camp) => { const r = db.rows.find((x) => x.user_id === me && x.id === id); if (!r) throw new Error('Sync this character first'); r.campaign_id = camp; };
  C.joinCampaign = async () => { throw new Error('No campaign with that code'); };
  C.createCampaign = async (name) => { db.campaigns.push({ id: 'c' + (db.campaigns.length + 1), name, code: 'ABCDEF', campaign_members: [{ user_id: me, name: 'Sam' }] }); };
  C.leaveCampaign = async (id) => { db.campaigns = db.campaigns.filter((x) => x.id !== id); db.rows.forEach((r) => { if (r.user_id === me && r.campaign_id === id) r.campaign_id = null; }); };
  C.renameCampaign = async (id, name) => { db.campaigns.find((x) => x.id === id).name = name; };
  C.newCode = async (id) => { db.campaigns.find((x) => x.id === id).code = 'NEWCQD'; };
  C.campaignCache = () => cache; C.setCampaignCache = (c) => { cache = c; };
  window.__campaignDb = db;
  document.getElementById('tomenu').click(); // open the menu: showView('menu') → camps.setActive(true) → refresh from the stub
})();
```

Run it from the **sheet** view (after Step 1, click any card to get back to the sheet first), so the stub's ☰ Characters click opens the menu and starts the refresh.

- [ ] **Step 3: Walk the acceptance criteria** — screenshot the menu (Iron Hills section, code chip, "3 players", Ilsa Venn / Pockets with "Jo · Edited 1 min ago" / "Alex · Edited 20 min ago"). Click "+ Add character" → screenshot the picker → click your character → check it appears in Iron Hills ("You") and in Your characters with the "Iron Hills" tag. Click Ilsa Venn → screenshot the band; `javascript_tool`: `[document.querySelector('.cs-name').readOnly, document.getElementById('edit').hidden, JSON.parse(localStorage.getItem('chongkit.sheets')).chars && Object.values(JSON.parse(localStorage.getItem('chongkit.sheets')).chars).some((c) => c.name === 'Ilsa Venn')]` → `[true, true, false]`. Back to the menu, Join with code → type `zzz-zzz` → "No campaign with that code" in the dialog. Try the section ⋯ (Rename to "Iron Hills 2" → heading changes; Leave → confirm → section gone, toast "Left Iron Hills 2" without Undo). `resize_window` preset `mobile` → screenshot, check `document.documentElement.scrollWidth <= innerWidth`; then preset `desktop`.

- [ ] **Step 4: Fix and recheck** — any failure: fix the source file, reload, rerun the stub, recheck. Then `npm test`, and commit the fixes:

```bash
git pull --rebase origin main
git add character-sheet/
git commit -m "Character Sheet campaigns: fixes from the browser check

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin main
```

(Skip the commit if nothing needed fixing.) Clear the test state afterwards: `javascript_tool`: `localStorage.removeItem('chongkit.sheets')` only if the stub run left test characters you created; otherwise leave it.

---

### Task 6: Docs, tracker, final check

**Goal:** CLAUDE.md, README.md and TRACKER.md describe campaigns; everything is tested and pushed.

**Files:**
- Modify: `CLAUDE.md` (Character Sheet section items 6–7, a new item 8, Layout), `README.md` (Character Sheet section), `TRACKER.md` (Campaigns block)

**Acceptance Criteria:**
- [ ] CLAUDE.md Character Sheet section has a Campaigns item (tables, functions, own-rows `list()`, cache key, viewing mode, no Realtime), security rules mention membership reads and the `campaign_id` column privilege, and Layout lists `campaigns.js`.
- [ ] README explains creating a campaign, joining with a code, adding a character and viewing a friend's sheet.
- [ ] TRACKER.md marks Campaigns ✅ done, with the two-account check at the table left as an open item.
- [ ] `npm test` passes; `git status` clean after the push.

**Verify:** `npm test && git status -s` → `ℹ fail 0`, no output from status

**Steps:**

- [ ] **Step 1: CLAUDE.md.** In the Character Sheet section:
  - Item 6 (Accounts): after "syncs characters to `public.character_sheets` (`user_id`, `id`, `data` jsonb, `updated_at`; RLS: own rows only)" change the parenthesis to `(\`user_id\`, \`id\`, \`data\` jsonb, \`updated_at\`, \`campaign_id\`; RLS: write own rows, read own rows and those in your campaigns)` and add the sentence: `` `Cloud.list()` asks for your own rows only (`Sheet.ownRowsPath`): without that, campaign friends' characters would merge into yours. ``
  - Item 7 (Security rules): append: `Campaign members can read each other's characters, never write them; \`authenticated\` has no INSERT/UPDATE on \`campaign_id\` (only \`set_character_campaign\`, \`leave_campaign\` and \`delete_my_account\` change it); every campaign change is a \`security definer\` function acting only as the caller; a wrong join code always says "No campaign with that code".`
  - New item 8:

```markdown
8. **Campaigns** (`campaigns.js`, browser global `SheetCampaigns`): players of a campaign see each
   other's characters. Tables `campaigns` (name, 6-character `code`) and `campaign_members` (with a
   display `name`); `character_sheets.campaign_id`. Functions: `create_campaign`, `join_campaign`,
   `leave_campaign` (the last member out deletes it), `rename_campaign`, `new_campaign_code`,
   `set_character_campaign` (own characters only, a campaign you're in). No roles; several campaigns
   per account (10), 12 members each, one campaign per character. The Characters menu has "Your
   characters" then a section per campaign (`menu.js` shares its `card`); a friend's card opens their
   sheet read-only (`ui.js` "viewing": nothing saved, synced or undone). No Realtime: it refreshes every
   30 s while the menu or a friend's sheet shows (`Sheet.campaignDiff` / `campaignMerge` download only
   what changed); the last copy is in localStorage `chongkit.campaigns.<user>`.
```

  - Layout: under `menu.js` add `  campaigns.js               Draws the campaigns in the Characters menu; refreshes them every 30 s`.

- [ ] **Step 2: README.md.** In the Character Sheet section, after the **Accounts (optional):** paragraph add:

```markdown
**Campaigns (needs an account):** in the Characters menu, **+ New campaign** makes one and shows its
code (like `K7Q-3MD`); everyone else uses **Join with code**. In a campaign, **+ Add character** puts one
of your characters in it (a character is in one campaign at a time; its card's ⋯ → **Remove from
campaign** takes it out). Everyone in the campaign sees its characters as cards and can open them
read-only; they refresh about every 30 seconds. The campaign's ⋯ has Copy code, Rename, New code (the
old code stops working) and Leave. There are no roles: everyone in a campaign is equal.
```

- [ ] **Step 3: TRACKER.md.** Replace the "📋 Campaigns — planned" block with:

```markdown
### ✅ Campaigns — done (spec: `docs/superpowers/specs/2026-10-09-character-sheet-campaigns-design.md`)
- [x] Database: campaigns, members, read rule, functions (migration `campaigns`), checked as fake users
- [x] Create / join a campaign with a code; several per person; no roles; New code; Leave
- [x] Add your own characters to a campaign; members see them in the Characters menu and open them read-only
- [x] Refresh every ~30 s (no Realtime); cache per account; `Cloud.list()` only your own rows
- [ ] Two-account check at the table (one creates, a friend joins and sees the sheet update)
```

(If Task 1 added its own line under the planned block, it's replaced by this block.)

- [ ] **Step 4: Final check and push**

```bash
npm test
git pull --rebase origin main
git add CLAUDE.md README.md TRACKER.md
git commit -m "Character Sheet campaigns: docs and tracker

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin main
git status -s
```

Expected: tests pass, push succeeds, `git status -s` prints nothing.
