# Traps - Real-time Trivia Game with Sabotage Mechanics

A multiplayer trivia game where players compete to answer AI-generated medium-difficulty questions fastest while throwing traps at opponents.

## Game Overview

- **Players**: 2+ players on mobile devices
- **Host**: Configures game settings and monitors gameplay
- **Presenter**: Displays live game state on big screen for spectators

## Game Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                              LOBBY                                   │
│  - Host configures: total rounds, question time (default 15s)       │
│  - Players join and enter their names                               │
│  - Host starts game when ready (minimum 2 players)                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         GET READY (5s)                               │
│  - Shows countdown "Get Ready!" animation                           │
│  - 4 random categories selected from pool in background             │
│  - Auto-advances when countdown complete AND categories ready       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         CATEGORY VOTE                                │
│  - 4 random categories from predefined pool (30 topics)             │
│  - All players see same 4 options                                   │
│  - Players vote for preferred category                              │
│  - Majority wins, random tie-breaker                                │
│  - Offline players are skipped                                      │
│  - 15 second voting time                                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         TRAP SELECTION                               │
│  - 20 second timer (always runs full duration)                      │
│  - AI generates question in background during this phase            │
│  - Each player MUST select one trap to throw                        │
│  - Each player MUST select a target player                          │
│  - All 4 trap types available every round                           │
│  - A player can only throw ONE trap per round                       │
│  - A player CAN receive multiple traps from different players       │
│  - Offline players are skipped                                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           QUESTION                                   │
│  - AI-generated medium-difficulty question for selected category    │
│  - 4 possible answers, only 1 correct                               │
│  - Timer based on host config (default 15s)                         │
│  - Players must clear traps before answering                        │
│  - Faster correct answers = more points                             │
│  - Timer ends early when all online players answered                │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         ROUND RESULTS                                │
│  - Show correct answer                                              │
│  - Show points earned this round per player                         │
│  - Show running leaderboard                                         │
│  - 5 second display time                                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │  More rounds remaining?   │
                    └─────────────┬─────────────┘
                          │               │
                         YES              NO
                          │               │
                          ▼               ▼
               [GET READY]        ┌─────────────────────┐
                                  │    FINAL RESULTS    │
                                  │  - Podium display   │
                                  │  - Final scores     │
                                  │  - Confetti!        │
                                  └─────────────────────┘
```

## Scoring System

Points are awarded based on speed of correct answer:

```
Base Points: 100 (for correct answer)
Speed Bonus: 0-900 points (faster = more)

Formula:
  timeToAnswer = answerTimestamp - questionStartTimestamp
  maxTime = questionTimeSeconds * 1000 (in ms)
  speedRatio = 1 - (timeToAnswer / maxTime)
  speedBonus = floor(speedRatio * 900)
  totalPoints = isCorrect ? (100 + speedBonus) : 0

Examples (15s question time):
  - Answer in 1s  → 100 + 840 = 940 points
  - Answer in 5s  → 100 + 600 = 700 points
  - Answer in 10s → 100 + 300 = 400 points
  - Answer in 14s → 100 + 60  = 160 points
  - Wrong answer  → 0 points
```

## Trap Types

### 1. Ice Trap ❄️

- **Effect**: Freezes all 4 answer buttons with ice overlay
- **Clear Method**: Tap each frozen answer 3 times to break the ice
- **Behavior**:
  - Player can choose to break only one answer's ice to answer quickly
  - Breaking ice does NOT select the answer - requires separate tap to answer
  - Visual: Ice crack effect on each tap

### 2. Mud Trap 🟤

- **Effect**: Covers all 4 answer buttons with mud/viscous substance
- **Clear Method**: Swipe across each answer to wipe away mud
- **Behavior**:
  - Player can reveal answers selectively
  - Swiping does NOT select the answer - requires separate tap to answer
  - Visual: Mud smear that clears on swipe

### 3. Mixed Letters Trap 🔀

- **Effect**: Scrambles the letters in each answer text
- **Clear Method**: None - player must decipher scrambled text
- **Behavior**:
  - Letters are randomly shuffled but deterministic (same for all observers)
  - Spaces and punctuation remain in place
  - Visual: Jumbled text display

### 4. Missing Letters Trap ⬜

- **Effect**: Replaces ~40% of letters with underscores
- **Clear Method**: None - player must guess missing letters
- **Behavior**:
  - Random letters removed but deterministic
  - Spaces and punctuation remain visible
  - Visual: Text with `_` placeholders

### Multiple Traps Stacking

- A player can receive multiple traps from different players
- All traps must be dealt with (ice broken, mud swiped) before answering
- Mixed Letters and Missing Letters both apply to text simultaneously
- Order of trap application: Ice → Mud → Text effects (Mixed/Missing)

## Configuration (Host-Controlled)

| Setting       | Default    | Description                     |
| ------------- | ---------- | ------------------------------- |
| Total Rounds  | 10         | Number of questions in the game |
| Question Time | 15 seconds | Time limit per question         |

## Phase Timings

| Phase          | Duration                   | Notes                                         |
| -------------- | -------------------------- | --------------------------------------------- |
| Get Ready      | 5 seconds                  | Countdown + category generation in background |
| Category Vote  | 15 seconds                 | Auto-advances when time expires               |
| Trap Selection | 20 seconds                 | Always runs full duration (AI generates Q)    |
| Question       | Configurable (15s default) | Ends early when all online players answered   |
| Round Results  | 5 seconds                  | Auto-advance to next phase                    |

## Technical Requirements

### Mobile Optimization

- Touch-friendly buttons (minimum 44x44px tap targets)
- Swipe gesture detection for mud trap
- Responsive layout for various screen sizes
- Fast tap response for ice breaking

### Real-time Synchronization

- Server-synchronized timestamps for fair scoring
- Live vote counts during category selection
- Real-time trap activity feed on presenter view
- Immediate answer submission confirmation

### Offline Player Handling

- Skip offline players in voting tallies
- Skip offline players in trap selection completion check
- Skip offline players in "all answered" detection
- Show offline status in player lists

## Views

### Player Views

1. **Create Profile** - Name entry
2. **Game Lobby** - Waiting for host to start
3. **Game Starting** - "Get Ready!" countdown
4. **Category Vote** - 4 topic buttons with vote counts
5. **Trap Selection** - 4 trap types + player list + timer
6. **Question** - Timer + 4 answers + trap overlays
7. **Round Results** - Points earned + leaderboard
8. **Final Results** - Podium with top 3 + animated scores

### Host Views

1. **Lobby** - Configuration controls + player list + start button
2. **Game Monitor** - Current phase + question + trap activity + scores

### Presenter Views

1. **Lobby** - QR code + player list
2. **Category Vote** - Live vote counts + leaderboard sidebar
3. **Trap Selection** - Trap activity feed + leaderboard sidebar
4. **Question** - Question + timer + answer progress + leaderboard sidebar
5. **Round Results** - Correct answer + leaderboard with round points
6. **Final Results** - Winner announcement + podium with confetti

## Categories & AI

### Category Pool (30 Topics)

Categories are randomly selected from this predefined pool each round:

- World Geography, Classic Movies, Science & Nature, Sports History
- Pop Music, Ancient History, Food & Cooking, Technology
- Literature, Space Exploration, World Cultures, Famous Inventions
- Animals, Art & Artists, Television Shows, Mythology
- Olympics, Video Games, World Capitals, Ocean Life
- Famous Scientists, Musical Instruments, World Languages, Dinosaurs
- Weather & Climate, Famous Buildings, Board Games, Superheroes
- National Parks, Desserts & Sweets

### Question Generation (AI)

```
Generate 1 medium-difficulty trivia question about [CATEGORY].
Return as JSON with:
- question: string (the question text)
- answers: string[] (4 possible answers)
- correctIndex: number (0-3, index of correct answer)

Requirements:
- Question should be challenging but fair
- All wrong answers should be plausible
- Answers should be similar length
- No trick questions
```
