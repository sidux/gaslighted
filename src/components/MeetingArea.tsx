import React, { useState, useEffect } from 'react';
import { Participant, GameState, FartResultType } from '../logic/types';

interface MeetingAreaProps {
  gameState: GameState;
  participants: Participant[];
}

// Component to render a participant video
interface ParticipantVideoProps {
  participant: Participant;
  isSpeaking: boolean;
  fartReaction: FartResultType | null;
  pressure: number;
  shame: number;
  isGameOver: boolean;
  victory: boolean;
}

const ParticipantVideo: React.FC<ParticipantVideoProps> = ({ 
  participant, 
  isSpeaking, 
  fartReaction,
  pressure,
  shame,
  isGameOver,
  victory
}) => {
  const [faceImage, setFaceImage] = useState('neutral');
  const [talkingState, setTalkingState] = useState(0);
  const [talkingInterval, setTalkingIntervalState] = useState<NodeJS.Timeout | null>(null);
  
  // Handle talking animation
  useEffect(() => {
    if (isSpeaking && !fartReaction) {
      // Start talking animation
      const interval = setInterval(() => {
        setTalkingState(prev => (prev === 0 ? 1 : 0));
      }, 300);
      
      setTalkingIntervalState(interval);
      
      return () => {
        clearInterval(interval);
        setTalkingIntervalState(null);
      };
    } else if (talkingInterval) {
      // Stop talking animation
      clearInterval(talkingInterval);
      setTalkingIntervalState(null);
      setTalkingState(0);
    }
  }, [isSpeaking, fartReaction]);
  
  // Handle face image based on state
  useEffect(() => {
    let image = 'neutral';
    
    if (participant.type === 'player') {
      // Player-specific faces
      if (isGameOver && shame >= 100) {
        image = 'shame';
      } else if (victory) {
        image = 'perfect-fart';
      } else if (pressure >= 80) {
        image = 'critical-pressure';
      } else if (fartReaction === 'perfect') {
        image = 'perfect-fart';
      } else if (fartReaction === 'okay') {
        image = 'okay-fart';
      } else if (fartReaction === 'bad') {
        image = 'bad-fart';
      } else if (isSpeaking) {
        image = `talking${talkingState + 1}`;
      }
    } else {
      // NPC faces
      if (fartReaction === 'okay') {
        image = 'okay-fart-reaction';
      } else if (fartReaction === 'bad') {
        image = 'bad-fart-reaction';
      } else if (isSpeaking) {
        image = `talking${talkingState + 1}`;
      }
    }
    
    setFaceImage(image);
  }, [participant.type, isSpeaking, fartReaction, talkingState, pressure, shame, isGameOver, victory]);
  
  return (
    <div className="video-container">
      <div className="video-participant">
        <img 
          src={`src/assets/faces/${participant.id}-${faceImage}.png`}
          alt={participant.id}
          className="participant-face"
        />
        <div className="participant-name">
          {participant.id.charAt(0).toUpperCase() + participant.id.slice(1)}
        </div>
      </div>
    </div>
  );
};

const MeetingArea: React.FC<MeetingAreaProps> = ({ gameState, participants }) => {
  const currentDialogue = gameState.level.dialogues[gameState.currentDialogueIndex];
  const currentSpeakerId = currentDialogue?.speakerId;
  
  return (
    <div className="meeting-container">
      <div className="video-grid">
        {participants.map(participant => (
          <ParticipantVideo
            key={participant.id}
            participant={participant}
            isSpeaking={participant.id === currentSpeakerId && gameState.isPlaying}
            fartReaction={
              gameState.lastFartResult && 
              (participant.type === 'player' || participant.id !== currentSpeakerId) 
                ? gameState.lastFartResult.type 
                : null
            }
            pressure={gameState.pressure}
            shame={gameState.shame}
            isGameOver={gameState.isGameOver}
            victory={gameState.victory}
          />
        ))}
      </div>
      
      <div 
        className={`perfect-effect ${gameState.lastFartResult?.type === 'perfect' ? 'active' : ''}`}
      >
        PERFECT!
      </div>
      
      <div 
        className={`okay-effect ${gameState.lastFartResult?.type === 'okay' ? 'active' : ''}`}
      >
        OKAY
      </div>
      
      <div 
        className={`bad-effect ${gameState.lastFartResult?.type === 'bad' ? 'active' : ''}`}
      >
        BAD!
      </div>
    </div>
  );
};

export default MeetingArea;
