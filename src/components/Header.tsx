import React from 'react';

interface HeaderProps {
  title: string;
  onLeave: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, onLeave }) => {
  return (
    <div className="header">
      <div className="header-left">
        <img src="src/assets/faces/wojak-neutral.png" alt="Meeting" width="24" height="24" />
        <h1 className="header-title">{title}</h1>
      </div>
      
      <div className="header-right">
        <button className="header-button disabled">
          📊 Present now
        </button>
        
        <button className="header-button disabled">
          ⚙️ Settings
        </button>
        
        <button className="header-button" onClick={onLeave}>
          ✕ Hangout
        </button>
      </div>
    </div>
  );
};

export default Header;
