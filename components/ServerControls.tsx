
import React, { useState, useEffect } from 'react';
import { ServerStatus, ServerProfile } from '../types';
import { PlayIcon, StopIcon, UpdateIcon, InstallIcon, RestartIcon, ClockIcon, ServerIcon, UsersIcon } from './icons';

interface ServerControlsProps {
  profile: ServerProfile | null;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onUpdate: () => void;
  onInstall: () => void;
  onOpenTimedShutdown: () => void;
  onCancelTimedShutdown: () => void;
  activeShutdownEndTime: number | null;
  onOpenTimedRestart: () => void;
  onCancelTimedRestart: () => void;
  activeRestartEndTime: number | null;
  isActionInProgress: boolean;
}

const StatusIndicator: React.FC<{ status: ServerStatus }> = ({ status }) => {
  const statusConfig = {
    [ServerStatus.Verifying]: { text: 'Verifying...', color: 'bg-gray-500', pulse: true },
    [ServerStatus.NotInstalled]: { text: 'Not Installed', color: 'bg-gray-500', pulse: false },
    [ServerStatus.Running]: { text: 'Running', color: 'bg-green-500', pulse: true },
    [ServerStatus.Starting]: { text: 'Starting...', color: 'bg-yellow-500', pulse: true },
    [ServerStatus.Stopped]: { text: 'Stopped', color: 'bg-red-500', pulse: false },
    [ServerStatus.Stopping]: { text: 'Stopping...', color: 'bg-orange-500', pulse: true },
    [ServerStatus.Restarting]: { text: 'Restarting...', color: 'bg-yellow-500', pulse: true },
    [ServerStatus.Updating]: { text: 'Updating...', color: 'bg-blue-500', pulse: true },
    [ServerStatus.Error]: { text: 'Error', color: 'bg-red-700', pulse: false },
  };

  const { text, color, pulse } = statusConfig[status] || statusConfig[ServerStatus.Error];

  return (
    <div className="flex items-center space-x-3">
      <div className={`relative w-4 h-4 rounded-full ${color}`}>
        {pulse && <div className={`absolute inset-0 rounded-full ${color} animate-ping`}></div>}
      </div>
      <span className="text-xl font-semibold uppercase tracking-wider">{text}</span>
    </div>
  );
};

function formatDuration(totalSeconds: number): string {
    if (totalSeconds < 0) return '00:00:00';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return [hours, minutes, seconds]
        .map(v => v.toString().padStart(2, '0'))
        .join(':');
}

function formatBytes(bytes: number, decimals = 2): string {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}


const ServerControls: React.FC<ServerControlsProps> = ({ 
    profile, onStart, onStop, onRestart, onUpdate, onInstall, 
    onOpenTimedShutdown, onCancelTimedShutdown, activeShutdownEndTime,
    onOpenTimedRestart, onCancelTimedRestart, activeRestartEndTime,
    isActionInProgress 
}) => {
  const status = profile?.status || ServerStatus.NotInstalled;
  const [liveUptime, setLiveUptime] = useState(profile?.uptime || 0);
  const [shutdownTimeLeft, setShutdownTimeLeft] = useState<string>('');
  const [restartTimeLeft, setRestartTimeLeft] = useState<string>('');

  useEffect(() => {
    setLiveUptime(profile?.uptime || 0);

    if (status === ServerStatus.Running) {
        const interval = setInterval(() => {
            setLiveUptime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }
  }, [profile?.uptime, status]);

  // Countdown effect for active shutdown timer
  useEffect(() => {
    if (activeShutdownEndTime) {
        const interval = setInterval(() => {
            const diff = Math.max(0, Math.floor((activeShutdownEndTime - Date.now()) / 1000));
            if (diff <= 0) {
                setShutdownTimeLeft('Shutting down...');
                clearInterval(interval);
            } else {
                setShutdownTimeLeft(formatDuration(diff));
            }
        }, 1000);
        const diff = Math.max(0, Math.floor((activeShutdownEndTime - Date.now()) / 1000));
        setShutdownTimeLeft(formatDuration(diff));
        return () => clearInterval(interval);
    } else {
        setShutdownTimeLeft('');
    }
  }, [activeShutdownEndTime]);

  // Countdown effect for active restart timer
  useEffect(() => {
    if (activeRestartEndTime) {
        const interval = setInterval(() => {
            const diff = Math.max(0, Math.floor((activeRestartEndTime - Date.now()) / 1000));
            if (diff <= 0) {
                setRestartTimeLeft('Restarting...');
                clearInterval(interval);
            } else {
                setRestartTimeLeft(formatDuration(diff));
            }
        }, 1000);
        const diff = Math.max(0, Math.floor((activeRestartEndTime - Date.now()) / 1000));
        setRestartTimeLeft(formatDuration(diff));
        return () => clearInterval(interval);
    } else {
        setRestartTimeLeft('');
    }
  }, [activeRestartEndTime]);

  const rconEnabled = profile?.config.bEnableRcon ?? false;

  return (
    <div className="p-6 bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-700 flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-8">
        <div>
          <h2 className="text-lg font-bold text-cyan-400 mb-2">Server Status</h2>
          <StatusIndicator status={status} />
        </div>
        {status === ServerStatus.Running && (
            <div className="flex items-center space-x-6 mt-4 sm:mt-0 text-gray-300 animate-fade-in">
                <div className="flex items-center space-x-2">
                    <ClockIcon className="w-5 h-5 text-cyan-400"/>
                    <div>
                        <div className="text-xs text-gray-400">Uptime</div>
                        <div className="font-mono font-semibold">{formatDuration(liveUptime)}</div>
                    </div>
                </div>
                 <div className="flex items-center space-x-2">
                    <ServerIcon className="w-5 h-5 text-cyan-400"/>
                    <div>
                        <div className="text-xs text-gray-400">Memory</div>
                        <div className="font-mono font-semibold">{formatBytes(profile?.memoryUsage || 0)}</div>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <UsersIcon className="w-5 h-5 text-cyan-400"/>
                    <div>
                        <div className="text-xs text-gray-400">Players</div>
                        <div className="font-mono font-semibold">{profile?.playerCount ?? 0} / {profile?.config.maxPlayers ?? 0}</div>
                    </div>
                </div>
            </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {status === ServerStatus.NotInstalled ? (
           <button
             onClick={onInstall}
             className="flex items-center justify-center px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-md transition-colors duration-200 shadow-md"
           >
             <InstallIcon className="w-5 h-5 mr-2" />
             Install Server
           </button>
        ) : (
          <>
            <button
              onClick={onStart}
              disabled={status === ServerStatus.Running || status === ServerStatus.Starting || isActionInProgress}
              className="flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-md transition-colors duration-200 shadow-md disabled:shadow-none"
            >
              <PlayIcon className="w-5 h-5 mr-2" />
              Start
            </button>
            
            {/* SHUTDOWN GROUP */}
            {activeShutdownEndTime ? (
                <button
                    onClick={onCancelTimedShutdown}
                    className="flex items-center justify-center px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-md transition-colors duration-200 shadow-md animate-pulse"
                >
                    <ClockIcon className="w-5 h-5 mr-2" />
                    Cancel Stop ({shutdownTimeLeft})
                </button>
            ) : (
                <div className="flex shadow-md rounded-md">
                    <button
                        onClick={onStop}
                        disabled={!(status === ServerStatus.Running || status === ServerStatus.Starting) || isActionInProgress || !!activeRestartEndTime}
                        className={`flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold transition-colors duration-200 disabled:shadow-none ${status === ServerStatus.Running ? 'rounded-l-md border-r border-red-700' : 'rounded-md'}`}
                    >
                        <StopIcon className="w-5 h-5 mr-2" />
                        Stop
                    </button>
                    {/* Split button dropdown for timed shutdown */}
                    {status === ServerStatus.Running && (
                        <button
                            onClick={onOpenTimedShutdown}
                            disabled={isActionInProgress || !rconEnabled || !!activeRestartEndTime}
                            title={rconEnabled ? "Graceful Shutdown (Timer)" : "RCON required for Timed Shutdown"}
                            className="px-2 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-r-md transition-colors duration-200 disabled:shadow-none flex items-center justify-center border-l border-red-700"
                        >
                            <ClockIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}

            {/* RESTART GROUP */}
            {activeRestartEndTime ? (
                <button
                    onClick={onCancelTimedRestart}
                    className="flex items-center justify-center px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-md transition-colors duration-200 shadow-md animate-pulse"
                >
                    <ClockIcon className="w-5 h-5 mr-2" />
                    Cancel Restart ({restartTimeLeft})
                </button>
            ) : (
                <div className="flex shadow-md rounded-md">
                    <button
                        onClick={onRestart}
                        disabled={status !== ServerStatus.Running || isActionInProgress || !!activeShutdownEndTime}
                        className={`flex items-center justify-center px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold transition-colors duration-200 disabled:shadow-none ${status === ServerStatus.Running ? 'rounded-l-md border-r border-yellow-700' : 'rounded-md'}`}
                    >
                        <RestartIcon className="w-5 h-5 mr-2" />
                        Restart
                    </button>
                    {status === ServerStatus.Running && (
                        <button
                            onClick={onOpenTimedRestart}
                            disabled={isActionInProgress || !rconEnabled || !!activeShutdownEndTime}
                            title={rconEnabled ? "Graceful Restart (Timer)" : "RCON required for Timed Restart"}
                            className="px-2 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-r-md transition-colors duration-200 disabled:shadow-none flex items-center justify-center border-l border-yellow-700"
                        >
                            <ClockIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}

            <button
              onClick={onUpdate}
              disabled={status === ServerStatus.Running || status === ServerStatus.Starting || isActionInProgress}
              className="flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-md transition-colors duration-200 shadow-md disabled:shadow-none"
            >
              <UpdateIcon className="w-5 h-5 mr-2" />
              Update Server Files
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ServerControls;
