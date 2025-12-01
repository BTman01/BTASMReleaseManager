import React, { useState } from 'react';
import { BackupInfo } from '../types';
import { BackupIcon, TrashIcon } from './icons';

interface BackupManagerProps {
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
  backups,
  onCreateBackup,
  onRestoreBackup,
  onDeleteBackup,
  isActionInProgress,
  isLoading,
  isCreating,
}) => {
  const [busyAction, setBusyAction] = useState<string | null>(null);

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
    <div className="max-w-4xl mx-auto">
      <Card title="Backup & Restore" icon={<BackupIcon />}>
        <div className="flex items-start justify-between p-4 bg-gray-900/50 rounded-md border border-gray-700">
          <div>
            <h4 className="font-semibold text-gray-200">Create New Backup</h4>
            <p className="text-sm text-gray-400 mt-1">
              Creates a compressed .zip file of the entire <code className="text-xs">ShooterGame/Saved</code> directory.
              <br />
              The server must be stopped to create a backup safely.
            </p>
          </div>
          <button
            onClick={onCreateBackup}
            disabled={isActionInProgress || isCreating}
            className="w-48 flex items-center justify-center px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-md transition-colors duration-200 shadow-md"
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