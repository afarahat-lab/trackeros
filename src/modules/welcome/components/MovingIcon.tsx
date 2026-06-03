import React from 'react';

interface MovingIconProps {
  iconType: string;
  animationType: string;
  duration: number;
}

/**
 * MovingIcon component renders an icon with animation to create a dynamic visual effect.
 * 
 * @param {MovingIconProps} props - The properties for the MovingIcon component.
 * @returns {JSX.Element} The rendered MovingIcon component.
 */
const MovingIcon: React.FC<MovingIconProps> = ({ iconType, animationType, duration }) => {
  const style = {
    animation: `${animationType} ${duration}s infinite`
  };

  return <div className={`icon ${iconType}`} style={style}></div>;
};

export default MovingIcon;
