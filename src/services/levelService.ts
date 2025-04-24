import { Level } from '../types';

/**
 * Fetches all available level files from the levels directory
 */
export const getLevelFiles = async (): Promise<string[]> => {
  try {
    const response = await fetch('src/assets/levels/');
    if (!response.ok) {
      console.warn('Failed to fetch levels directory, using fallback');
      return ['level1.json']; // Fallback to known level
    }
    
    const text = await response.text();
    // Extract .json files from directory listing
    const matches = text.match(/href="([^"]+\.json)"/g) || [];
    return matches.map(match => match.replace('href="', '').replace('"', ''));
  } catch (error) {
    console.error('Error fetching level files:', error);
    return ['level1.json']; // Fallback to known level
  }
};

/**
 * Loads a level by its filename
 */
export const loadLevel = async (filename: string): Promise<Level | null> => {
  try {
    const response = await fetch(`src/assets/levels/${filename}`);
    if (!response.ok) {
      console.error(`Failed to load level: ${filename}`);
      return null;
    }
    
    const levelData: Level = await response.json();
    
    // Add level ID based on the filename (without extension)
    const levelId = filename.replace(/\.json$/, '');
    return {
      ...levelData,
      id: levelId
    };
  } catch (error) {
    console.error(`Error loading level ${filename}:`, error);
    return null;
  }
};

/**
 * Loads all available levels
 */
export const loadAllLevels = async (): Promise<Level[]> => {
  try {
    // Get level files
    const levelFiles = await getLevelFiles();
    
    // Load all levels in parallel
    const loadedLevels = await Promise.all(
      levelFiles.map(file => loadLevel(file))
    );
    
    // Filter out failed loads
    const validLevels = loadedLevels.filter((level): level is Level => level !== null);
    
    if (validLevels.length === 0) {
      console.warn('No valid levels loaded, check level files');
    }
    
    return validLevels;
  } catch (error) {
    console.error('Error loading all levels:', error);
    return [];
  }
};
