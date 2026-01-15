# Training XP System – Endurance & Speed Domains

**Version:** 1.0 Draft  
**Last Updated:** January 14, 2026  
**Status:** Pending Expert Review

---

## Overview

The Training XP System allows athletes to earn XP from regular training activities (runs, rides, swims) synced from Strava or Garmin. This supplements the existing Challenge-based XP system to ensure endurance athletes can progress at a fair rate compared to skill-based disciplines.

### Goals
1. **Fair progression** – Runners/cyclists who train 3-4 days/week should progress comparably to ninja/strength athletes
2. **Reward consistency** – Weekly active day bonuses encourage regular training
3. **Prevent gaming** – Caps and validation prevent XP exploits
4. **Low friction** – Auto-sync from Strava/Garmin, no manual logging

---

## Unit Preferences

Athletes can choose their preferred unit system in their profile settings. All XP calculations use metric internally, with automatic conversion for display.

### Setting

| Setting | Options | Default |
|---------|---------|--------|
| Unit System | Metric / Imperial | Based on locale |

### Conversion Factors

| Metric | Imperial | Conversion |
|--------|----------|------------|
| 1 km | 0.621 mi | Distance |
| 1 m | 3.281 ft | Elevation |
| min/km | min/mi | Pace |

### Display Examples

**Metric user sees:**
- Distance: 10 km
- Elevation: 400 m
- Pace: 5:30/km

**Imperial user sees:**
- Distance: 6.2 mi
- Elevation: 1,312 ft
- Pace: 8:51/mi

### Internal Calculation

All XP formulas use metric values. Imperial inputs are converted before calculation:

```
Distance (km) = Distance (mi) × 1.609
Elevation (m) = Elevation (ft) × 0.305
```

---

## XP Calculation Formula

### Base  (Experience Points)

```
Base XP = (distance_km × 2) + (elevation_gain_m × 0.05)
```

| Component | Value | Example |
|-----------|-------|---------|
| Distance  | 2 XP per km | 10 km = 20 XP |
| Elevation | 0.05 XP per meter | 400m gain = 20 XP |

**Example: 10K run with 400m elevation gain**
- Distance: 10 × 2 = 20 XP
- Elevation: 400 × 0.05 = 20 XP
- **Base XP: 40 XP**

---

### Terrain Bonus (Elevation per KM)

Hillier routes earn bonus XP to account for increased effort.

| Elevation Gain per KM | Classification | Multiplier |
|----------------------|----------------|------------|
| < 20 m/km | Flat | 1.0× |
| 20-40 m/km | Rolling | 1.15× |
| 40-70 m/km | Hilly | 1.30× |
| > 70 m/km | Mountain | 1.50× |

**Example: 10K with 600m gain (60m/km = Hilly)**
- Base XP: (10 × 2) + (600 × 0.05) = 20 + 30 = 50 XP
- Hilly multiplier: 50 × 1.30 = **65 XP**

---

### Effort Multiplier (Heart Rate Zones)

If heart rate data is available, effort is rewarded. Higher intensity = higher multiplier.

| Zone | % of Max HR | Description | Multiplier |
|------|-------------|-------------|------------|
| Z1 | < 60% | Recovery | 0.5× |
| Z2 | 60-70% | Easy/Aerobic | 1.0× |
| Z3 | 70-80% | Tempo | 1.1× |
| Z4 | 80-90% | Threshold | 1.2× |
| Z5 | > 90% | VO2max/Sprint | 1.25× |

*If no HR data available, defaults to 1.0×*

**Note:** Max HR can be set in athlete profile or calculated as `220 - age`.

---

### Activity Type Multipliers

Different activities have different effort-per-km. Multipliers normalize this.

| Activity Type | Multiplier | Rationale |
|---------------|------------|-----------|
| Running | 1.0× | Baseline |
| Trail Running | 1.1× | Uneven terrain, technical |
| Cycling | 0.4× | Less effort per km (wheeled) |
| Mountain Biking | 0.5× | Harder than road cycling |
| Swimming | 3.0× | Very high effort per km |
| Open Water Swim | 3.2× | Currents, navigation |
| Rowing/Kayaking | 2.0× | Full body effort |
| Hiking | 0.7× | Slower but sustained |
| Walking | 0.3× | Low intensity |
| Cross-Country Skiing | 1.5× | Full body, high effort |

---

### Final XP Calculation

```
Final XP = Base XP × Terrain Multiplier × Effort Multiplier × Activity Multiplier
```

**Full Example: Trail run, 15K, 800m elevation, Z3 effort**
- Base XP: (15 × 2) + (800 × 0.05) = 30 + 40 = 70 XP
- Terrain: 800m / 15km = 53m/km → Hilly → 1.30×
- Effort: Z3 → 1.1×
- Activity: Trail Running → 1.1×
- **Final: 70 × 1.30 × 1.1 × 1.1 = 110 XP** (before caps)

---

## Domain Assignment

Training activities award XP to relevant domains based on activity type and distance.

### Running

| Distance | Primary Domain | Secondary Domain |
|----------|---------------|------------------|
| < 1 km (sprint) | Speed (100%) | - |
| 1-5 km | Speed (60%) | Endurance (40%) |
| > 5 km | Endurance (80%) | Speed (20%) |

### Cycling

| Distance | Primary Domain | Secondary Domain |
|----------|---------------|------------------|
| < 20 km | Speed (50%) | Endurance (50%) |
| 20-50 km | Endurance (70%) | Speed (30%) |
| > 50 km | Endurance (100%) | - |

### Other Activities

| Activity | Primary Domain | Secondary Domain |
|----------|---------------|------------------|
| Swimming | Endurance (70%) | Skill (30%) |
| Trail Running | Endurance (70%) | Skill (30%) |
| Hiking | Endurance (100%) | - |
| Rowing | Endurance (60%) | Strength (40%) |

---

## Daily Caps

Prevents over-training exploits and encourages sustainable training.

| Cap Type | Limit | Rationale |
|----------|-------|-----------|
| Daily XP | 50 XP | ~25K run equivalent |
| Daily Distance | 50 km | Prevents ultra spam |
| Daily Activities | 3 | Prevents micro-activity spam |

**What happens when capped:**
- XP stops accumulating for that day
- Activity is still logged (for weekly totals)
- Athlete is encouraged to rest

---

## Weekly Caps & Bonuses

### Base Weekly Cap

| Cap Type | Base Limit |
|----------|------------|
| Weekly Training XP | 250 XP |
| Weekly Distance | 200 km |

### Weekly Volume Bonuses

Higher training volume unlocks higher caps and bonus XP.

| Weekly Distance | Bonus XP | New Weekly Cap |
|-----------------|----------|----------------|
| 20-40 km | +20 XP | 250 XP |
| 40-70 km | +40 XP | 300 XP |
| 70-100 km | +60 XP | 350 XP |
| 100-150 km | +80 XP | 400 XP |
| 150+ km | +100 XP | 450 XP |

*Volume bonus is added once at end of week*

### Weekly Active Day Bonuses

Reward consistency without encouraging unsafe consecutive training (rest days prevent injury).

| Days Active This Week | Bonus XP |
|----------------------|----------|
| 3 days | +15 XP |
| 4 days | +30 XP |
| 5+ days | +50 XP |

*"Active" = at least 1 qualifying activity (min 1 km / 0.6 mi)*

**Note:** Days do NOT need to be consecutive. Taking rest days is healthy and encouraged.

---

## Weekly Summary Example

**Athlete: Recreational runner, 30 years old (20-40 km/week typical)**

| Day | Activity | Distance | Elevation | Effort | Raw XP | Capped XP |
|-----|----------|----------|-----------|--------|--------|-----------|
| Mon | Rest | - | - | - | 0 | 0 |
| Tue | Easy run | 5 km | 30m | Z2 | 12 | 12 |
| Wed | Rest | - | - | - | 0 | 0 |
| Thu | Tempo run | 8 km | 60m | Z3 | 22 | 22 |
| Fri | Rest | - | - | - | 0 | 0 |
| Sat | Long run | 12 km | 150m | Z2 | 32 | 32 |
| Sun | Recovery jog | 5 km | 20m | Z1 | 6 | 6 |

**Weekly Totals (Metric):**
- Distance: 30 km (18.6 mi)
- Elevation: 260 m (853 ft)
- Raw XP from activities: 72 XP
- Active day bonus (4 days): +30 XP
- Volume bonus (20-40 km): +20 XP
- **Total Weekly XP: 122 XP**

**Imperial Display:** 18.6 mi, 853 ft vert

At this rate: ~500 XP/month → About half a rank per month (F-rank = 1000 XP)

---

## Advanced Runner Example

**Athlete: Competitive runner, 25 years old (50-70 km/week)**

| Day | Activity | Distance | Elevation | Effort | Raw XP | Capped XP |
|-----|----------|----------|-----------|--------|--------|-----------|
| Mon | Easy run | 8 km | 50m | Z2 | 18 | 18 |
| Tue | Intervals | 10 km | 80m | Z4 | 31 | 31 |
| Wed | Easy run | 8 km | 40m | Z2 | 18 | 18 |
| Thu | Tempo run | 12 km | 100m | Z3 | 33 | 33 |
| Fri | Rest | - | - | - | 0 | 0 |
| Sat | Long run | 22 km | 350m | Z2 | 62 | 50 (capped) |
| Sun | Recovery | 6 km | 30m | Z1 | 7 | 7 |

**Weekly Totals:**
- Distance: 66 km (41 mi)
- Raw XP from activities: 157 XP
- Active day bonus (6 days): +50 XP
- Volume bonus (40-70 km): +40 XP
- **Total Weekly XP: 247 XP**

At this rate: ~1000 XP/month → About 1 full rank per month

---

## Breakthrough Challenges (Rank Gates)

Training XP fills your progress bar, but **you cannot advance to the next letter rank without completing a Breakthrough Challenge**.

### How It Works

1. Athlete trains → accumulates XP → reaches rank threshold (e.g., F9 → E0)
2. XP over the cap becomes "banked XP" (saved but not applied)
3. Athlete must complete the **Breakthrough Challenge** for their target rank
4. Upon completion, rank advances and banked XP is applied

### Why Breakthroughs?
- Ensures athletes can actually perform at their rank level
- Prevents pure volume grinding without skill demonstration
- Creates meaningful milestone moments

### EXAMPLE Endurance Breakthrough Challenges

| Breakthrough | Target | Notes |
|--------------|--------|-------|
| F → E | Complete a 5K | Any pace, just finish |
| E → D | 10K under 65 min | Moderate pace requirement |
| D → C | Half Marathon finish | 21.1 km, any pace |
| C → B | Half Marathon under 2:00 | ~5:40/km pace |
| B → A | Marathon finish | 42.2 km, any pace |
| A → S | Marathon under 3:30 | ~5:00/km pace |

*All times are for Adult Male 18-29. Other divisions have adjusted targets.*

### Speed Breakthrough Challenges

| Breakthrough | Target | Notes |
|--------------|--------|-------|
| F → E | 400m sprint | Any time |
| E → D | 400m under 80s | |
| D → C | 200m under 35s | |
| C → B | 400m under 65s | |
| B → A | 100m under 14s | |
| A → S | 100m under 12s | Elite level |

### Division Adjustments

Breakthrough targets scale by age and gender division, using the same grading matrix as regular challenges.

---

## Anti-Cheating Measures

### 1. GPS Requirement

- Activities **must have GPS data** from Strava/Garmin
- Manual entries are rejected (except by coaches/admins)
- Indoor treadmill runs: Allowed only if paired with HR data AND reasonable pace

### 2. Pace Sanity Checks

Activities outside humanly possible ranges are rejected.

| Activity | Minimum Pace | Maximum Pace |
|----------|--------------|--------------|
| Running | 2:30/km (world record) | 12:00/km |
| Cycling | 10 km/h | 60 km/h avg |
| Swimming | 1:00/100m | 4:00/100m |

**Note:** Pace variation within an activity is NOT flagged – trail running naturally has slow uphills and fast downhills.

### 3. Minimum Thresholds

| Threshold | Value | Reason |
|-----------|-------|--------|
| Minimum distance | 1 km | No micro activities |
| Minimum duration | 5 min | No accidental starts |
| Minimum avg speed | 4 km/h | Must be actually moving |

### 4. Duplicate Detection

No XP if activity matches an existing record:
- Same source + external ID (Strava activity ID)
- Overlapping time window (start time within 80% of duration)

### 5. Strava/Garmin Flags

If the source platform flags an activity (e.g., "possibly erroneous"), it's auto-rejected.

### 6. Daily/Weekly Caps

Even if someone tries to game the system with high volume, caps limit the maximum possible XP.

| Cap | Limit |
|-----|-------|
| Daily XP | 50 XP |
| Weekly XP | 250-450 XP (based on volume) |

### 7. No Retroactive Sync

Only activities from **after account linking** count toward XP. Historical activities cannot be imported for XP.

### 8. Activity Review Dashboard

Admins and coaches can review flagged or reported activities with full data visualization.

**Review Interface Shows:**

| Data | Visualization | Red Flags |
|------|---------------|----------|
| **Pace Graph** | Line chart over time/distance | Sudden impossible speed changes |
| **Heart Rate Graph** | Line chart with zone bands | Flat line (fake), no correlation to effort |
| **Elevation Profile** | Area chart of route | Doesn't match claimed vert |
| **GPS Map** | Route overlay on map | Teleporting, straight lines, car routes |
| **Splits Table** | Per-km/mi breakdown | Individual km faster than WR pace |
| **Cadence Graph** | Steps/strokes per minute | Abnormal patterns |

**Comparison View:**
- HR vs Pace correlation (effort should match speed)
- Cadence vs Pace (should correlate)
- Grade-adjusted pace (GAP) vs actual pace

**Reviewer Actions:**
| Action | Effect |
|--------|--------|
| Approve | XP awarded (for manual review queue) |
| Reject | No XP, activity flagged |
| Reduce XP | Partial award (e.g., treadmill without GPS) |
| Ban User | Account suspended for cheating |

**Auto-Flag Triggers (for manual review):**
- Activity in top 0.1% of user's history
- Pace variance < 5% over long distance (unrealistic consistency)
- HR flat at unusual value (e.g., exactly 150 for 2 hours)
- GPS quality score below threshold
- User has previous rejected activities

---

## XP Comparison: Training vs Challenges

| Source | XP Range | Frequency |
|--------|----------|-----------|
| Easy training run (5K) | 10-15 XP | 2-3x/week |
| Hard training run (10K hills) | 30-40 XP | 1-2x/week |
| Long run (12-15K) | 35-50 XP | Weekly |
| Weekly bonuses | 35-90 XP | Weekly |
| **Recreational runner weekly total** | **100-150 XP** | - |
| **Competitive runner weekly total** | **200-300 XP** | - |
| F-tier challenge completion | 25 XP | One-time |
| D-tier challenge completion | 75 XP | One-time |
| B-tier challenge completion | 150 XP | One-time |
| Breakthrough challenge | Unlocks rank | One-time |

**Balance:** 
- Recreational runner (3-4 days, 25-35 km/week): ~500 XP/month
- Competitive runner (5-6 days, 50-70 km/week): ~1000 XP/month
- Ninja athlete completing 6-8 challenges/month: ~400-600 XP/month

---

## Questions for Expert Review

1. **XP per KM (2 XP)** – Does this feel right for running? Too high/low?

2. **Elevation bonus (0.05 XP/m)** – Is this enough to reward hilly runs? A 1000m elevation run only adds 50 XP.

3. **Terrain multipliers** – Are the thresholds (20/40/70 m/km) appropriate for classifying terrain difficulty?

4. **Activity multipliers** – Is cycling at 0.4× fair compared to running? Should swimming be 3×?

5. **Daily cap (50 XP)** – Does this unfairly penalize ultra runners doing 50K+ training runs?

6. **Weekly caps (250-450 XP)** – Are these appropriate for different training volumes?

7. **Heart rate zones** – Should Z1 recovery runs be penalized (0.5×) or is that discouraging active recovery?

8. **Breakthrough distances** – Are the marathon/half-marathon gates appropriate for each rank?

9. **Division scaling** – What adjustments make sense for:
   - Youth (14-17)
   - Masters (40-49, 50-59, 60+)
   - Female divisions

10. **Missing activities** – Are there activity types we should add? (Nordic skiing, triathlon, etc.)

---

## Appendix: Full Calculation Examples

### Example 1: Easy Recovery Run
- **Activity:** 5 km run, 30m elevation, Z1 effort
- Base XP: (5 × 2) + (30 × 0.05) = 10 + 1.5 = 11.5
- Terrain: 30m / 5km = 6m/km → Flat → 1.0×
- Effort: Z1 → 0.5×
- Activity: Running → 1.0×
- **Final: 11.5 × 1.0 × 0.5 × 1.0 = 6 XP**

### Example 2: Tempo Run
- **Activity:** 10 km run, 80m elevation, Z3 effort
- Base XP: (10 × 2) + (80 × 0.05) = 20 + 4 = 24
- Terrain: 80m / 10km = 8m/km → Flat → 1.0×
- Effort: Z3 → 1.1×
- Activity: Running → 1.0×
- **Final: 24 × 1.0 × 1.1 × 1.0 = 26 XP**

### Example 3: Mountain Trail Run
- **Activity:** 12 km trail run, 900m elevation, Z3 effort
- Base XP: (12 × 2) + (900 × 0.05) = 24 + 45 = 69
- Terrain: 900m / 12km = 75m/km → Mountain → 1.5×
- Effort: Z3 → 1.1×
- Activity: Trail Running → 1.1×
- **Final: 69 × 1.5 × 1.1 × 1.1 = 125 XP** → Capped at 50 XP daily

### Example 4: Long Bike Ride
- **Activity:** 80 km road ride, 600m elevation, Z2 effort
- Base XP: (80 × 2) + (600 × 0.05) = 160 + 30 = 190
- Terrain: 600m / 80km = 7.5m/km → Flat → 1.0×
- Effort: Z2 → 1.0×
- Activity: Cycling → 0.4×
- **Final: 190 × 1.0 × 1.0 × 0.4 = 76 XP** → Capped at 50 XP daily

### Example 5: Pool Swim
- **Activity:** 3 km swim, 0m elevation, Z3 effort
- Base XP: (3 × 2) + (0 × 0.05) = 6 + 0 = 6
- Terrain: N/A → 1.0×
- Effort: Z3 → 1.1×
- Activity: Swimming → 3.0×
- **Final: 6 × 1.0 × 1.1 × 3.0 = 20 XP**

---

## Changelog

| Version | Date | Changes |
|---------|------|--------|
| 1.1 | 2026-01-14 | Added unit preferences (metric/imperial), changed consecutive streaks to weekly active days for injury prevention, fixed recreational runner example to realistic 20-40 km/week, added advanced runner example, added activity review dashboard with HR/pace graphs |
| 1.0 | 2026-01-14 | Initial draft for expert review |
