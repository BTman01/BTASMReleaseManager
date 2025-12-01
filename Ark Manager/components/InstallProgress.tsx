
import React, { useEffect, useRef } from 'react';
import { CheckCircleIcon } from './icons';

interface InstallProgressProps {
  progress: number;
  log: string[];
  onStartInstall: () => Promise<void>;
}

const InstallProgress: React.FC<InstallProgressProps> = ({ progress, log, onStartInstall }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [log]);
  
  useEffect(() => {
    if (!hasStarted.current) {
        hasStarted.current = true;
        onStartInstall();
    }
  }, [onStartInstall]);

  return (
    <div className="container mx-auto flex items-center justify-center py-16">
      <div className="w-full max-w-3xl p-8 bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-700">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Setting Up New Server Profile...</h2>
        
        <div className="w-full bg-gray-900 rounded-full h-4 mb-2 border border-gray-700 overflow-hidden">
          <div 
            className="bg-cyan-500 h-full rounded-full transition-all duration-300 ease-linear" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-right text-cyan-300 font-mono text-lg mb-6">{progress}%</p>
        
        <div 
          ref={logContainerRef}
          className="w-full h-64 bg-black/50 p-4 rounded-md border border-gray-700 font-mono text-sm text-gray-300 overflow-y-auto"
        >
          {log.map((entry, index) => (
            <div key={index} className="animate-fade-in whitespace-pre-wrap">
              <span className="text-cyan-400 mr-2">&gt;</span>
              <span>{entry}</span>
            </div>
          ))}
          {log.includes("✅ Installation successful!") && (
            <p className="text-green-400 font-bold mt-4 flex items-center animate-fade-in">
              <CheckCircleIcon className="w-5 h-5 mr-2" />
              Setup Complete! Returning to dashboard...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallProgress;