import React, { useState, useEffect } from 'react';
import MainMenu from './MainMenu';
import GameScreen from './GameScreen';
import InstructionsScreen from './InstructionsScreen';
import { Level } from '../types';
import { loadAllLevels } from '../services/levelService';

enum Screen {
  MAIN_MENU,
  INSTRUCTIONS,
  GAME
}

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.MAIN_MENU);
  const [level, setLevel] = useState<Level | null>(null);
  
  const [availableLevels, setAvailableLevels] = useState<Level[]>([]);
  const [selectedLevelIndex, setSelectedLevelIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load all level data
  useEffect(() => {
    const loadLevels = async () => {
      setIsLoading(true);
      try {
        const loadedLevels = await loadAllLevels();
        setAvailableLevels(loadedLevels);
        if (loadedLevels.length > 0) {
          setLevel(loadedLevels[0]);
        }
      } catch (error) {
        console.error('Failed to load levels:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadLevels();
  }, []);
  
  // Update selected level when selectedLevelIndex changes
  useEffect(() => {
    if (availableLevels.length > 0 && selectedLevelIndex < availableLevels.length) {
      setLevel(availableLevels[selectedLevelIndex]);
    }
  }, [selectedLevelIndex, availableLevels]);
  
  const handleStartGame = () => {
    setCurrentScreen(Screen.GAME);
  };
  
  const handleShowInstructions = () => {
    setCurrentScreen(Screen.INSTRUCTIONS);
  };
  
  const handleBackToMainMenu = () => {
    setCurrentScreen(Screen.MAIN_MENU);
  };
  
  if (isLoading) {
    return (
      <div className="loading-screen">
        <h1>Loading...</h1>
        <p>Loading game assets...</p>
      </div>
    );
  }
  
  return (
    <div className="app-container">
      {currentScreen === Screen.MAIN_MENU && (
        <MainMenu 
          onStart={handleStartGame} 
          onShowInstructions={handleShowInstructions}
          level={level}
          availableLevels={availableLevels}
          selectedLevelIndex={selectedLevelIndex}
          onSelectLevel={setSelectedLevelIndex}
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
