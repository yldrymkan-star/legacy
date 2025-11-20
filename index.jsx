import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  // Using React.createElement to be consistent with other components and avoid the need for a JSX build step.
  root.render(React.createElement(App));
}
