import React from 'react';

interface InstructionsScreenProps {
  onBack: () => void;
}

const InstructionsScreen: React.FC<InstructionsScreenProps> = ({ onBack }) => {
  return (
    <div className="main-menu">
      <h1 className="main-menu-title">How to Play</h1>
      
      <div className="instructions">
        <h2 className="instructions-title">Welcome to your first corporate meeting!</h2>
        
        <p className="instructions-text">
          You're Wojak, trapped in a Google Meet with unmutable audio. 
          Unfortunately, you need to fart but can't leave the meeting!
        </p>
        
        <h3 className="instructions-title">Game Objective</h3>
        <p className="instructions-text">
          Survive the entire meeting without anyone discovering your gastric distress.
          Release pressure at strategic moments by timing your farts with the conversation.
        </p>
        
        <h3 className="instructions-title">Core Mechanics</h3>
        <ul className="instructions-list">
          <li>Your fart pressure builds continuously during the meeting</li>
          <li>Listen to the ongoing conversation and watch for highlighted words</li>
          <li>Press the indicated key to release pressure when prompted</li>
          <li>Perfect timing = silent fart (no one notices)</li>
          <li>Okay timing = quiet fart (slightly noticeable)</li>
          <li>Bad timing = loud fart (everyone notices!)</li>
        </ul>
        
        <h3 className="instructions-title">Controls</h3>
        <p className="instructions-text">
          Press the matching fart key when it appears above a word:
        </p>
        <p className="instructions-text">
          <span className="instructions-key">T</span> - T-fart
          <span className="instructions-key">P</span> - P-fart
          <span className="instructions-key">K</span> - K-fart
          <span className="instructions-key">F</span> - F-fart
          <span className="instructions-key">R</span> - R-fart
          <span className="instructions-key">Z</span> - Z-fart
        </p>
        
        <h3 className="instructions-title">Tips</h3>
        <ul className="instructions-list">
          <li>Chain perfect farts for combo multipliers</li>
          <li>Don't let pressure reach maximum - it causes an automatic loud fart</li>
          <li>Keep your shame meter low - if it fills up, you'll resign in shame</li>
          <li>Your final score is based on negative pressure - the lower the better!</li>
        </ul>
      </div>
      
      <button className="main-menu-button" onClick={onBack}>
        Back to Main Menu
      </button>
    </div>
  );
};

export default InstructionsScreen;
