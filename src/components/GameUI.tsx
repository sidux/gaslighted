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

  return (
    <div className="game-ui">
      <GameMeters gameState={gameState} />

      <div className="karaoke-container">
        <KaraokeText 
          gameState={gameState} 
          dialogueMetadata={dialogueMetadata}
          handleFartAnimationEnd={handleFartAnimationEnd}
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