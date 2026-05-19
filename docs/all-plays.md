# All Plays — Requirements & Functionality Document

**Screen Route:** `/plays`
**Page Title:** "All Plays"
**Role Access:** Both managers and players can access this screen. The data source and available actions differ by role.

---

## 1. Screen Purpose

The All Plays screen provides a single consolidated view of every play the user has access to, across all playbooks. It serves as a fast way to find, browse, favorite, share, and manage plays without needing to navigate into individual playbooks. Managers see all plays they own; players see all plays from playbooks shared with their teams.

---

## 2. Page Header

### 2.1 Title and Subtitle

- **Page title:** "All Plays" (`h2`, `text-2xl font-semibold tracking-tight`).
- **Subtitle:** "Every play across all your playbooks." (Same for all roles — the data scope changes but the subtitle does not differ by role in the current implementation.)

### 2.2 View Mode Toggle

- Positioned in the top-right area of the page header row, beside the "New Play" button.
- A compact toggle group: **Grid** (grid icon, default) and **List** (list icon).
- Hidden on mobile viewports (`plays-view-toggle` class controls this); on mobile, grid view is always used.
- State is local and not persisted.

### 2.3 New Play Button

- Label: "New Play" with a plus icon.
- Visible to all roles.
- On click: calls `useQuickPlay().open()` which opens `QuickPlayDialog` (see Section 8).

---

## 3. Filter Bar

The filter bar appears below the page header. It is a flex row on larger viewports and a column on small viewports.

### 3.1 Search Input

- Placeholder: "Search plays..."
- Icon: magnifying glass inside the left padding.
- `flex-1 min-w-[12rem] max-w-sm` sizing.
- Filters the `allPlays` list in real-time by:
  - `play.name` (case-insensitive includes)
  - `play._playbookName` (the joined playbook name)
  - `play.formation` (the formation label string)
- Search is applied after type filter and favorites filter.

### 3.2 Type Filter Buttons

Four pill/outline buttons in a flex-wrap row:

1. **All** button: `typeFilter = 'all'`. Shows count as `allPlays.length`. Highlighted with `bg-accent` when active.
2. **Offense** button: `typeFilter = 'offense'`. Shows count of offense plays. Has swords icon. Highlighted with `bg-primary/10 border-primary text-primary` when active.
3. **Defense** button: `typeFilter = 'defense'`. Shows count of defense plays. Has shield icon. Highlighted with `bg-destructive/10 border-destructive text-destructive` when active.
4. **Favorites** button: toggles `favoritesFilter` boolean. Shows count as `favoritePlayIds.length`. Has star icon (filled amber when active). Highlighted with `bg-amber-500/15 border-amber-500/40 text-amber-800` (light mode) / `text-amber-300` (dark mode) when active.

The type filter and favorites filter are independent and composable: the user can view only offense favorites, for example.

---

## 4. Loading State

Shown while `loading === true`.

**Grid loading (6 skeleton cards):**
Each card shows:
- `Skeleton h-5 w-16` (type badge placeholder, top-left)
- `Skeleton h-3 w-12` (date placeholder, top-right)
- `Skeleton h-4 w-28` (name placeholder)
- `Skeleton h-3 w-20` (playbook name placeholder)

**List loading (6 skeleton rows):**
Each row shows:
- `Skeleton h-8 w-8 rounded shrink-0` (star button)
- `Skeleton h-5 w-14 rounded-md shrink-0` (type badge)
- `Skeleton h-4 w-40` + `Skeleton h-3 w-24` stacked (name and playbook)
- `Skeleton h-3 w-16 shrink-0` (date)

---

## 5. Empty States

### 5.1 No Plays at All

Condition: `allPlays.length === 0` AND `loading === false`.

- Centered layout with large `Swords` icon (muted color, `w-14 h-14`).
- Heading: "No plays yet".
- Body: "No plays yet. Create your first one to start designing."
- Button: "Create Play" (primary) → `quickPlay.open()`.

### 5.2 No Plays Match Filters

Condition: `allPlays.length > 0` AND `filteredPlays.length === 0`.

- Centered muted text only (no icon).
- If `favoritesFilter === true`: "No favorite plays yet. Star a play to add it here."
- Otherwise: "No plays match your filters."
- No action button.

---

## 6. Play Cards — Grid View

Grid layout: `grid gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3`.

Each play card is a `div` with a `play-card` class (glass morphism styling). The entire card is clickable to navigate to `/plays/[id]`, except for the action buttons which stop propagation.

### 6.1 Grid Card Structure

**Top row (flex, space-between):**
- **Left**: Play type badge (pill with icon and label).
  - Offense: `badge-offense` class → blue/primary colors, swords icon, "offense" label.
  - Defense: `badge-defense` class → red/destructive colors, shield icon, "defense" label.
- **Right**: flex row of:
  - **Star/favorite button** (ghost icon button, `h-7 w-7`):
    - Star icon: empty outline when not favorited; filled amber (`fill-amber-500`) when favorited.
    - Button color: muted by default; `text-amber-600` when favorited.
    - `@click.stop` to prevent card navigation.
    - On tap: `toggleFavorite(play.id)`.
  - **Last updated date** string (`text-xs text-muted-foreground`): formatted as relative time.
  - **Three-dot dropdown** (managers only, `MoreVertical` icon, `h-6 w-6`):
    - Default opacity 0; becomes visible on card hover (`opacity-0 group-hover:opacity-100 transition-opacity`).
    - `@click.stop` to prevent card navigation.
    - Dropdown menu items:
      1. **Share** (share2 icon): `openShareDialog(play)`.
      2. **Notify Team** (bell icon): `openNotifyDialog(play)`.
      3. **Delete** (trash icon, destructive text): `handleDelete(play.id)`.

**Body:**
- **Play name** (`h4`, `font-medium text-sm`, margin-bottom 4px).
- **Playbook name** (`p`, `text-xs text-muted-foreground`): BookOpen icon + `play._playbookName` (joined from `playbooks.name`).
- **Formation** (`p`, `text-xs text-muted-foreground opacity-70`): shown only if `play.formation` is non-empty.

---

## 7. Play Cards — List View

List layout: `flex flex-col gap-2`.

Each row is a `div` with `play-card play-card--list` classes (glass morphism, horizontal flex).

### 7.1 List Row Structure (left to right)

1. **Star button** (ghost, `h-9 w-9 shrink-0`): same favorite toggle as grid. `@click.stop`.
2. **Type badge** (`shrink-0`): same pill as grid.
3. **Play info** (flex-1, min-w-0):
   - Play name (`h4 font-medium text-sm truncate`).
   - Subline: BookOpen icon + playbook name (truncated) + optional " · formation" (if formation non-empty).
4. **Date** (`text-xs text-muted-foreground shrink-0 hidden sm:inline tabular-nums`): hidden on xs viewports.
5. **Three-dot dropdown** (`MoreVertical`, `h-8 w-8 shrink-0`):
   - On desktop (sm+): `opacity-0 group-hover:opacity-100` (visible on hover).
   - On mobile: always visible (`sm:opacity-100` → the opacity-0 only applies above sm).
   - Same menu items as grid.

---

## 8. Favorites System

### 8.1 usePlayFavorites Composable

Manages a persistent set of favorited play IDs stored in the Supabase `play_favorites` table.

**State:**
- `favoritePlayIds: string[]` — reactive array of play IDs the user has starred.
- `loading: boolean`.

**Functions:**
- `isFavorite(playId: string): boolean` — returns `true` if the ID is in `favoritePlayIds`.
- `toggleFavorite(playId: string)` — if currently favorited: DELETEs the row from `play_favorites` and removes from local array. If not favorited: INSERTs a new row and adds to local array.
- `fetchFavorites()` — SELECTs `play_id` from `play_favorites` WHERE `user_id = currentUser.id`. Populates `favoritePlayIds`.

**Auto-initialization:** A `watch` on the user ref triggers `fetchFavorites()` when the user logs in, and clears `favoritePlayIds` on logout.

**When a play is deleted:** The deleted play's ID should be removed from `favoritePlayIds`. This is done client-side immediately after `deletePlay` succeeds, by filtering the ID out of the local array. The DB row will also be cascade-deleted if a foreign key cascade is configured, or the orphaned row will simply never match a real play.

### 8.2 Favorite Filter UI

- The **Favorites** type filter button controls `favoritesFilter` (a boolean ref).
- When `favoritesFilter === true`, `filteredPlays` is further filtered to only include plays whose IDs are in `favoritePlayIds`.
- The button shows the current count of favorited plays (from `favoritePlayIds.length`), not the count of favorited plays matching other filters.

---

## 9. Filtering Logic (Computed)

```
filteredPlays = allPlays
  → if typeFilter !== 'all': filter by play_type === typeFilter
  → if favoritesFilter: filter to plays in favoritePlayIds Set
  → if searchQuery.trim(): filter by name/playbookName/formation
```

The filters are applied in order (type first, then favorites, then search). All three can be active simultaneously.

Supporting computed values:
- `offensePlays`: `allPlays.filter(p => p.play_type === 'offense')` — drives Offense button count.
- `defensePlays`: `allPlays.filter(p => p.play_type === 'defense')` — drives Defense button count.
- `favoriteCount`: `favoritePlayIds.length` — drives Favorites button count.

---

## 10. Play Navigation

Clicking a play card anywhere except action buttons calls `navigateToPlay(playId)` which calls `router.push('/plays/' + playId)`.

---

## 11. Delete Play

**Trigger:** Three-dot menu → Delete.

**Confirmation dialog:**
- Title: "Delete Play"
- Body: "Are you sure? This action cannot be undone."
- Actions: "Delete" (destructive), "Cancel".

**On confirm:**
- Calls `deletePlay(play.id)` via `usePlays()` composable → `client.from('plays').delete().eq('id', id)`.
- Removes the play from `allPlays` array.
- Removes the play ID from `favoritePlayIds` if present.

---

## 12. Share Play

**Trigger:** Three-dot menu → Share (managers only).

**Behavior:**
- `openShareDialog(play)` sets `shareDialogPlay = play` and `shareDialogOpen = true`.
- `SharePlayDialog` opens with the selected play.
- The dialog calls `getOrCreateShareLink(play)` from `useSharePlay()` composable.
  - If an active share exists for this play (checks `shared_plays` table): updates the snapshot and returns the existing token.
  - If no active share: inserts a new row in `shared_plays` with a randomly generated `share_token`, the play's canvas snapshot, name, type, and formation.
  - Ghost defense players: if the play has `ghost_defense_play_id` set in canvas data, the ghost players are fetched and embedded in the snapshot as `_ghost_players`.
- Dialog displays the shareable URL: `https://[domain]/shared/[token]`.
- "Copy Link" button copies the URL to clipboard.
- Optional: "Revoke" button sets `is_active = false` on the `shared_plays` row.

---

## 13. Notify Team (Managers Only)

**Trigger:** Three-dot menu → Notify Team (managers only).

**Opens notify dialog with:**
- Title: "Notify Team".
- Description: `Send a notification about "[play name]" to your team.`
- **Team dropdown**: lists the manager's teams from `teams.value`, filtered to exclude teams named "Free Agent". Required selection.
- **Message textarea** (optional): placeholder "Add a message for your team…", 3 rows, resizable.
- **Confirm button**: "Send Notification". Disabled when no team selected or `notifying === true`. Shows "Sending…" while in-flight.
- **Cancel button**: closes dialog, no action.

**Submission:**
- `POST /api/notifications/notify-team` with body:
  ```json
  {
    "team_id": "[selected team ID]",
    "type": "new_play",
    "title": "New play: [play name]",
    "message": "[optional message or undefined]",
    "metadata": { "play_id": "[play ID]" }
  }
  ```
- On success: dialog closes; toast "Team notified" (success variant).
- On error: toast error; dialog stays open.

---

## 14. New Play — QuickPlayDialog

**Trigger:** "New Play" button in page header.

`useQuickPlay()` composable manages the dialog open state.

**Dialog fields:**
- **Play name** (text input, required, placeholder "Play name").
- **Playbook selector** (dropdown, required): lists the user's playbooks. If no playbooks exist, prompts to create one first.
- **Play type toggle**: Offense / Defense pills (same design as the play designer header, editable here since it's a new play).

**Submit:**
- Validates name is non-empty and a playbook is selected.
- Creates the play via `createPlay(playbookId, name, playType, '', starters, fieldSettings)`.
- Navigates to `/plays/[newPlay.id]` using `router.push`.
- Dialog closes.

---

## 15. Player View Differences

Players access `allPlays` through a different data path:

**Fetch flow:**
1. `fetchAccessiblePlaybooks()` from `useTeamPlaybooks()` is called first.
   - Fetches `team_memberships` for the player.
   - Fetches `team_playbooks` for those team IDs.
   - Fetches `playbooks` for the resulting playbook IDs.
2. From those accessible playbook IDs, queries `plays` table:
   ```
   SELECT *, playbooks!inner(name)
   WHERE playbook_id IN [accessible playbook IDs]
   ORDER BY updated_at DESC
   ```
3. The `_playbookName` field is populated from the joined `playbooks.name`.

**Player UI restrictions:**
- No three-dot menu on cards (Share, Notify, Delete are hidden).
- No "New Play" quick-create (visible but uses player-specific save endpoint at `/api/plays/create-for-team`).
- Can still toggle favorites.
- Search and type filter work identically.

---

## 16. Manager View Data Fetch

```
SELECT plays.*, playbooks!inner(name)
FROM plays
WHERE plays.user_id = [currentUser.id]
ORDER BY plays.updated_at DESC
```

The `_playbookName` property is populated from `p.playbooks.name` in the mapping.

---

## 17. Relative Date Formatting

The `formatDate(isoString)` function converts an ISO 8601 timestamp to a human-readable relative string:
- 0–60 minutes: "Xm ago" or "Just now" (< 1 minute).
- 1–23 hours: "Xh ago".
- 1–6 days: "Xd ago".
- 7+ days: abbreviated month name + day number (e.g., "Jan 5", "Dec 22").

---

## 18. Play Type Badge Styling

The `play-type-badge` class styles a pill component:
- `.badge-offense`: blue/primary background, border, text. Offense plays.
- `.badge-defense`: red/destructive background, border, text. Defense plays.

Both variants include an icon (Swords for offense, Shield for defense) and a capitalized text label.

---

## 19. Navigation

| Destination | Trigger |
|-------------|---------|
| `/plays/[id]` | Clicking a play card |
| `/plays/[newId]` | After creating play via QuickPlayDialog |
| `/playbooks` | Via breadcrumb or sidebar navigation |
| `/playbooks/[id]` | Via breadcrumb if navigated from a playbook |
| `/shared/[token]` | Via SharePlayDialog URL (external, opens in browser) |

---

## 20. Data Layer

### 20.1 Supabase Tables Read (Manager)

| Table | Columns | Filter |
|-------|---------|--------|
| `plays` | `*, playbooks!inner(name)` | `user_id = currentUser.id`, ordered by `updated_at DESC` |
| `play_favorites` | `play_id` | `user_id = currentUser.id` |
| `teams` | `*` | `user_id = currentUser.id` (for Notify Team dialog) |

### 20.2 Supabase Tables Read (Player)

| Table | Columns | Filter |
|-------|---------|--------|
| `team_memberships` | `team_id` | `user_id = currentUser.id` |
| `team_playbooks` | `playbook_id` | `team_id IN [member team IDs]` |
| `playbooks` | `id, name` | `id IN [accessible playbook IDs]` |
| `plays` | `*, playbooks!inner(name)` | `playbook_id IN [accessible playbook IDs]`, ordered by `updated_at DESC` |
| `play_favorites` | `play_id` | `user_id = currentUser.id` |

### 20.3 Supabase Tables Written

| Table | Operation | Trigger |
|-------|-----------|---------|
| `plays` | INSERT | QuickPlayDialog confirm |
| `plays` | DELETE | Delete confirm |
| `play_favorites` | INSERT | Star button (unfavorited → favorited) |
| `play_favorites` | DELETE | Star button (favorited → unfavorited) |
| `shared_plays` | INSERT | Share play (new share) |
| `shared_plays` | UPDATE | Share play (update existing snapshot or revoke) |

### 20.4 API Endpoints Called

| Endpoint | Method | Body | Trigger |
|----------|--------|------|---------|
| `/api/notifications/notify-team` | POST | `{ team_id, type, title, message?, metadata }` | Notify Team dialog confirm |

### 20.5 Key Composables

- `usePlays()`: `deletePlay` (and implicitly `createPlay` via `useQuickPlay`)
- `usePlayFavorites()`: `isFavorite`, `toggleFavorite`, `favoritePlayIds`, `fetchFavorites`
- `useSharePlay()`: `getOrCreateShareLink`, `buildShareUrl`
- `useQuickPlay()`: `open()`, manages `QuickPlayDialog` state
- `useTeamPlaybooks()`: `fetchAccessiblePlaybooks`, `accessiblePlaybooks` (player view)
- `useAccountType()`: `isManager`, `isPlayer`
- `useTeams()`: `fetchTeams`, `teams` (for Notify Team dialog)
- `useConfirm()`: confirmation dialog helper

---

## 21. Play Data Model (Extended for All Plays)

In addition to the base `Play` model (see playbooks.md Section 21), the All Plays page augments each play with:

```
PlayWithPlaybook extends Play {
  _playbookName?: string    // Populated from joined playbooks.name
  _authorName?: string      // Currently unused; reserved for future display
}
```

The `_playbookName` field is populated client-side from the PostgREST join: `playbooks!inner(name)` returns `{ name: string }` nested under `p.playbooks`, and the mapping extracts it to `_playbookName`.

---

## 22. Notifications Data Model

Notifications received via real-time Supabase channel subscription and REST fetch.

```
AppNotification {
  id: string
  user_id: string
  type: 'job_completed' | 'job_failed' | 'new_play' | 'player_created_play'
       | 'join_request' | 'join_approved' | 'join_rejected'
  title: string
  message: string | null
  metadata: {
    play_id?: string
    play_name?: string
    playbook_id?: string
    team_id?: string
    team_name?: string
    job_id?: string
    request_id?: string
    user_name?: string
    player_name?: string
  } | null
  read: boolean
  read_at: string | null
  created_at: string
}
```

Notifications with `type = 'new_play'` are triggered by the Notify Team action. They route players to `/plays/[metadata.play_id]` when tapped in the notification center.
