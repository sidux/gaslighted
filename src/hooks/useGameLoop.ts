import { useEffect, useRef } from 'react';
import { GameState } from '../types';
import { updateGameState, playFartAudio } from '../services';

export function useGameLoop(
  gameState: GameState | null, 
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>,
  isLoading: boolean
) {
  const lastUpdateTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Game loop
  useEffect(() => {
    if (!gameState || !gameState.isPlaying || isLoading || (gameState && gameState.isPaused)) {
      return;
    }
    
    const gameLoop = (timestamp: number) => {
      if (lastUpdateTimeRef.current === null) {
        lastUpdateTimeRef.current = timestamp;
      }
      
      const deltaTime = timestamp - lastUpdateTimeRef.current;
      lastUpdateTimeRef.current = timestamp;
      
      // Apply a minimum deltaTime to ensure consistent updates
      const minDeltaTime = Math.max(deltaTime, 16.67); // ~60fps
      
      setGameState(prevState => {
        if (!prevState) return null;
        
        // Handle paused state
        if (prevState.isPaused || prevState.pausedTimestamp !== null) {
          return prevState;
        }
        
        // Store previous state's lastFartResult to detect new auto-farts
        const prevLastFartResult = prevState.lastFartResult;
        
        // Update game state
        const newState = updateGameState(prevState, minDeltaTime);
        
        // Check if a new terrible auto-fart just happened
        if (newState.lastFartResult && 
            newState.lastFartResult.type === 'terrible' && 
            (!prevLastFartResult || prevLastFartResult !== newState.lastFartResult)) {
          
          // Play the terrible fart sound manually when auto-fart occurs
          if (prevState.audioResources) {
            playFartAudio(
              prevState.audioResources,
              newState.lastFartResult.fartType,
              'terrible'
            );
            
            // Pause the speaker for a short time on terrible farts
            newState.pausedTimestamp = Date.now();
            
            // Set a timeout to unpause after 1.5 seconds (longer than bad farts)
            setTimeout(() => {
              setGameState(state => {
                if (!state) return null;
                return {
                  ...state,
                  pausedTimestamp: null
                };
              });
            }, 1500);
          }
        }
        
        return newState;
      });
      
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };
    
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [gameState?.isPlaying, gameState?.isPaused, isLoading, setGameState]);

  return {
    lastUpdateTimeRef,
    animationFrameRef
  };
}