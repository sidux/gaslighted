/**
 * standardize-faces.js
 * 
 * This script processes all face images in the faces directory,
 * standardizing them to the same size and aspect ratio for consistent display.
 * 
 * Usage: node standardize-faces.js
 * 
 * Requirements: npm install sharp
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Configuration
const FACES_DIR = path.join(__dirname, '..', 'faces');
const OUTPUT_DIR = path.join(__dirname, '..', 'faces', 'standardized');
const STANDARD_WIDTH = 320;
const STANDARD_HEIGHT = 320;
const STANDARD_ASPECT_RATIO = STANDARD_WIDTH / STANDARD_HEIGHT;

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Created output directory: ${OUTPUT_DIR}`);
}

// Process all PNG files in the faces directory
async function processImages() {
  try {
    const files = fs.readdirSync(FACES_DIR);
    const pngFiles = files.filter(file => file.endsWith('.png'));
    
    console.log(`Found ${pngFiles.length} PNG files to process`);
    
    for (const file of pngFiles) {
      const inputPath = path.join(FACES_DIR, file);
      const outputPath = path.join(OUTPUT_DIR, file);
      
      // Get image metadata
      const metadata = await sharp(inputPath).metadata();
      const { width, height } = metadata;
      const aspectRatio = width / height;
      
      console.log(`Processing ${file} (${width}x${height}, aspect ratio: ${aspectRatio.toFixed(2)})`);
      
      let pipeline = sharp(inputPath);
      
      // Decide how to process based on aspect ratio
      if (Math.abs(aspectRatio - STANDARD_ASPECT_RATIO) < 0.1) {
        // If aspect ratio is close to our standard, just resize
        pipeline = pipeline.resize(STANDARD_WIDTH, STANDARD_HEIGHT, {
          fit: 'fill'
        });
      } else if (aspectRatio > STANDARD_ASPECT_RATIO) {
        // Image is wider than our standard - crop width
        const cropWidth = Math.round(height * STANDARD_ASPECT_RATIO);
        const leftOffset = Math.round((width - cropWidth) / 2);
        
        pipeline = pipeline
          .extract({ left: leftOffset, top: 0, width: cropWidth, height })
          .resize(STANDARD_WIDTH, STANDARD_HEIGHT);
          
        console.log(`  Cropping width from ${width} to ${cropWidth}`);
      } else {
        // Image is taller than our standard - crop height
        const cropHeight = Math.round(width / STANDARD_ASPECT_RATIO);
        const topOffset = Math.round((height - cropHeight) / 3); // Crop from upper third for faces
        
        pipeline = pipeline
          .extract({ left: 0, top: topOffset, width, height: cropHeight })
          .resize(STANDARD_WIDTH, STANDARD_HEIGHT);
          
        console.log(`  Cropping height from ${height} to ${cropHeight}`);
      }
      
      // Save the processed image
      await pipeline.toFile(outputPath);
      console.log(`  Saved to ${outputPath}`);
    }
    
    console.log('All images processed successfully!');
    console.log('To use these images, update your code to load from the "faces/standardized" directory.');
  } catch (err) {
    console.error('Error processing images:', err);
  }
}

// Run the script
processImages();
