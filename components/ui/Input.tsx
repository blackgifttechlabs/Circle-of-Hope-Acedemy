import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full mb-4">
      {label && <label className="block text-coha-900 text-sm font-semibold mb-1 uppercase tracking-wider">{label}</label>}
      <input
        className={`w-full p-3 border-2 border-gray-300 focus:border-coha-500 outline-none transition-colors bg-white rounded-none text-gray-800 ${className}`}
        {...props}
      />
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
};