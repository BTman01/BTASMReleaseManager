import React, { useState } from 'react';
import { AlertTriangleIcon, SaveIcon, DownloadCloudIcon } from './icons';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onSave: (autoSave: boolean) => void;
  onDiscard: () => void;
  onCancel: () => void;
}

const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({ isOpen, onSave, onDiscard, onCancel }) => {
  const [autoSave, setAutoSave] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-lg p-6 bg-gray-800 rounded-lg shadow-2xl border border-yellow-600/50">
        <h2 className="text-xl font-bold text-yellow-400 mb-4 flex items-center">
          <AlertTriangleIcon className="w-6 h-6 mr-2" />
          Configuration Mismatch Detected
        </h2>
        
        <div className="text-gray-300 mb-6 text-sm">
            <p className="mb-4">
                The server configuration in this application differs from the actual files on your disk. This usually happens if you edited the <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-400">.ini</code> files directly.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                <div className="bg-gray-900/50 p-3 rounded border border-gray-700 flex flex-col">
                    <strong className="text-cyan-400 mb-1">Option 1: Load Disk Settings</strong>
                    <span className="text-gray-400 text-xs flex-grow">Import changes from your files into the app. (Discards unsaved app changes).</span>
                </div>
                 <div className="bg-gray-900/50 p-3 rounded border border-gray-700 flex flex-col">
                    <strong className="text-green-400 mb-1">Option 2: Save App Settings</strong>
                    <span className="text-gray-400 text-xs flex-grow">Overwrite the files on disk with the settings shown in the app.</span>
                </div>
            </div>
        </div>
        
        <div className="mb-6 flex items-center bg-gray-900/50 p-3 rounded-md border border-gray-700">
            <input 
                id="autoSave" 
                type="checkbox" 
                checked={autoSave} 
                onChange={(e) => setAutoSave(e.target.checked)} 
                className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-600 focus:ring-cyan-500"
            />
            <label htmlFor="autoSave" className="ml-3 text-sm text-gray-300 select-none cursor-pointer">
                Always <strong>Save App Settings</strong> (Option 2) automatically in the future
            </label>
        </div>

        <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onDiscard}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-md transition-colors shadow-md flex items-center"
            >
              <DownloadCloudIcon className="w-4 h-4 mr-2" />
              Load Disk Settings & Start
            </button>
            <button
              onClick={() => onSave(autoSave)}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-md transition-colors shadow-md flex items-center"
            >
              <SaveIcon className="w-4 h-4 mr-2" />
              Save App Settings & Start
            </button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedChangesModal;