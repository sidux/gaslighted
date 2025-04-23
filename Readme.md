### 🎮 Game Prompt – **Gaslighted**

Build a 2D satire game in **React + TypeScript**. The player (Wojak) is stuck in a corporate Zoom-like meeting and can’t mute. A **fart pressure meter** builds during the call. They must **release pressure discreetly** by clicking karaoke-style letters, timed with character speech (via **Amazon Polly viseme metadata**).

---

### 🧱 Core Systems

#### 🔺 Fart Pressure (can go **negative**)
- Starts at `0`, increases over time
- Reduced by timed releases
- Can go **below 0** — this becomes the **final score**
- Max = **auto fart**

#### 🔻 Shame Meter (0–100)
- Increases on:
  - OK fart = low shame
  - Missed/full fart = high shame
- Full = **game over (player resigns)**

#### 🎯 Combo System
- Consecutive perfect farts = combo
- Combo rewards:
  - Extra pressure relief
  - Bonus score
  - Visual/audio effects
- Any mistake = combo break

#### 💨 Fart Types (6 MP3s)
- Mapped to viseme phoneme types (`t`, `p`, `b`, `f`, `r`, `z`)
- Each triggers:
  - A specific sound (`fart1.mp3` to `fart6.mp3`)
  - Matching NPC reaction (face change, sound, camera FX)

---

### 📘 Level Completion

- A level ends **when all dialogue lines are finished**
- Victory condition:
  - **Shame < 100**
  - Reached the end of the meeting
- Final score = **negative pressure value** (lower is better)

---

### 👥 Characters

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
- Animate between talking1, talking2, neutral talking1 ... while speaking.
- React with different expressions to each fart type:
  - perfect (no reaction)
  - okay
  - bad
- the player character (wojak) must also react to the fart sound and has more expressions. depending on pressure build up, loosing with max shame, wining, having a silent fart etc.

---

### 🗂️ Level Format (`/levels/[id].yaml`)

```yaml
id: level1
title: First Day Jitters
description: Your first remote meeting. Thankfully, people are forgiving.

rules:
  pressure_buildup_speed: 1.2
  precision_window_ms: 250
  pressure_release:
    perfect: 30
    okay: 15
  shame_gain:
    okay: 10
    real: 40

participants:
  - id: wojak
    voiceType: Russel
    type: player

  - id: boomer
    voiceType: Brian
    type: npc

  - id: zoomer
    voiceType: brandon
    type: npc

  - id: karen
    voiceType: Amy
    type: npc

dialogue:
  - speakerId: boomer
    text: Welcome to the quarterly review meeting.  We have lots to discuss today.
  - speakerId: zoomer
    text: Hey everyone!  I'm super excited to share our Q4 results!

```

- `voice` is selected in the YAML
- `audio` must be `.mp3`
- `karaoke_letters` computed in code from `visemes`

---

### 📁 File Structure

```
/levels/              # One YAML per level
/dialogue/            # MP3 + viseme JSON per line of diagogue [levelId]-[dialogueItemIndex]-[characterId].mp3 and [levelId]-[dialogueItemIndex]-[characterId]-metadata.json
/assets/faces/        # [id]-[expression].png
/assets/audio/        # fart1.mp3 ... fart6.mp3
/components/          # React components
/logic/               # game logic independent of framework
/scripts/             # Polly + viseme generator (MP3 + JSON)
```

---
