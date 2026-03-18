import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-6 py-3 font-medium transition-colors duration-200 flex items-center justify-center gap-2 rounded-none";
  
  const variants = {
    primary: "bg-coha-900 hover:bg-coha-800 text-white",
    secondary: "bg-coha-500 hover:bg-coha-400 text-white",
    outline: "border-2 border-coha-900 text-coha-900 hover:bg-coha-900 hover:text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white"
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${widthStyle} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};