import React from 'react';

interface ControlBarProps {
  onBackToMenu: () => void;
  onStartGame?: () => void;
  isGameInProgress: boolean;
}

// Google Meet modern style control bar
const ControlBar: React.FC<ControlBarProps> = ({ onBackToMenu, onStartGame, isGameInProgress }) => {
  return (
    <div className="meet-control-bar">
      <div className="control-group left">
        <button className="meet-control-button" disabled title="Microphone (disabled)">
          <span className="material-icons">mic_off</span>
        </button>
        
        <button className="meet-control-button" disabled title="Video camera (disabled)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 8V16C15 16.55 14.55 17 14 17H5C4.45 17 4 16.55 4 16V8C4 7.45 4.45 7 5 7H14C14.55 7 15 7.45 15 8ZM16 5H5C3.34 5 2 6.34 2 8V16C2 17.66 3.34 19 5 19H16C17.66 19 19 17.66 19 16V13.5L22.29 16.79C22.92 17.42 24 16.97 24 16.08V7.91C24 7.02 22.92 6.57 22.29 7.2L19 10.5V8C19 6.34 17.66 5 16 5Z" fill="white"/>
          </svg>
        </button>
      </div>
      
      <div className="control-group center">
        {!isGameInProgress && onStartGame && (
          <button className="meet-control-button start-game" onClick={onStartGame} title="Start the meeting">
            Start Meeting
          </button>
        )}
        
        <button className="meet-control-button" disabled title="Present screen (disabled)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 18C21.1 18 21.99 17.1 21.99 16L22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V16C2 17.1 2.9 18 4 18H0V20H24V18H20ZM4 6H20V16H4V6Z" fill="white"/>
          </svg>
        </button>
        
        <button className="meet-control-button" disabled title="More options (disabled)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 8C13.1 8 14 7.1 14 6C14 4.9 13.1 4 12 4C10.9 4 10 4.9 10 6C10 7.1 10.9 8 12 8ZM12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10ZM12 16C10.9 16 10 16.9 10 18C10 19.1 10.9 20 12 20C13.1 20 14 19.1 14 18C14 16.9 13.1 16 12 16Z" fill="white"/>
          </svg>
        </button>
      </div>
      
      <div className="control-group right">
        <button 
          className="meet-control-button end-call" 
          onClick={onBackToMenu} 
          title="Leave call and return to main menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9C10.4 9 8.85 9.25 7.4 9.72V12.82C7.4 13.21 7.17 13.56 6.84 13.72C5.86 14.21 4.97 14.84 4.18 15.57C4 15.75 3.75 15.85 3.48 15.85C3.2 15.85 2.95 15.74 2.77 15.56L0.29 13.08C0.11 12.91 0 12.66 0 12.38C0 12.1 0.11 11.85 0.29 11.67C3.34 8.78 7.46 7 12 7C16.54 7 20.66 8.78 23.71 11.67C23.89 11.85 24 12.1 24 12.38C24 12.66 23.89 12.91 23.71 13.09L21.23 15.57C21.05 15.75 20.8 15.86 20.52 15.86C20.25 15.86 20 15.75 19.82 15.58C19.03 14.84 18.14 14.22 17.16 13.73C16.83 13.57 16.6 13.23 16.6 12.83V9.73C15.15 9.25 13.6 9 12 9Z" fill="white"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ControlBar;
