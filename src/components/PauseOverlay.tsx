import React from 'react';

interface PauseOverlayProps {
  onResume: () => void;
}

const PauseOverlay: React.FC<PauseOverlayProps> = ({ onResume }) => {
  return (
    <div className="pause-overlay">
      <div className="pause-container">
        <h2 className="pause-title">Game Paused</h2>
        <p className="pause-subtitle">Take a break, check your phone, or grab a snack.</p>
        <button className="pause-resume-button" onClick={onResume}>
          Resume Meeting
        </button>
      </div>
    </div>
  );
};

export default PauseOverlay;