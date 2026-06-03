import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HelpPage from '../components/HelpPage';

// SC-1: The help page displays the credits of the web application.
describe('HelpPage Component', () => {
  it('should display the credits of the web application', () => {
    render(<HelpPage />);
    const creditsElement = screen.getByText(/This application was developed by the Gestalt team./i);
    expect(creditsElement).toBeInTheDocument();
  });

  it('should display the Help Page title', () => {
    render(<HelpPage />);
    const titleElement = screen.getByText(/Help Page/i);
    expect(titleElement).toBeInTheDocument();
  });

  it('should display the Credits section title', () => {
    render(<HelpPage />);
    const sectionTitleElement = screen.getByText(/Credits/i);
    expect(sectionTitleElement).toBeInTheDocument();
  });
});
