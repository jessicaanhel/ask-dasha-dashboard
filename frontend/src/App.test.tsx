import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test('opens the mortgage calculator by default', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { name: /Mortgage Calculator/i })).toBeInTheDocument();
  expect(screen.getAllByText('Ask Dasha').length).toBeGreaterThan(0);
});
