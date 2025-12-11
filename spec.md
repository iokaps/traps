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
│  - Host starts game when ready                                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         CATEGORY VOTE                                │
│  - AI generates 4 general knowledge topics                          │
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
│  - 30 second timer (reduces to 5s when all players done)            │
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
│  - AI generates 1 medium-difficulty question for selected category  │
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
               [CATEGORY VOTE]    ┌─────────────────────┐
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

| Phase          | Duration                   | Notes                               |
| -------------- | -------------------------- | ----------------------------------- |
| Category Vote  | 15 seconds                 | Or when all online players voted    |
| Trap Selection | 30 seconds                 | Reduces to 5s when all players done |
| Question       | Configurable (15s default) | Ends early when all answered        |
| Round Results  | 5 seconds                  | Auto-advance to next phase          |

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

## Sound Effects (Free Assets)

| Event                   | Sound                |
| ----------------------- | -------------------- |
| Ice tap/crack           | Cracking ice sound   |
| Mud swipe               | Wet splat/wipe sound |
| Trap thrown             | Whoosh sound         |
| Correct answer          | Positive chime       |
| Wrong answer            | Negative buzz        |
| Timer warning (5s left) | Ticking/beep         |
| Round complete          | Short fanfare        |
| Game over               | Celebration sound    |

## Views

### Player Views

1. **Create Profile** - Name entry
2. **Game Lobby** - Waiting for host to start
3. **Category Vote** - 4 topic buttons with vote counts
4. **Trap Selection** - 4 trap types + player list + timer
5. **Question** - Timer + 4 answers + trap overlays
6. **Round Results** - Points earned + leaderboard
7. **Final Results** - Podium with top 3

### Host Views

1. **Lobby** - Configuration controls + player list + start button
2. **Game Monitor** - Current question + trap activity + scores

### Presenter Views

1. **Lobby** - QR code + player list
2. **Category Vote** - Live vote counts
3. **Trap Selection** - Trap activity feed (who threw what at whom)
4. **Question** - Question text + timer + answer progress
5. **Round Results** - Animated score reveal + leaderboard
6. **Final Results** - Podium with confetti

## AI Prompts

### Category Generation

```
Generate 4 diverse general knowledge topics for a trivia game.
Return as JSON array of strings.
Topics should be specific enough to generate questions but broad enough for variety.
Examples: "Ancient Egyptian History", "90s Pop Music", "Space Exploration", "World Cuisine"
```

### Question Generation

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

## Sound Effects

Sound files should be placed in `public/sounds/`. The game uses the `useSoundEffects` hook for one-shot audio playback.

### Sound Files Required

| Sound         | File                | When Played                                 |
| ------------- | ------------------- | ------------------------------------------- |
| Ice Break     | `ice-break.mp3`     | When tapping ice trap overlay               |
| Mud Clear     | `mud-clear.mp3`     | When swiping mud trap away                  |
| Trap Throw    | `trap-throw.mp3`    | When selecting and throwing a trap          |
| Correct       | `correct.mp3`       | When showing round results (correct answer) |
| Incorrect     | `incorrect.mp3`     | When showing round results (wrong answer)   |
| Timer Warning | `timer-warning.mp3` | When question timer reaches 5 seconds       |
| Button Click  | `button-click.mp3`  | When selecting an answer                    |
| Vote          | `vote.mp3`          | When voting for a category                  |
| Game Over     | `game-over.mp3`     | When showing final results                  |

### Free Sound Resources

- [Freesound.org](https://freesound.org)
- [Pixabay Sound Effects](https://pixabay.com/sound-effects/)
- [Zapsplat](https://www.zapsplat.com)
