# Gaslighted

A satirical, cartoony game that simulates a tense corporate remote meeting where the player, Russel (Wojak), must time their flatulence releases perfectly while NPCs talk corporate nonsense.

## Game Concept

In "Gaslighted," you play as Russel, an unfortunate employee who just ate something spicy before an important remote meeting. You cannot mute your microphone and must manage your rising fart pressure, timing releases to coincide with dialogue, laughter, or background noise from other meeting participants.

## Core Gameplay

- The **fart pressure meter** increases steadily.
- Holding in farts changes Russel's **facial expression dynamically**.
- Farting resets the meter but must be **timed with dialogue**, laughter, or background noise.
- **Releasing at the wrong moment reduces player credibility**, and NPCs **react with custom facial/audio expressions**.
- **If the player does nothing**, pressure can auto-release, leading to **embarrassment and potential failure**.
- **Later levels** are more strict: some allow minor mistakes, but the final level is **no-mistake allowed**.

## Technical Architecture

Built with Phaser 3 and TypeScript, following SOLID principles:

- **YAML-driven level system** for fully customizable gameplay
- Modular components for farts, facial expressions, and NPC reactions
- Text-to-speech audio generation for NPC dialogue
- Corporate jargon generator for authentic meeting nonsense

## Building and Running

1. Install dependencies:
   ```
   npm install
   ```

2. Run in development mode:
   ```
   npm run dev
   ```

3. Build for production:
   ```
   npm run build
   ```

## Level Creation

Levels are defined in YAML files located in the `levels` directory. Each level specifies:

- Participants with their character types and voice styles
- Dialogue sequences with timing and "safety status" for fart opportunities
- Difficulty parameters

## Credits

Created as a satirical take on remote work culture. All characters are fictional.

## License

MIT License
