import React, { useEffect, useRef, useState } from 'react';
import { Level } from '../types';

interface MainMenuProps {
  onStart: () => void;
  onShowInstructions: () => void;
  level: Level | null;
  availableLevels?: Level[];
  selectedLevelIndex?: number;
  onSelectLevel?: (index: number) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ 
  onStart, 
  onShowInstructions, 
  level, 
  availableLevels = [], 
  selectedLevelIndex = 0, 
  onSelectLevel = () => {} 
}) => {
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [particles, setParticles] = useState<{id: number, x: number, y: number, size: number, speed: number}[]>([]);
  
  // Generate random particles for the background
  useEffect(() => {
    const newParticles = [];
    for (let i = 0; i < 50; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 5 + 1,
        speed: Math.random() * 0.5 + 0.1
      });
    }
    setParticles(newParticles);
    
    // Particle animation
    const interval = setInterval(() => {
      setParticles(prev => prev.map(particle => ({
        ...particle,
        y: particle.y + particle.speed > 100 ? 0 : particle.y + particle.speed,
        x: particle.x + (Math.random() * 0.2 - 0.1)
      })));
    }, 50);
    
    return () => clearInterval(interval);
  }, []);

  // Set focus to the start button when the component mounts for better keyboard navigation
  useEffect(() => {
    if (startButtonRef.current) {
      startButtonRef.current.focus();
    }
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (e.currentTarget === startButtonRef.current) {
        onStart();
      }
    }
  };

  return (
    <main className="main-menu" role="main" aria-labelledby="game-title">
      {/* Background particles */}
      <div className="particles-container">
        {particles.map(particle => (
          <div 
            key={particle.id}
            className="particle"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              opacity: Math.random() * 0.5 + 0.3
            }}
          ></div>
        ))}
      </div>
      
      <div className="main-menu-content">
        <div className="title-container">
          <h1 className="main-menu-title animated-title" id="game-title">
            <span className="g-letter">G</span>
            <span className="a-letter">A</span>
            <span className="s-letter">S</span>
            <span className="l-letter">L</span>
            <span className="i-letter">I</span>
            <span className="g2-letter">G</span>
            <span className="h-letter">H</span>
            <span className="t-letter">T</span>
            <span className="e-letter">E</span>
            <span className="d-letter">D</span>
          </h1>
          <div className="title-underline"></div>
        </div>
        
        <p className="main-menu-subtitle">
          A satirical corporate survival game where timing and balance are everything
        </p>
        
        {level && (
          <div className="level-info fade-in" aria-live="polite">
            <div className="level-badge">
              <span className="level-icon">🎯</span>
              <h2 id="level-title">{level.title}</h2>
            </div>
            <p id="level-description">{level.description}</p>
            
            {availableLevels.length > 1 && (
              <div className="level-selector">
                <h3>Select Level</h3>
                <div className="level-buttons">
                  {availableLevels.map((lvl, index) => (
                    <button 
                      key={index}
                      className={`level-button ${index === selectedLevelIndex ? 'active' : ''}`}
                      onClick={() => onSelectLevel(index)}
                      aria-label={`Select level ${index + 1}: ${lvl.title}`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="main-menu-buttons">
          <button 
            className={`main-menu-button ${isHovered ? 'button-hovered' : ''}`}
            onClick={onStart}
            ref={startButtonRef}
            onKeyDown={handleKeyDown}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            aria-label="Join Meeting and start the game"
          >
            <span className="button-icon">📹</span>
            Join Meeting
          </button>
          
          <button 
            className="main-menu-button secondary"
            onClick={onShowInstructions}
            aria-label="Show game instructions"
          >
            <span className="button-icon">📋</span>
            How to Play
          </button>
        </div>
        
        <div className="menu-footer">
          <p>Press the right key at the right time. Don't get caught!</p>
        </div>
      </div>
    </main>
  );
};

export default MainMenu;
