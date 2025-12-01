
import React from 'react';
import { AlertTriangleIcon, StopIcon } from './icons';

interface CloseConfirmationModalProps {
  isOpen: boolean;
  onExit: () => void;
  onMinimize: () => void;
  onCancel: () => void;
}

const MinimizeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8 3v3a2 2 0 0 1-2 2H3"></path>
    <path d="M21 8h-3a2 2 0 0 1-2-2V3"></path>
    <path d="M3 16h3a2 2 0 0 1 2 2v3"></path>
    <path d="M16 21v-3a2 2 0 0 1 2-2h3"></path>
  </svg>
);

const CloseConfirmationModal: React.FC<CloseConfirmationModalProps> = ({ isOpen, onExit, onMinimize, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md p-6 bg-gray-900/90 rounded-lg shadow-2xl border border-cyan-500/30 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>

        <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center relative z-10">
          <AlertTriangleIcon className="w-6 h-6 mr-2 text-cyan-500" />
          Server Manager is Running
        </h2>
        
        <p className="text-gray-300 mb-8 text-sm relative z-10 leading-relaxed">
          You are attempting to close the application while the server manager is active. 
          <br /><br />
          Would you like to <strong>Exit</strong> completely (stopping the manager) or <strong>Minimize</strong> to the system tray?
        </p>

        <div className="flex flex-col sm:flex-row justify-end gap-3 relative z-10">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onMinimize}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-md transition-colors shadow-md shadow-cyan-500/20 flex items-center justify-center"
            >
              <MinimizeIcon className="w-4 h-4 mr-2" />
              Minimize
            </button>
            <button
              onClick={onExit}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-md transition-colors shadow-md shadow-red-500/20 flex items-center justify-center"
            >
              <StopIcon className="w-4 h-4 mr-2" />
              Exit Application
            </button>
        </div>
      </div>
    </div>
  );
};

export default CloseConfirmationModal;
