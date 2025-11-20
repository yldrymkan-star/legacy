import React from 'react';

const LoadingSpinner = () => {
  return (
    React.createElement(
      'div',
      { className: 'flex justify-center items-center p-4' },
      React.createElement('div', { className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 dark:border-amber-300' })
    )
  );
};

export default LoadingSpinner;