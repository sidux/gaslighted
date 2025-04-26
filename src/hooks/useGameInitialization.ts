import { useState, useEffect } from 'react';
import { Level, GameState, Viseme, AudioResources } from '../types';
import { 
  initializeGameState, 
  loadLevelMetadata, 
  loadAudioResources,
  stopAllAudio 
} from '../services';

export function useGameInitialization(level: Level) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [dialogueMetadata, setDialogueMetadata] = useState<{ [key: string]: Viseme[] }>({});
  const [audioResources, setAudioResources] = useState<AudioResources | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load metadata and audio resources on mount
  useEffect(() => {
    const init = async () => {
      try {
        // Load metadata for all dialogues
        const metadata = await loadLevelMetadata(level);
        setDialogueMetadata(metadata);
        
        // Load audio resources
        const audio = await loadAudioResources(level);
        setAudioResources(audio);
        
        // Initialize game state
        const initialState = initializeGameState(level, metadata);
        // Add audio resources to the game state for access in other components
        initialState.audioResources = audio;
        // Add setGameState to the gameState for access in components
        initialState.setGameState = setGameState;
        setGameState(initialState);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize game:', error);
      }
    };
    
    init();
    
    // Cleanup on unmount
    return () => {
      if (audioResources) {
        stopAllAudio(audioResources);
      }
    };
  }, [level]);

  return {
    gameState,
    setGameState,
    dialogueMetadata,
    audioResources,
    isLoading
  };
}