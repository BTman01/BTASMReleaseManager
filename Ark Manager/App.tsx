import React, { useState, useEffect, useRef, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import SettingsModal from './components/SettingsModal';
import NotificationDropdown from './components/NotificationDropdown';
import CloseConfirmationModal from './components/CloseConfirmationModal';
import UpdateModal from './components/UpdateModal';
import Toast, { ToastMessage } from './components/Toast';
import AuthModal from './components/AuthModal';
import { AppSettings, AppNotification } from './types';
import * as appSettingsService from './services/appSettingsService';
import { checkUpdateAvailable, installUpdate } from './services/updaterService';
import { auth, logoutUser, getStoredRememberMe, onAuthStateChanged, type FirebaseUser } from './services/firebase';

// Environment check for Tauri features
const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

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

  // Cloud Authentication State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileBridgeOpen, setIsMobileBridgeOpen] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Monitor auth status on app initialization
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      const rememberMe = getStoredRememberMe();

      if (!user) {
        // Not authenticated: present the login popup on application startup
        setIsAuthModalOpen(true);
      } else {
        // Authenticated
        if (!rememberMe) {
          // If the user previously elected not to remember session, prompt to sign in
          setIsAuthModalOpen(true);
        } else {
          // Remember me enabled: silently auto-login
          setIsAuthModalOpen(false);
        }
      }
      setAuthInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
      if (toast?.message !== 'Signed out of cloud account') {
        setToast({ message: 'Signed out of cloud account', type: 'success' });
      }
      setIsAuthModalOpen(true);
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

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
      if (!isTauri) return;
      try {
        const { isEnabled, enable, disable } = await import('@tauri-apps/plugin-autostart');
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
        if (!isTauri) return;
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
    if (!isTauri) return;

    const setupCloseListener = async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
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
    if (key === 'startWithWindows' && isTauri) {
      try {
        const { enable, disable } = await import('@tauri-apps/plugin-autostart');
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
    if (!isTauri) return;
    shouldExitRef.current = true;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const appWindow = getCurrentWindow();
    await appWindow.close();
  };

  const handleConfirmMinimize = async () => {
    if (!isTauri) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
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
      if (pendingAppUpdate && isTauri) {
          try {
              await installUpdate(pendingAppUpdate);
          } catch (error) {
              console.error(error);
              handleShowToast(`Update failed: ${error}`, 'error');
              setIsUpdateModalOpen(false);
          }
      }
  };

  const handleUpdateFound = (update: any) => {
      setPendingAppUpdate(update);
      setIsUpdateModalOpen(true);
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gray-950 text-gray-100 font-sans selection:bg-cyan-500 selection:text-white relative">
      {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
      )}

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
          currentUser={currentUser}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
          onOpenMobileBridge={() => setIsMobileBridgeOpen(true)}
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
            isMobileBridgeOpen={isMobileBridgeOpen}
            onCloseMobileBridge={() => setIsMobileBridgeOpen(false)}
            currentUser={currentUser}
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
        <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onSuccess={(email) => {
              handleShowToast(`Signed in successfully as ${email}`, 'success');
              setIsAuthModalOpen(false);
            }}
            canBypassOffline={true}
        />
      </div>
    </div>
  );
};

export default App;