
import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, AlertTriangleIcon, CancelIcon } from './icons';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error';
}

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Handle entry animation
  useEffect(() => {
    // Small delay to ensure render happens before transition
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Handle auto-dismiss
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Wait for exit animation to finish before unmounting
      setTimeout(onClose, 300); 
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleManualClose = () => {
      setIsVisible(false);
      setTimeout(onClose, 300);
  };

  const isSuccess = type === 'success';

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
    >
      <div className={`flex items-start p-4 rounded-lg shadow-xl backdrop-blur-md border ${
          isSuccess 
            ? 'bg-green-900/90 border-green-500 shadow-green-500/20' 
            : 'bg-red-900/90 border-red-500 shadow-red-500/20'
        } w-80 sm:w-96`}
      >
        <div className={`flex-shrink-0 ${isSuccess ? 'text-green-400' : 'text-red-400'}`}>
          {isSuccess ? <CheckCircleIcon className="w-6 h-6" /> : <AlertTriangleIcon className="w-6 h-6" />}
        </div>
        <div className="ml-3 flex-1 pt-0.5">
          <p className="text-sm font-bold text-white">
            {isSuccess ? 'Success' : 'Error'}
          </p>
          <p className="mt-1 text-sm text-gray-200 leading-snug break-words">
            {message}
          </p>
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            className={`rounded-md inline-flex text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${isSuccess ? 'focus:ring-green-500' : 'focus:ring-red-500'}`}
            onClick={handleManualClose}
          >
            <span className="sr-only">Close</span>
            <CancelIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;
