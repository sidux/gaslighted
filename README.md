# Gaslighted

A satirical, cartoony game that simulates a tense corporate remote meeting where the player, Russel (Wojak), must time their flatulence releases perfectly while NPCs talk corporate nonsense.

## Game Concept

In "Gaslighted," you play as Russel, an unfortunate employee who just ate something spicy before an important remote meeting. You cannot mute your microphone and must manage your rising fart pressure, timing releases to coincide with dialogue, laughter, or background noise from other meeting participants.

## Core Gameplay

- **Hold SPACE** to reduce the rate of pressure increase, simulating holding in a fart.
- **Release SPACE** to let it out, ideally timed with someone speaking.
- The **fart pressure meter** shows safe zones where you can release without being detected.
- Each speaker has their **own speech rhythm** (like a beat or cadence).
- You need to **match your fart rhythm** to theirs **without overlapping with pauses** — similar to a stealthy rhythm game during conversations.
- **Visual indicators** show optimal timing windows for releasing your farts.
- **Releasing at the wrong moment reduces player credibility**, and NPCs **react with custom facial/audio expressions**.
- **If pressure builds too high**, it can auto-release at the worst possible moment.
- **Later levels** feature more complex speech patterns and stricter requirements.

## Technical Architecture

Built with Phaser 3 and TypeScript, following SOLID principles:

- **YAML-driven level system** for fully customizable gameplay
- **Neural Speech Mark processing** for dynamic rhythm extraction from dialogue
- **Visual safe zone indicators** synchronized with speech patterns
- **Speech rhythm display** showing upcoming speaking patterns
- Modular components for farts, facial expressions, and NPC reactions
- Text-to-speech audio generation with Speech Marks for precise timing
- Corporate jargon generator for authentic meeting nonsense

## Speech Rhythm System

The game uses advanced speech mark processing to create a dynamic rhythm-based gameplay:

1. **Speech Marks**: JSON files containing timing information for each word in the dialogue
2. **Safe Zones**: Automatically calculated based on when characters are speaking
3. **Rhythm Display**: Visual representation of upcoming speech patterns
4. **Feedback System**: Real-time indicators of timing quality

### Generating Speech Marks

To generate speech marks for new dialogue:

1. Install AWS SDK dependencies:
   ```
   npm install aws-sdk js-yaml
   ```

2. Configure AWS credentials for Polly access

3. Run the generation script:
   ```
   node scripts/generate_speech_marks.js
   ```

This will create speech mark JSON files in the `audio/dialogue/speech_marks` directory, which the game uses to create precise timing windows.

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
