import { useEffect } from 'react';
import { GameState, AudioResources } from '../types';
import { playHeartbeatSound } from '../services';

export function useHeartbeatSound(
  gameState: GameState | null,
  audioResources: AudioResources | null
) {
  // Update heartbeat sound based on shame meter
  useEffect(() => {
    if (!gameState || !audioResources) {
      return;
    }
    
    // Update heartbeat volume and rate based on shame level
    // Only play when game is playing, not over, and not paused
    playHeartbeatSound(
      audioResources,
      gameState.shame,
      gameState.isPlaying && !gameState.isGameOver && !gameState.isPaused
    );
  }, [gameState?.shame, gameState?.isPlaying, gameState?.isGameOver, gameState?.isPaused, audioResources]);
}