import React, { useMemo, useState } from 'react';
import { BackupInfo, ServerConfig, ServerProfile, ServerStatus } from '../types';
import { AlertTriangleIcon, BackupIcon, CheckCircleIcon, ClockIcon, FolderIcon, TrashIcon } from './icons';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { getRootInstallPath } from '../services/directoryService';

interface BackupManagerProps {
  profile: ServerProfile;
  onConfigChange: (newConfig: Partial<ServerConfig>) => void;
  backups: BackupInfo[];
  onCreateBackup: () => Promise<void>;
  onRestoreBackup: (filename: string) => Promise<void>;
  onDeleteBackup: (filename: string) => Promise<void>;
  isActionInProgress: boolean;
  isLoading: boolean;
  isCreating: boolean;
}

const Card: React.FC<{ title: string; icon?: React.ReactNode, children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="p-6 bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-700 h-full flex flex-col">
        <div className="flex items-center space-x-2 text-lg font-bold text-cyan-400 mb-4">
            {icon}
            <h3>{title}</h3>
        </div>
        <div className="flex-grow flex flex-col space-y-4">{children}</div>
    </div>
);

function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const BackupManager: React.FC<BackupManagerProps> = ({
  profile,
  onConfigChange,
  backups,
  onCreateBackup,
  onRestoreBackup,
  onDeleteBackup,
  isActionInProgress,
  isLoading,
  isCreating,
}) => {
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const { config } = profile;
  const autoBackupEnabled = config.autoBackupEnabled ?? false;
  const autoBackupIntervalMinutes = config.autoBackupIntervalMinutes ?? 60;
  const autoBackupMaxKeep = config.autoBackupMaxKeep ?? 10;
  const autoBackupOnlyWhenRunning = config.autoBackupOnlyWhenRunning ?? true;
  const autoBackupOnStopRestart = config.autoBackupOnStopRestart ?? false;
  const customBackupPath = config.backupPath ?? '';

  const defaultBackupPath = useMemo(() => {
    const root = getRootInstallPath(profile.path);
    if (!root) return 'ManagerBackups (inside server folder)';
    const separator = root.includes('/') && !root.includes('\\') ? '/' : '\\';
    return `${root}${separator}ManagerBackups`;
  }, [profile.path]);

  const activeBackupPath = customBackupPath.trim() || defaultBackupPath;

  const handleBrowseBackupPath = async () => {
    try {
      const root = getRootInstallPath(profile.path);
      const selected = await openDialog({
        directory: true,
        title: 'Select Backup Destination Folder',
        defaultPath: customBackupPath.trim() || root || undefined,
      });
      if (typeof selected === 'string' && selected.trim()) {
        onConfigChange({ backupPath: selected });
      }
    } catch (err) {
      console.error('Failed to open backup folder dialog:', err);
    }
  };

  const formattedLastBackup = useMemo(() => {
    if (!profile.lastBackupTime) return 'Never';
    try {
      const date = new Date(profile.lastBackupTime);
      if (isNaN(date.getTime())) return profile.lastBackupTime;
      return date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return profile.lastBackupTime;
    }
  }, [profile.lastBackupTime]);

  const handleRestore = async (filename: string) => {
    setBusyAction(`restoring-${filename}`);
    await onRestoreBackup(filename);
    setBusyAction(null);
  };

  const handleDelete = async (filename: string) => {
    setBusyAction(`deleting-${filename}`);
    await onDeleteBackup(filename);
    setBusyAction(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card title="Backup Storage Location" icon={<FolderIcon className="w-5 h-5" />}>
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            Choose where manual and automatic backups are saved. Leave blank to store backups in the default <code className="text-cyan-300 bg-gray-900/60 px-1 py-0.5 rounded font-mono text-xs">ManagerBackups</code> folder next to your server files.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={customBackupPath}
              onChange={(e) => onConfigChange({ backupPath: e.target.value })}
              placeholder={defaultBackupPath}
              disabled={isActionInProgress || isCreating}
              aria-label="Backup Destination Directory"
              className="flex-grow bg-gray-900/70 border border-gray-600 rounded-md px-3 py-2 text-gray-100 font-mono text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition disabled:bg-gray-700 disabled:cursor-not-allowed"
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleBrowseBackupPath}
                disabled={isActionInProgress || isCreating}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-gray-100 text-sm font-semibold rounded-md border border-gray-600 transition-colors"
              >
                <FolderIcon className="w-4 h-4 text-cyan-400" />
                <span>Browse...</span>
              </button>
              {customBackupPath.trim() !== '' && (
                <button
                  type="button"
                  onClick={() => onConfigChange({ backupPath: '' })}
                  disabled={isActionInProgress || isCreating}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 hover:text-white text-sm font-medium rounded-md border border-gray-600 transition-colors"
                  title="Reset to default ManagerBackups folder"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400 bg-gray-900/40 border border-gray-700/70 rounded px-3 py-2">
            <span className="truncate">
              <span className="text-gray-500 uppercase tracking-wider font-semibold mr-2">Active Folder:</span>
              <span className="font-mono text-cyan-300">{activeBackupPath}</span>
            </span>
            <span className="text-[11px] text-gray-500">
              {customBackupPath.trim() ? 'Custom location' : 'Default location'}
            </span>
          </div>
        </div>
      </Card>

      <Card title="Automated Backups" icon={<ClockIcon />}>
        <div className="space-y-4">
          <div className="p-4 bg-gray-900/50 rounded-md border border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Auto-Backup Status</p>
              <div className="mt-1 flex items-center space-x-2">
                {!autoBackupEnabled ? (
                  <span className="text-sm font-semibold text-gray-400">Disabled</span>
                ) : autoBackupOnlyWhenRunning && profile.status !== ServerStatus.Running ? (
                  <span className="text-sm font-semibold text-amber-400">Armed (Waiting for Server Start)</span>
                ) : (
                  <span className="flex items-center text-sm font-semibold text-green-400">
                    <CheckCircleIcon className="w-4 h-4 mr-1.5" />
                    Active (Every {autoBackupIntervalMinutes >= 60 ? `${autoBackupIntervalMinutes / 60}h` : `${autoBackupIntervalMinutes}m`})
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Last Backup</p>
              <p className="font-mono text-sm text-cyan-300 mt-1">{formattedLastBackup}</p>
            </div>
          </div>

          <div className="space-y-4 pt-1">
            <div>
              <label className="flex items-center space-x-3 text-sm font-medium text-gray-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoBackupEnabled}
                  onChange={(e) => onConfigChange({ autoBackupEnabled: e.target.checked })}
                  disabled={isActionInProgress}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-600 focus:ring-cyan-500 disabled:cursor-not-allowed cursor-pointer"
                />
                <span>Enable automatic scheduled backups</span>
              </label>
              <p className="text-xs text-gray-400 ml-7 mt-1">
                Automatically compresses your <code className="text-cyan-300 bg-gray-900/60 px-1 py-0.5 rounded font-mono text-[11px]">ShooterGame/Saved</code> directory on a repeating schedule.
              </p>
            </div>

            {autoBackupEnabled && (
              <div className="pl-7 space-y-4 animate-fade-in border-l-2 border-cyan-500/40 ml-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                  <div>
                    <label htmlFor="autoBackupIntervalMinutes" className="block text-sm font-medium text-gray-300 mb-1.5">
                      Backup frequency
                    </label>
                    <select
                      id="autoBackupIntervalMinutes"
                      value={autoBackupIntervalMinutes}
                      onChange={(e) => onConfigChange({ autoBackupIntervalMinutes: parseInt(e.target.value, 10) })}
                      disabled={isActionInProgress}
                      className="w-full bg-gray-900/70 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition disabled:bg-gray-700 disabled:cursor-not-allowed text-sm"
                    >
                      <option value={15}>Every 15 Minutes</option>
                      <option value={30}>Every 30 Minutes</option>
                      <option value={60}>Every 1 Hour</option>
                      <option value={120}>Every 2 Hours</option>
                      <option value={240}>Every 4 Hours</option>
                      <option value={360}>Every 6 Hours</option>
                      <option value={720}>Every 12 Hours</option>
                      <option value={1440}>Every 24 Hours</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="autoBackupMaxKeep" className="block text-sm font-medium text-gray-300 mb-1.5">
                      Retention limit (max backups to keep)
                    </label>
                    <select
                      id="autoBackupMaxKeep"
                      value={autoBackupMaxKeep}
                      onChange={(e) => onConfigChange({ autoBackupMaxKeep: parseInt(e.target.value, 10) })}
                      disabled={isActionInProgress}
                      className="w-full bg-gray-900/70 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition disabled:bg-gray-700 disabled:cursor-not-allowed text-sm"
                    >
                      <option value={0}>Keep All (Unlimited)</option>
                      <option value={3}>Keep Last 3 Backups</option>
                      <option value={5}>Keep Last 5 Backups</option>
                      <option value={10}>Keep Last 10 Backups</option>
                      <option value={20}>Keep Last 20 Backups</option>
                      <option value={50}>Keep Last 50 Backups</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-3 text-sm font-medium text-gray-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoBackupOnlyWhenRunning}
                      onChange={(e) => onConfigChange({ autoBackupOnlyWhenRunning: e.target.checked })}
                      disabled={isActionInProgress}
                      className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-600 focus:ring-cyan-500 disabled:cursor-not-allowed cursor-pointer"
                    />
                    <span>Only run scheduled backups while server is running</span>
                  </label>
                  <p className="text-xs text-gray-400 ml-7 mt-1">
                    Prevents creating redundant scheduled backups when the server is offline. If RCON is enabled, <code className="text-cyan-300 bg-gray-900/60 px-1 py-0.5 rounded font-mono text-[11px]">SaveWorld</code> runs automatically before each live backup.
                  </p>
                  {!config.bEnableRcon && (
                    <p className="text-xs text-amber-400/90 ml-7 mt-1.5 flex items-center gap-1.5 bg-amber-950/30 border border-amber-800/40 rounded px-2.5 py-1 max-w-xl">
                      <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span>RCON is currently disabled. Enable RCON in Server Configuration so live scheduled backups can flush world saves first.</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            <hr className="border-gray-700/70" />

            <div>
              <label className="flex items-center space-x-3 text-sm font-medium text-gray-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoBackupOnStopRestart}
                  onChange={(e) => onConfigChange({ autoBackupOnStopRestart: e.target.checked })}
                  disabled={isActionInProgress}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-600 focus:ring-cyan-500 disabled:cursor-not-allowed cursor-pointer"
                />
                <span>Auto-backup server on Stop or Restart</span>
              </label>
              <p className="text-xs text-gray-400 ml-7 mt-1">
                When checked, automatically creates a backup right after the server stops (and before starting back up on restarts). Unchecked by default.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Backup & Restore" icon={<BackupIcon />}>
        <div className="flex items-start justify-between p-4 bg-gray-900/50 rounded-md border border-gray-700 gap-4">
          <div>
            <h4 className="font-semibold text-gray-200">Create New Backup</h4>
            <p className="text-sm text-gray-400 mt-1">
              Creates a compressed .zip file of the entire <code className="text-xs">ShooterGame/Saved</code> directory.
              <br />
              For best consistency, stop the server first or ensure RCON is enabled for automatic world saving.
            </p>
          </div>
          <button
            onClick={onCreateBackup}
            disabled={isActionInProgress || isCreating || !profile.path}
            className="w-48 flex-shrink-0 flex items-center justify-center px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-md transition-colors duration-200 shadow-md"
          >
            {isCreating ? (
              <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Creating...</>
            ) : "Create New Backup"}
          </button>
        </div>

        <div>
          <h4 className="font-semibold text-gray-200 mb-2">Available Backups</h4>
          <div className="border border-gray-700 rounded-md max-h-96 overflow-y-auto">
            {isLoading ? (
              <p className="text-gray-400 p-4 text-center">Loading backups...</p>
            ) : backups.length === 0 ? (
              <p className="text-gray-400 p-4 text-center">No backups found.</p>
            ) : (
              <ul className="divide-y divide-gray-700">
                {backups.map((backup) => (
                  <li key={backup.filename} className="p-3 flex items-center justify-between hover:bg-gray-900/50 transition-colors">
                    <div>
                      <p className="font-mono text-cyan-400">{backup.filename}</p>
                      <p className="text-sm text-gray-400">
                        Created: {backup.created_at} | Size: {formatBytes(backup.size)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleRestore(backup.filename)}
                        disabled={isActionInProgress || !!busyAction}
                        className="px-3 py-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-bold rounded-md transition-colors duration-200 whitespace-nowrap"
                      >
                        {busyAction === `restoring-${backup.filename}` ? 'Restoring...' : 'Restore'}
                      </button>
                      <button
                        onClick={() => handleDelete(backup.filename)}
                        disabled={isActionInProgress || !!busyAction}
                        className="p-2 text-gray-400 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-colors disabled:text-gray-600 disabled:cursor-not-allowed"
                        aria-label={`Delete backup ${backup.filename}`}
                      >
                        {busyAction === `deleting-${backup.filename}` ? 
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          : <TrashIcon className="w-5 h-5" />}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BackupManager;