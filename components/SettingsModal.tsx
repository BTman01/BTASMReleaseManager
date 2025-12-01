
import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { CogIcon, FolderIcon, DownloadCloudIcon } from './icons';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { getVersion } from '@tauri-apps/api/app';
import { checkForAppUpdates } from '../services/updaterService';


interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSettingChange }) => {
  const [version, setVersion] = useState('');
  const [showPreviousReleases, setShowPreviousReleases] = useState(false);
  const [isCheckingForUpdate, setIsCheckingForUpdate] = useState(false);

  useEffect(() => {
    const fetchVersion = async () => {
      if (isOpen) {
        try {
          const appVersion = await getVersion();
          setVersion(appVersion);
        } catch (error) {
          console.error("Failed to get app version:", error);
        }
      }
    };
    fetchVersion();
  }, [isOpen]);

  const handleCheckForUpdates = async () => {
      setIsCheckingForUpdate(true);
      await checkForAppUpdates(false); // false = not silent, show result dialog
      setIsCheckingForUpdate(false);
  };


  if (!isOpen) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    let processedValue: string | number | boolean;
    if (type === 'checkbox') {
        processedValue = checked;
    } else {
        processedValue = value;
    }
    
    onSettingChange(name as keyof AppSettings, processedValue as AppSettings[keyof AppSettings]);
  };
  
  const handleBrowseDefaultPath = async () => {
      const selected = await openDialog({
          directory: true,
          title: 'Select Default Directory for New Servers',
          defaultPath: settings.defaultServerPath || undefined
      });
      if (typeof selected === 'string') {
          onSettingChange('defaultServerPath', selected);
      }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl p-8 bg-gray-800 rounded-lg shadow-2xl shadow-cyan-500/20 border border-gray-700 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <div className="flex-shrink-0">
            <div className="flex items-center space-x-3 text-2xl font-bold text-cyan-400 mb-6">
                <CogIcon className="w-7 h-7" />
                <h3>Application Settings</h3>
            </div>
        </div>

        <div className="flex-grow overflow-y-auto pr-4 space-y-6 custom-scrollbar">
            <div>
                <label htmlFor="theme" className="font-medium text-gray-200">Theme</label>
                <p className="text-sm text-gray-400 mb-2">Choose the application's visual appearance.</p>
                <select 
                    id="theme"
                    name="theme"
                    value={settings.theme}
                    onChange={handleChange}
                    className="w-full bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                </select>
            </div>
            
            <div className="flex items-start">
                <div className="flex h-5 items-center">
                    <input id="startWithWindows" name="startWithWindows" type="checkbox" checked={settings.startWithWindows} onChange={handleChange} className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-600 focus:ring-cyan-500" />
                </div>
                <div className="ml-3 text-sm">
                    <label htmlFor="startWithWindows" className="font-medium text-gray-200">Start with Windows</label>
                    <p className="text-gray-400">Automatically launch the Ark Server Manager when you log in.</p>
                </div>
            </div>

            <div className="flex items-start">
                <div className="flex h-5 items-center">
                    <input id="notificationsEnabled" name="notificationsEnabled" type="checkbox" checked={settings.notificationsEnabled} onChange={handleChange} className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-600 focus:ring-cyan-500" />
                </div>
                <div className="ml-3 text-sm">
                    <label htmlFor="notificationsEnabled" className="font-medium text-gray-200">Enable Notifications</label>
                    <p className="text-gray-400">Receive desktop notifications for server events.</p>
                </div>
            </div>
            
            <div>
                 <label htmlFor="defaultServerPath" className="font-medium text-gray-200">Default Server Path</label>
                 <p className="text-sm text-gray-400 mb-2">The default folder for new server profile installations.</p>
                 <div className="flex space-x-2">
                    <input
                        id="defaultServerPath"
                        name="defaultServerPath"
                        type="text"
                        value={settings.defaultServerPath || ''}
                        onChange={(e) => onSettingChange('defaultServerPath', e.target.value)}
                        placeholder="e.g., C:\ArkServers"
                        className="w-full bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                    />
                    <button
                        onClick={handleBrowseDefaultPath}
                        className="flex items-center justify-center px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-md transition-colors duration-200"
                    >
                        <FolderIcon className="w-5 h-5" />
                    </button>
                 </div>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <h4 className="font-semibold text-gray-200 mb-2">What's New</h4>
              <div className="bg-gray-900/50 p-4 rounded-md border border-gray-700 max-h-96 overflow-y-auto text-sm custom-scrollbar">
                <p className="font-bold text-cyan-400 mb-2">Version {version || '0.1.9'}</p>
                
                {/* Latest Release Notes */}
                <div className="space-y-4 text-gray-300">
                    <div>
                        <p className="font-semibold text-gray-200">v0.1.9 (Latest)</p>
                        <ul className="list-disc list-inside pl-2 text-gray-400">
                            <li><strong>Cloud Build Fixes:</strong> Resolved configuration issues preventing the auto-update system from building correctly on GitHub.</li>
                            <li><strong>Dependency Synchronization:</strong> Ensured package configurations match the remote repository for smoother updates.</li>
                        </ul>
                    </div>
                </div>

                {/* Collapsible Previous Versions */}
                <div className="mt-4">
                    <button 
                        onClick={() => setShowPreviousReleases(!showPreviousReleases)}
                        className="flex items-center text-cyan-500 hover:text-cyan-400 text-xs font-semibold transition-colors focus:outline-none"
                    >
                        <svg 
                            className={`w-4 h-4 mr-1 transition-transform duration-200 ${showPreviousReleases ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        {showPreviousReleases ? 'Hide Previous Versions' : 'Show Previous Versions'}
                    </button>

                    {showPreviousReleases && (
                        <div className="mt-4 space-y-4 text-gray-300 border-t border-gray-700/50 pt-4 animate-fade-in">
                            <div>
                                <p className="font-semibold text-gray-200">v0.1.8</p>
                                <ul className="list-disc list-inside pl-2 text-gray-400">
                                    <li><strong>In-App Auto-Updater:</strong> Future updates will now be delivered directly to the application. The app will check for updates on startup and notify you if a new version is available.</li>
                                    <li><strong>Manual Update Check:</strong> Added a new "Check for Updates" button in the Settings menu (bottom left) to manually verify you are on the latest version.</li>
                                    <li><strong>System Stability:</strong> Optimized build configurations and resolved dependency issues for smoother operation.</li>
                                </ul>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-200">v0.1.7</p>
                                <ul className="list-disc list-inside pl-2 text-gray-400">
                                    <li><strong>Auto-Updater Infrastructure:</strong> Added backend support to push application updates directly to users.</li>
                                    <li><strong>Critical Performance Fixes:</strong> Resolved a memory leak and "quota exceeded" crash caused by event listener loops. The app runs much smoother and uses significantly less RAM.</li>
                                    <li><strong>Layout Modernization:</strong> The header, status bar, and tabs are now fixed to the top of the window. Only the content area scrolls, providing a much better user experience on long pages.</li>
                                    <li><strong>Custom Title Bar:</strong> Introduced a sleek, frameless window design with custom minimize, maximize, and close controls that match the Ark/Tek aesthetic.</li>
                                    <li><strong>Mod Manager Improvements:</strong> Fixed layout clipping issues in the mod list and prevented infinite loading loops for invalid mod IDs.</li>
                                    <li><strong>Visual Polish:</strong> Added custom-themed scrollbars, fixed z-index layering issues, and improved light mode visibility in modals.</li>
                                </ul>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-200">v0.1.6</p>
                                <ul className="list-disc list-inside pl-2 text-gray-400">
                                    <li><strong>System Tray Support:</strong> You can now minimize the manager to the system tray to keep it running in the background. Left-click the tray icon to restore, or right-click for options.</li>
                                    <li><strong>Configuration Safety:</strong> Added intelligent detection of external file changes. The app now syncs with your .ini files on startup and warns you of unsaved changes before starting the server.</li>
                                    <li><strong>Visual Overhaul:</strong> Introduced a new immersive "Ark/Tek" themed background with animated grid overlays and improved readability.</li>
                                    <li><strong>Enhanced UX:</strong> Replaced native browser alerts with modern, non-intrusive "Toast" notifications for smoother interaction.</li>
                                </ul>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-200">v0.1.5</p>
                                <ul className="list-disc list-inside pl-2 text-gray-400">
                                    <li><strong>Timed Operations:</strong> Added configurable timers for server shutdown and restart with automated countdown announcements in Server Chat.</li>
                                    <li><strong>Custom Reasons:</strong> You can now specify a reason (e.g., "Maintenance") for timed shutdowns and restarts, which is broadcast to players along with the countdown.</li>
                                    <li><strong>RCON Overhaul:</strong> Implemented a new RCON client for vastly improved stability and reliable command execution.</li>
                                    <li><strong>UI Enhancements:</strong> Fixed layout issues in server controls and improved the timer dialogs.</li>
                                </ul>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-200">v0.1.4</p>
                                <ul className="list-disc list-inside pl-2 text-gray-400">
                                    <li><strong>Major Player Tracking Fix:</strong> Reworked the backend log parser to accurately detect player join/leave events. The player count and player list in the "Player Management" tab now update correctly and in real-time.</li>
                                    <li><strong>Memory Display Fix:</strong> Resolved an issue where the initial memory usage reported in the server log was being overwritten. The correct memory value from the startup log is now shown.</li>
                                    <li><strong>Improved Log Parsing Stability:</strong> Enhanced the backend logic to reliably parse multiple types of events from the server log (memory, players, etc.) without conflicts.</li>
                                </ul>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-200">v0.1.3</p>
                                <ul className="list-disc list-inside pl-2 text-gray-400">
                                    <li><strong>Notification Center:</strong> Added a new notification system with a bell icon in the header to provide alerts for server updates and upcoming restarts.</li>
                                    <li><strong>Update & Restart Alerts:</strong> The manager now automatically checks for server updates on startup and warns when a scheduled restart is less than an hour away.</li>
                                    <li><strong>Notification Management:</strong> Notifications can be marked as read or cleared entirely.</li>
                                    <li><strong>Server Clustering:</strong> Added a new "Clustering" section to the Server Configuration tab to allow linking multiple servers together.</li>
                                    <li><strong>Automatic Mod Name Fetching:</strong> Manually entering a mod ID now automatically fetches its name from CurseForge, replacing "Unknown Name".</li>
                                </ul>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-200">v0.1.2</p>
                                <ul className="list-disc list-inside pl-2 text-gray-400">
                                    <li>Enhanced Import: The server settings import modal now features a collapsible, detailed view, allowing you to see every single setting detected in your .ini files before importing.</li>
                                    <li>Improved Port Management: Added a dedicated, auto-calculated "Peer Port" field to the Server Configuration tab for complete visibility.</li>
                                    <li>UI Polish & Bug Fixes: Resolved several console warnings related to DOM nesting and uncontrolled components for a smoother, error-free experience.</li>
                                </ul>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-200">v0.1.1</p>
                                <ul className="list-disc list-inside pl-2 text-gray-400">
                                    <li>Robust Configuration Parsing: The .ini file parser has been significantly upgraded to handle a wider variety of file formats, including case-insensitive names and alternative keys, ensuring your existing server settings are always detected.</li>
                                    <li>Expanded Game Settings: Added a huge number of new options to the Game Settings tab, giving you granular control over player, dino, and world settings.</li>
                                </ul>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-200">v0.1.0</p>
                                <ul className="list-disc list-inside pl-2 text-gray-400">
                                    <li>Initial Release!</li>
                                    <li>Server Profile Management: Create, manage, and switch between multiple server profiles.</li>
                                    <li>Automated Setup: Import settings from existing Ark server installations with a single click.</li>
                                    <li>Core Controls: Start, stop, and update your dedicated server.</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
              </div>
            </div>
        </div>
        
        <div className="mt-8 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500 font-mono">v{version}</span>
                <button
                    onClick={handleCheckForUpdates}
                    disabled={isCheckingForUpdate}
                    className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline flex items-center disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                    {isCheckingForUpdate ? (
                        <>Checking...</>
                    ) : (
                        <><DownloadCloudIcon className="w-3 h-3 mr-1" /> Check for Updates</>
                    )}
                </button>
            </div>
            <button
                onClick={onClose}
                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-md transition-colors duration-200 shadow-md"
            >
                Close
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
