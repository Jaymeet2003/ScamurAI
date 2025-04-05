import React from 'react';
import classNames from 'classnames';

export const Button = ({ children, onClick, className = '', variant = 'default', ...props }) => {
  const baseStyles = 'px-6 py-2 rounded-full font-semibold text-base transition-all duration-300 focus:outline-none';

  const variants = {
    default: 'bg-[#6366f1] text-white hover:bg-[#4f46e5] border border-indigo-500',
    outline: 'bg-transparent text-[#a5b4fc] border border-[#6366f1] hover:text-white hover:bg-[#4f46e5]',
  };

  return (
    <button
      onClick={onClick}
      className={classNames(baseStyles, variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
};
