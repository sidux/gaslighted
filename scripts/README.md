# Audio Generation Scripts

## Generate Audio Files

The `generate-audio.js` script pre-generates all the audio files needed for game dialogues using Amazon Polly's text-to-speech service.

### Prerequisites

Before running the script, make sure:

1. You have AWS credentials with Polly access
2. You've set the credentials in the `.env` file at the project root
3. You have Node.js installed
4. You've installed all required dependencies with `npm install`

### Usage

Run the script from the project root:

```bash
node scripts/generate-audio.js
```

### What it does

1. Reads all level files from the `levels` directory
2. For each dialogue in the level:
   - Determines the appropriate voice based on the character
   - Generates a unique filename based on the speaker, voice, and text content
   - Calls Amazon Polly to generate the audio
   - Saves the audio file to `audio/dialogue/`

3. Creates a mapping file (`levelname_mapping.json`) in the audio directory that maps dialogue text to the corresponding audio filename

### Output

The script will create:
- MP3 files for each dialogue line in the `audio/dialogue/` directory
- A JSON mapping file for each level in the same directory

### Notes

- The script only generates audio for dialogue that doesn't already have a corresponding audio file
- It uses the neural engine for better quality voices
- Voice mapping follows the same configuration as in the game
