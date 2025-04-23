# Game – **Gaslighted**

## Concept
**Gaslighted** - A 2D satirical corporate survival game built in **React + TypeScript** where players navigate the social minefield of remote meetings. Players control "Wojak," trapped in a Google Meet-style video call with unmutable audio. A **fart pressure meter** builds continuously during the meeting, requiring timely, strategic releases that must be disguised among ongoing conversation by typing specific letters at precise moments, synchronized with speech patterns (using **Amazon Polly viseme metadata**).

---

## Core Mechanics

### Gameplay Loop
1. Listen to ongoing meeting dialogue (in karaoke style with highlighted words)
2. Watch for highlighted fart opportunity moments during speech
3. Press the correct letter (matching the viseme) at the right time
4. Manage pressure meter while minimizing shame
5. Achieve combos for score multipliers and pressure relief
6. Complete the entire meeting without being discovered

### Input System
- Player must press the correct key corresponding to a viseme phoneme type (`t`, `p`, `b`, `f`, `r`, `z`) (close viseme sounds are also accepted)
- Timing window determines success quality (perfect, okay, bad)
- Each success level has different effects on pressure and shame

---

### 🧱 Core Systems

#### UI
- game should responsive
- ui should be as close as possible to google meet, for example hangout will just quit te game return the main menu, non relveant buttons should be disabled. (simulating a bug)
- should have a karaoke text for the current dialogue highlighting the current word, with the letter (related to the fart) to press above.
- farting release UI effects
- should shiny effects with combos etc like guitar hero

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
- Mapped to viseme phoneme types (`t`, `p`, `b`, `f`, `r`, `z`) (and close viseme sounds)
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

Stored in: `/assets/faces/`

🗣️ Characters must:
- Animate by changing faces talking1 -> talking2 -> neutral -> talking1 ... while speaking.
- React with different expressions to each fart type:
  - perfect (no reaction)
  - okay
  - bad
- the player character (wojak) must also react to the fart sound and has more expressions. depending on pressure build up, loosing with max shame, wining, having a silent fart etc.

---

### Level Format (`/levels/[id].json`)

check example in src/assets/level1.json

---

### File Structure

```
/dialogue/            # MP3 + viseme JSON per line of diagogue [levelId]-[dialogueItemIndex]-[characterId].mp3 and [levelId]-[dialogueItemIndex]-[characterId]-metadata.json
/assets/faces/        # [id]-[expression].png
/assets/audio/        # z-fart.mp3 ...
/assets/levels/       # level1.json ...
/components/          # React components
/logic/               # game logic independent of framework
/scripts/             # Polly + viseme generator (MP3 + JSON)
```

---
