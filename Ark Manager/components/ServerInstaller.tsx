
import React, { useEffect, useRef } from 'react';
import { CheckCircleIcon, InstallIcon } from './icons';

interface ServerInstallerProps {
    logs: string[];
    isInstalling: boolean;
    onClose: () => void;
}

const ServerInstaller: React.FC<ServerInstallerProps> = ({ logs, isInstalling, onClose }) => {
    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Auto-scroll to the bottom of the log container
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            aria-modal="true"
            role="dialog"
        >
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl shadow-cyan-500/10 w-full max-w-2xl max-h-[80vh] flex flex-col">
                <header className="p-4 border-b border-gray-700 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <InstallIcon className="w-6 h-6 text-cyan-400" />
                        <h2 className="text-xl font-bold text-gray-100">Server Installation</h2>
                    </div>
                     <button 
                        onClick={onClose} 
                        disabled={isInstalling}
                        className="text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                        aria-label="Close installation window"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </header>
                <main className="p-4 flex-grow overflow-y-hidden flex flex-col">
                    <div ref={logContainerRef} className="bg-gray-900 p-3 rounded-md flex-grow overflow-y-auto font-mono text-sm text-gray-300 space-y-1">
                        {logs.map((log, index) => (
                            <p key={index} className="whitespace-pre-wrap animate-fadeIn">
                                <span className="text-gray-500 mr-2">{`[${index + 1}]`}</span>
                                {log}
                            </p>
                        ))}
                        {isInstalling && (
                             <div className="flex items-center text-cyan-400">
                                <svg className="animate-spin h-4 w-4 text-cyan-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Installation in progress...</span>
                            </div>
                        )}
                    </div>
                </main>
                 <footer className="p-4 border-t border-gray-700">
                    {!isInstalling && logs.length > 0 ? (
                        <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
                             <div className="flex items-center text-green-400 font-semibold">
                                <CheckCircleIcon className="w-5 h-5 mr-2" />
                                Installation Complete!
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full sm:w-auto px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-md transition-colors duration-200"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">Please wait for the installation to complete.</p>
                    )}
                </footer>
            </div>
        </div>
    );
};

export default ServerInstaller;
