import React from 'react';
import { StartButton } from './StartButton';

/**
 * WelcomeScreen component displays a welcome message and a start button.
 * Clicking the start button shows a message that the system is yet to be developed.
 */
const WelcomeScreen: React.FC = () => {
  return (
    <div>
      <h1>Welcome to Trackeros</h1>
      <StartButton />
    </div>
  );
};

export default WelcomeScreen;
