import React from 'react';

/**
 * HelpPage component displays the help information including credits for the web application.
 *
 * @returns {JSX.Element} The rendered HelpPage component.
 */
const HelpPage: React.FC = () => {
  const credits = 'This application was developed by the Gestalt team.';

  return (
    <div>
      <h1>Help Page</h1>
      <section>
        <h2>Credits</h2>
        <p>{credits}</p>
      </section>
    </div>
  );
};

export default HelpPage;
