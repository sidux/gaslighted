import React from 'react';
import { Level } from '../logic/types';

interface MainMenuProps {
  onStart: () => void;
  onShowInstructions: () => void;
  level: Level | null;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStart, onShowInstructions, level }) => {
  return (
    <div className="main-menu">
      <h1 className="main-menu-title">GASLIGHTED</h1>
      <p className="main-menu-subtitle">
        A satirical corporate survival game where timing is everything
      </p>
      
      {level && (
        <div className="level-info fade-in">
          <h2>{level.title}</h2>
          <p>{level.description}</p>
        </div>
      )}
      
      <button className="main-menu-button" onClick={onStart}>
        Join Meeting
      </button>
      
      <button className="main-menu-button" onClick={onShowInstructions}>
        How to Play
      </button>
    </div>
  );
};

export default MainMenu;
