import React from 'react';

export const Card = ({ children, className = '' }) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};
