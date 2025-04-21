/**
 * Generate Audio Files Script
 * 
 * This script reads all dialogue from level files and generates TTS audio files using Amazon Polly.
 * Run this script before building the game to generate all required audio files.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const AWS = require('aws-sdk');
const crypto = require('crypto');
require('dotenv').config();

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: new AWS.Credentials({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  })
});

// Create Polly instance
const polly = new AWS.Polly();

// Voice mappings (same as in GameConfig)
const VOICE_MAPPINGS = {
  'Brian': 'Brian',     // Standard voice
  'Bruno': 'Russell',   // Standard voice
  'Brandon': 'Joey',    // Standard voice
  'Salli': 'Joanna'     // Available in neural
};

// List of voices that support neural engine
const NEURAL_VOICES = [
  'Joanna', 'Matthew', 'Lupe', 'Ruth', 'Kevin', 'Stephen', 'Ivy', 'Kendra',
  'Kimberly', 'Amy', 'Emma', 'Brian', 'Aria', 'Ayanda', 'Olivia', 'Danielle'
];

// Directory configuration
const LEVELS_DIR = path.join(__dirname, '..', 'levels');
const AUDIO_OUTPUT_DIR = path.join(__dirname, '..', 'audio', 'dialogue');

// Create output directory if it doesn't exist
if (!fs.existsSync(AUDIO_OUTPUT_DIR)) {
  fs.mkdirSync(AUDIO_OUTPUT_DIR, { recursive: true });
}

/**
 * Generate a filename for a dialogue entry
 */
function generateFilename(speakerId, voiceType, text) {
  // Create a hash of the text to ensure unique filenames
  const hash = crypto.createHash('md5').update(text).digest('hex').substring(0, 8);
  // Format: speakerId_voiceType_hash.mp3
  return `${speakerId}_${voiceType}_${hash}.mp3`;
}

/**
 * Generate audio for a single dialogue entry
 */
async function generateAudio(speakerId, voiceType, text, filename) {
  return new Promise((resolve, reject) => {
    // Map voice type to Polly voice
    const pollyVoice = VOICE_MAPPINGS[voiceType] || voiceType;
    
    // Determine if this voice supports neural
    const supportsNeural = NEURAL_VOICES.includes(pollyVoice);
    const engine = supportsNeural ? 'neural' : 'standard';
    
    console.log(`Generating audio for: "${text.substring(0, 50)}..." using voice ${pollyVoice} (${engine} engine)`);
    
    // Set parameters for synthesis
    const params = {
      Engine: engine,
      OutputFormat: 'mp3',
      Text: text,
      VoiceId: pollyVoice
    };
    
    // Call Polly to synthesize speech
    polly.synthesizeSpeech(params, (err, data) => {
      if (err) {
        // If neural failed, try standard as fallback
        if (err.code === 'ValidationException' && engine === 'neural') {
          console.log(`Neural engine not supported for voice ${pollyVoice}, falling back to standard engine`);
          
          // Retry with standard engine
          const standardParams = {
            ...params,
            Engine: 'standard'
          };
          
          polly.synthesizeSpeech(standardParams, (standardErr, standardData) => {
            if (standardErr) {
              console.error('Error with fallback to standard engine:', standardErr);
              reject(standardErr);
              return;
            }
            
            // Save the audio file
            const outputPath = path.join(AUDIO_OUTPUT_DIR, filename);
            fs.writeFileSync(outputPath, standardData.AudioStream);
            console.log(`Saved audio file: ${filename} (with standard engine)`);
            resolve(filename);
          });
        } else {
          console.error('Error generating audio:', err);
          reject(err);
        }
        return;
      }
      
      // Save the audio file
      const outputPath = path.join(AUDIO_OUTPUT_DIR, filename);
      fs.writeFileSync(outputPath, data.AudioStream);
      console.log(`Saved audio file: ${filename}`);
      resolve(filename);
    });
  });
}

/**
 * Process all dialogue in a level file
 */
async function processLevelFile(filePath) {
  try {
    // Read and parse YAML file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const levelData = yaml.load(fileContent);
    
    // Get participant voice mappings
    const participantVoices = {};
    levelData.participants.forEach(participant => {
      participantVoices[participant.id] = participant.voiceType;
    });
    
    // Generate audio for each dialogue entry
    const dialogues = levelData.dialogues;
    const audioMap = {};
    
    for (const dialogue of dialogues) {
      const { speakerId, text } = dialogue;
      const voiceType = participantVoices[speakerId];
      
      if (!voiceType) {
        console.warn(`No voice type found for speaker: ${speakerId}`);
        continue;
      }
      
      // Generate filename
      const filename = generateFilename(speakerId, voiceType, text);
      
      // Check if file already exists
      const outputPath = path.join(AUDIO_OUTPUT_DIR, filename);
      if (!fs.existsSync(outputPath)) {
        try {
          await generateAudio(speakerId, voiceType, text, filename);
        } catch (error) {
          console.error(`Error generating audio for "${text.substring(0, 30)}..."`, error.message);
        }
      } else {
        console.log(`Audio file already exists: ${filename}`);
      }
      
      // Add to audio map
      audioMap[text] = filename;
    }
    
    // Generate audio mapping file
    const levelName = path.basename(filePath, '.yaml');
    const mappingFile = path.join(AUDIO_OUTPUT_DIR, `${levelName}_mapping.json`);
    fs.writeFileSync(mappingFile, JSON.stringify(audioMap, null, 2));
    console.log(`Created audio mapping file: ${mappingFile}`);
    
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
    // Get all YAML files in levels directory
    const files = fs.readdirSync(LEVELS_DIR)
      .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'))
      .map(file => path.join(LEVELS_DIR, file));
    
    console.log(`Found ${files.length} level files to process`);
    
    // Process each file
    for (const file of files) {
      console.log(`Processing ${file}...`);
      await processLevelFile(file);
    }
    
    console.log('Audio generation complete!');
  } catch (error) {
    console.error('Error in main process:', error);
  }
}

// Run the script
main();
