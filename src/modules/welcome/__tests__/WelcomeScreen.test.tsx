import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WelcomeScreen from '../components/WelcomeScreen';

// Mock the alert function
vi.spyOn(window, 'alert').mockImplementation(() => {});

describe('SC-1: WelcomeScreen Component', () => {
  it('should display a welcome message and a start button', () => {
    render(<WelcomeScreen />);
    
    const welcomeMessage = screen.getByText('Welcome to Trackeros');
    const startButton = screen.getByRole('button', { name: /start/i });

    expect(welcomeMessage).toBeInTheDocument();
    expect(startButton).toBeInTheDocument();
  });

  it('should display an alert message when the start button is clicked', () => {
    render(<WelcomeScreen />);

    const startButton = screen.getByRole('button', { name: /start/i });
    fireEvent.click(startButton);

    expect(window.alert).toHaveBeenCalledWith('The system is yet to be developed.');
  });
});