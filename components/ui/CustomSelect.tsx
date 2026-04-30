import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

interface Option {
  label: string;
  value: string;
}

interface CustomSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  required?: boolean;
  placeholder?: string;
  className?: string;
  name?: string; // For form handling
  error?: string; // Added error prop
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ 
  label, 
  value, 
  onChange, 
  options, 
  required,
  placeholder = "Choose",
  className = "",
  name,
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const getBorderColor = () => {
    if (error) return 'border-red-500 bg-red-50/30';
    if (isOpen) return 'border-coha-500 bg-gray-100';
    return 'border-gray-300';
  };

  return (
    <div className={`w-full mb-4 relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-gray-800 text-sm font-medium mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div 
        className={`w-full border-b-2 cursor-pointer transition-colors ${getBorderColor()}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="p-3 flex justify-between items-center">
          <span className={`${!value ? 'text-gray-500' : 'text-gray-900'} font-medium`}>
            {value ? options.find(o => o.value === value)?.label || value : placeholder}
          </span>
          <ChevronDown size={18} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-coha-500' : error ? 'text-red-500' : 'text-gray-500'}`} />
        </div>
      </div>
      
      {error && (
        <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
      
      {/* Scroll Book Animation */}
      <div 
        className={`absolute z-20 w-full bg-white shadow-xl border border-gray-100 mt-1 rounded-b-lg overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="overflow-y-auto max-h-60">
          {options.map((option) => (
            <div 
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`p-3 text-sm cursor-pointer hover:bg-coha-50 transition-colors border-b border-gray-50 last:border-0 ${value === option.value ? 'bg-coha-50 text-coha-900 font-bold' : 'text-gray-700'}`}
            >
              {option.label}
            </div>
          ))}
          {options.length === 0 && (
            <div className="p-3 text-sm text-gray-500 italic">No options available</div>
          )}
        </div>
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  );
};