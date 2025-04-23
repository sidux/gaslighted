import React, { useState, useEffect } from 'react';
import MainMenu from './MainMenu';
import GameScreen from './GameScreen';
import InstructionsScreen from './InstructionsScreen';
import { Level } from '../logic/types';

enum Screen {
  MAIN_MENU,
  INSTRUCTIONS,
  GAME
}

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.MAIN_MENU);
  const [level, setLevel] = useState<Level | null>(null);
  
  // Load the first level data
  useEffect(() => {
    const loadLevel = async () => {
      try {
        const response = await fetch('src/assets/levels/level1.json');
        if (!response.ok) {
          throw new Error(`Failed to load level: ${response.statusText}`);
        }
        const levelData: Level = await response.json();
        setLevel(levelData);
      } catch (error) {
        console.error('Failed to load level:', error);
      }
    };
    
    loadLevel();
  }, []);
  
  const handleStartGame = () => {
    setCurrentScreen(Screen.GAME);
  };
  
  const handleShowInstructions = () => {
    setCurrentScreen(Screen.INSTRUCTIONS);
  };
  
  const handleBackToMainMenu = () => {
    setCurrentScreen(Screen.MAIN_MENU);
  };
  
  return (
    <div className="app-container">
      {currentScreen === Screen.MAIN_MENU && (
        <MainMenu 
          onStart={handleStartGame} 
          onShowInstructions={handleShowInstructions}
          level={level}
        />
      )}
      
      {currentScreen === Screen.INSTRUCTIONS && (
        <InstructionsScreen onBack={handleBackToMainMenu} />
      )}
      
      {currentScreen === Screen.GAME && level && (
        <GameScreen level={level} onBackToMenu={handleBackToMainMenu} />
      )}
    </div>
  );
};

export default App;
