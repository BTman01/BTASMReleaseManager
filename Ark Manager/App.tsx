
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import SettingsModal from './components/SettingsModal';
import NotificationDropdown from './components/NotificationDropdown';
import CloseConfirmationModal from './components/CloseConfirmationModal';
import UpdateModal from './components/UpdateModal';
import Toast, { ToastMessage } from './components/Toast';
import { AppSettings, AppNotification } from './types';
import * as appSettingsService from './services/appSettingsService';
import { checkUpdateAvailable, installUpdate } from './services/updaterService';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
import { getCurrentWindow } from '@tauri-apps/api/window';

const App: React.FC = () => {
  console.log("App.tsx: Rendering App component");

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(appSettingsService.loadSettings());
  
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [profileToSelect, setProfileToSelect] = useState<string | null>(null);

  // App Update State
  const [pendingAppUpdate, setPendingAppUpdate] = useState<any | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  // Close Confirmation State
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const shouldExitRef = useRef(false);

  // Toast State
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Effect to apply theme and sync OS settings
  useEffect(() => {
    const loadedSettings = appSettingsService.loadSettings();
    setAppSettings(loadedSettings);

    // Apply theme
    if (loadedSettings.theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    
    // Sync the autostart setting with the OS state
    const syncAutostart = async () => {
      try {
        const osAutostartEnabled = await isEnabled();
        if (loadedSettings.startWithWindows && !osAutostartEnabled) {
          console.log("Settings say autostart should be ON, but it's OFF. Enabling...");
          await enable();
        } else if (!loadedSettings.startWithWindows && osAutostartEnabled) {
          console.log("Settings say autostart should be OFF, but it's ON. Disabling...");
          await disable();
        }
      } catch (error) {
        console.error("Failed to sync autostart setting:", error);
      }
    };
    syncAutostart();

    // Check for app updates silently on startup
    const silentUpdateCheck = async () => {
        const update = await checkUpdateAvailable();
        if (update) {
            console.log("App update available:", update.version);
            setPendingAppUpdate(update);
        }
    };
    silentUpdateCheck();
  }, []);

  // Effect to intercept window close requests
  useEffect(() => {
    const setupCloseListener = async () => {
      const appWindow = getCurrentWindow();
      const unlisten = await appWindow.onCloseRequested(async (event) => {
        if (shouldExitRef.current) {
          return; // Allow the close to happen
        }
        event.preventDefault();
        setIsCloseModalOpen(true);
      });
      return unlisten;
    };

    const unlistenPromise = setupCloseListener();

    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  }, []);
  
  // Effect to check for unread notifications
  useEffect(() => {
    setHasUnread(notifications.some(n => !n.read));
  }, [notifications]);

  const handleSettingChange = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setAppSettings(prevSettings => {
        const newSettings = { ...prevSettings, [key]: value };
        appSettingsService.saveSettings(newSettings);
        return newSettings;
    });

    // Handle side-effects of changing settings
    if (key === 'startWithWindows') {
      try {
        if (value) {
          await enable();
          console.log("Autostart enabled.");
        } else {
          await disable();
          console.log("Autostart disabled.");
        }
      } catch (error) {
        console.error("Failed to update autostart setting:", error);
      }
    }

    if (key === 'theme') {
      if (value === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
    }
  }, []);
  
  const handleNotificationClick = (profileId: string) => {
    setProfileToSelect(profileId);
    setIsNotificationsOpen(false);
  };
  
  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClearAll = () => {
    setNotifications([]);
    setIsNotificationsOpen(false);
  };
  
  const handleToggleNotifications = () => {
    setIsNotificationsOpen(prev => !prev);
  };

  // Close Modal Handlers
  const handleConfirmExit = async () => {
    shouldExitRef.current = true;
    const appWindow = getCurrentWindow();
    await appWindow.close();
  };

  const handleConfirmMinimize = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.hide();
    setIsCloseModalOpen(false);
  };

  const handleShowToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  const handleOpenUpdateModal = () => {
      if (pendingAppUpdate) {
          setIsUpdateModalOpen(true);
      }
  };

  const handleConfirmInstall = async () => {
      if (pendingAppUpdate) {
          try {
              await installUpdate(pendingAppUpdate);
          } catch (error) {
              console.error(error);
              handleShowToast(`Update failed: ${error}`, 'error');
              setIsUpdateModalOpen(false);
          }
      }
  };

  // Called from SettingsModal if manual check finds an update
  const handleUpdateFound = (update: any) => {
      setPendingAppUpdate(update);
      setIsUpdateModalOpen(true);
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gray-950 text-gray-100 font-sans selection:bg-cyan-500 selection:text-white relative">
      {/* Toast Notification for App Level events */}
      {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
      )}

      {/* Immersive Background Layer */}
      <div className="fixed inset-0 w-full h-full z-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 opacity-20" 
          style={{backgroundImage: "url('https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=2574&auto=format&fit=crop')"}}
        ></div>
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(rgba(6, 182, 212, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.5) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950/80 via-gray-950/50 to-gray-950/80"></div>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at center, transparent 0%, #030712 100%)', opacity: 0.6 }}></div>
      </div>

      <div className="relative z-10 flex flex-col h-full overflow-hidden">
        <Header 
          onOpenSettings={() => setIsSettingsOpen(true)} 
          hasUnread={hasUnread}
          onToggleNotifications={handleToggleNotifications}
          pendingAppUpdate={pendingAppUpdate}
          onInstallAppUpdate={handleOpenUpdateModal}
        />
        <NotificationDropdown 
          isOpen={isNotificationsOpen}
          notifications={notifications}
          onClose={() => setIsNotificationsOpen(false)}
          onNotificationClick={handleNotificationClick}
          onMarkAllRead={handleMarkAllRead}
          onClearAll={handleClearAll}
        />
        <main className="flex-grow overflow-hidden flex flex-col relative">
          <Dashboard 
            appSettings={appSettings} 
            setNotifications={setNotifications}
            profileToSelect={profileToSelect}
            onUpdateAppSettings={handleSettingChange}
            onShowToast={handleShowToast}
          />
        </main>
        <SettingsModal 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={appSettings}
          onSettingChange={handleSettingChange}
          onUpdateFound={handleUpdateFound}
        />
        <CloseConfirmationModal
          isOpen={isCloseModalOpen}
          onExit={handleConfirmExit}
          onMinimize={handleConfirmMinimize}
          onCancel={() => setIsCloseModalOpen(false)}
        />
        <UpdateModal
            isOpen={isUpdateModalOpen}
            onClose={() => setIsUpdateModalOpen(false)}
            onInstall={handleConfirmInstall}
            updateData={pendingAppUpdate}
        />
      </div>
    </div>
  );
};

export default App;
