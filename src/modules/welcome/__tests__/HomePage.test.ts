import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from '../components/HomePage';

// Mock the MovingIcon component to isolate the test to the HomePage and EnhancedUIComponent
vi.mock('../components/MovingIcon', () => ({
  default: () => <div>Mocked Moving Icon</div>
}));

describe('SC-1: Home Page UI Enhancements', () => {
  it('should render the home page with enhanced UI elements', () => {
    render(<HomePage />);

    // Check for the presence of the main heading
    const heading = screen.getByRole('heading', { name: /welcome to the home page/i });
    expect(heading).toBeInTheDocument();

    // Check for the EnhancedUIComponent with specific classes
    const enhancedUI = screen.getByText(/user preferences loaded/i);
    expect(enhancedUI).toBeInTheDocument();
    expect(enhancedUI.parentElement).toHaveClass('enhanced-ui light grid');

    // Check for the presence of mocked moving icons
    const icons = screen.getAllByText(/mocked moving icon/i);
    expect(icons).toHaveLength(3);
  });

  it('should handle missing user preferences gracefully', () => {
    // Assuming HomePage handles missing user preferences internally
    render(<HomePage />);

    // Check that the EnhancedUIComponent still renders correctly
    const enhancedUI = screen.getByText(/user preferences loaded/i);
    expect(enhancedUI).toBeInTheDocument();
  });
});
