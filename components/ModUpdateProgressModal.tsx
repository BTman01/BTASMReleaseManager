
import React, { useEffect, useRef } from 'react';

interface ModUpdateProgressModalProps {
  log: string[];
  isFinished: boolean;
  onClose: () => void;
}

const ModUpdateProgressModal: React.FC<ModUpdateProgressModalProps> = ({ log, isFinished, onClose }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [log]);

  const finalMessage = log[log.length - 1] || '';
  const hasError = finalMessage.includes('❌');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-4xl p-8 bg-gray-800 rounded-lg shadow-2xl shadow-blue-500/20 border border-gray-700 flex flex-col">
        <div className="flex-grow">
          <h2 className="text-2xl font-bold text-cyan-400 mb-2">
            {isFinished ? (hasError ? 'Mod Update Finished with Errors' : 'Mod Update Complete') : 'Updating Mods...'}
          </h2>
          <p className="text-gray-400 mb-4">
            {isFinished 
                ? 'You can now close this window.' 
                : 'Downloading mods from the Steam Workshop. Please wait.'
            }
          </p>
          <div 
            ref={logContainerRef}
            className="w-full h-96 bg-black/50 p-4 rounded-md border border-gray-700 font-mono text-sm text-gray-300 overflow-y-auto"
          >
            {log.map((entry, index) => (
              <div key={index} className="whitespace-pre-wrap">
                <span className="text-cyan-400 mr-2">&gt;</span>
                <span>{entry}</span>
              </div>
            ))}
          </div>
        </div>
        {isFinished && (
            <div className="mt-6 text-right">
                <button
                    onClick={onClose}
                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-md transition-colors duration-200 shadow-md"
                >
                    Close
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default ModUpdateProgressModal;
