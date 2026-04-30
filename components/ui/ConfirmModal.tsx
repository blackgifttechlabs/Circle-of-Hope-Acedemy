import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  isLoading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white w-full max-w-md shadow-2xl border-t-8 border-red-600 animate-fade-in">
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="bg-red-100 p-3 rounded-full shrink-0">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onConfirm} disabled={isLoading}>
              {isLoading ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};