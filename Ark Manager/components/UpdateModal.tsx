
import React, { useState } from 'react';
import { DownloadCloudIcon, CancelIcon, InfoIcon } from './icons';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => Promise<void>;
  updateData: any; 
}

const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, onClose, onInstall, updateData }) => {
  const [isInstalling, setIsInstalling] = useState(false);

  if (!isOpen || !updateData) return null;

  const handleInstallClick = async () => {
    setIsInstalling(true);
    await onInstall();
    // App usually restarts here, so state reset isn't strictly necessary, but good practice.
    // setIsInstalling(false); 
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-gray-900 border border-cyan-500/30 rounded-xl shadow-2xl shadow-cyan-500/20 flex flex-col overflow-hidden transform transition-all scale-100">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-start justify-between bg-gradient-to-r from-gray-900 to-gray-800">
            <div className="flex items-center space-x-4">
                <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20 shadow-inner shadow-cyan-500/10">
                    <DownloadCloudIcon className="w-8 h-8 text-cyan-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white tracking-wide">New Version Available</h2>
                    <p className="text-cyan-400 font-mono text-sm mt-1">v{updateData.version}</p>
                </div>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-md hover:bg-gray-800">
                <CancelIcon className="w-6 h-6" />
            </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
            <div className="flex items-center space-x-2 text-sm text-gray-300 font-semibold">
                <InfoIcon className="w-4 h-4 text-cyan-500" />
                <span>Release Notes:</span>
            </div>
            
            <div className="bg-black/40 rounded-lg border border-gray-700/50 p-4 max-h-64 overflow-y-auto custom-scrollbar font-mono text-sm text-gray-300 whitespace-pre-wrap leading-relaxed shadow-inner">
                {updateData.body || "No release notes provided."}
            </div>
            
            <p className="text-xs text-gray-500 italic text-center pt-2">
                The application will restart automatically after the update is installed.
            </p>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 bg-gray-900/50 flex justify-end space-x-3">
            <button 
                onClick={onClose}
                disabled={isInstalling}
                className="px-5 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors font-medium text-sm disabled:opacity-50"
            >
                Remind Me Later
            </button>
            <button 
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
                {isInstalling ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Installing...
                    </>
                ) : (
                    "Install & Restart"
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateModal;
