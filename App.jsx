import React from 'react';
import ChatInterface from './components/ChatInterface.jsx';

function App() {
  return (
    React.createElement(
      'div',
      { className: 'min-h-screen flex flex-col bg-stone-50 dark:bg-stone-950' },
      React.createElement(ChatInterface, null)
    )
  );
}

export default App;