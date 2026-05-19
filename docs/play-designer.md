# Play Designer — Requirements & Functionality Document

**Screen Route:** `/plays/[id]`
**New Play Route:** `/plays/new?playbookId=xxx` (query parameter is informational; the playbook is selected at save time via dialog)
**Layout:** Uses the `canvas` layout (no sidebar, full-viewport canvas shell)
**Role Access:** Both managers and players can open and edit plays. Players use a separate save endpoint.

---

## 1. Screen Purpose

The Play Designer is the core creative tool of FlagOS. It allows a user to design a single offensive or defensive flag football play on an interactive canvas. A play consists of a set of players placed on a normalized football field, each with routes (for offense) or zone assignments (for defense). The designer supports drawing routes, assigning read progressions, setting coverage zones, running a live simulation preview, overlaying a ghost defensive formation, and sharing or printing the completed play.

---

## 2. Screen States

### 2.1 Loading State
- Shown when `loading === true` AND `currentPlay === null` (first load of an existing play).
- The full body is replaced with a centered "Loading play..." message.
- The header bar is still rendered (shows "Loading..." in the play name slot).
- Save button is disabled during load.

### 2.2 New Play Draft State (`playId === 'new'`)
- No database record exists yet.
- A draft `Play` object is initialized in memory with `id = 'new'`, `name = 'Untitled Play'`, and a default formation derived from field settings.
- The play type (Offense/Defense) is set from `fieldSettings.default_play_type` (default: `'offense'`).
- If `show_ghost_defense_by_default` is true in field settings AND a `default_ghost_defense_play_id` is set, the ghost defense overlay is loaded from that play's canvas data immediately.
- Header shows "Save Play" button; Share and Notify Team buttons are hidden; the play type toggle is editable.
- On initial render, formation players are populated via `getDefaultFormation()` using the current field settings and the user's starters (if a team is set as active).

### 2.3 Existing Play State (`playId` is a UUID)
- Play is fetched from the `plays` table on mount.
- The canvas is initialized with `canvas_data` from the database record.
- Ghost defense overlay is restored from `canvas_data.ghost_defense_play_id` if present and play type is offense.
- The play type toggle is disabled (cannot change play type on an existing play).
- Header shows "Save Changes" button; Share and Notify Team buttons are visible.

### 2.4 Canvas Ready State
- The `canvasReady` flag gates all canvas-related UI (toolbar, roster card, player card, mobile tools strip).
- Before canvas is ready, none of these subviews render.
- Canvas becomes ready after initial data is loaded and a `nextTick` cycle has passed.

---

## 3. Header Bar

The header bar is a single horizontal strip (`height: 48px`, card background, rounded corners, drop shadow). It is divided into three flex zones: left, center, and right. On mobile (below 1024px), the center zone and right zone are hidden; only the left zone remains.

### 3.1 Left Zone

**Play Name Input**
- An inline text input rendered with transparent background and no visible border by default.
- On hover: a bottom border appears in the foreground border color.
- On focus: the bottom border turns primary color; the text overflow behavior changes from `ellipsis` to `clip` and the text wraps normally so the full name is editable.
- The input uses `v-model` bound to `currentPlay.name`.
- On change (blur/enter): if the play is an existing play (not new), the name is immediately persisted to the database via `updatePlay(playId, { name })`. This is a fire-and-forget auto-save for name changes.
- On mobile, the input takes `flex: 1` so it fills available horizontal space before the type pills.
- On desktop, the input is `width: 144px` (`w-36`) and shrink-disabled.

**Play Type Toggle (Offense / Defense Pills)**
- A pill-group with two buttons: "Offense" (sword icon) and "Defense" (shield icon).
- The active type is highlighted with a colored background: offense uses `bg-primary/15 text-primary border-primary/30`; defense uses `bg-destructive/15 text-destructive border-destructive/30`.
- **Disabled** on all existing plays (`playId !== 'new'` makes both buttons `disabled`). The UI still renders the toggle to show which type the play is, but tapping does nothing.
- On new plays only, tapping the inactive pill switches the play type:
  - If `cIsDirty` is true, a confirmation dialog appears: "Switch play type? If you switch, your current changes will be lost. Do you want to continue?" with "Switch" and "Cancel" actions.
  - On confirm (or if not dirty): `currentPlay.play_type` is updated, ghost defense is cleared if switching to defense, offense-only tools (straight, curve, option, motion, readorder, erase) are switched back to "select" if any were active, and `resetFormation` is called to reinitialize the canvas with the new side's default formation.
- On mobile, the type pills are compact (`px-1.5 py-0.5 text-[11px]`) and pushed to the right edge of the header via `margin-left: auto`.

### 3.2 Center Zone (Desktop Only; hidden on mobile via CSS)

The center zone renders the `CanvasToolbar` component plus the play test speed selector and play test button cluster. The entire center zone has `display: none` on mobile.

**CanvasToolbar component receives the following props:**
- `selectedTool`: the currently active `CanvasTool` value.
- `canUndo` / `canRedo`: booleans driving undo/redo button enabled states.
- `canSetPrimaryTarget`: boolean; true when an offense WR or non-QB player with a route is selected.
- `selectedPlayerIsPrimary`: boolean; true when the selected player has `primaryTarget === true`.
- `motionToolDisabled`: boolean; true when play is defense, OR the selected player is position C / designation C.
- `readOrderDisabled`: boolean; true when play is defense, OR no offense players have any route segments.
- `routeToolsDisabled`: boolean; true when play type is defense.
- `eraseToolDisabled`: boolean; true when play type is defense.
- `showZonePositionButton`: boolean; true when play is defense AND the selected player is a coverage player (not RSH).
- `zonePositionUnlocked`: boolean; reflects `selectedPlayer.coverageZoneUnlocked`.

**Toolbar button order (left to right):**
1. **Undo** button (arrow-counterclockwise icon). Shortcut: Cmd+Z. Disabled when `canUndo === false`.
2. **Redo** button (arrow-clockwise icon). Shortcut: Cmd+Shift+Z. Disabled when `canRedo === false`.
3. Visual separator (1px vertical line).
4. **Select** tool button (mouse pointer icon). Activates `'select'` tool mode.
5. Visual separator.
6. **Straight Route** tool (minus/line icon). Activates `'straight'` tool. Disabled when `routeToolsDisabled`.
7. **Curve Route** tool (spline/curve icon). Activates `'curve'` tool. Disabled when `routeToolsDisabled`.
8. **Option Route** tool (git-branch/fork icon). Activates `'option'` tool. Disabled when `routeToolsDisabled`.
9. **Motion** tool (move/arrow icon). Activates `'motion'` tool. Disabled when `motionToolDisabled`. QB motion draws a rollout path; non-C, non-defense receivers draw a pre-snap motion path.
10. **Read Progression** tool (list-ordered/numbered icon). Activates `'readorder'` tool. Disabled when `readOrderDisabled`. Tapping a segment with this tool assigns or removes a read order number.
11. **Zone Position** button (crosshair icon). Only visible when `showZonePositionButton === true`. Toggles the selected defensive coverage player's `coverageZoneUnlocked` flag. When unlocked, the zone circle can be dragged independently of the player body; when locked, the zone always follows the player.
12. **Primary Target** button (target icon). Only visible when `canSetPrimaryTarget === true`. Amber coloring when `selectedPlayerIsPrimary === true`. Tapping sets `primaryTarget = true` on the selected receiver (all others are set to false). Only one primary target is allowed at a time.
13. **Erase Route** tool (eraser icon). Activates `'erase'` tool. Disabled when `eraseToolDisabled`. In this mode, tapping a player clears their route.
14. Visual separator.
15. **Clear All Routes** button (trash icon). Always available. Calls `resetFormation` which wipes all routes and motion paths and re-places players at their default formation positions, then seeds the undo history.

**Play Test Speed Selector** (offense plays only):
- A dropdown button showing the current speed as e.g. "1×" or "2×".
- Speed options: 0.5, 1, 1.5, 2, 2.5, 3 (multipliers).
- Selected speed is highlighted in the dropdown.
- Setting a new speed takes effect on the next play test run (or mid-run if already running, via the `playbackSpeed` ref on the simulation).

**Play Test Button** (offense plays only):
- Green play icon button. Tooltip: "Test play".
- Disabled when: `loading === true`, simulation is already running (`isRunning === true`), OR no offense player has any route segments (`anyOffensePlayerHasRoute === false`).
- On click: calls `runPlayTest()` which passes the current canvas players and ghost defense players to the simulation engine, then calls `start()`.
- When `simulationState === 'play_over'`: the play button is replaced by a **Reset** button (rotate-counterclockwise icon, tooltip: "Reset play test"). Clicking calls `playTest.clearOverlay()` which returns the canvas to its non-simulation state.
- While simulation is running, neither button is disabled (the play button is replaced by reset only after `play_over`, not while running).

**Share button** (hidden when `playId === 'new'`):
- Share2 icon. Tooltip: "Share play".
- Opens `SharePlayDialog`.

**Notify Team bell** (managers only, hidden when `playId === 'new'`):
- Bell icon. Tooltip: "Notify team".
- Opens the Notify Team dialog (see Section 10).

**Print button** (always visible):
- Printer icon. Tooltip: "Print play".
- Disabled when `currentPlay === null`.
- On click: calls `handlePrint()` which uses the `usePlayPrint` composable.

### 3.3 Right Zone (Desktop Only; hidden on mobile)

**Ghost Defense Dropdown** (offense plays only, desktop only):
- A bordered button showing a shield icon and the currently selected defense play name, or "Defensive coverage" if none selected.
- When a ghost defense is active, the button gains a primary-tinted border and background.
- On click: opens a dropdown menu, which triggers a fetch of all defensive plays accessible to the user (see Section 9).
- Dropdown contains: "None" option at top, then a list of defense plays showing `play.name · playbook.name`.
- Selecting a play: loads that play's canvas players into `ghostPlayers` (deep clone); sets `ghostPlayId`. These players are then passed to the canvas renderer to draw semi-transparently.
- Selecting "None": clears `ghostPlayers` and `ghostPlayId`.

**View Mode Toggle (Fit / Full):**
- A compact pill-style toggle group.
- **Fit**: canvas fills the full vertical height of the center column. Field is cropped to the viewport.
- **Full**: canvas is sized so the entire field (including both endzones) is visible, centered vertically.
- On desktop, the selected view mode is saved per play in `canvas_data.view_mode` when the play is saved.
- On mobile, view mode is always read from `fieldSettings.default_play_view` (does not persist from user interaction).
- On load of an existing play on desktop: `canvas_data.view_mode` is restored if set; otherwise falls back to `fieldSettings.default_play_view`.

**Save Button** (desktop only):
- Label: "Save Play" when `playId === 'new'`; "Save Changes" when existing.
- Disabled when: `(!cIsDirty && playId !== 'new')` OR `loading === true`.
- On click: calls `handleSaveClick()`.
  - For new plays: opens `SavePlayDialog`.
  - For existing plays: immediately calls `handleSave()` which exports canvas data and calls `saveCanvasData`.

---

## 4. Three-Column Body (Desktop)

The body below the header is a flex row with three panels: left (roster), center (canvas), right (player details).

### 4.1 Left Panel — Canvas Roster Card (CanvasRosterCard)

- Width: 208px at 1024px viewport, 240px at larger viewports (`w-52 lg:w-60`).
- Contains a scrollable list of players currently placed on the canvas.
- Header label shows the play type ("Offense" or "Defense").

**Player list:**
- Each row: position badge (colored square/circle with the position abbreviation) + player name + jersey number.
- Clicking a player row selects that player on the canvas (equivalent to tapping the player circle on the canvas).
- A "remove" button (X icon) per player removes them from the canvas via `removePlayerFromField`. Selecting and removing also clears the Details panel.

**Add Player section:**
- "Add Player" button opens a dropdown with two actions:
  1. Pick from roster starters (lists available starter players not already on canvas).
  2. Add placeholder (adds a generic WR/DB placeholder with number 0 and position name as name).
- Maximum player count is enforced: offense uses `fieldSettings.default_offense_starter_count` (5–8), defense uses `default_defense_starter_count` (5–8). The Add Player button is disabled when the current player count equals or exceeds the max.

### 4.2 Center Panel — PlayCanvas

- Takes `flex: 1` remaining width.
- Contains the canvas element that renders the football field.
- In **Fit** mode: the canvas wrapper uses full column height (`height: 100%`).
- In **Full** mode: the canvas wrapper takes 82% height (`height: 82%`, min `55vh`), centered vertically in the column.
- Max width `768px` at default, `896px` on XL screens.

**Field Rendering (Canvas 2D API):**
- Field dimensions come from `fieldSettings`: `field_length`, `field_width`, `endzone_size`, `line_of_scrimmage`, `first_down`.
- The total field length for rendering is `field_length + (endzone_size * 2)`.
- In Fit view mode, the field fills the canvas vertically; in Full mode, the entire field is scaled to fit within the canvas bounds.
- Field colors (exact hex values from constants):
  - Grass: `#2d7a45` (dark green)
  - Lighter stripes: `#348c4f` (alternating yard bands)
  - Endzone: `#c62828` (red endzone background)
  - Endzone text (team name label): `rgba(255,255,255,0.18)`
  - Line of scrimmage: `#f97316` (orange horizontal line)
  - First down line: `#fdd835` (yellow horizontal line)
  - Yard hash marks: `rgba(255,255,255,0.3)`
  - Yard numbers: `rgba(255,255,255,0.35)`
  - Sideline: `#1a1a1a`

**Player Rendering:**
- Players are rendered as colored circles (default shape) at their normalized `(x, y)` coordinates mapped onto the canvas pixel space.
- Position colors: QB = `#f97316` (orange), WR = `#22c55e` (green), C = `#f59e0b` (amber), DB = `#ef4444` (red), RSH = `#a855f7` (purple), MLB = `#3b82f6` (blue).
- If a player has `markerColor` set (hex string), that color overrides the position default.
- Marker shape: `'circle'` (default), `'square'`, or `'triangle'`.
- Label inside the marker (controlled by `showLabel`): `'number'` (player jersey number), `'position'` (designation string like QB, X, Y, R), `'both'` (number above, position below), `'none'` (no label).
- The global `show_player_names_on_canvas` setting and `default_player_label_on_canvas` setting provide default values; individual player `showLabel` overrides them.
- Selected player: rendered with a highlight ring or distinct visual treatment.

**Route Rendering:**
- Straight segments: drawn as solid lines from point to point.
- Curve segments: drawn as bezier/arc curves through the points array.
- Option segments: drawn as dashed lines.
- Rollout segments (QB only): drawn as a distinct path style (QB scramble line).
- Read order numbers are drawn as small numbered badges along the route at segment midpoints.

**Motion Path Rendering:**
- Pre-snap motion paths are drawn as lighter/dashed lines from the player's starting position to the end of the motion path.
- For QB, the motion path IS the rollout segment and is synced bidirectionally.

**Ghost Defense Rendering:**
- Ghost players (from `ghostPlayers` prop) are rendered semi-transparently (reduced opacity) over the field.
- Ghost players use the same position color logic but with a transparency layer.
- Ghost players are not interactive (cannot be selected or moved).

**Coverage Zone Rendering:**
- Non-rusher defense players render a circular coverage zone around their position.
- Zone radius is `coverageRadius` yards, converted to canvas pixels using field dimensions.
- When `coverageZoneUnlocked === true`, the zone center is at `(coverageZoneX, coverageZoneY)` rather than the player position; a line is drawn from the player to the zone center.

**Simulation Animation:**
- When `simulationMode === true`, animated positions (`animatedPositions`) override normal player positions for rendering.
- `animatedPositions` is a `Record<string, {x: number, y: number}>` keyed by canvas player ID.
- `animatedBall` is `{x: number, y: number, visible: boolean}` for the football position.
- The ball is rendered as a small football icon or oval at `animatedBall.x, animatedBall.y` when `visible === true`.
- When simulation is running or `play_over`, an "Exit" overlay button appears on the canvas; tapping it calls `playTest.clearOverlay()`.

**Touch/Mouse Interaction:**
- Single-finger or mouse drag on a player: moves the player. Before drag starts, `pushHistoryBeforeDrag` is called; after drag ends, `pushHistoryAfterDrag` is called. Routes and motion paths translate with the player (delta applied to all points).
- When zone position is unlocked for a defense player: dragging the zone circle moves the zone independently; dragging the player body moves only the body.
- Tapping/clicking an empty field area: deselects any selected player.
- Tapping/clicking a player while in Select tool mode: selects that player.
- Drawing tools (straight/curve/option): a tap/click on a selected player starts a new route segment from the player position (or motion path end if motion exists). Subsequent taps add points to the in-progress segment. Switching tool or selecting a new player finalizes the active segment.
- Motion tool: taps/clicks on the selected player add motion path points.
- Read Order tool: tapping a player's route segment toggles a read order number on that segment. If the segment already has a number, it is removed (and remaining numbers are renumbered without gaps). If not, the next available number (`nextReadOrder`) is assigned.
- Erase tool: tapping a player clears their entire route and motion path (rushers' routes cannot be erased — their path to QB is always present).
- Canvas does NOT allow page scroll while a finger is touching the canvas (`touch-action: none` or equivalent is applied).

**Canvas Data Export:**
- `getExportData()` returns a deep clone of the current `CanvasData` state (version, players, annotations).
- This is called on save, on print, and to initialize play test.

### 4.3 Right Panel — Canvas Player Card (CanvasPlayerCard)

- Width: 256px at 1024px, 288px on XL screens (`w-64 xl:w-72`).
- Only rendered when a player is selected (`cSelectedPlayer !== null`).
- Scrollable content area within a rounded card.

**Player Info Section:**
- **Designation dropdown**: editable selector.
  - For offense: values are `'Q'`, `'X'`, `'Y'`, `'Z'`, `'C'`.
  - For defense: values are `'R'`, `'D1'`, `'D2'`, `'D3'`, `'D4'`.
  - Changing designation updates `player.designation` via `onSetPlayerDesignation`. If changed to `'R'`, `coverageRadius` is cleared (rushers have no zone).
- Player name (display only, not editable here).
- Player jersey number (display only).

**Visual Properties Section:**
- **Marker Shape picker**: three shape options (circle, square, triangle). Tapping one sets `player.markerShape`.
- **Marker Color picker**: an inline color swatch (hex color picker or preset swatches). Tapping opens a color picker; selecting a color sets `player.markerColor`.
- **Label mode selector**: four options — Number, Position, Both, None. Sets `player.showLabel`.

**Defense-Only Properties:**
- **Alignment selector** (only for non-rusher defense players): options `'tight'`, `'normal'`, `'soft'`, `'off'`. These represent depth relative to the line of scrimmage. Changing alignment not only updates the property but physically moves the player's Y coordinate by a normalized offset:
  - tight: +0.025 (toward LOS)
  - normal: 0 (no change)
  - soft: -0.02 (deeper)
  - off: -0.045 (deepest)
- **Coverage Radius** field: numeric input in yards (integer, 1–20 range typical). Sets `player.coverageRadius`. Only shown for non-rusher defense players.

**Route Segments Section** (offense players only):
- Lists each `RouteSegment` in the player's `route.segments` array.
- Each segment row shows: segment type icon, segment type label, and optionally the read order number ("Read #2").
- A delete button (X) per segment. Tapping deletes that segment via `onDeleteSegment`. If the segment had a read order, remaining read order numbers are renumbered. If this was the last segment, `primaryTarget` is cleared.
- Rollout segments for QB are listed and deletable; deleting one also clears `motionPath`.

**Suggest Route (Blur AI)** (offense players only):
- A "Suggest Route" button that sends the current canvas state to an AI endpoint.
- A suggested route preview is drawn on the canvas as a distinct visual overlay (dashed or lighter rendering) without committing it.
- The player card shows "Accept" and "Discard" actions while a preview is active.
- Accepting applies the suggested route to the player's actual route segments.
- Discarding clears the preview.
- On error: shows an error state in the player card.

**Undo / Redo Buttons:**
- Compact undo and redo buttons at the bottom of the player card.
- Functionally identical to the toolbar undo/redo buttons.

---

## 5. Mobile Layout (Viewports below 1024px)

On mobile, the three-panel desktop layout is replaced with a single-panel "tab switching" layout.

### 5.1 Mobile Bottom Tab Bar

- A fixed horizontal bar at the bottom of the screen.
- Contains 2–3 tab buttons:
  - **Canvas** tab (always present): icon + "Canvas" label.
  - **Roster** tab (always present): icon + "Roster" label.
  - **Details** tab (only shown when a player is selected): icon + "Details" label.
- The active tab is highlighted with primary color text.
- Tapping a tab switches `activePanel` to `'canvas'`, `'roster'`, or `'details'`.
- When the selected player is cleared (e.g. by tapping empty canvas area), the Details tab disappears and `activePanel` auto-switches back to `'canvas'`.

### 5.2 Canvas Panel (Mobile)

The canvas panel uses a CSS Grid layout: 48px left column (tools rail) + 1fr right column (canvas + action strip).

**Mobile Action Strip** (top-right of canvas panel, right column row 1):
- White/card background, only top-right corner rounded (top-left flush with tools column).
- Contains from left to right:
  1. Undo button (44px × 44px, muted color, accent background on hover).
  2. Redo button (same).
  3. Separator line (1px × 28px).
  4. For offense plays: play speed dropdown (shows current speed as e.g. "1×", chevron down, opens speed options 0.5–3×).
  5. For offense plays: Play/Reset button (green). Shown as play icon when `simulationState !== 'play_over'`, rotate-counterclockwise when `'play_over'`. Same disabled rules as desktop Play button.
  6. For offense plays: Coverage overlay dropdown (pushed to the right edge via `margin-left: auto`). Shows shield icon + label. When a ghost defense is active: highlighted border and tinted background.

**Mobile Left Tools Rail** (48px wide, full height of canvas panel, left column spanning both rows):
- White/card background, only top-left corner rounded.
- Scrollable vertically if more tools than available height.
- Tool buttons stacked top-to-bottom (40px × 40px each, 8px border radius):
  1. Select (mouse pointer icon).
  2. Straight route (minus/line icon). Disabled for defense.
  3. Curve route (spline icon). Disabled for defense.
  4. Option route (git-branch icon). Disabled for defense.
  5. Motion (move/arrows icon). Disabled when `motionToolDisabled`.
  6. Read Progression (list-ordered icon). Disabled when `readOrderDisabled`.
  7. Zone Position (crosshair icon). Only visible when `showZonePositionButton === true`. Active state uses amber coloring.
  8. Primary Target (target icon). Only visible when `canSetPrimaryTarget === true`. Uses amber coloring.
  9. Erase (eraser icon). Disabled for defense.
  10. Clear All Routes (trash icon). Always available. Uses destructive color on hover.
- The active tool button has a primary-colored filled background with white icon (inverted).
- Disabled buttons have 35% opacity and are not tappable.

**Mobile Tool Tip Overlay:**
- On every tap of a tool button, a floating tooltip appears to the right of the tapped button.
- The tooltip is Teleported to `<body>` (fixed position, high z-index).
- Content: the button's `aria-label` text.
- Position: `right` edge of the tapped button + 10px horizontal offset; vertical center aligned to the button's vertical center.
- A small left-pointing arrow (CSS triangle) on the left edge of the tooltip.
- Visible for approximately 1.8 seconds, then fades out with a CSS transition.
- Only one tooltip visible at a time; re-tapping any button resets the timer.

**Canvas Area** (right column, row 2):
- Same canvas rendering as desktop. Field fills the full available height.
- Touch interaction: single-finger drag to move players. Multi-finger gestures do not zoom (no pinch-zoom implemented).
- Prevents page scroll when touch starts on the canvas.

### 5.3 Roster Panel (Mobile)

- Replaces the canvas completely (positioned `absolute, inset: 0`).
- The CanvasRosterCard component fills the panel.
- Scrollable independently.

### 5.4 Details Panel (Mobile)

- Replaces the canvas completely.
- The CanvasPlayerCard component fills the panel.
- Scrollable independently.

---

## 6. Canvas Data Model

All canvas state is represented by the `CanvasData` structure, serialized as JSONB in the database.

### 6.1 CanvasData

```
CanvasData {
  version: number          // Current schema version = 2
  players: CanvasPlayer[]  // All players on the field
  annotations: CanvasAnnotation[]  // Text/arrow/line overlays
  ghost_defense_play_id: string | null  // Saved ghost defense play ID
  view_mode: 'fit' | 'full'  // Saved view preference (desktop only)
}
```

Version 1 → Version 2 migration: `route.points[]` (flat array) is converted to `route.segments[{ points, type }]`. This migration runs automatically whenever canvas data is loaded.

### 6.2 CanvasPlayer

```
CanvasPlayer {
  id: string                  // Local unique ID (e.g. "p1716000000000")
  x: number                   // Normalized horizontal position 0.0 (left) – 1.0 (right)
  y: number                   // Normalized vertical position 0.0 (top/defense end) – 1.0 (bottom/offense end)
  position: string            // 'QB' | 'WR' | 'C' | 'DB' | 'RSH' | 'MLB'
  designation: string         // Display label; offense: 'Q'|'X'|'Y'|'Z'|'C'; defense: 'R'|'D1'|'D2'|'D3'|'D4'
  side: 'offense' | 'defense'
  route: CanvasRoute | null   // Route data including segments
  motionPath: CanvasPoint[] | null  // Pre-snap motion path points
  number?: number             // Jersey number (from roster player)
  name?: string               // Player name (from roster player)
  coverageRadius?: number     // Zone radius in yards; defense non-rushers only
  coverageZoneUnlocked?: boolean   // When true, zone can be positioned independently
  coverageZoneX?: number      // Zone center X (0–1) when unlocked
  coverageZoneY?: number      // Zone center Y (0–1) when unlocked
  alignment?: 'tight' | 'normal' | 'soft' | 'off'  // Defensive depth
  primaryTarget?: boolean     // When true, QB always throws to this receiver
  markerShape?: 'circle' | 'square' | 'triangle'
  markerColor?: string        // Hex color override
  showLabel?: 'number' | 'position' | 'both' | 'none'
}
```

**Field Coordinate System:**
- `x = 0` is the left sideline; `x = 1` is the right sideline.
- `y = 0` is the top of the field (where the defensive offense positions face); `y = 1` is the bottom.
- Offense lines up near `y = losY` (LOS computed from field settings); the QB is placed at `y = losY + 5 * oneYard`.
- Defense lines up above the LOS (`y < losY`), with yOffset values negative (e.g., `-5` yards = `losY - 5 * oneYard`).
- `oneYard = 1 / totalLength` where `totalLength = field_length + (endzone_size * 2)`.
- `losY = (endzone_size + field_length - line_of_scrimmage) * oneYard`.

### 6.3 CanvasRoute

```
CanvasRoute {
  segments: RouteSegment[]
}
```

### 6.4 RouteSegment

```
RouteSegment {
  points: CanvasPoint[]   // Array of {x, y} in 0–1 field coordinates
  type: 'straight' | 'curve' | 'option' | 'rollout'
  readOrder?: number      // 1, 2, 3... read progression label; absent = no assignment
}
```

- **straight**: line drawn through points in order.
- **curve**: bezier/arc path through points.
- **option**: dashed line (alternate/hot route).
- **rollout**: QB scramble path; synced with `motionPath` on QB.

### 6.5 CanvasPoint

```
CanvasPoint { x: number; y: number }
```

### 6.6 CanvasAnnotation

```
CanvasAnnotation {
  id: string
  type: 'text' | 'arrow' | 'line'
  x: number; y: number    // Anchor point in 0–1 coords
  text?: string           // For type='text'
  points?: CanvasPoint[]  // For type='arrow' or 'line'
  color: string           // Hex color
}
```

---

## 7. Formation Auto-Assign

When a new play is created or the play type is changed (new plays only), `resetFormation()` is called to populate the canvas with default player positions.

### 7.1 Slot Definitions

**Offense slots by player count:**
- 5: QB (x=0.5, yOffset=+5), C (x=0.5, yOffset=0), WR (x=0.2, yOffset=0), WR (x=0.8, yOffset=0), WR (x=0.65, yOffset=0)
- 6: adds WR at x=0.35
- 7: adds WR at x=0.5
- 8: adds WR at x=0.15

**Defense slots by player count:**
- 5: RSH (x=0.5, yOffset=-7), MLB (x=0.5, yOffset=-5), DB (x=0.2, yOffset=-5), DB (x=0.8, yOffset=-5), DB (x=0.5, yOffset=-10)
- 6: adds DB at x=0.35, yOffset=-7
- 7: adds DB at x=0.65, yOffset=-7
- 8: adds DB at x=0.25, yOffset=-12

yOffset is in yards; converted to normalized Y using `oneYard`. Defense offsets are negative (i.e., `losY - absOffset * oneYard`).

### 7.2 Starter Matching Algorithm

If starters are provided (from the active team), each slot is filled by:
1. First trying to find a starter whose team-assigned position matches the slot position (from `starterPositionMap`, a `Record<playerId, position>` from `team_players`).
2. If no match: finding a starter whose capability list (`offense_positions` or `defense_positions`) includes the slot position.
3. If still no match: taking the next available starter from the pool.

Each used starter is removed from the pool after assignment so no player fills two slots.

If no starters are available, slots are populated with position-only placeholder entries (number=0, name=position string).

### 7.3 Rusher Default Route

After defense formation is initialized, the Rusher (RSH) automatically receives a straight route segment pointing toward the QB's position. This provides a visual arrow showing the rush path without requiring manual drawing.

### 7.4 Coverage Defaults

Non-rusher defense players are initialized with `coverageRadius = 5` yards and `alignment = 'normal'`.

---

## 8. Undo / Redo System

The undo/redo system is a global history stack stored in `useCanvas`.

### 8.1 History Stack

- Type: `CanvasData[]` (full snapshots).
- Maximum depth: 30 entries (`HISTORY_CAP`). When exceeded, the oldest entry is removed.
- `historyIndex` tracks the current position in the stack.
- `canUndo = historyIndex > 0`
- `canRedo = historyIndex >= 0 && historyIndex < stack.length - 1`

### 8.2 Snapshot Triggers

A `pushHistory()` call (which stores the entire current `CanvasData` snapshot) is made:
- After adding a player.
- After removing a player.
- After starting a route segment, adding a point to a segment.
- After finalizing a segment.
- After deleting a route segment.
- After clearing all routes.
- Before and after a drag operation (two calls: pre-drag state and post-drag state).
- After assigning or removing a read order.
- After adding a motion point.
- After updating a player attribute.
- After setting player designation.

### 8.3 Undo / Redo Actions

- `undo()`: decrements `historyIndex`, deep-clones the snapshot at the new index into `canvasData`, syncs `nextReadOrder` from routes, resets `activeSegmentIndex`, sets `isDirty = true`.
- `redo()`: increments `historyIndex`, applies snapshot the same way.

### 8.4 Seed History

`seedHistory()` is called once after initial canvas data is loaded (or after `resetFormation` on a new play). It initializes the stack with a single snapshot at index 0, giving the user a clean starting point to undo back to.

---

## 9. Ghost Defense Overlay

### 9.1 Purpose

The ghost defense overlay allows an offense play designer to see how a particular defensive scheme covers the field while drawing routes, without the defense players being part of the offense play design.

### 9.2 Loading Ghost Plays

When the ghost defense dropdown is opened (desktop or mobile), `fetchDefensePlaysForGhost()` is called:
- For managers: queries `plays` table filtered by `play_type = 'defense'` AND `user_id = current_user`, joined with `playbooks` for the playbook name. Ordered by `updated_at DESC`.
- For players with an active team: queries plays via `team_playbooks` — first fetches `playbook_id`s from `team_playbooks` where `team_id = activeTeamId`, then queries `plays` filtered to those playbook IDs and `play_type = 'defense'`.
- For players without a team: empty list.

### 9.3 Selecting a Ghost Play

When a defense play is selected from the dropdown:
- The play's `canvas_data.players` array is deep-cloned into `ghostPlayers`.
- `ghostPlayId` is set to the play's ID.
- Ghost players are passed to the canvas renderer for semi-transparent rendering.

### 9.4 Restoring on Load

On load of an existing offense play, if `canvas_data.ghost_defense_play_id` is set, `loadGhostPlayById` is called:
- Queries the single play by ID from `plays` table.
- Sets `ghostPlayers` and `ghostPlayId`.
- Adds that play to `defensePlaysForGhost` array so it shows as the selected item in the dropdown.

### 9.5 Saving Ghost Defense Selection

When canvas data is saved (auto-save or manual), `ghostPlayId` is written into `canvas_data.ghost_defense_play_id`.

---

## 10. Save Flow

### 10.1 Saving a New Play

1. User clicks "Save Play" button.
2. `SavePlayDialog` opens. Contains:
   - Play name input (pre-filled with `currentPlay.name`, editable).
   - Playbook selector (lists user's playbooks; required).
   - Confirm button (disabled while saving).
3. On confirm:
   - `isSaving = true`.
   - Canvas export data is assembled including `ghost_defense_play_id` and `view_mode`.
   - **Manager flow**: calls `createPlay(playbookId, name, playType, formation, starters, fieldSettings)` which inserts a default-formation play, then immediately calls `updatePlay(newPlay.id, { canvas_data })` to overwrite with the actual drafted canvas data.
   - **Player flow**: calls `POST /api/plays/create-for-team` with `{ team_id, play_name, play_type, canvas_data, formation }`. This endpoint creates the play in a team-accessible context.
   - On success: dialog closes, router navigates to `/plays/[newPlayId]` (replaces history entry).
   - On error: toast shown; dialog remains open.
   - `isSaving = false` in `finally`.

### 10.2 Saving an Existing Play

1. User clicks "Save Changes" button (desktop) or equivalent mobile action.
2. `handleSave()` is called immediately (no dialog).
3. `canvasRef.getExportData()` is called to get current canvas state.
4. Payload assembled: `{ ...canvasData, ghost_defense_play_id: ghostPlayId, view_mode: viewModeToPersist() }`.
5. `saveCanvasData(playId, payload)` is called → `updatePlay(id, { canvas_data, updated_at })`.
6. `isDirty` is set to false on the canvas.
7. Success toast shown.

### 10.3 Auto-Save (Canvas @save event)

The `PlayCanvas` component emits a `@save` event with the current `CanvasData` whenever a debounced internal save trigger fires. The parent handles this by calling `handleSaveData(data)`:
- For new plays: stores the data in `currentPlay.canvas_data` in memory (no DB call). Sets `isDirty = false` on canvas.
- For existing plays: calls `saveCanvasData(playId, payload)` — a full update.

---

## 11. Share Play

**Trigger:** "Share" button in header center zone (hidden for new plays).

**Dialog (`SharePlayDialog`):**
- Shows "Share" heading.
- Calls `getOrCreateShareLink(play, { ghostPlayers })` on open.
  - Checks for existing active share in `shared_plays` table for this play/user.
  - If exists: updates the snapshot (in case routes changed) and returns the existing token.
  - If not: inserts a new row with a random 32-char hex `share_token`, play snapshot (including `_ghost_players` if ghost players are active), play name, type, and formation.
- Displays the shareable URL: `https://[app-domain]/shared/[token]`.
- A "Copy Link" button copies the URL to the clipboard.
- Optional "Revoke" button: sets `is_active = false` on the share record.

**Shared Play View (`/shared/[token]`):**
- Fetches from `shared_plays` table: `play_name, play_type, play_formation, play_snapshot` where `share_token = token` AND `is_active = true`.
- No authentication required (anon access allowed by RLS policy).
- Renders a minimal page: top bar with FlagLab logo, play name, type icon, formation label, print button. Then the canvas (read-only rendering). Footer credit.
- If not found or inactive: shows error state with "Play not found" message.
- Print button: same `usePlayPrint` flow as the designer.

---

## 12. Notify Team (Managers Only)

**Trigger:** Bell icon button in header center zone (hidden for new plays, hidden for players).

**Dialog:**
- Title: "Notify Team".
- Description: `Send a notification about "[play name]" to your team.`
- **Team dropdown**: lists the manager's teams excluding "Free Agent" pseudo-team.
- **Message textarea** (optional): placeholder "Add a message for your team…", 3 rows.
- Confirm button: "Send Notification" (shows spinner + "Sending…" while in-flight). Disabled when no team selected or sending.
- Cancel button.

**Submission:**
- `POST /api/notifications/notify-team` with body:
  ```
  {
    team_id: string,
    type: 'new_play',
    title: 'New play: [play name]',
    message: string | undefined,
    metadata: { play_id: string }
  }
  ```
- On success: dialog closes; success toast "Team notified".
- On error: error toast.

---

## 13. Print

**Trigger:** Printer icon button in header.

**Behavior:**
1. If simulation is currently running or `play_over`, clears the simulation overlay first.
2. Switches view mode to "full" temporarily.
3. Applies print CSS classes to `<html>`: sets `--play-field-aspect-ratio`, `--play-print-width`, `--play-print-height` CSS custom properties based on field dimensions.
4. Calls `canvas.prepareForPrint()` which re-renders the canvas at high resolution.
5. Waits two animation frames for paint to complete.
6. Calls `window.print()`.
7. After `afterprint` event fires: restores saved view mode, removes print CSS properties, restores canvas.

**Print Dimensions:**
- Computed to fit within 7.5in × 9in (US Letter page minus margins).
- Aspect ratio: `field_width / (field_length + endzone_size * 2)`.
- Width and height are set as CSS `in` units.
- A print header (play name + "Offense"/"Defense" label) is visible only in print media (`display: none` normally, shown via `@media print`).

---

## 14. Play Test (usePlayTest / usePlaySimulation)

### 14.1 Initialization

`playTest.initialize(offensePlayers, defensePlayers, roster, fieldSettings)` is called before each run.
- `offensePlayers`: current canvas offense players (from `getExportData().players` filtered to `side === 'offense'`).
- `defensePlayers`: the current ghost defense players array (may be empty).
- `roster`: the roster Player objects with full attribute data.
- `fieldSettings`: `{ field_length, field_width, endzone_size, line_of_scrimmage }`.
- Always runs in `playTestMode: true` (guaranteed catch, anticipation-based throw timing, primary target respected).

### 14.2 States

- `idle`: no simulation data. Canvas renders normally.
- `running`: simulation is executing frame by frame using `requestAnimationFrame`. `animatedPositions` and `animatedBall` are updated each frame based on elapsed time and `playbackSpeed`.
- `play_over`: simulation ended. Last frame positions are frozen. Canvas still shows animated positions. Play button replaced by Reset button.

### 14.3 Playback Speed

The `playbackSpeed` ref (default 1.0) scales the simulation time step. At 0.5×, everything moves at half speed; at 3×, triple speed. Can be changed before or during a run.

### 14.4 Clearing

`clearOverlay()` sets `simulationState = 'idle'`, clears `animatedPositions` and `animatedBall`, and resets internal simulation state. This causes the canvas to revert to static player rendering.

---

## 15. Keyboard Shortcuts (Desktop Only)

- **Cmd+Z** (macOS) / **Ctrl+Z** (Windows): Undo. Fires only when focus is not on a text input, textarea, select, or contenteditable element.
- **Cmd+Shift+Z** / **Ctrl+Shift+Z**: Redo. Same focus exclusion.
- All other interactions are mouse/touch only (no keyboard tool switching).

---

## 16. Navigation

| Destination | Trigger |
|-------------|---------|
| `/playbooks/[playbookId]` | Back navigation (if `currentPlay.playbook_id` is set) |
| `/playbooks` | Back navigation (if no playbook ID) |
| `/plays/[newId]` | After saving a new play (router.replace) |
| `/shared/[token]` | Via the Share dialog URL (external; opens in browser) |
| `/plays/new` | Via "New Play" buttons throughout the app |

---

## 17. Data Layer

### 17.1 Supabase Tables Read

| Table | Columns | Filter |
|-------|---------|--------|
| `plays` | `*` | `id = playId` (single play load) |
| `playbooks` | `name` | `id = play.playbook_id` (for breadcrumb) |
| `plays` | `id, name, canvas_data, playbook_id, playbooks!inner(name)` | `play_type = 'defense'`, `user_id = currentUser.id` OR `playbook_id IN [team playbooks]` (ghost dropdown) |
| `team_playbooks` | `playbook_id` | `team_id = activeTeamId` (ghost dropdown for players) |
| `field_settings` | `*` | `user_id = currentUser.id` |
| `players` | `*` | `user_id = currentUser.id` |
| `teams` | `*, team_players(*, player:players(*))` | `user_id = currentUser.id` |
| `team_memberships` | `team:teams(*, team_players(*))` | `user_id = currentUser.id` |
| `shared_plays` | `share_token` | `play_id, user_id, is_active = true` |

### 17.2 Supabase Tables Written

| Table | Operation | Trigger |
|-------|-----------|---------|
| `plays` | UPDATE (`canvas_data`, `updated_at`) | Auto-save and manual save |
| `plays` | UPDATE (`name`) | Name field change on existing play |
| `plays` | UPDATE (`play_type`) | Play type switch on existing play |
| `plays` | INSERT | Save new play (manager flow) |
| `plays` | UPDATE (`canvas_data`) | After INSERT, to apply drafted canvas |
| `shared_plays` | INSERT | First share of a play |
| `shared_plays` | UPDATE (`play_snapshot`, `is_active`) | Re-share (update snapshot) or revoke |

### 17.3 API Endpoints Called

| Endpoint | Method | Body | Trigger |
|----------|--------|------|---------|
| `/api/plays/create-for-team` | POST | `{ team_id, play_name, play_type, canvas_data, formation }` | Save new play (player flow) |
| `/api/notifications/notify-team` | POST | `{ team_id, type, title, message?, metadata }` | Notify Team dialog confirm |

### 17.4 Key Composables

- `usePlays()`: `fetchPlay`, `createPlay`, `updatePlay`, `saveCanvasData`, `initDraftPlay`
- `useCanvas()`: the entire canvas state machine (history, tools, player management, route drawing)
- `usePlayTest()`: wraps `usePlaySimulation` for play preview
- `useSharePlay()`: `getOrCreateShareLink`, `revokeShareLink`, `buildShareUrl`
- `useFieldSettings()`: `fetchSettings`, `settings`
- `usePlayers()`: `fetchPlayers`, `players`
- `useTeams()`: `fetchTeams`, `teams`
- `usePlayPrint()`: `runPrint`
- `usePlayDesignerUI()`: `activePanel`, `setPanel` (mobile tab state)
- `useBreakpoint()`: `isDesktop` (breakpoint detection at 1024px)
- `useAccountType()`: `isManager`, `isPlayer`
- `useActiveContext()`: `activeTeamId` (currently active team for ghost defense scoping)
