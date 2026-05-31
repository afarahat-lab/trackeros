import React from 'react';

/**
 * StartButton component is a button that, when clicked, displays a message indicating the system is yet to be developed.
 */
export const StartButton: React.FC = () => {
  const handleClick = () => {
    alert('The system is yet to be developed.');
  };

  return (
    <button onClick={handleClick}>Start</button>
  );
};
