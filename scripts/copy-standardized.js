/**
 * copy-standardized.js
 * 
 * This script copies all standardized face images back to the original faces directory
 * after backing up the original files.
 * 
 * Usage: node copy-standardized.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const FACES_DIR = path.join(__dirname, '..', 'faces');
const STANDARDIZED_DIR = path.join(__dirname, '..', 'faces', 'standardized');
const BACKUP_DIR = path.join(__dirname, '..', 'faces', 'original-backup');

// Create backup directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`Created backup directory: ${BACKUP_DIR}`);
}

// Copy standardized images to main directory
function copyStandardizedImages() {
  try {
    if (!fs.existsSync(STANDARDIZED_DIR)) {
      console.error(`Standardized directory not found: ${STANDARDIZED_DIR}`);
      console.error('Please run standardize-faces.js first.');
      return;
    }
    
    const files = fs.readdirSync(STANDARDIZED_DIR);
    const pngFiles = files.filter(file => file.endsWith('.png'));
    
    console.log(`Found ${pngFiles.length} standardized PNG files to copy`);
    
    for (const file of pngFiles) {
      const originalPath = path.join(FACES_DIR, file);
      const standardizedPath = path.join(STANDARDIZED_DIR, file);
      const backupPath = path.join(BACKUP_DIR, file);
      
      // Backup original file if it exists
      if (fs.existsSync(originalPath)) {
        fs.copyFileSync(originalPath, backupPath);
        console.log(`Backed up ${file} to ${backupPath}`);
      }
      
      // Copy standardized file to original location
      fs.copyFileSync(standardizedPath, originalPath);
      console.log(`Copied standardized ${file} to ${originalPath}`);
    }
    
    console.log('All standardized images have been copied successfully!');
    console.log(`Original files were backed up to: ${BACKUP_DIR}`);
  } catch (err) {
    console.error('Error copying images:', err);
  }
}

// Run the script
copyStandardizedImages();
