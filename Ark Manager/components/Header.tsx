import React, { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { CogIcon, BellIcon, WindowMinimizeIcon, WindowMaximizeIcon, WindowRestoreIcon, WindowCloseIcon, DownloadCloudIcon } from './icons';

interface HeaderProps {
  onOpenSettings: () => void;
  hasUnread: boolean;
  onToggleNotifications: () => void;
  pendingAppUpdate: any | null;
  onInstallAppUpdate: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings, hasUnread, onToggleNotifications, pendingAppUpdate, onInstallAppUpdate }) => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Check initial maximized state
    const checkMaximized = async () => {
        try {
            const appWindow = getCurrentWindow();
            setIsMaximized(await appWindow.isMaximized());
        } catch (e) { console.error(e); }
    };

    checkMaximized();

    // Listen for resize events to update the maximized icon state
    const appWindow = getCurrentWindow();
    const unlisten = appWindow.onResized(async () => {
        setIsMaximized(await appWindow.isMaximized());
    });

    return () => {
        unlisten.then(f => f());
    };
  }, []);

  const handleMinimize = async () => {
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
  };

  const handleMaximizeToggle = async () => {
      const appWindow = getCurrentWindow();
      const maximized = await appWindow.isMaximized();
      if (maximized) {
          await appWindow.unmaximize();
      } else {
          await appWindow.maximize();
      }
      setIsMaximized(!maximized);
  };

  const handleClose = async () => {
      const appWindow = getCurrentWindow();
      await appWindow.close();
  };

  return (
    <div className="flex flex-col w-full select-none z-50">
      {/* Row 1: Custom Title Bar (Window Controls & Drag Region) */}
      <div 
        className="h-8 flex items-center justify-end bg-black/60 backdrop-blur-md border-b border-white/5"
        data-tauri-drag-region
      >
        {/* Spacer to push controls to right, also acts as drag handle */}
        <div className="flex-grow h-full" data-tauri-drag-region></div>

        {/* Window Controls */}
        <div className="flex h-full">
            <button 
                onClick={handleMinimize}
                className="w-10 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Minimize"
            >
                <WindowMinimizeIcon className="w-3.5 h-3.5" />
            </button>
            <button 
                onClick={handleMaximizeToggle}
                className="w-10 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label={isMaximized ? "Restore" : "Maximize"}
            >
                {isMaximized ? <WindowRestoreIcon className="w-3.5 h-3.5" /> : <WindowMaximizeIcon className="w-3.5 h-3.5" />}
            </button>
            <button 
                onClick={handleClose}
                className="w-10 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-600 transition-colors"
                aria-label="Close"
            >
                <WindowCloseIcon className="w-3.5 h-3.5" />
            </button>
        </div>
      </div>

      {/* Row 2: Main App Header (Logo, Title, App Tools) */}
      <header className="bg-black/30 backdrop-blur-sm p-3 shadow-lg shadow-cyan-500/10 flex items-center justify-between">
          <div className="flex items-center space-x-3 pl-2">
              <svg className="w-8 h-8 text-cyan-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.789-2.75 9.566-1.74 2.777-2.75 5.434-2.75 5.434h11c0 0-1.01-2.657-2.75-5.434C13.009 17.789 12 14.517 12 11z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0-3.517 1.009-6.789 2.75-9.566C16.491-1.343 17.5.313 17.5.313h-11c0 0 1.01 2.657 2.75 5.434C10.991 4.211 12 7.483 12 11z"></path></svg>
              <h1 className="text-xl font-bold text-gray-100 tracking-wider pointer-events-none">
                Ark Ascended Server Manager
              </h1>
          </div>

          <div className="flex items-center space-x-2 mr-2">
                {pendingAppUpdate && (
                    <button
                        onClick={onInstallAppUpdate}
                        className="relative p-2 text-cyan-400 hover:text-white hover:bg-cyan-600/30 rounded-full transition-colors flex items-center space-x-2 group"
                        title={`Update Available: v${pendingAppUpdate.version}`}
                    >
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                        </span>
                        <DownloadCloudIcon className="w-6 h-6" />
                        <span className="text-xs font-bold hidden group-hover:block transition-all">Update v{pendingAppUpdate.version}</span>
                    </button>
                )}
                <button
                    onClick={onToggleNotifications}
                    className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full transition-colors"
                    aria-label="Open notifications"
                >
                    <BellIcon className="w-6 h-6" />
                    {hasUnread && (
                    <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-gray-800"></span>
                    )}
                </button>
                <button 
                    onClick={onOpenSettings}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full transition-colors"
                    aria-label="Open application settings"
                >
                    <CogIcon className="w-6 h-6" />
                </button>
          </div>
      </header>
    </div>
  );
};

export default Header;
