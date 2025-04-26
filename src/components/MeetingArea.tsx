import React, { useState, useEffect, memo, useRef } from 'react';
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
  gameState: GameState;
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
  isActive,
  gameState
}) => {
  const [faceImage, setFaceImage] = useState('neutral');
  const [talkingState, setTalkingState] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const animationTimeRef = useRef<number>(0);
  
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
      } else if (fartReaction === 'bad' || fartReaction === 'terrible') {
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
  }, [participant.type, isSpeaking, fartReaction, talkingState, pressure, shame, isGameOver, victory]);
  
  // Separate useEffect to handle the talking animation with requestAnimationFrame
  useEffect(() => {
    // If not speaking or has a fart reaction, cancel any animation
    if (!isSpeaking || fartReaction) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    // Get game speed from game state
    const gameSpeed = gameState.level.rules.game_speed || 1.0;
    
    // Base talking interval in ms (adjusted for game speed)
    const talkingInterval = 300 / gameSpeed;
    
    // Animation loop with requestAnimationFrame
    const animate = (timestamp: number) => {
      // Initialize lastFrameTime on first run
      if (lastFrameTimeRef.current === 0) {
        lastFrameTimeRef.current = timestamp;
      }
      
      // Calculate elapsed time since last frame
      const deltaTime = timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;
      
      // Add to accumulated animation time
      animationTimeRef.current += deltaTime;
      
      // Check if it's time to switch talking state
      if (animationTimeRef.current >= talkingInterval) {
        // Toggle talking state
        setTalkingState(prev => (prev === 0 ? 1 : 0));
        
        // Reset animation timer (but keep remainder for smoother animation)
        animationTimeRef.current %= talkingInterval;
      }
      
      // Continue animation loop
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    animationRef.current = requestAnimationFrame(animate);
    
    // Cleanup when component unmounts or deps change
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      // Reset times
      lastFrameTimeRef.current = 0;
      animationTimeRef.current = 0;
    };
  }, [isSpeaking, fartReaction, gameState.level.rules.game_speed]);
  
  // Generate CSS classes based on current state
  const containerClasses = [
    "video-container",
    isActive ? "active-speaker" : "",
    fartReaction === 'bad' || fartReaction === 'terrible' ? "vibrate" : "",
    fartReaction === 'terrible' ? "vibrate-intense" : ""
  ].filter(Boolean).join(" ");
  
  return (
    <div className={containerClasses}>
      <div 
        className="video-participant"
        aria-label={`${participant.id} ${fartReaction === 'bad' ? 'is reacting to a bad fart' : isSpeaking ? 'is speaking' : ''}`}
        style={{
          backgroundImage: `url(${require(`../assets/backgrounds/${participant.id}.jpg`)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          position: 'relative'
        }}
      >
        {/* Blur overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: participant.type === 'player' ? 'blur(5px)' : 'blur(2px)',
          WebkitBackdropFilter: participant.type === 'player' ? 'blur(5px)' : 'blur(2px)',
          zIndex: 1
        }}></div>
        
        <div className="character-container" style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'flex-end', 
          height: '100%', 
          width: '100%', 
          position: 'absolute',
          bottom: '0',
          zIndex: 2
        }}>
          <img 
            src={require(`../assets/faces/${participant.id}-${faceImage}.png`)}
            alt={participant.id}
            className="participant-face"
            style={{ marginBottom: '0', maxHeight: '90%', objectFit: 'contain' }}
          />
        </div>
        <div className="participant-name" style={{ zIndex: 2 }}>
          {participant.id.charAt(0).toUpperCase() + participant.id.slice(1)}
        </div>
        {participant.type === 'player' && isSpeaking && (
          <div className="active-indicator" style={{ zIndex: 2 }}>
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
    bad: gameState.lastFartResult?.type === 'bad' ? 'active' : '',
    terrible: gameState.lastFartResult?.type === 'terrible' ? 'active' : ''
  };
  
  return (
    <div className="meeting-container">
      <div className="meeting-info">
        <span className="meeting-title">Team meeting</span>
        <span className="meeting-time">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
      </div>
      
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
            isActive={participant.id === currentSpeakerId}
            gameState={gameState}
          />
        ))}
      </div>
      
      {/* Fart effect overlays */}
      <div className={`perfect-effect ${fartEffectClasses.perfect}`}>PERFECT!</div>
      <div className={`okay-effect ${fartEffectClasses.okay}`}>OKAY</div>
      <div className={`bad-effect ${fartEffectClasses.bad}`}>BAD!</div>
      <div className={`terrible-effect ${fartEffectClasses.terrible}`}>TERRIBLE!</div>
    </div>
  );
};

export default MeetingArea;
