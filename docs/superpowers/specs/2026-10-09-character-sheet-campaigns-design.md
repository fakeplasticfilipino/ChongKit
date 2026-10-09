# Character Sheet: Campaigns — design

Date: 2026-10-09. Status: approved in brainstorming, awaiting spec review.

## Goal

Players and the GM of one campaign can see each other's characters. Someone creates a campaign and
shares a short code; the others join with it; each player adds the characters they choose. Everyone
in the campaign sees those characters in their Characters menu and can open them read-only. It
refreshes every ~30 seconds — not real time — and costs nothing beyond the Supabase free plan.

## Decisions

- **Several campaigns per person.** Each character is in at most one campaign at a time.
- **Players pick which characters to share**, from inside the campaign ("+ Add character"), not from
  a "Share" option on the character.
- **No roles.** Everyone in a campaign is equal: anyone can rename it, copy the code or make a new
  code; each player adds or removes only their own characters; anyone can leave; a campaign is
  deleted when its last member leaves. "New code" stops an old code from working.
- **Needs an account.** Signed out, the menu shows "Sign in to join a campaign" instead of the
  campaign buttons.
- **No new screen.** Campaigns are sections of the existing Characters menu, made of the existing
  cards; a friend's character opens in the existing sheet view, read-only.
- **A shared character shows twice:** in "Your characters" (with a small campaign tag) and in its
  campaign's section (its foot says "You").
- **Polling, not Realtime.** No websockets, no CSP change.
- Out of scope: a party overview dashboard, GM powers (kick, delete for everyone, edit others'
  sheets), Realtime, joining while signed out.

## Look (flat v4 sheet look, `sheet.css`)

Characters menu, top to bottom:

1. Toolbar as today (← All tools, Characters, Import, account).
2. **Your characters** — a section heading (bold, a 2 px rule under it), then the cards as today and
   "+ New character". A card in a campaign shows a small grey tag with the campaign's name.
3. **One section per campaign** — heading: the campaign's name, its code in a grey chip
   (`K7Q-3MD`), "N players", and a ⋯ (Copy code, Rename, New code, Leave). Then a card per
   character in the campaign: name, details, first Current / Max pair and Armor, as today; the foot
   shows the player's name and when it was last edited ("Jo · 1 min ago"), or "You". Friends' cards
   have no ⋯. The last tile is a dashed "+ Add character".
4. A row of two dashed buttons: "+ New campaign" and "Join with code". Signed out, this row is
   "Sign in to join a campaign" (opens the sign-in dialog).

"+ Add character" opens a small picker titled "Add to <campaign>": one row per character you own
(name and first detail); a character already in another campaign is greyed with "in <campaign>";
a dashed Cancel row.

Opening a friend's card shows their sheet in the normal sheet view with a grey band on top:
"<character> — <player>'s character · <campaign>" and, on the right, "updated <when>". Customize is
hidden; every field and the free notes box are read-only; ☰ Characters goes back.

UI text is labels only: "+ New campaign", "Join with code", "+ Add character", "Add to <campaign>",
"Copy code", "Rename", "New code", "Leave", "Remove from campaign", "No campaign with that code",
"Sign in to join a campaign", toast "Left <campaign>" (no Undo button).

## Database (Supabase project `chong-nimble-sheet`, migration `campaigns`)

Tables:

- `campaigns`: `id` uuid pk, `name` text (1–60 chars), `code` text unique (6 chars from an
  unambiguous alphabet, no 0/O/1/I), `created_at`.
- `campaign_members`: `campaign_id` → campaigns (cascade), `user_id` → auth.users (cascade),
  `name` text (display name, ≤ 60 chars), `joined_at`; pk (`campaign_id`, `user_id`).
- `character_sheets.campaign_id` uuid null → campaigns (on delete set null). Normal sync never sends
  this column, so an upsert keeps it.

Row-level security:

- `character_sheets` SELECT: own rows, **or** rows whose `campaign_id` is a campaign the caller is a
  member of. INSERT/UPDATE/DELETE: own rows only (unchanged). Signed-in users can't set
  `campaign_id` directly (column privileges: INSERT and UPDATE granted on every column except
  `campaign_id`), so a character can't be pushed into a campaign its owner isn't in.
- `campaigns`, `campaign_members` SELECT: campaigns the caller is a member of, and their members.
  No INSERT/UPDATE/DELETE for `authenticated`; `anon` gets nothing on any of them.
- Membership checks inside policies go through a `security definer` helper
  (`is_campaign_member(campaign_id)`) so the policies don't recurse.

Functions (all `security definer`, `search_path` pinned, act only as `auth.uid()`, callable by
`authenticated` only):

- `create_campaign(name, member_name)` → the new campaign (`id`, `name`, `code`); the caller joins.
- `join_campaign(code, member_name)` → the campaign. Code is normalized (upper case, no dashes or
  spaces). A wrong code always raises the same "No campaign with that code".
- `leave_campaign(campaign_id)` → clears `campaign_id` on the caller's characters in it, removes the
  caller, deletes the campaign if no members remain.
- `rename_campaign(campaign_id, name)`, `new_campaign_code(campaign_id)` → members only.
- `set_character_campaign(character_id, campaign_id | null)` → only the caller's own character, and
  only a campaign the caller is in (null = remove from campaign).
- `delete_my_account()` (existing) also leaves every campaign first (same cleanup as
  `leave_campaign`).

Limits: 10 campaigns per account, 12 members per campaign (raised in the functions).

## Page

- **`campaigns.js`** (new, browser global `SheetCampaigns`, given `ui.js`'s helpers like
  `menu.js`): draws the campaign sections, the campaign ⋯ menu, the "Add to" picker, the New campaign
  (name) and Join (code) dialogs, and the signed-out row.
- **`menu.js`**: "Your characters" heading; campaign tag on cards; card ⋯ gains "Remove from
  campaign" when the character is in one; appends what `campaigns.js` draws.
- **`cloud.js`**:
  - `list()` asks for own rows only: `character_sheets?select=id,data&user_id=eq.<me>`. (Without
    this, friends' characters would merge into your own list once the new policy lets you read them.)
  - New: `campaigns()` (campaigns with members), `campaignIndex()` (`id`, `user_id`, `campaign_id`,
    `updated_at` of every visible campaign character not owned by the caller), `campaignChars(ids)`
    (their `data`), and wrappers for the functions: `createCampaign`, `joinCampaign`,
    `leaveCampaign`, `renameCampaign`, `newCode`, `setCampaign`. The member name sent is
    `Cloud.name()`.
- **`ui.js`**: a **viewing** mode for a friend's character: the grey band, Customize hidden, fields
  and the free box `readOnly`, no save, no undo, never written into `chongkit.sheets`. Starts and
  stops the refresh timer. Own characters keep a local `campaign` (id) learned from the account so
  their cards can show the tag.
- **`sheet.js`** (pure, tested): `formatCode('K7Q3MD')` → `'K7Q-3MD'`; `parseCode(text)` → the 6
  characters or null (accepts lower case, dashes, spaces); `campaignView(cache, own, me)` → sections
  in display order (your card marked as yours and drawn from your local copy; others most recently
  edited first); `campaignDiff(cache, index)` → `{ fetch: ids, gone: ids }`.
- **`sheet.css`**: section heading, code chip, campaign tag, picker, viewing band.

## Refresh

- Runs when the Characters menu opens, every 30 s while the menu or a friend's sheet is on screen
  and the tab is visible, and when the tab becomes visible again.
- One refresh: `campaigns()`, then `campaignIndex()`, then `campaignChars(fetch)` for only the ids
  `campaignDiff` says changed or are new; `gone` ids are dropped (removed from a campaign, player
  left, or deleted).
- Cache in localStorage `chongkit.campaigns.<user>`: `{ campaigns, chars: { id: { owner, campaign,
  updated, data } } }`. Cleared by sign-out with "remove my characters" and by Delete account.
- A failed refresh keeps the cards and shows the existing "Not synced" status; the next tick
  retries. Create / join / leave / rename / new code / add / remove call the database and then
  refresh at once; offline they fail with a short message and aren't queued.
- A friend's sheet open in viewing mode redraws when its data changes.

## Security (adds to CLAUDE.md's Character Sheet security rules)

- Reading others' characters is only through membership; writing stays own-rows-only.
- Joining needs the code; a wrong code reveals nothing; "New code" retires an old one.
- Every campaign change goes through a `security definer` function that acts only as the caller.
- Friends' names and sheet text are set as text, never as HTML (as today).
- No new hosts: the CSP is unchanged.

## Testing

- `tests/sheet.test.js`: `formatCode`, `parseCode`, `campaignView` (sections, "You", order, local
  copy wins), `campaignDiff` (changed, new, gone), and that `Cloud.list()` builds the own-rows path.
- Database, via SQL acting as two fake users after the migration: non-members can't read a
  campaign's characters; can't add someone else's character or add to a campaign you're not in;
  can't set `campaign_id` with a plain insert or update; a wrong code reveals nothing; leaving clears your
  characters; the last member leaving deletes the campaign; a normal sync upsert keeps
  `campaign_id`; `delete_my_account()` cleans up; limits hold. Then Supabase's security advisor.
- Browser: the menu, picker and viewing band in the local preview with made-up campaign data. The
  two-account check (one creates, a friend joins) is done by the table.

## Docs

CLAUDE.md (a Campaigns item in the Character Sheet section: tables, functions, own-rows `list()`,
security notes; layout lists `campaigns.js`), README (how to create and join), TRACKER.md.
