# Locker Room — Requirements & Functionality Document

**Screen Route:** `/squad`
**Page Title:** "Locker Room"
**Role Access:** Both managers and players can access this page. The content and permissions differ significantly by role.

---

## 1. Screen Purpose

The Locker Room is the roster management hub of FlagOS. Managers use it to create and organize teams, add and edit player profiles with detailed athletic attributes, assign starters, manage join requests, and invite players to link their FlagOS accounts. Players use it in read-only mode to see the roster of teams they have joined and to manage their team memberships.

---

## 2. Page Header

### 2.1 Title and Subtitle

- **Page title:** "Locker Room" (`h2`, `text-2xl font-semibold`).
- **Subtitle** differs by role:
  - Manager: "Manage your teams, roster, and player attributes."
  - Player: "Your team roster and membership."

### 2.2 Export Button (Managers Only)

- Label: "Export players" with a download icon.
- Positioned top-right of the page header row.
- Disabled when `filteredPlayers.length === 0`.
- On click: calls `usePlayerExport` which converts the current filtered player list to a downloadable CSV or JSON file (filename includes the date).
- The export includes all columns currently visible: name, number, height, weight, offense positions, defense positions, starter status.

---

## 3. Role Determination

- `account_type` field on the `profiles` table: `'manager'` or `'player'`.
- Exposed via `useAccountType()` composable: `isManager` (boolean), `isPlayer` (boolean).
- The same page renders completely different UI trees based on this value.

---

## 4. Manager View

### 4.1 Teams Section

Located at the top of the page.

#### 4.1.1 Section Header

- Label: "Teams" (small caps, muted, uppercase tracking).
- "New Team" button (ghost variant, small) to the right. Opens `TeamDialog` for creating a new team.

#### 4.1.2 Team Slot Cards

Managers see up to 3 "tracked" team slots displayed in a responsive grid (1 column on mobile, 2 on sm, 3 on lg+). The tracked team IDs are stored in local state (session-persistent, not saved to DB — only the `contextActiveTeamId` is meaningful globally).

**Tracked Team Card (occupied slot):**
- Rendered as a rounded bordered card (`min-height: 80px`).
- **Team name**: bold, styled with the team's auto-generated color (hex) as text color.
- **Active badge**: small pill "Active" with primary coloring. Shown when `team.id === contextActiveTeamId`.
- **Team scores** (3 numeric values): `OVR [n]`, `OFF [n]`, `DEF [n]`. See Section 4.2 for score computation.
- **Player count**: "N players" showing the number of players in the team.
- **Click-to-activate hint**: small muted text "Click to activate" shown when this is not the active team.
- **Clicking the card**: if not already active, sets this team as `contextActiveTeamId`. This is the "active team" that drives the roster display, ghost defense scope, and play designer formation.
- **X button** (close icon, top right): removes this team from the tracked slots. This does NOT delete the team from the database — it only removes the card from the visible slots so another team can be tracked in its place.
- **Border color**: uses the team color at 25% opacity as the card border (when not active; active ring overrides).

**Empty Slot Card:**
- Shown when fewer than 3 teams are tracked.
- Rendered as a dashed-border card.
- Contains a `Select` dropdown placeholder labeled "+ Select team".
- Dropdown options: each of the user's teams not already in a tracked slot, plus a "+ New Team" option at the bottom.
- Selecting an existing team: adds it to the tracked slots list.
- Selecting "+ New Team": opens `TeamDialog` to create a new team, then adds it.

**Team Color:**
- Auto-generated when a team is first displayed (deterministic from team ID or random assignment).
- Stored in a local `teamColorMap` (in-memory map of `teamId → hexColor`). Not persisted to database.
- Colors are chosen from a palette to be visually distinct per team.

#### 4.1.3 OVR / OFF / DEF Score Computation

Scores are calculated on the frontend from the team's player attributes:

- **OVR (Overall)**: weighted average across all attribute categories for all players on the team, starters weighted 2× bench.
- **OFF (Offense)**: weighted average of offense-relevant attributes (QB: throwing_power, accuracy, decision_making; WR: catching, route_running, separation; C: snapping, snap_accuracy; universal: speed, agility, football_iq, etc.) for players with offense positions, starters weighted 2×.
- **DEF (Defense)**: weighted average of defense-relevant attributes (DB: coverage, zone_awareness, ball_hawking; RSH: rush, rush_moves, timing; MLB: play_recognition, field_awareness; universal: speed, agility, etc.) for players with defense positions, starters weighted 2×.
- Scores are on a 1–10 scale (raw attribute average), multiplied by 10 and rounded to one decimal for display as a 0–100 OVR/OFF/DEF number.
- Teams with no eligible players show 0.

---

### 4.2 Players / Requests Tab Toggle

Below the team section, a segmented control toggles between two views:

- **Players tab** (person/users icon + "Players"): shows the roster.
- **Requests tab** (bell icon + "Requests"): shows pending join requests. A badge shows the count of pending requests. On switching to Requests tab, `fetchReceivedRequests(contextActiveTeamId)` is called to load pending requests for the active team.

---

### 4.3 Players Tab — Roster Management

#### 4.3.1 Search and Filter Bar

**Search input:**
- Placeholder: "Search..."
- Searches player names (case-insensitive `includes`).
- Real-time filtering as the user types.
- Width: 200px on desktop; full-width on mobile.

**Filter toggle button:**
- Label: "Filter" with a filter icon.
- Shows a count badge when active filters are applied (e.g., "Filter (2)").
- Tapping toggles the expanded filter panel below the search bar.

**Filter panel (collapsible):**
- **Position filter**: segmented buttons: All | QB | WR | C | DB | RSH | MLB. Filters by any position in the player's `offense_positions` or `defense_positions`.
- **Off Starter filter**: All | Starter | Bench. Filters by team_player's `offense_starter` value.
- **Def Starter filter**: All | Starter | Bench. Filters by team_player's `defense_starter` value.
- Filters are independent (all must match). A player must pass every active filter to appear in results.

**Active filter count badge:** shown on the Filter button as a small circle with the number of non-default filter values active.

#### 4.3.2 Bulk Actions Bar

- A checkbox appears on the left of each desktop row (hidden on mobile).
- **Select All checkbox** in the table header selects/deselects all visible rows.
- When any rows are selected, a sticky **selection toolbar** appears above the table:
  - "N selected" label.
  - **Delete Selected** button (destructive variant). Opens confirmation dialog: "Delete N players? This action cannot be undone." On confirm, calls `deletePlayer` for each selected ID, then clears selection.
  - **Deselect All** link/button.

#### 4.3.3 Auto Starters and Reset Starters Buttons

Two action buttons appear near the top of the roster section (beside or above the filter bar):

**Auto starters** button:
- Shows a loading spinner while running.
- Calls `autoAssignTeamStarters(activeTeamId, { offenseCount, defenseCount })`.
- Algorithm:
  1. Filters team players to those with offense positions (for offense) and defense positions (for defense).
  2. Computes Z-scores across all attributes for each eligible player.
  3. Phase 1: assigns each positional slot (e.g., 1 QB, 1 C, 3 WR for a 5-player offense) to the highest-scoring eligible player for that position, removing them from the pool.
  4. Phase 2: fills any remaining slots with the best overall players remaining.
  5. Respects locked assignments: players with `offense_starter_locked = true` or `defense_starter_locked = true` are not moved. Their slots are pre-deducted from the target count before the algorithm runs.
  6. Updates `team_players` rows with new `offense_starter`, `defense_starter`, and corresponding position values.
- The `offenseCount` and `defenseCount` come from `fieldSettings.default_offense_starter_count` and `default_defense_starter_count`.

**Reset starters** button:
- Shows a loading spinner while running.
- Calls `resetTeamStarters(activeTeamId)`.
- Sets `offense_starter = false` and `defense_starter = false` on all `team_players` rows for the active team that do NOT have `offense_starter_locked` or `defense_starter_locked` set.
- Locked starters are preserved.

#### 4.3.4 Add Player Button (Split Button)

A compound button on the right side of the action bar:
- Primary action label: "Add Player" (plus icon). Clicking opens `PlayerDialog` in create mode.
- Dropdown chevron opens a small menu with two options:
  1. "Add Player": same as primary action.
  2. "Add multiple players": opens `BulkImportDialog`.

#### 4.3.5 Desktop Roster Table

Shown on viewports >= 640px (or some breakpoint; on mobile, cards are shown instead — see 4.3.9).

**Table columns (left to right):**
1. **Expand chevron** (narrow column): clicking this row or the chevron opens the inline attribute editor below the row.
2. **Checkbox** (desktop only): for bulk selection.
3. **#** (jersey number, sortable): displayed as a number.
4. **Name** (sortable): player display name.
5. **Off Position**: comma-separated offense position badges for the player's `offense_positions` array.
6. **Def Position**: comma-separated defense position badges.
7. **Off Starter** (sortable): shows "X/Y" ratio — X = number of teams this player starts on (offense), Y = number of teams this player is on total. E.g., "1/2" means starter on 1 of 2 teams.
8. **Def Starter** (sortable): same ratio for defense.
9. **Actions** (fixed right column): two icon buttons:
   - **Invite** (email/envelope icon): opens invite flow for this player.
   - **Delete** (trash icon): opens confirmation dialog → `deletePlayer(id)`.

**Linked user indicator:**
- If `player.linked_user_id` is not null, a small green checkmark icon appears in the Name column (or a dedicated column).
- This indicates the player has created a FlagOS account and linked it via an invite.

**Column sorting:**
- Clicking a column header toggles between ascending, descending, and no-sort.
- Only one column sorted at a time.
- Sort state is local (not persisted).

#### 4.3.6 Row Expansion — Inline Attribute Editor

Clicking a table row (or the expand chevron) reveals an inline expanded section below the row.

**Expanded section contains:**
- **Height**: two separate number inputs — feet and inches (e.g., 6 ft, 1 in). Stored internally as total inches in the `height` field.
- **Weight** (lbs): number input.
- **Offense Positions**: multi-select checkboxes for QB, WR, C.
- **Defense Positions**: multi-select checkboxes for DB, RSH, MLB.
- **Teams**: multi-select of teams the player belongs to (all manager's teams, excluding "Free Agent"). Changing this calls `bulkSetPlayerTeams` to add/remove the player from teams.
- **Roster Status** (per team, only shown when player is on at least one team): for each team the player is on, shows:
  - Team name.
  - Offense Starter checkbox with a **lock toggle** (lock icon). Lock prevents Auto Starters from changing this assignment.
  - Defense Starter checkbox with a similar lock toggle.
  - The lock state corresponds to `team_players.offense_starter_locked` / `defense_starter_locked`.
- **Attribute editor**: shows Universal Attributes section (always) and the position-specific attribute groups matching the player's current positions (see Section 4.4).
- **Buttons**: "Save" (saves all pending changes via `updatePlayer` + any `updateTeamPlayer` calls), "Cancel" (discards changes and collapses row), "Edit" (if in view mode — though the row expansion starts in edit mode).
- `hasChanges` is tracked; Save button is disabled when no changes are pending.

#### 4.3.7 Player Dialog (Create / Edit Modal)

`PlayerDialog` is a full-screen modal (or large dialog) for creating or editing a player.

**Fields:**

*Basic info:*
- **Name** (required text input).
- **Jersey Number** (required number input).
- **Height**: feet + inches (two number inputs). Both optional.
- **Weight** (lbs, optional number input).

*Positions:*
- **Offense Positions** (multi-select checkboxes): QB, WR, C.
- **Defense Positions** (multi-select checkboxes): DB, RSH, MLB.
- A player may have zero offense AND zero defense positions (no positions assigned yet).

*Teams:*
- Multi-select of the manager's teams, excluding the "Free Agent" pseudo-team.
- Initially empty for new players.
- Saving a player with no teams selected: player remains on the "Free Agent" team (auto-managed by `bulkSetPlayerTeams`).

*Attributes section (shown only if at least one position is selected):*
- **Mode selector**: toggle between "Use default attributes" (all sliders set to 5) and "Enter my own" (sliders editable).
- **"Copy from" dropdown**: lists other players. Selecting one populates all attribute sliders with that player's values.
- **"Reset to defaults" button**: resets all sliders back to 5.
- Attribute groups displayed:
  - **Universal** (always): 12 attributes — Speed, Acceleration, Stamina, Football IQ, Agility, Playmaking, Reaction Time, Deceleration, Change of Direction (COD), Reach (Catch Radius), Body Control / Balance, Field Vision.
  - **QB** (if QB is in offense positions): 8 attributes — Throwing Power, Accuracy, Decision Making, Pocket Awareness, Release Quickness, Throw Timing (Anticipation), Throw on the Run, Ball Security.
  - **WR** (if WR is in offense positions): 9 attributes — Catching, Route Running, Release, Separation, Jump Ball, Ball Tracking, Contested Catch, Hands Consistency, After Catch Vision.
  - **C** (if C is in offense positions): 4 attributes — Snapping, Snap Accuracy, Snap Speed, Snap Velocity.
  - **Evasion** (if any offense position selected): 3 attributes — Hip Drop, Knee Slide, Hip Twist.
  - **DB** (if DB is in defense positions): 9 attributes — Coverage, Ball Hawking, Zone Awareness, Coverage Technique, Ball Skills (Defensive), Closing Burst, Recovery Agility, Flag Pull Technique, Play Recognition.
  - **RSH** (if RSH is in defense positions): 8 attributes — Rush, Rush Moves, Timing, Get-Off Burst, Rush Angle Efficiency, Closing Burst (Rush), Rush Discipline, Sack / Flag Conversion.
  - **MLB** (if MLB is in defense positions): 5 attributes — Play Recognition (shared with DB), Field Awareness, Zone Recognition, Pursuit Angle, Coverage Support.
  - **Defense Evasion** (if any defense position selected): 2 attributes — Flag Pulling, Pursuit.
- All sliders: integer range 1–10, default 5.
- Groups for positions not in the player's selected lists are hidden entirely.

**Submit behavior (create mode):**
- Calls `createPlayer(partialPlayer)` which inserts a new row in `players` with all attribute JSONBs, then `bulkSetPlayerTeams` to set team memberships.
- On success: dialog closes; player added to local `players` list.

**Submit behavior (edit mode):**
- Calls `updatePlayer(id, updates)`.
- On success: dialog closes; player updated in local list.

#### 4.3.8 Attribute Slider Component

Each attribute is displayed as a named slider. The component shows:
- Attribute label (human-readable name).
- Numeric value display (e.g., "7").
- A horizontal slider (min 1, max 10, step 1).
- Optional: a colored fill indicating performance level (1–4 = red/low, 5–6 = yellow/medium, 7–8 = green/good, 9–10 = blue/elite).

#### 4.3.9 Mobile Roster — Card View

On mobile viewports, the table is replaced by a vertical list of player cards. Each card shows:
- Left badge: jersey number (bold, primary color).
- Player name (bold).
- Position badges:
  - Offense positions: secondary/filled style badges.
  - Defense positions: outline style badges.
  - Starter positions (positions where the player IS a starter on the active team): badge text gets a gold star `★` suffix and gold styling.
- Three action buttons (icon only, right side):
  1. **Invite** (mail icon): opens invite flow for this player.
  2. **Edit** (pencil icon): opens `PlayerDialog` in edit mode.
  3. **Delete** (trash icon): confirm dialog → `deletePlayer`.

---

### 4.4 Requests Tab

Shows pending join requests for the currently active team.

**Loading:** calls `fetchReceivedRequests(contextActiveTeamId)` on tab activation. Fetches from `team_join_requests` table where `team_id = activeTeamId` AND `status = 'pending'`, ordered by `created_at DESC`.

**Empty state:** "No pending join requests."

**Request row:** shows:
- User identifier (user ID or display name if available via metadata).
- Optional message the user included with their request (freeform text).
- Date of request (formatted as relative time or date).
- **Approve button**: calls `respondToRequest(requestId, 'approved')` which posts to `/api/join-requests/[id]/respond` with `{ decision: 'approved' }`. On success: row removed from list.
- **Reject button** (destructive variant): calls `respondToRequest(requestId, 'rejected')`. On success: row removed.

**Request count badge:** visible on the Requests tab button even before the tab is selected. Badge shows the count of `receivedRequests.length`.

---

### 4.5 Invite System

Managers can invite players to link their FlagOS accounts to a player profile.

#### 4.5.1 Invite Flow

Accessed via the envelope/mail icon on a player row (table or card).

**Invite dialog:**
- Title: "Invite Player".
- Two invitation methods:
  1. **Email invite**: enter an email address and click "Send Invite". An invite record is created in `player_invites` table via `POST /api/invites/create` with `{ team_id, player_id, role: 'player' }`. The API sends an email to the specified address with a link to `/join/[token]`.
  2. **Link-only invite**: click "Copy Link". An invite record is created with `email = 'link-only@flaglab.invite'` (sentinel value). Returns a URL: `https://[app-domain]/join/[token]`. The link is copied to the clipboard; no email is sent.

**Invite record fields:**
- `id`, `token` (random UUID or hex), `team_id`, `player_id` (the player being invited), `email` (destination or sentinel), `invited_by` (current user ID), `expires_at` (set by server), `used_at` (null until invite accepted), `created_at`.

#### 4.5.2 Invite States

- **Pending**: `used_at IS NULL`. Link still works.
- **Used**: `used_at IS NOT NULL`. When a user visits `/join/[token]` and logs in/creates an account, their `linked_user_id` is set on the player record.
- **Expired**: `expires_at < now()`. Server rejects the invite.

#### 4.5.3 Join Flow (for invited player user)

- User visits `/join/[token]`.
- If not logged in: redirected to login/signup with the token preserved.
- On successful authentication: the invite is validated, `player.linked_user_id` is set to the new user's ID, `invite.used_at` is set to now.
- User is redirected to the app as a `'player'` account type.

---

### 4.6 Bulk Import (BulkImportDialog)

Opened via the "Add multiple players" dropdown option.

**Import method:**
- Paste raw text or upload a CSV file.
- Expected CSV columns: name, number, height (optional), weight (optional), offense_positions (comma-separated), defense_positions (comma-separated).
- The dialog parses rows and shows a preview table.
- User can edit or remove rows before confirming.
- On confirm: calls `bulkCreatePlayers(rows)` which batch-inserts via `client.from('players').insert(payload)`. Falls back to row-by-row insertion if batch fails.
- Reports results: "N players created, M errors."

---

## 5. Player View

Players see a read-only version of the Locker Room. The entire manager section (Player Dialog, Bulk Import, Auto Starters, Bulk Actions, attribute sliders, inline editors) is hidden.

### 5.1 Teams Section

Fetches teams the player is a member of via `team_memberships` table (joined with `teams`). Excludes the "Free Agent" team.

**Team cards:**
- Displays each member team.
- Shows: team name, player count, join date ("Joined [date]").
- **Active badge** on the currently active team.
- **Leave button** (small, destructive text color): shows a confirm dialog before proceeding.
  - On confirm: calls `POST /api/team-memberships/leave` or equivalent, removing the `team_memberships` row.
  - If leaving the active team: switches `contextActiveTeamId` to another team or null.
- Clicking a non-active team card sets it as active.

**Empty state:** "Not on any teams yet. Ask your coach for an invite link to join their team."

### 5.2 Team Roster (Read-Only)

When an active team is set, displays the full player roster for that team.

- Section title: "[Team Name] Roster".
- Loading skeleton: 5 rows while fetching.
- Empty state: "No players on this team yet."

**Roster list:**
- Scrollable list; each row contains:
  - Jersey number badge (`#N`, primary colored, width 32px).
  - Player name (flex-1, truncated if long).
  - Position badge cluster: offense position badges (secondary/filled style) and defense position badges (outline style).
- No actions, no edit, no delete, no invite.

**Data source:** from `teams.team_players` (fetched with `team_players(*, player:players(*))`) filtered to the active team.

---

## 6. Team Dialog (Create / Edit Team)

`TeamDialog` is a small modal for creating or editing a team.

**Fields:**
- **Name** (required).
- **Description** (optional textarea).

**Create mode:** calls `createTeam(name, description)` → inserts into `teams` with `user_id = currentUser.id`. On success: new team added to `teams` array.

**Edit mode:** calls `updateTeam(id, { name, description, updated_at })` → updates the row.

**Auto-created Free Agent team:** every new account has a "Free Agent" team created automatically via the `handle_new_profile` database trigger. This team cannot be deleted and is hidden from the team selection in Player Dialog and team slots section.

---

## 7. Loading States

- **Teams section**: no explicit skeleton; if `loading === true`, the grid area may show a spinner or be empty momentarily.
- **Roster section (player view)**: 5 skeleton rows (`h-11 rounded-lg bg-muted/50 animate-pulse`).
- **Roster section (manager desktop table)**: rows replaced by skeleton rows.
- Auto Starters and Reset Starters buttons show inline spinners while async operations are pending.
- Delete, Update, and Create operations show the button in a loading/disabled state.

---

## 8. Navigation

| Destination | Trigger |
|-------------|---------|
| `/squad` (current page, re-render) | Tab switches within the page |
| `/join/[token]` | Player follows invite link (external, separate page) |
| `/plays/new` | Via sidebar/global navigation (not directly from this page) |
| `/playbooks` | Via sidebar/global navigation |

---

## 9. Data Layer

### 9.1 Supabase Tables Read

| Table | Columns | Filter |
|-------|---------|--------|
| `players` | `*` | `user_id = currentUser.id`, ordered by `number ASC` |
| `teams` | `*, team_players(*, player:players(*))` | `user_id = currentUser.id` |
| `team_memberships` | `team:teams(*, team_players(*))` | `user_id = currentUser.id` (player view) |
| `team_join_requests` | `*` | `team_id = activeTeamId`, `status = 'pending'` |
| `player_invites` | `*` | `team_id`, `invited_by = currentUser.id`, `used_at IS NULL` |
| `field_settings` | `default_offense_starter_count, default_defense_starter_count` | `user_id = currentUser.id` |

### 9.2 Supabase Tables Written

| Table | Operation | Trigger |
|-------|-----------|---------|
| `players` | INSERT | "Add Player" dialog confirm |
| `players` | UPDATE | Inline editor save, Player Dialog edit save |
| `players` | DELETE | Delete button confirm |
| `team_players` | INSERT | Adding player to a team |
| `team_players` | UPDATE | Starter toggle, lock toggle, position assignment, auto-assign |
| `team_players` | DELETE | Removing player from a team |
| `teams` | INSERT | TeamDialog create |
| `teams` | UPDATE | TeamDialog edit |
| `player_invites` | INSERT (via API) | Invite player action |
| `player_invites` | DELETE | Revoke invite |

### 9.3 API Endpoints Called

| Endpoint | Method | Body | Trigger |
|----------|--------|------|---------|
| `/api/invites/create` | POST | `{ team_id, player_id, role }` | Create player invite |
| `/api/join-requests/[id]/respond` | POST | `{ decision: 'approved' | 'rejected' }` | Approve/reject join request |

### 9.4 Key Composables

- `usePlayers()`: `fetchPlayers`, `createPlayer`, `updatePlayer`, `deletePlayer`, `bulkCreatePlayers`, `bulkUpdatePlayers`, `autoAssignStarters`, `resetStarters`, `teamScore`
- `useTeams()`: `fetchTeams`, `createTeam`, `updateTeam`, `deleteTeam`, `addPlayerToTeam`, `removePlayerFromTeam`, `updateTeamPlayer`, `autoAssignTeamStarters`, `resetTeamStarters`, `bulkSetPlayerTeams`
- `usePlayerInvites(teamId)`: `fetchInvites`, `createInvite`, `revokeInvite`
- `useTeamJoinRequests()`: `fetchReceivedRequests`, `respondToRequest`
- `useTeamMemberships()`: team membership data for player view
- `useAccountType()`: `isManager`, `isPlayer`
- `useActiveContext()`: `activeTeamId`, `setContextActiveTeam`
- `usePlayerExport()`: CSV/JSON export of filtered players
- `useFieldSettings()`: `settings` for starter count defaults
- `useBulkImport()`: CSV parsing and bulk player creation logic
