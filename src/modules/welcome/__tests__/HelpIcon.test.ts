import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HelpIcon from '../components/HelpIcon';

// Mock any external dependencies if necessary
// vi.mock('../path/to/dependency', () => ({ ...mockedFunctions }));

describe('SC-1: HelpIcon Component', () => {
  it('should render the help icon on the main screen', () => {
    render(<HelpIcon tooltipText={"This application helps you track your tasks efficiently."} />);
    const helpIcon = screen.getByText('❓');
    expect(helpIcon).toBeInTheDocument();
  });

  it('should display a tooltip with application description when the help icon is clicked', () => {
    render(<HelpIcon tooltipText={"This application helps you track your tasks efficiently."} />);
    const helpIcon = screen.getByText('❓');
    fireEvent.click(helpIcon);
    const tooltip = screen.getByText('This application helps you track your tasks efficiently.');
    expect(tooltip).toBeInTheDocument();
  });

  it('should hide the tooltip when the help icon is clicked again', () => {
    render(<HelpIcon tooltipText={"This application helps you track your tasks efficiently."} />);
    const helpIcon = screen.getByText('❓');
    fireEvent.click(helpIcon);
    fireEvent.click(helpIcon);
    const tooltip = screen.queryByText('This application helps you track your tasks efficiently.');
    expect(tooltip).not.toBeInTheDocument();
  });

  // Error case: Ensure no tooltip is shown if tooltipText is empty
  it('should not display a tooltip if tooltipText is empty', () => {
    render(<HelpIcon tooltipText={""} />);
    const helpIcon = screen.getByText('❓');
    fireEvent.click(helpIcon);
    const tooltip = screen.queryByText('');
    expect(tooltip).not.toBeInTheDocument();
  });
});
