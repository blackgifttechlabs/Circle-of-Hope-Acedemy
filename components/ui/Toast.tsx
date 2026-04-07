import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  variant?: 'success' | 'error' | 'info';
}

export const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose, variant = 'success' }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      // Show for 2 seconds as requested by admin
      const timer = setTimeout(() => {
        setShow(false);
        // Wait for slide out animation to finish before calling onClose cleanup
        setTimeout(onClose, 300); 
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  const bgColors = {
    success: 'bg-green-600 border-green-400',
    error: 'bg-red-600 border-red-400',
    info: 'bg-coha-900 border-coha-400'
  };

  return (
    <div
      className={`fixed top-4 right-4 z-[100] flex items-center gap-3 text-white px-6 py-4 shadow-2xl border-l-4 transform transition-transform duration-300 ease-in-out ${bgColors[variant]} ${
        show ? 'translate-x-0' : 'translate-x-[200%]'
      }`}
    >
      <CheckCircle className="text-white" size={24} />
      <span className="font-semibold tracking-wide">{message}</span>
    </div>
  );
};