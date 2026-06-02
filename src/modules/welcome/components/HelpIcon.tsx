import React, { useState } from 'react';

interface HelpIconProps {
  /**
   * The text to display inside the tooltip when the help icon is clicked.
   */
  tooltipText: string;
}

/**
 * HelpIcon component displays a help icon on the main screen that shows a tooltip with application description when clicked.
 */
const HelpIcon: React.FC<HelpIconProps> = ({ tooltipText }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleIconClick = () => {
    setShowTooltip(!showTooltip);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <span onClick={handleIconClick} style={{ cursor: 'pointer' }}>❓</span>
      {showTooltip && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#fff',
          border: '1px solid #ccc',
          padding: '5px',
          borderRadius: '3px',
          boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)'
        }}>
          {tooltipText}
        </div>
      )}
    </div>
  );
};

export default HelpIcon;
