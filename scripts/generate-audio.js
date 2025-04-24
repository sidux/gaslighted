/**
 * Generate Audio and Speech Marks Script
 * 
 * This enhanced script:
 * 1. Reads all dialogue from level files
 * 2. Generates TTS audio files using Amazon Polly with direct SSML support
 * 3. Generates corresponding speech marks for rhythm-based gameplay
 * 4. Supports neural voices with natural pauses and rhythm
 * 5. Handles question-answer format with multiple choices
 * 6. Generates audio for both answer options and feedback responses
 * 
 * Usage:
 * - Run 'npm run generate-audio' to generate all audio files
 * - Run 'npm run generate-audio:dry-run' to simulate the generation process without creating files
 * 
 * Audio file naming:
 * - Regular dialogue: [levelId]-[dialogueIndex]-[speakerId].mp3
 * - Answer options: [levelId]-[dialogueIndex]-[speakerId]-answer-[answerIndex].mp3
 * - Feedback responses: [levelId]-[dialogueIndex]-[speakerId]-feedback-[correct|incorrect].mp3
 * 
 * Speech marks are generated for all audio files with matching filenames:
 * - [filename]-metadata.json
 * 
 * Run this script before building the game to generate all required audio files.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const AWS = require('aws-sdk');
const crypto = require('crypto');
const util = require('util');
require('dotenv').config();

// Promisified filesystem operations
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: new AWS.Credentials({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  })
});

// Create Polly instance
const polly = new AWS.Polly();

// List of neural voices
const NEURAL_VOICES = [
  'Joanna', 'Matthew', 'Lupe', 'Ruth', 'Kevin', 'Stephen', 'Ivy', 'Kendra',
  'Kimberly', 'Amy', 'Emma', 'Brian', 'Aria', 'Ayanda', 'Olivia', 'Danielle',
  'Gregory', 'Arthur', 'Daniel', 'Ryland', 'Justin', 'Joey', 'Hiujin', 'Laura',
  'Niamh', 'Suvi', 'Sofie', 'Adriano', 'Arlet', 'Hannah', 'Kajal', 'Kazuha'
];

// Directory configuration
const LEVELS_DIR = path.join(__dirname, '..', 'src', 'assets', 'levels');
const AUDIO_OUTPUT_DIR = path.join(__dirname, '..', 'src', 'assets', 'dialogue');
const SPEECH_MARKS_DIR = path.join(__dirname, '..', 'src', 'assets', 'dialogue', 'speech_marks');

// Create output directories if they don't exist
async function ensureDirectories() {
  if (!fs.existsSync(AUDIO_OUTPUT_DIR)) {
    await mkdir(AUDIO_OUTPUT_DIR, { recursive: true });
  }

  if (!fs.existsSync(SPEECH_MARKS_DIR)) {
    await mkdir(SPEECH_MARKS_DIR, { recursive: true });
  }
}

/**
 * Generate a filename for a dialogue entry
 */
function generateFilename(levelId, dialogueIndex, speaker, type = 'dialogue', index = null) {
  switch (type) {
    case 'dialogue':
      // Format: [levelId]-[dialogueItemIndex]-[characterId].mp3
      return `${levelId}-${dialogueIndex}-${speaker}.mp3`;
    case 'answer':
      // Format: [levelId]-[dialogueItemIndex]-[characterId]-answer-[answerIndex].mp3
      return `${levelId}-${dialogueIndex}-${speaker}-answer-${index}.mp3`;
    case 'feedback':
      // Format: [levelId]-[dialogueItemIndex]-[characterId]-feedback-[correct|incorrect].mp3
      return `${levelId}-${dialogueIndex}-${speaker}-feedback-${index}.mp3`;
    default:
      return `${levelId}-${dialogueIndex}-${speaker}.mp3`;
  }
}

// Global variable to check if we're in dry-run mode
const isDryRun = () => process.argv.includes('--dry-run');

/**
 * Generate audio for a single dialogue entry
 */
async function generateAudio(speaker, voiceType, text, filename) {
  // If in dry-run mode, just log and return
  if (isDryRun()) {
    console.log(`[DRY RUN] Would generate audio for: "${text.substring(0, 50)}..." using voice ${voiceType}`);
    return filename;
  }
  
  try {
    // Determine if this voice supports neural
    const supportsNeural = NEURAL_VOICES.includes(voiceType);
    const engine = supportsNeural ? 'neural' : 'standard';

    console.log(`Generating audio for: "${text.substring(0, 50)}..." using voice ${voiceType} (${engine} engine)`);

    // Check if text contains SSML tags
    const isSSML = text.includes('<speak>');
    const textToUse = isSSML ? text : text;

    // Set parameters for synthesis
    const params = {
      Engine: engine,
      OutputFormat: 'mp3',
      Text: textToUse,
      TextType: isSSML ? 'ssml' : 'text',
      VoiceId: voiceType
    };

    // Call Polly to synthesize speech
    const audioData = await polly.synthesizeSpeech(params).promise();

    // Save the audio file
    const outputPath = path.join(AUDIO_OUTPUT_DIR, filename);
    await writeFile(outputPath, audioData.AudioStream);
    console.log(`Saved audio file: ${filename} (with ${engine} engine)`);

    return filename;
  } catch (err) {
    // If neural failed, try standard as fallback
    if (err.code === 'ValidationException' && err.message.includes('neural')) {
      console.log(`Neural engine not supported for voice ${voiceType}, falling back to standard engine`);

      // Retry with standard engine
      const isSSML = text.includes('<speak>');
      const textToUse = isSSML ? text : text;

      const standardParams = {
        Engine: 'standard',
        OutputFormat: 'mp3',
        Text: textToUse,
        TextType: isSSML ? 'ssml' : 'text',
        VoiceId: voiceType
      };

      try {
        const standardData = await polly.synthesizeSpeech(standardParams).promise();
        // Save the audio file
        const outputPath = path.join(AUDIO_OUTPUT_DIR, filename);
        await writeFile(outputPath, standardData.AudioStream);
        console.log(`Saved audio file: ${filename} (with standard engine)`);
        return filename;
      } catch (standardErr) {
        console.error('Error with fallback to standard engine:', standardErr);
        throw standardErr;
      }
    }

    console.error('Error generating audio:', err);
    throw err;
  }
}

/**
 * Generate speech marks for a dialogue entry
 */
async function generateSpeechMarks(speaker, voiceType, text, audioFilename) {
  // If in dry-run mode, just log and return
  if (isDryRun()) {
    console.log(`[DRY RUN] Would generate speech marks for: "${text.substring(0, 30)}..." with voice ${voiceType}`);
    return [];
  }

  try {
    // Determine if this voice supports neural
    const supportsNeural = NEURAL_VOICES.includes(voiceType);
    const engine = supportsNeural ? 'neural' : 'standard';

    console.log(`Generating speech marks for: "${text.substring(0, 30)}..." with voice ${voiceType}`);

    // Check if text contains SSML tags
    const isSSML = text.includes('<speak>');
    const textToUse = isSSML ? text : text;

    // Set parameters for speech marks
    const params = {
      Engine: engine,
      OutputFormat: 'json',
      Text: textToUse,
      TextType: isSSML ? 'ssml' : 'text',
      VoiceId: voiceType,
      SpeechMarkTypes: ['sentence', 'word', 'viseme']
    };

    // Call Polly to generate speech marks
    const data = await polly.synthesizeSpeech(params).promise();

    // Convert the response to string and parse as JSON lines
    const speechMarksText = Buffer.from(data.AudioStream).toString('utf8');
    const speechMarks = speechMarksText.split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

    // Save speech marks to file
    const outputFile = path.join(SPEECH_MARKS_DIR, audioFilename.replace('.mp3', '-metadata.json'));
    await writeFile(outputFile, JSON.stringify(speechMarks, null, 2));

    console.log(`Speech marks saved to: ${outputFile} (${speechMarks.length} marks)`);
    return speechMarks;
  } catch (err) {
    console.error('Error generating speech marks:', err);
    throw err;
  }
}

/**
 * Process all dialogue in a level file
 */
async function processLevelFile(filePath) {
  try {
    // Read and parse JSON file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const levelData = JSON.parse(fileContent);

    // Get participant voice mappings
    const participantVoices = {};
    levelData.participants.forEach(participant => {
      participantVoices[participant.id] = participant.voiceType;
    });

    // Extract level ID from file path
    const levelId = path.basename(filePath, path.extname(filePath));

    // Generate audio for each dialogue entry
    const dialogues = levelData.dialogues || [];
    const audioMap = {};

    for (let i = 0; i < dialogues.length; i++) {
      const dialogue = dialogues[i];
      const speakerId = dialogue.speaker;
      const voiceType = participantVoices[speakerId];

      if (!voiceType) {
        console.warn(`No voice type found for speaker: ${speakerId}`);
        continue;
      }

      // Case 1: Regular dialogue with text
      if (dialogue.text) {
        const text = dialogue.text;

        // Generate filename using level ID, dialogue index, and speaker ID
        const filename = generateFilename(levelId, i, speakerId);

        // Add to audio map
        audioMap[text] = filename;
        dialogue.soundFile = filename;  // Update the dialogue with the sound file

        // Check if file already exists
        const outputPath = path.join(AUDIO_OUTPUT_DIR, filename);
        const speechMarksPath = path.join(SPEECH_MARKS_DIR, filename.replace('.mp3', '-metadata.json'));

        // Track if we need to generate speech marks
        let needSpeechMarks = !fs.existsSync(speechMarksPath);

        // Generate audio if needed
        try {
          await generateAudio(speakerId, voiceType, text, filename);
          needSpeechMarks = true; // Always generate speech marks for newly created audio
        } catch (error) {
          console.error(`Error generating audio for "${text.substring(0, 30)}..."`, error.message);
          continue;
        }

        // Generate speech marks if needed
        if (needSpeechMarks) {
          try {
            await generateSpeechMarks(speakerId, voiceType, text, filename);
          } catch (error) {
            console.error(`Error generating speech marks for "${text.substring(0, 30)}..."`, error.message);
          }
        } else {
          console.log(`Speech marks already exist for: ${filename}`);
        }
      } 
      // Case 2: Dialogue with answers (question)
      else if (dialogue.answers && dialogue.answers.length > 0) {
        console.log(`Processing answers for dialogue ${i} (question)`);

        // Generate audio for each answer option
        for (let j = 0; j < dialogue.answers.length; j++) {
          const answerObj = dialogue.answers[j];
          const answerText = answerObj.text;
          
          // Generate a special filename for the answer
          const answerFilename = generateFilename(levelId, i, speakerId, 'answer', j);

          // Add to audio map
          audioMap[answerText] = answerFilename;

          // Check if file already exists
          const speechMarksPath = path.join(SPEECH_MARKS_DIR, answerFilename.replace('.mp3', '-metadata.json'));
          let needSpeechMarks = !fs.existsSync(speechMarksPath);

          // Generate audio if needed
          try {
            await generateAudio(speakerId, voiceType, answerText, answerFilename);
            needSpeechMarks = true; // Always generate speech marks for newly created audio
          } catch (error) {
            console.error(`Error generating audio for answer "${answerText.substring(0, 30)}..."`, error.message);
            continue;
          }

          // Generate speech marks if needed
          if (needSpeechMarks) {
            try {
              await generateSpeechMarks(speakerId, voiceType, answerText, answerFilename);
            } catch (error) {
              console.error(`Error generating speech marks for answer "${answerText.substring(0, 30)}..."`, error.message);
            }
          } else {
            console.log(`Speech marks already exist for answer: ${answerFilename}`);
          }
        }
      }
      // Case 3: Dialogue with feedback
      else if (dialogue.feedback && dialogue.feedback.length > 0) {
        console.log(`Processing feedback for dialogue ${i}`);

        // Generate audio for each feedback option
        for (let j = 0; j < dialogue.feedback.length; j++) {
          const feedbackObj = dialogue.feedback[j];
          const feedbackText = feedbackObj.text;
          const isCorrect = feedbackObj.correct;
          
          // Generate a special filename for the feedback
          const feedbackType = isCorrect ? 'correct' : 'incorrect';
          const feedbackFilename = generateFilename(levelId, i, speakerId, 'feedback', feedbackType);

          // Add to audio map
          audioMap[feedbackText] = feedbackFilename;

          // Check if file already exists
          const speechMarksPath = path.join(SPEECH_MARKS_DIR, feedbackFilename.replace('.mp3', '-metadata.json'));
          let needSpeechMarks = !fs.existsSync(speechMarksPath);

          // Generate audio if needed
          try {
            await generateAudio(speakerId, voiceType, feedbackText, feedbackFilename);
            needSpeechMarks = true; // Always generate speech marks for newly created audio
          } catch (error) {
            console.error(`Error generating audio for feedback "${feedbackText.substring(0, 30)}..."`, error.message);
            continue;
          }

          // Generate speech marks if needed
          if (needSpeechMarks) {
            try {
              await generateSpeechMarks(speakerId, voiceType, feedbackText, feedbackFilename);
            } catch (error) {
              console.error(`Error generating speech marks for feedback "${feedbackText.substring(0, 30)}..."`, error.message);
            }
          } else {
            console.log(`Speech marks already exist for feedback: ${feedbackFilename}`);
          }
        }
      }
    }

    return audioMap;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return {};
  }
}

/**
 * Main function to process all level files
 */
async function main() {
  try {
    // Check for dry-run flag
    if (isDryRun()) {
      console.log('Running in dry-run mode - no files will be created.');
    } else {
      // Ensure output directories exist if not in dry-run mode
      await ensureDirectories();
    }

    const files = fs.readdirSync(LEVELS_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => path.join(LEVELS_DIR, file));

    console.log(`Found ${files.length} level files to process`);

    // Process each file
    for (const file of files) {
      console.log(`${isDryRun() ? 'Would process' : 'Processing'} ${file}...`);
      
      // If dry run, calculate and display stats
      if (isDryRun()) {
        const fileContent = fs.readFileSync(file, 'utf8');
        const levelData = JSON.parse(fileContent);
        
        // Count the number of audio files that would be generated
        let dialogueCount = 0;
        let answerCount = 0;
        let feedbackCount = 0;
        
        levelData.dialogues.forEach(dialogue => {
          if (dialogue.text) dialogueCount++;
          if (dialogue.answers) answerCount += dialogue.answers.length;
          if (dialogue.feedback) feedbackCount += dialogue.feedback.length;
        });
        
        console.log(`  - Regular dialogues: ${dialogueCount}`);
        console.log(`  - Answer options: ${answerCount}`);
        console.log(`  - Feedback responses: ${feedbackCount}`);
        console.log(`  - Total audio files: ${dialogueCount + answerCount + feedbackCount}`);
      } else {
        // Actually process the file
        await processLevelFile(file);
      }
    }

    if (isDryRun()) {
      console.log('Dry run complete! No files were created.');
    } else {
      console.log('Audio and speech marks generation complete!');
    }
  } catch (error) {
    console.error('Error in main process:', error);
  }
}

// Run the script
main();
