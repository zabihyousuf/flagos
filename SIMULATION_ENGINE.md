# FlagOS Play Simulation Engine

## Overview

The Play Simulation Engine is a comprehensive physics and AI-driven system that simulates the execution of flag football plays. It allows you to test offensive plays against defensive schemes to see how they perform in real game scenarios.

## Features

### 🎮 Simulation States

The simulation progresses through these states:

1. **Pre-Snap** - Players line up in their initial positions
2. **Snap** - Ball snaps from center to QB
3. **Motion** - Pre-snap motion executes (if designed)
4. **Routes Developing** - Receivers run routes, defenders move to zones
5. **QB Reading** - QB reads the defense and decides when/where to throw
6. **Ball in Air** - Ball travels to target receiver
7. **Catch Attempt** - Receiver attempts to catch (success/drop/INT)
8. **Post-Catch** - Ball carrier runs, defenders pursue
9. **Play Over** - Final outcome determined

### 🧠 AI Decision Making

#### Quarterback AI
- **Read Progression**: Follows designed read order (1st, 2nd, 3rd read)
- **Pressure Awareness**: Throws earlier when rushers are close
- **Attribute-Driven**:
  - `decision_making` - How well QB follows progression
  - `pocket_awareness` - How well QB senses pressure
  - `accuracy` - Affects throw precision
  - `throwing_power` - Affects ball speed
  - `football_iq` - Better progression reading

#### Defensive AI
- **Rushers**: Rush directly toward QB with speed boost
- **Coverage Players**:
  1. Move to assigned zone first
  2. Cover nearest receiver in zone
  3. React to ball carrier after catch
- **Pursuit**: All defenders chase ball carrier post-catch
- **Flag Pull**: Determined by distance + `flag_pulling` attribute

### 📊 Outcome Determination

#### Catches
Success based on:
- Receiver's `catching` and `hands_consistency` attributes
- Separation from nearest defender
- `contested_catch` attribute when covered closely
- Ball accuracy from QB

#### Interceptions
Occur when:
- Defender very close to receiver (< 0.8 field units)
- Random chance weighted by defender's `ball_hawking` attribute
- Poor throw accuracy

#### Sacks
Occur when:
- Rusher reaches QB before throw
- QB can't find open receiver in time

### 🎯 Player Attributes Used

#### Universal (All Players)
- `speed` - Base movement speed
- `acceleration` - How quickly they reach top speed
- `agility` - Affects route running smoothness
- `reaction_time` - Affects decision speed
- `field_vision` - Helps find open space

#### Quarterback
- `throwing_power` - Ball speed
- `accuracy` - Throw precision
- `decision_making` - Read progression quality
- `pocket_awareness` - Pressure sensing
- `release_quickness` - Throw speed
- `throw_timing` - Anticipation

#### Wide Receiver
- `route_running` - Speed through cuts
- `catching` - Base catch probability
- `hands_consistency` - Drops vs catches
- `contested_catch` - Catches under pressure
- `separation` - Creating space
- `after_catch_vision` - YAC ability

#### Defensive Back
- `coverage` - Staying with receiver
- `ball_hawking` - Interception chance
- `zone_awareness` - Zone coverage quality
- `closing_burst` - Speed to receiver
- `flag_pull_technique` - Flag pull success

#### Rusher
- `rush` - Rush power/speed
- `rush_moves` - Getting past blockers
- `get_off_burst` - Snap reaction
- `rush_angle_efficiency` - Path to QB
- `sack_flag_conversion` - Finishing the sack

### 🎨 Visual Features

- **Live Animation**: Smooth player movement along routes
- **Ball Physics**: Realistic ball flight and catching
- **Coverage Zones**: Visual zone radius for defenders
- **Separation Indicators**: Green glow on open receivers during QB read
- **Ball Carrier Highlight**: Gold ring around player with ball
- **Route Visualization**: See designed routes as players run them

### ⚡ Controls

- **Run Play**: Start the simulation
- **Pause/Resume**: Stop/continue simulation
- **Reset**: Return to pre-snap state
- **Speed Control**: 0.1x (slow-mo) to 3x (fast-forward)

### 📈 Results

Each simulation produces:
- **Outcome**: completion | incompletion | interception | sack | scramble
- **Yards Gained**: Based on where flag is pulled or play ends
- **Event Log**: Timestamped play-by-play of all events
- **Player Stats**: Who caught it, who made the tackle, etc.

### 🔄 Independent Simulations

**IMPORTANT**: Each simulation run is completely independent. The engine uses randomness and player attributes to determine outcomes, so:
- Running the same play twice can produce different results
- This simulates real game variability
- Better players/plays will succeed more often, but not always
- Run plays multiple times to see average performance

## Usage

1. Navigate to **Simulation → Scenario Test**
2. Select an **Offensive Play** from your playbooks
3. Select a **Defensive Play** to test against
4. Click **Run Play** to start simulation
5. Watch the play unfold in real-time
6. Review results and event log
7. Click **Run Play** again to simulate another rep (outcome will vary)

## Technical Architecture

### Core Components

1. **`usePlaySimulation.ts`**
   - State machine for simulation phases
   - Physics engine for player movement
   - AI decision logic for QB and defense
   - Collision detection and catch mechanics

2. **`useSimulationRenderer.ts`**
   - Canvas-based rendering
   - Player visualization
   - Ball animation
   - Coverage zone overlays

3. **`scenario.vue`**
   - UI for play selection
   - Control panel for simulation
   - Event log display
   - Results presentation

### Physics Model

- Field coordinates: 0-1 normalized (0,0 = top-left, 1,1 = bottom-right)
- Movement: Vector-based with speed from attributes
- Time: Delta time-based (smooth across frame rates)
- Routes: Bezier/linear interpolation along segments
- Ball: Projectile motion with velocity vectors

## Future Enhancements

Potential additions:
- [ ] Wind and weather conditions
- [ ] Fatigue system (stamina affects late-play speed)
- [ ] Injury risk simulation
- [ ] Advanced stats (completion %, avg yards, success rate)
- [ ] Batch simulation (run 100 reps automatically)
- [ ] Heat maps (where completions happen)
- [ ] Export simulation video/GIF
- [ ] Formation strength analysis
- [ ] AI-suggested adjustments

## Tips for Best Results

1. **Design Clear Routes**: Well-defined routes produce better simulations
2. **Set Read Progression**: Assign read order (1, 2, 3) to receiver routes
3. **Use Real Player Data**: Accurate attributes = realistic outcomes
4. **Test Multiple Times**: Run same matchup 5-10 times to see consistency
5. **Vary Defensive Schemes**: Test against different coverages
6. **Watch Separation**: Pay attention to when receivers get open
7. **QB Pressure**: Notice how rush pressure affects decision-making

## Known Limitations

- Center doesn't block (flag football has no blocking)
- No "hot routes" or audibles
- Defenders don't jump routes or anticipate
- No penalties or turnovers (fumbles)
- Ball carrier always tries to advance (no sliding/going down)
- Weather/field conditions not modeled

---

**Built with**: Vue 3, TypeScript, HTML5 Canvas, Physics simulation
**Performance**: Optimized for 60fps animation on all devices
