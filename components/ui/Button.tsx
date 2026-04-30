import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  fullWidth?: boolean;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  loading = false,
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-6 py-3 font-medium transition-colors duration-200 flex items-center justify-center gap-2 rounded-none disabled:opacity-50 disabled:cursor-not-allowed";
  
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
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : children}
    </button>
  );
};
