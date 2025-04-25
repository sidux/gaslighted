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
    playHeartbeatSound(
      audioResources,
      gameState.shame,
      gameState.isPlaying && !gameState.isGameOver
    );
  }, [gameState?.shame, gameState?.isPlaying, gameState?.isGameOver, audioResources]);
}