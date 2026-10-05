import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { App } from '../src/App';

function CurrentPath() {
  return <div data-testid="path">{useLocation().pathname}</div>;
}

// Renders the whole app at a path, with an optional logged-in token.
export function renderApp(path = '/', token?: string) {
  if (token) sessionStorage.setItem('backoffice.token', token);
  // applyAccept off: let any file reach the app, so its own type check is tested.
  const user = userEvent.setup({ applyAccept: false });
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <CurrentPath />
    </MemoryRouter>,
  );
  return { user, path: () => screen.getByTestId('path').textContent };
}
