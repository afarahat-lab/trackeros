import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from '../components/HomePage';

// SC-1: The home page displays moving icons that enhance the visual appeal.
describe('HomePage Component', () => {
  it('should render the home page with moving icons', () => {
    render(<HomePage />);

    // Check if the heading is displayed
    const heading = screen.getByText(/Welcome to the Home Page/i);
    expect(heading).toBeInTheDocument();

    // Check if the icons are rendered
    const starIcon = screen.getByClass('icon star');
    const heartIcon = screen.getByClass('icon heart');
    const circleIcon = screen.getByClass('icon circle');

    expect(starIcon).toBeInTheDocument();
    expect(heartIcon).toBeInTheDocument();
    expect(circleIcon).toBeInTheDocument();

    // Check if the icons have the correct animation styles
    expect(starIcon).toHaveStyle('animation: spin 2s infinite');
    expect(heartIcon).toHaveStyle('animation: bounce 3s infinite');
    expect(circleIcon).toHaveStyle('animation: fade 4s infinite');
  });
});
