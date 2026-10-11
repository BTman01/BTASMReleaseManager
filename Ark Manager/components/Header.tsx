
import React, { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { CogIcon, BellIcon, WindowMinimizeIcon, WindowMaximizeIcon, WindowRestoreIcon, WindowCloseIcon, DownloadCloudIcon, ArkSpecimenImplantLogo } from './icons';
import OfficialServerStatusBadge from './OfficialServerStatusBadge';

interface HeaderProps {
  onOpenSettings: () => void;
  hasUnread: boolean;
  onToggleNotifications: () => void;
  pendingAppUpdate: any | null;
  onInstallAppUpdate: () => void;
  currentUser?: { email?: string | null; displayName?: string | null } | null;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
  onOpenMobileBridge?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  hasUnread,
  onToggleNotifications,
  pendingAppUpdate,
  onInstallAppUpdate,
  currentUser,
  onOpenAuthModal,
  onLogout,
  onOpenMobileBridge,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

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
                className="w-10 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Minimize"
            >
                <WindowMinimizeIcon className="w-3.5 h-3.5" />
            </button>
            <button 
                onClick={handleMaximizeToggle}
                className="w-10 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label={isMaximized ? "Restore" : "Maximize"}
            >
                {isMaximized ? <WindowRestoreIcon className="w-3.5 h-3.5" /> : <WindowMaximizeIcon className="w-3.5 h-3.5" />}
            </button>
            <button 
                onClick={handleClose}
                className="w-10 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-600 transition-colors cursor-pointer"
                aria-label="Close"
            >
                <WindowCloseIcon className="w-3.5 h-3.5" />
            </button>
        </div>
      </div>

      {/* Row 2: Main App Header (Logo, Title, Official Status, App Tools) */}
      <header className="bg-black/40 backdrop-blur-md p-3 shadow-lg shadow-cyan-500/10 flex items-center justify-between gap-3 border-b border-white/5">
          {/* Enhanced ARK Specimen Implant Logo & Brand Title */}
          <div className="flex items-center space-x-3.5 pl-2 flex-shrink-0 group">
              <div className="relative flex items-center justify-center p-1 rounded-xl bg-gradient-to-br from-cyan-950/70 to-slate-950/90 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.25)] group-hover:border-cyan-400/70 group-hover:shadow-[0_0_22px_rgba(34,211,238,0.45)] transition-all duration-300">
                  <ArkSpecimenImplantLogo className="w-8 h-8 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                  </span>
              </div>

              <div className="flex flex-col select-none pointer-events-none">
                  <div className="flex items-baseline space-x-1.5">
                      <span className="text-sm font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-gray-100 via-gray-200 to-gray-400 font-mono">
                          BT&apos;s
                      </span>
                      <span className="text-lg font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.4)]">
                          ASA
                      </span>
                      <span className="text-sm font-extrabold uppercase tracking-wider text-gray-200 hidden sm:inline">
                          SERVER MANAGER
                      </span>
                  </div>
                  <div className="flex items-center space-x-2 text-[9px] uppercase font-mono tracking-widest text-cyan-400/80 -mt-0.5">
                      <span className="flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block animate-pulse"></span>
                          <span>ASCENDED EDITION</span>
                      </span>
                      <span className="text-gray-600 hidden md:inline">•</span>
                      <span className="text-gray-400 hidden md:inline">CONTROL HUB</span>
                  </div>
              </div>
          </div>

          {/* Center Official Status & Game Version */}
          <div className="flex items-center justify-center flex-1 max-w-md">
            <OfficialServerStatusBadge />
          </div>

          <div className="flex items-center space-x-2 mr-2 flex-shrink-0">
                {pendingAppUpdate && (
                    <button
                        onClick={onInstallAppUpdate}
                        className="relative p-2 text-cyan-400 hover:text-white hover:bg-cyan-600/30 rounded-full transition-colors flex items-center space-x-2 group cursor-pointer"
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
                    className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full transition-colors cursor-pointer"
                    aria-label="Open notifications"
                >
                    <BellIcon className="w-6 h-6" />
                    {hasUnread && (
                    <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-gray-800"></span>
                    )}
                </button>
                <button 
                    onClick={onOpenSettings}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full transition-colors cursor-pointer"
                    aria-label="Open application settings"
                >
                    <CogIcon className="w-6 h-6" />
                </button>

                {/* Mobile Bridge Status & Command Dispatch Button */}
                {currentUser && (
                  <button
                    onClick={onOpenMobileBridge}
                    className="p-2 text-cyan-400 hover:text-white hover:bg-cyan-950/60 rounded-full transition-all cursor-pointer relative group"
                    title="Mobile Bridge & Remote Cloud Dispatch"
                    aria-label="Mobile Bridge"
                  >
                    <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </button>
                )}

                {/* Cloud Auth / User Profile */}
                <div className="relative pl-1 border-l border-white/10">
                  {currentUser ? (
                    <div className="relative">
                      <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center space-x-2 py-1 px-2.5 rounded-full bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/30 hover:border-cyan-400/50 text-cyan-200 text-xs font-medium transition-all shadow-sm cursor-pointer"
                        title={currentUser.email || 'Cloud Account'}
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-[10px] uppercase">
                          {(currentUser.displayName || currentUser.email || 'U')[0]}
                        </div>
                        <span className="max-w-[100px] truncate text-gray-200 hidden md:inline">
                          {currentUser.displayName || currentUser.email?.split('@')[0]}
                        </span>
                      </button>

                      {showUserMenu && (
                        <div className="absolute right-0 mt-2 w-60 rounded-xl bg-gray-950 border border-cyan-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.8)] p-2 z-50 animate-fade-in text-xs">
                          <div className="px-3 py-2 border-b border-gray-800">
                            <p className="font-bold text-gray-200 truncate">
                              {currentUser.displayName || 'Server Admin'}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate">{currentUser.email}</p>
                            <span className="inline-block mt-1 px-1.5 py-0.2 text-[9px] font-mono bg-cyan-950 text-cyan-300 rounded border border-cyan-800">
                              Cloud Connected (Phase 2)
                            </span>
                          </div>
                          <div className="p-1 space-y-1">
                            <button
                              onClick={() => {
                                setShowUserMenu(false);
                                onOpenMobileBridge?.();
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-cyan-300 hover:text-white hover:bg-cyan-950/50 font-medium flex items-center space-x-2 transition-colors cursor-pointer"
                            >
                              <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              <span>Mobile Bridge & Dispatch</span>
                            </button>
                            <button
                              onClick={() => {
                                setShowUserMenu(false);
                                onLogout?.();
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/40 font-medium flex items-center space-x-2 transition-colors cursor-pointer"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                              <span>Sign Out</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={onOpenAuthModal}
                      className="flex items-center space-x-1.5 py-1 px-3 rounded-full bg-gradient-to-r from-cyan-950 to-slate-900 hover:from-cyan-900 hover:to-slate-800 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-xs font-semibold shadow-[0_0_10px_rgba(6,182,212,0.15)] transition-all cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      <span>Sign In</span>
                    </button>
                  )}
                </div>
          </div>
      </header>
    </div>
  );
};

export default Header;

