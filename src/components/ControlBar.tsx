import React from 'react';

// Google Meet style control bar with disabled buttons
const ControlBar: React.FC = () => {
  return (
    <div className="control-bar">
      <button className="control-button" disabled title="Mute microphone (disabled)">
        🎤
      </button>
      
      <button className="control-button" disabled title="Turn off camera (disabled)">
        📷
      </button>
      
      <button className="control-button" disabled title="Share screen (disabled)">
        📺
      </button>
      
      <button className="control-button" disabled title="More options (disabled)">
        ⋮
      </button>
      
      <button className="control-button red" disabled title="Leave call (disabled)">
        📞
      </button>
    </div>
  );
};

export default ControlBar;
