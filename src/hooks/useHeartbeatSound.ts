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
    
    // Get game speed from level rules
    const gameSpeed = gameState.level.rules.game_speed || 1.0;
    
    // Update heartbeat volume and rate based on shame level
    // Only play when game is playing, not over, and not paused
    playHeartbeatSound(
      audioResources,
      gameState.shame,
      gameState.isPlaying && !gameState.isGameOver && !gameState.isPaused,
      undefined, // intensity parameter
      gameSpeed
    );
  }, [gameState?.shame, gameState?.isPlaying, gameState?.isGameOver, gameState?.isPaused, audioResources]);
}