import { useEffect } from 'react';
import { GameState, AudioResources, FartType, FartResult } from '../types';
import { 
  checkFartKeyPress,
  applyFartResult,
  playFartAudio
} from '../services';

export function useKeyboardHandler(
  gameState: GameState | null, 
  audioResources: AudioResources | null,
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>
) {
  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!gameState || !gameState.isPlaying || gameState.isGameOver) {
        return;
      }
      
      // Don't process fart keys if showing a question (allow for answer selection)
      if (gameState.showingQuestion) {
        return;
      }
      
      const key = event.key.toLowerCase();
      const validFartKeys = ['t', 'p', 'k', 'f', 'r', 'z'];
      
      if (validFartKeys.includes(key)) {
        console.log(`Processing fart key: ${key}`);
        
        // Find all active opportunities of the pressed key type
        const activeOpportunities = gameState.fartOpportunities.filter(
          opp => opp.active && !opp.handled && !opp.pressed && opp.type === key
        );

        console.log(`Active opportunities for ${key}: ${activeOpportunities.length}`);

        // If there are active opportunities of this type
        if (activeOpportunities.length > 0) {
          processValidFartPress(key, activeOpportunities, gameState, audioResources, setGameState);
        } else {
          // If there's no active fart opportunity of this type, trigger a bad fart
          if (audioResources) {
            processBadFartPress(key as FartType, gameState, audioResources, setGameState);
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, audioResources, setGameState]);
}

// Process a valid fart key press with active opportunities
function processValidFartPress(
  key: string,
  activeOpportunities: any[],
  gameState: GameState,
  audioResources: AudioResources | null,
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>
) {
  // Sort by time to get the earliest one
  activeOpportunities.sort((a, b) => a.time - b.time);
  const opportunity = activeOpportunities[0];
  
  const result = checkFartKeyPress(
    key,
    opportunity,
    gameState.playbackTime,
    gameState.level.rules.precision_window_ms
  );
  
  if (result && audioResources) {
    // Play fart sound
    playFartAudio(audioResources, result.fartType, result.type);
    console.log(`Played fart of type: ${result.type}`);
    
    // Apply result to game state
    setGameState(prevState => {
      if (!prevState) return null;
      
      // Create a unique key for this press to force animation refresh
      const animationKey = `${Date.now()}-${Math.random()}`;
      
      // Mark the opportunity as pressed but NOT handled yet - this will let the animation play
      const updatedOpportunities = prevState.fartOpportunities.map(opp => {
        if (opp === opportunity) {
          return { 
            ...opp, 
            handled: false,               // Don't mark as handled yet so letter stays visible
            pressed: true,                // Mark as pressed for animation
            pressedTime: prevState.playbackTime,  // Record when it was pressed
            resultType: result.type,      // Store the result type for visual feedback
            animationKey: animationKey    // Add unique key to force animation refresh
          };
        }
        return opp;
      });
      
      // Set a timeout to mark the opportunity as handled after the animation completes
      setTimeout(() => {
        setGameState(latestState => {
          if (!latestState) return null;
          
          const finalOpportunities = latestState.fartOpportunities.map(opp => {
            if (opp === opportunity) {
              return {
                ...opp,
                handled: true // Now mark as handled after animation
              };
            }
            return opp;
          });
          
          return {
            ...latestState,
            fartOpportunities: finalOpportunities
          };
        });
      }, 1000); // Increased to 1 second to match animation duration
      
      // For bad farts, pause the speaker for a short time
      const shouldPause = result.type === 'bad';
      
      // Don't pause if it's already paused (e.g., during answer/feedback)
      const newPausedTimestamp = shouldPause && !prevState.pausedTimestamp 
        ? Date.now() 
        : prevState.pausedTimestamp;
      
      // Apply fart result
      const newState = applyFartResult({
        ...prevState,
        fartOpportunities: updatedOpportunities,
        currentFartOpportunity: prevState.currentFartOpportunity === opportunity ? null : prevState.currentFartOpportunity,
        // If it's a bad fart, set the pausedTimestamp to now (only if not already paused)
        pausedTimestamp: newPausedTimestamp
      }, result);
      
      // For bad farts, set a timeout to unpause after 1 second (only if we newly paused)
      if (shouldPause && newPausedTimestamp !== prevState.pausedTimestamp) {
        setTimeout(() => {
          setGameState(state => {
            if (!state) return null;
            return {
              ...state,
              pausedTimestamp: null
            };
          });
        }, 1000); // Pause for 1 second
      }
      
      return newState;
    });
  }
}

// Process a bad fart press (when no active opportunities exist)
function processBadFartPress(
  fartType: FartType,
  gameState: GameState,
  audioResources: AudioResources,
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>
) {
  console.log("No active opportunity - doing bad fart");
  
  // Play a bad fart sound with the pressed key type
  playFartAudio(audioResources, fartType, 'bad');
  
  // Create a bad fart result
  const badFartResult: FartResult = {
    type: 'bad',
    fartType: fartType,
    timestamp: gameState.playbackTime,
    wordIndex: gameState.currentWordIndex,
  };
  
  // Apply the bad fart to the game state
  setGameState(prevState => {
    if (!prevState) return null;
    
    // Don't pause if it's already paused (e.g., during answer/feedback)
    const newPausedTimestamp = !prevState.pausedTimestamp 
      ? Date.now() 
      : prevState.pausedTimestamp;
    
    // Apply fart result
    const newState = applyFartResult({
      ...prevState,
      pausedTimestamp: newPausedTimestamp
    }, badFartResult);
    
    // Set a timeout to unpause after 1 second (only if we newly paused)
    if (newPausedTimestamp !== prevState.pausedTimestamp) {
      setTimeout(() => {
        setGameState(state => {
          if (!state) return null;
          return {
            ...state,
            pausedTimestamp: null
          };
        });
      }, 1000); // Pause for 1 second
    }
    
    return newState;
  });
}