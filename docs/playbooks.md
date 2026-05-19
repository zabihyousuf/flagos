# Playbooks — Requirements & Functionality Document

This document covers two related screens:
- **Playbooks Index** at `/playbooks`
- **Playbook Detail** at `/playbooks/[id]`

Both screens are accessible to managers and players, with role-based differences in what actions are available.

---

## PART 1: Playbooks Index (`/playbooks`)

---

### 1. Screen Purpose

The Playbooks Index is the organizational hub for all playbooks in the system. Managers create, edit, share, and delete playbooks here. Players see playbooks that have been shared with teams they are members of. A playbook is a named container that groups related plays together.

---

### 2. Page Header

### 2.1 Title and Subtitle

- **Page title:** "Playbooks" (`h2`, `text-2xl font-semibold tracking-tight`).
- **Subtitle** differs by role:
  - Manager: "Organize your plays into playbooks."
  - Player: "Playbooks shared with your teams."

### 2.2 Header Action Buttons

Top-right area, flex row:

**"All plays" button** (visible to all roles):
- Outline variant button with a swords icon.
- Navigates to `/plays`.
- Always visible regardless of role or playbook count.

**"New Playbook" button** (managers only):
- Primary variant with a plus icon.
- Opens `PlaybookDialog` in create mode.
- Hidden entirely for players.

---

### 3. View Mode Toggle

- A compact toggle group allowing Grid and List views.
- Hidden on mobile (always uses grid on mobile).
- Visible on desktop only.
- State is local (not persisted to DB or localStorage).
- Grid view: `grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3`.
- List view: `flex flex-col gap-1.5`.

---

### 4. Loading State

Shown when `loading === true` AND the displayed playbooks list is empty.

- Renders 6 skeleton cards in a `grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3` layout.
- Each skeleton card has:
  - Card header area with a `h-5 w-32` title skeleton and two `h-8 w-8` button skeletons.
  - A `h-3 w-48` description skeleton.
  - Card content with two `h-4 w-16` and `h-4 w-20` skeletons.
- Skeletons use the `Skeleton` component with `animate-pulse`.

---

### 5. Empty State

Shown when the playbooks list is empty AND loading is complete.

- Centered layout with `BookOpen` icon (large, muted color).
- **Managers:** "No playbooks yet" heading + "Create your first playbook to start designing plays." + "Create Playbook" primary button (opens `PlaybookDialog`).
- **Players:** "No playbooks yet" heading + "No playbooks have been shared with your teams yet." — no action button.

---

### 6. Playbook Cards

`PlaybookCard` component used for both grid and list variants.

#### 6.1 Card Content (Grid Variant)

- **Playbook name**: displayed as the card title (`CardHeader`).
- **Description**: shown if non-empty, truncated after 2 lines.
- **Play count**: "N plays" using the count from the `plays` subquery. Clicking the count or the card itself navigates to `/playbooks/[id]`.
- **Last updated**: relative time string (e.g., "2h ago", "3d ago", "Jan 5"). Computed from `updated_at` ISO timestamp.
- The card is clickable: tapping anywhere on the card (outside action buttons) navigates to `/playbooks/[id]`.

#### 6.2 Manager-Only Action Buttons

Three icon buttons appear in the top-right corner of the card (inside the `CardHeader`):

1. **Edit button** (pencil icon): opens `PlaybookDialog` in edit mode with the current playbook data pre-filled.
2. **Delete button** (trash icon): opens a confirmation dialog (see Section 6.3). Shows a loading spinner while `deletingId === playbook.id`.
3. **Share button** (share/people icon): opens `SharePlaybookDialog` (see Section 7). Only shown when `showShare === true` (passed as prop from the index page).

#### 6.3 Delete Confirmation Dialog

- **Title:** "Delete Playbook?"
- **Body:** "This will delete all plays in this playbook. This action cannot be undone."
- **Actions:** "Delete" (destructive) and "Cancel".
- On confirm: `deletingId` is set to the playbook ID; `deletePlaybook(id)` is called (deletes from `playbooks` table, cascade-deletes all plays in the playbook via DB foreign key with ON DELETE CASCADE); playbook removed from local `playbooks.value` list; `deletingId` cleared.
- On cancel: dialog closes, nothing changes.

#### 6.4 List Variant

Same data as grid but displayed in a horizontal row:
- Playbook name on the left.
- Description (truncated) below the name.
- Play count and last updated date on the right.
- Action buttons on the far right (same three icons).

---

### 7. PlaybookDialog (Create / Edit)

A modal dialog for creating or editing a playbook.

**Fields:**
- **Name** (required text input, `placeholder="Playbook name"`).
- **Description** (optional `<textarea>`, `placeholder="Optional description"`, 3 rows).

**Create mode (opened with no playbook prop):**
- On submit: `name` must be non-empty. Calls `createPlaybook(name, description)`:
  - Inserts into `playbooks` with `user_id = currentUser.id`.
  - Returns the new `Playbook` object.
  - New playbook prepended to `playbooks.value` array.
  - Dialog closes.

**Edit mode (opened with a playbook prop):**
- Pre-fills both fields with `playbook.name` and `playbook.description`.
- On submit: calls `updatePlaybook(playbook.id, { name, description })`:
  - Updates `name`, `description`, `updated_at` in `playbooks` table.
  - Updates the entry in `playbooks.value` array.
  - Dialog closes.

**Validation:**
- Submit button disabled while `name` is empty or only whitespace.
- Submit button shows loading state while the async call is in-flight.

---

### 8. SharePlaybookDialog

A modal for sharing a playbook with a team so its players can view the plays inside.

**Fields:**
- **Team selector dropdown**: lists teams owned or managed by the current user (excluding "Free Agent"). Required.
- Team display name in dropdown options.

**Submit behavior:**
- Calls `createTeamPlaybook(playbookId, teamId)` which inserts a row into `team_playbooks`:
  ```
  { team_id, playbook_id, shared_by: currentUser.id }
  ```
- A playbook can be shared with multiple teams (multiple `team_playbooks` rows allowed for the same playbook).
- On success: toast "Playbook shared with [team name]"; dialog closes.
- On error (e.g., duplicate): shows error message in dialog.

**Existing shares display (optional):**
- The dialog may optionally list currently shared teams (fetched from `team_playbooks` where `playbook_id = this.playbookId`) so the user can see where it is already shared.

---

### 9. Manager Data Flow

**Fetch:**
- `fetchPlaybooks()` called on mount.
- Queries `playbooks` table: `SELECT *` filtered to `user_id = currentUser.id`, ordered by `updated_at DESC`.
- Then queries `plays` table: `SELECT id, playbook_id` filtered to `playbook_id IN [fetched playbook IDs]` to compute per-playbook play counts.
- Playbooks are augmented with a `plays` array (just `{ id }` objects) for count display.

**Why separate queries:**
- PostgREST embedded joins do not reliably apply cross-table RLS for nested queries. Fetching plays separately and building a count map client-side is the reliable pattern.

---

### 10. Player Data Flow

**Fetch:**
- `fetchAccessiblePlaybooks()` is called on mount via `useTeamPlaybooks`.
- Step 1: queries `team_memberships` table for teams the player belongs to.
- Step 2: queries `team_playbooks` for all playbook IDs linked to those team IDs.
- Step 3: queries `playbooks` for those playbook IDs.
- The resulting list is stored in `accessiblePlaybooks`.

**Display:**
- `displayedPlaybooks` computed from `accessiblePlaybooks` (player) or `playbooks` (manager).

---

## PART 2: Playbook Detail (`/playbooks/[id]`)

---

### 11. Screen Purpose

The Playbook Detail page shows all plays inside a specific playbook. Managers can create, edit, delete, and share individual plays. Players can browse plays in read-only mode.

---

### 12. Page Header

### 12.1 Title and Description

- **Playbook name** (`h2`): fetched from the playbook record.
- **Description** (small muted text below name): shown if non-empty.

### 12.2 Action Buttons

**"New Play" button** (managers only):
- Label: "New Play" with a plus icon.
- Navigates to `/plays/new?playbookId=[id]`. The `playbookId` query param pre-selects this playbook in the `SavePlayDialog` that appears when the user saves the new play.
- Hidden for players.

---

### 13. Tabs: All | Offense | Defense

Three tab buttons below the page header.

**All tab:**
- Shows every play in the playbook.
- Label: "All (N)" where N = `plays.length`.

**Offense tab:**
- Shows only plays with `play_type === 'offense'`.
- Label: "Offense (N)" where N = count of offense plays.

**Defense tab:**
- Shows only plays with `play_type === 'defense'`.
- Label: "Defense (N)" where N = count of defense plays.

Tab state is local (not persisted to URL or DB).

---

### 14. View Mode Toggle

Same as the index page: Grid / List, hidden on mobile. Defaults to grid.

---

### 15. Loading State

Shown while `loading === true` AND `plays.length === 0`.
- 6 skeleton play cards in the current grid/list layout.
- Grid skeleton: type badge placeholder + title placeholder + date placeholder.
- List skeleton: inline left badge + title + date in a horizontal row.

---

### 16. Empty States

**Manager:**
- "No plays yet. Create your first play to start designing." + "Create Play" button (navigates to `/plays/new?playbookId=[id]`).

**Player:**
- "No plays in this playbook yet."

**Filtered empty (when a tab shows zero plays):**
- "No [offense/defense] plays in this playbook."

---

### 17. Play Cards (PlayCard Component)

Each play is displayed as either a grid card or a list row.

#### 17.1 Grid Card

- **Play type badge**: colored pill in the top-left corner.
  - Offense: blue/primary background, "Offense" label with swords icon.
  - Defense: red/destructive background, "Defense" label with shield icon.
- **Play name**: `h4`, medium weight.
- **Formation** (if set): small muted text below the name (e.g., "Trips Right", "4-Man Zone").
- **Last updated**: relative date string in the top-right corner. Format rules:
  - Less than 1 hour: "Xm ago" or "Just now".
  - Less than 24 hours: "Xh ago".
  - Less than 7 days: "Xd ago".
  - Otherwise: abbreviated month + day (e.g., "Jan 5").
- **Edit button** (pencil icon, managers only): navigates to `/plays/[id]`.
- **Delete button** (trash icon, managers only): confirm dialog → `deletePlay(id)`.
- **Share button** (share icon, managers only): opens `SharePlayDialog` for this play.
- Clicking the card body (not action buttons) navigates to `/plays/[id]`.

#### 17.2 List Row

- Same info in horizontal layout: type badge (left), play name + formation (flex-1 center), date (right), action buttons (far right).
- On mobile: date is hidden; action buttons always visible.

---

### 18. SharePlayDialog (from Playbook Detail)

Same dialog as used from the Play Designer and All Plays screens (see play-designer.md Section 11 for full details). When opened from here, the `play` prop is passed in. The dialog generates or retrieves a share token and displays a shareable URL.

---

### 19. Data Layer

#### 19.1 Supabase Tables Read (Playbook Index — Manager)

| Table | Columns | Filter |
|-------|---------|--------|
| `playbooks` | `*` | `user_id = currentUser.id`, ordered by `updated_at DESC` |
| `plays` | `id, playbook_id` | `playbook_id IN [fetched playbook IDs]` |

#### 19.2 Supabase Tables Read (Playbook Index — Player)

| Table | Columns | Filter |
|-------|---------|--------|
| `team_memberships` | `team_id` | `user_id = currentUser.id` |
| `team_playbooks` | `playbook_id` | `team_id IN [member team IDs]` |
| `playbooks` | `*` | `id IN [accessible playbook IDs]` |

#### 19.3 Supabase Tables Read (Playbook Detail)

| Table | Columns | Filter |
|-------|---------|--------|
| `plays` | `*` | `playbook_id = routeParam.id`, ordered by `created_at ASC` |
| `playbooks` | `name, description` | `id = routeParam.id` |

#### 19.4 Supabase Tables Written

| Table | Operation | Trigger |
|-------|-----------|---------|
| `playbooks` | INSERT | PlaybookDialog create |
| `playbooks` | UPDATE | PlaybookDialog edit |
| `playbooks` | DELETE | Delete playbook confirm |
| `plays` | DELETE | Delete play confirm |
| `team_playbooks` | INSERT | SharePlaybookDialog confirm |
| `shared_plays` | INSERT or UPDATE | SharePlayDialog confirm |

#### 19.5 Key Composables

- `usePlaybooks()`: `fetchPlaybooks`, `createPlaybook`, `updatePlaybook`, `deletePlaybook`
- `usePlays(playbookId)`: `fetchPlays`, `createPlay`, `deletePlay`
- `useTeamPlaybooks()`: `fetchAccessiblePlaybooks`, `accessiblePlaybooks` (player view)
- `useSharePlay()`: `getOrCreateShareLink`, `buildShareUrl`
- `useAccountType()`: `isManager`, `isPlayer`
- `useConfirm()`: confirmation dialog helper

---

### 20. Navigation

| Destination | Trigger |
|-------------|---------|
| `/playbooks` | Breadcrumb / back navigation |
| `/plays` | "All plays" button on index page |
| `/plays/[id]` | Edit button on play card, or clicking play card |
| `/plays/new?playbookId=[id]` | "New Play" button on detail page |
| `/shared/[token]` | Via SharePlayDialog URL (external link) |
| `/playbooks/[id]` | Clicking a PlaybookCard navigates here |

---

### 21. Play Data Model

```
Play {
  id: string                  // UUID primary key
  playbook_id: string         // FK to playbooks.id
  user_id: string             // FK to auth.users.id
  name: string                // e.g., "Post Corner"
  play_type: 'offense' | 'defense'
  formation: string           // Descriptive label, e.g., "Trips Right"; may be empty
  canvas_data: CanvasData     // Full serialized canvas state (see play-designer.md)
  created_at: string          // ISO 8601 timestamp
  updated_at: string          // ISO 8601 timestamp; updated on every save
}
```

### 22. Playbook Data Model

```
Playbook {
  id: string
  user_id: string
  name: string
  description: string         // May be empty string
  created_at: string
  updated_at: string
  plays?: Play[]              // Populated client-side from separate query; may be only {id} stubs
}
```

### 23. TeamPlaybook Data Model (for sharing)

```
TeamPlaybook {
  id: string
  team_id: string             // FK to teams.id
  playbook_id: string         // FK to playbooks.id
  shared_by: string           // FK to auth.users.id (the manager who shared)
  created_at: string
  playbook?: Playbook         // Joined when fetching accessible playbooks
}
```
