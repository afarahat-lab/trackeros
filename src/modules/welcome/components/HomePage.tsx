import React from 'react';
import MovingIcon from './MovingIcon';

/**
 * HomePage component displays the home page with moving icons to enhance visual appeal.
 */
const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <h1>Welcome to the Home Page</h1>
      <div className="icons">
        <MovingIcon iconType="star" animationType="spin" duration={2} />
        <MovingIcon iconType="heart" animationType="bounce" duration={3} />
        <MovingIcon iconType="circle" animationType="fade" duration={4} />
      </div>
    </div>
  );
};

export default HomePage;
