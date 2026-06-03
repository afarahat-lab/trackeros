import React from 'react';
import MovingIcon from './MovingIcon';
import EnhancedUIComponent from './EnhancedUIComponent';

/**
 * HomePage component displays the home page with moving icons and enhanced UI elements.
 */
const HomePage: React.FC = () => {
  const userPreferences = {}; // Assume this is fetched from a user settings service

  return (
    <div className="home-page">
      <h1>Welcome to the Home Page</h1>
      <EnhancedUIComponent theme="light" layout="grid" userPreferences={userPreferences} />
      <div className="icons">
        <MovingIcon iconType="star" animationType="spin" duration={2} />
        <MovingIcon iconType="heart" animationType="bounce" duration={3} />
        <MovingIcon iconType="circle" animationType="fade" duration={4} />
      </div>
    </div>
  );
};

export default HomePage;
