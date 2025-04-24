# Game – **Gaslighted**

## Concept
**Gaslighted** - A 2D satirical corporate survival game built in **React + TypeScript** where players navigate the social minefield of remote meetings. Players control "Wojak," trapped in a Google Meet-style video call with unmutable audio. A **fart pressure meter** builds continuously during the meeting, requiring timely, strategic releases that must be disguised among ongoing conversation by typing specific letters at precise moments, synchronized with speech patterns (using **Amazon Polly viseme metadata**).

## Installation and Running the Game

### Prerequisites
- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/sidux/gaslighted.git
   cd gaslighted
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Game
1. To start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3001
   ```

### Building for Production
1. To create a production build:
   ```bash
   npm run build
   ```

2. The built files will be in the `dist` folder

### Game Controls
- Press the highlighted letters (T, P, K, F, R, Z) when they appear over words during the meeting
- Time your key presses correctly for best results:
  - **Perfect**: Silent fart, pressure relief, and no shame
  - **Okay**: Quieter fart, some pressure relief, and minimal shame
  - **Bad**: Loud fart, less pressure relief, and high shame
  - **Terrible**: Extremely loud fart that occurs when pressure maxes out, with minimal pressure relief and maximum shame

---

## Core Mechanics

### Gameplay Loop
1. Listen to ongoing meeting dialogue (in karaoke style with highlighted words)
2. Watch for highlighted fart opportunity moments during speech
3. Press the correct letter (matching the viseme) at the right time
4. Answer questions when prompted (correct answers decrease shame, incorrect answers increase it)
5. Manage pressure meter while minimizing shame
6. Achieve combos for score multipliers and pressure relief
7. Complete the entire meeting without being discovered

### Input System
- Player must press the correct key corresponding to a viseme phoneme type (`t`, `p`, `k`, `f`, `r`, `z`) (close viseme sounds are also accepted)
- Timing window determines success quality (perfect, okay, bad)
- Each success level has different effects on pressure and shame

---

### 🧱 Core Systems

#### UI
- Game should be responsive
- UI should be as close as possible to Google Meet (e.g., hangout button quits the game, non-relevant buttons disabled - simulating a bug)
- Karaoke text for current dialogue highlighting current words, with fart letter to press above
- Question/answer UI integrated into the dialogue flow:
  - Questions display multiple-choice answers (shown in random order)
  - Timer bar showing remaining time to answer
  - Cool animations for time running out, correct/incorrect answers
  - Accelerated heartbeat effect when time is low
- Audio playback for answers and feedback
- Farting release UI effects
- Screen effects for critical pressure states:
  - Screen pulsing
  - Slight blur effect
  - Visual feedback for shame levels
- Shiny effects with combos etc. like Guitar Hero

#### 🔺 Fart Pressure (can go **negative**)
- Starts at `0`, increases over time
- Reduced by timed releases
- Can go **below 0** — this becomes the **final score**
- Max = **auto fart**

#### 🔻 Shame Meter (0–100)
- Increases on:
  - OK fart = low shame
  - Missed/Bad fart = high shame
- Full = **game over (player resigns)**

#### 🎯 Combo System
- Consecutive perfect farts = combo
- Combo rewards:
  - Extra pressure relief
  - Bonus score
  - Visual/audio effects
- Any mistake = combo break

#### Fart Types (6 MP3s)
- Mapped to viseme phoneme types (`t`, `p`, `k`, `f`, `r`, `z`) (and close viseme sounds)
- Each triggers:
  - A specific sound (`t-fart.mp3`, `z-fart.mp3` etc)
  - Matching NPC reaction (face change, sound, camera FX)
  - the fart sound volume should be louder than the dialogue when it' bad and lower when it's okay, and silent when it's perfect.

---

### Level Completion

- A level ends **when all dialogue lines are finished**
- Victory condition:
  - Reached the end of the meeting
- Final score = **negative pressure value** (lower is better)

---

### Characters

- **wojak** (player)
- **zoomer**
- **boomer**
- **karen**

Each character has:
```
[id]-talking1.png
[id]-talking2.png
[id]-neutral.png
[id]-perfect-fart-reaction.png
[id]-okay-fart-reaction.png
[id]-bad-fart-reaction.png
...
```

Stored in: `src/assets/faces/`

🗣️ Characters must:
- Animate by changing faces talking1 -> talking2 -> neutral -> talking1 ... while speaking.
- React with different expressions to each fart type:
  - perfect (no reaction)
  - okay
  - bad
- the player character (wojak) must also react to the fart sound and has more expressions. depending on pressure build up, loosing with max shame, wining, having a silent fart etc.

---

### Level Format (`src/assets/levels/[id].json`)

See example in `src/assets/levels/level1.json`

The level format now supports a question/answer system where players must respond to questions during the meeting. This adds an additional gameplay element where correct answers reduce shame and incorrect answers increase it.

#### Question Format
```json
{
  "speaker": "character-id",
  "answers": [
    {
      "text": "Answer option text (first option is always correct)",
      "correct": true
    },
    {
      "text": "Incorrect answer option",
      "correct": false
    },
    ...more options...
  ]
}
```

#### Feedback Format
Feedback appears after the player answers a question:
```json
{
  "speaker": "character-id",
  "feedback": [
    {
      "text": "Feedback for correct answer",
      "correct": true
    },
    {
      "text": "Feedback for incorrect answer",
      "correct": false
    }
  ]
}
```

#### Question/Answer Effects
The `rules` section of the level includes new properties:
- `question_pressure_multiplier`: Increases pressure buildup during questions
- `question_effects`: Contains properties for shame changes and heart effects
- `question_time_limit`: Time to answer (e.g. "10s")

Audio files for questions and feedback follow this naming pattern:
- Answers: `[levelId]-[dialogueIndex]-[speakerId]-answer-[answerIndex].mp3`
- Feedback: `[levelId]-[dialogueIndex]-[speakerId]-feedback-[correct/incorrect].mp3`

---

### File Structure

```
src/assets/dialogue/     # MP3 + viseme JSON per line of diagogue [levelId]-[dialogueItemIndex]-[characterId].mp3 and [levelId]-[dialogueItemIndex]-[characterId]-metadata.json
src/assets/faces/        # [id]-[expression].png
src/assets/audio/        # z-fart.mp3 ...
src/assets/levels/       # level1.json ...
src/components/          # React components
src/logic/               # game logic independent of framework
src/scripts/             # Polly + viseme generator (MP3 + JSON)
```

---
