import React, { useState, useEffect, memo } from 'react';
import { Participant, GameState, FartResultType } from '../types';

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
  isActive: boolean;
}

// Memoized participant video to prevent unnecessary re-renders
const ParticipantVideo: React.FC<ParticipantVideoProps> = memo(({ 
  participant, 
  isSpeaking, 
  fartReaction,
  pressure,
  shame,
  isGameOver,
  victory,
  isActive
}) => {
  const [faceImage, setFaceImage] = useState('neutral');
  const [talkingState, setTalkingState] = useState(0);
  
  // Handle talking animation and face image based on state
  useEffect(() => {
    // Determine the appropriate face image
    let image = 'neutral';
    
    if (participant.type === 'player') {
      // Player-specific faces
      if (isGameOver && shame >= 100) {
        image = 'lose';
      } else if (victory) {
        image = 'win';
      } else if (fartReaction === 'perfect') {
        image = 'perfect-fart';
      } else if (fartReaction === 'okay') {
        image = 'okay-fart';
      } else if (fartReaction === 'bad') {
        image = 'bad-fart';
      } else if (pressure >= 80) {
        image = 'critical-pressure';
      } else if (pressure >= 60) {
        image = 'high-pressure';
      } else if (pressure >= 40) {
        image = 'medium-pressure';
      } else if (pressure >= 20) {
        image = 'light-pressure';
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
    
    // Handle talking animation
    let intervalId: NodeJS.Timeout | null = null;
    
    if (isSpeaking && !fartReaction) {
      // Start talking animation
      intervalId = setInterval(() => {
        setTalkingState(prev => (prev === 0 ? 1 : 0));
      }, 300);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [participant.type, isSpeaking, fartReaction, talkingState, pressure, shame, isGameOver, victory]);
  
  // Generate CSS classes based on current state
  const containerClasses = [
    "video-container",
    isActive ? "active-speaker" : "",
    fartReaction === 'bad' ? "vibrate" : ""
  ].filter(Boolean).join(" ");
  
  return (
    <div className={containerClasses}>
      <div 
        className="video-participant"
        aria-label={`${participant.id} ${fartReaction === 'bad' ? 'is reacting to a bad fart' : isSpeaking ? 'is speaking' : ''}`}
      >
        <img 
          src={`src/assets/faces/${participant.id}-${faceImage}.png`}
          alt={participant.id}
          className="participant-face"
        />
        <div className="participant-name">
          {participant.id.charAt(0).toUpperCase() + participant.id.slice(1)}
        </div>
        {participant.type === 'player' && isSpeaking && (
          <div className="active-indicator">
            <span>Speaking</span>
          </div>
        )}
        {isActive && <div className="active-border"></div>}
      </div>
    </div>
  );
});

// The main meeting area component
const MeetingArea: React.FC<MeetingAreaProps> = ({ gameState, participants }) => {
  const currentDialogue = gameState.level.dialogues[gameState.currentDialogueIndex];
  const currentSpeakerId = currentDialogue?.speaker;
  
  // Effects for fart reactions
  const fartEffectClasses = {
    perfect: gameState.lastFartResult?.type === 'perfect' ? 'active' : '',
    okay: gameState.lastFartResult?.type === 'okay' ? 'active' : '',
    bad: gameState.lastFartResult?.type === 'bad' ? 'active' : ''
  };
  
  // Optimize participant order for smaller screens - put the active speaker and player first
  const sortedParticipants = [...participants].sort((a, b) => {
    // Player always first
    if (a.type === 'player') return -1;
    if (b.type === 'player') return 1;
    
    // Active speaker second
    if (a.id === currentSpeakerId) return -1;
    if (b.id === currentSpeakerId) return 1;
    
    return 0;
  });
  
  return (
    <div className="meeting-container">
      <div className="meeting-info">
        <span className="meeting-title">Team meeting</span>
        <span className="meeting-time">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
      </div>
      
      <div className="video-grid">
        {sortedParticipants.map(participant => (
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
            isActive={participant.id === currentSpeakerId}
          />
        ))}
      </div>
      
      {/* Fart effect overlays */}
      <div className={`perfect-effect ${fartEffectClasses.perfect}`}>PERFECT!</div>
      <div className={`okay-effect ${fartEffectClasses.okay}`}>OKAY</div>
      <div className={`bad-effect ${fartEffectClasses.bad}`}>BAD!</div>
    </div>
  );
};

export default MeetingArea;
