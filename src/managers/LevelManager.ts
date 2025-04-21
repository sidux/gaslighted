import { Level } from '../types/Level';
import { loadAllLevels } from '../utils/LevelLoader';

export class LevelManager {
  private levels: Map<string, Level> = new Map();

  constructor() {
    this.loadLevels();
  }

  public getLevel(id: string): Level {
    const level = this.levels.get(id);

    if (!level) {
      throw new Error(`Level with ID ${id} not found!`);
    }

    return level;
  }

  public getLevelList(): Level[] {
    return Array.from(this.levels.values()).sort((a, b) => a.difficulty - b.difficulty);
  }

  private loadLevels(): void {
    try {
      console.log('Loading levels from YAML files...');

      // Load all levels using our helper
      const levelModules = loadAllLevels();

      console.log(`Found ${levelModules.length} level files`);

      // Process each level
      levelModules.forEach((module: any) => {
        try {
          const level = module as Level;

          if (!level || !level.id) {
            console.error('Invalid level file detected (missing ID). Skipping.');
            return;
          }

          // Add the level to our map
          this.levels.set(level.id, level);
          console.log(`Loaded level: ${level.id} - ${level.title}`);
        } catch (e) {
          console.error('Error processing level file:', e);
        }
      });

      console.log(`Loaded ${this.levels.size} levels from YAML files.`);

      // Note: To add more levels, you only need to update the LevelLoader.ts file
      // No changes needed to this class
    } catch (error) {
      console.error('Error loading levels from YAML files:', error);
      throw new Error('Failed to load levels. See console for details.');
    }
  }
}
