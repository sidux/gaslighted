import React from 'react';
import { GameState, Viseme, FartOpportunity } from '../types';
import GameMeters from './GameMeters';
import KaraokeText from './KaraokeText';
import FartOpportunities from './FartOpportunities';

interface GameUIProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  dialogueMetadata: { [key: string]: Viseme[] };
}

const GameUI: React.FC<GameUIProps> = ({ gameState, setGameState, dialogueMetadata }) => {
  // Only render when playing
  if (!gameState.isPlaying || gameState.isGameOver) return null;

  const currentDialogue = gameState.level.dialogues[gameState.currentDialogueIndex];
  if (!currentDialogue) return null;

  // Handler called when the float animation finishes
  const handleFartAnimationEnd = (opp: FartOpportunity) => {
    setGameState(gs => ({
      ...gs,
      fartOpportunities: gs.fartOpportunities.map(o =>
        o === opp
          ? { ...o, handled: true, active: false }
          : o
      )
    }));
  };
  
  // Handler for when an answer is selected
  const handleAnswerSelected = (wasCorrect: boolean) => {
    console.log("GameUI - Answer selected, correct:", wasCorrect);
    
    // Adjust shame based on correctness
    setGameState(gs => {
      if (!gs) return null;
      
      let shameChange = 0;
      
      // Get shame change values from level rules
      if (wasCorrect) {
        shameChange = gs.level.rules.question?.correct_answer_shame_change || -10;
      } else {
        shameChange = gs.level.rules.question?.incorrect_answer_shame_change || 15;
      }
      
      console.log("Applying shame change:", shameChange);
      
      // Calculate new shame value, clamped between 0-100
      const newShame = Math.max(0, Math.min(100, gs.shame + shameChange));
      
      // Ensure the karaoke container gets proper size-fitting class
      setTimeout(() => {
        const karaokeContainer = document.querySelector('.karaoke-container');
        if (karaokeContainer) {
          karaokeContainer.classList.add('answer-selected');
          // Remove the class after transition completes
          setTimeout(() => {
            karaokeContainer.classList.remove('answer-selected');
          }, 500);
        }
      }, 100);
      
      return {
        ...gs,
        shame: newShame
      };
    });
  };

  return (
    <div className="game-ui">
      <GameMeters gameState={gameState} />

      <div className="karaoke-container">
        <KaraokeText 
          gameState={gameState} 
          dialogueMetadata={dialogueMetadata}
          handleFartAnimationEnd={handleFartAnimationEnd}
          onAnswerSelected={handleAnswerSelected}
        />
        
        <FartOpportunities 
          gameState={gameState}
          handleFartAnimationEnd={handleFartAnimationEnd}
        />
      </div>
    </div>
  );
};

export default GameUI;