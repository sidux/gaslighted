// This file handles the loading of level files
// It's a workaround for TypeScript not understanding webpack's require.context

import level1 from '../levels/level1.yaml';
import level2 from '../levels/level2.yaml';

/**
 * Loads all level files
 * In a real production environment, this would dynamically 
 * load all files in the levels directory
 */
export function loadAllLevels() {
  // Return an array of all level objects
  // When adding a new level file, you only need to add it here
  return [level1, level2];
}
