import React, { useState } from 'react';
import { ServerProfile, PlayerInfo, ServerStatus } from '../types';
import { UsersIcon, AlertTriangleIcon, WrenchScrewdriverIcon } from './icons';
import { confirm } from '@tauri-apps/plugin-dialog';

interface PlayerManagementProps {
  profile: ServerProfile | null;
  players: PlayerInfo[];
  isLoading: boolean;
  onKickPlayer: (steamId: string) => Promise<void>;
  onBanPlayer: (steamId: string) => Promise<void>;
  onDiagnoseRcon: () => Promise<void>;
  isDiagnosingRcon: boolean;
}

const Card: React.FC<{ title: string; icon?: React.ReactNode, children: React.ReactNode, actions?: React.ReactNode }> = ({ title, icon, children, actions }) => (
    <div className="p-6 bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-700 h-full flex flex-col">
        <div className="flex items-center justify-between space-x-2 text-lg font-bold text-cyan-400 mb-4">
            <div className="flex items-center space-x-2">
                {icon}
                <h3>{title}</h3>
            </div>
            {actions && <div>{actions}</div>}
        </div>
        <div className="flex-grow flex flex-col space-y-4">{children}</div>
    </div>
);

// Helper to format duration from seconds
function formatDuration(totalSeconds: number): string {
    if (totalSeconds < 0) return '0s';
    if (totalSeconds < 60) return `${Math.floor(totalSeconds)}s`;
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    let result = '';
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m`;
    
    return result.trim() || '0s';
}

const PlayerManagement: React.FC<PlayerManagementProps> = ({ profile, players, isLoading, onKickPlayer, onBanPlayer, onDiagnoseRcon, isDiagnosingRcon }) => {
    const [busyAction, setBusyAction] = useState<string | null>(null);

    const handleKick = async (player: PlayerInfo) => {
        const confirmed = await confirm(`Are you sure you want to kick ${player.name}?`, { title: 'Confirm Kick' });
        if (confirmed) {
            setBusyAction(`kick-${player.steamId}`);
            await onKickPlayer(player.steamId);
            setBusyAction(null);
            // Player list will refresh on next poll
        }
    };

    const handleBan = async (player: PlayerInfo) => {
        const confirmed = await confirm(`Are you sure you want to BAN ${player.name}? This is a permanent action.`, { title: 'Confirm Ban' });
        if (confirmed) {
            setBusyAction(`ban-${player.steamId}`);
            await onBanPlayer(player.steamId);
            setBusyAction(null);
        }
    };
    
    if (!profile) {
        return null;
    }

    const isServerRunning = profile.status === ServerStatus.Running;
    const isRconEnabled = profile.config.bEnableRcon;

    const renderContent = () => {
        if (!isServerRunning) {
            return <p className="text-gray-400 p-4 text-center">Server must be running to view players.</p>;
        }
        if (!isRconEnabled) {
            return (
                <div className="p-3 bg-yellow-900/50 border border-yellow-700 rounded-md text-yellow-300 text-sm flex items-center space-x-2">
                    <AlertTriangleIcon className="w-5 h-5 flex-shrink-0" />
                    <p>
                        RCON must be enabled to manage players. Please enable it in the 
                        <strong className="font-semibold"> Server Configuration </strong> 
                        tab, save your settings, and restart the server.
                    </p>
                </div>
            );
        }
        if (isLoading && players.length === 0) {
            return <p className="text-gray-400 p-4 text-center">Loading player list...</p>;
        }
        if (!isLoading && players.length === 0) {
            return <p className="text-gray-400 p-4 text-center">No players are currently online.</p>;
        }

        return (
            <div className="border border-gray-700 rounded-md max-h-96 overflow-y-auto">
                <ul className="divide-y divide-gray-700">
                    {players.map((player) => (
                        <li key={player.steamId} className="p-3 flex items-center justify-between hover:bg-gray-900/50 transition-colors">
                            <div>
                                <p className="font-semibold text-cyan-400">{player.name}</p>
                                <p className="text-sm text-gray-400">
                                    SteamID: {player.steamId} | Play Time: {formatDuration(player.playTime)}
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => handleKick(player)}
                                    disabled={!!busyAction}
                                    className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-bold rounded-md transition-colors duration-200"
                                >
                                    {busyAction === `kick-${player.steamId}` ? 'Kicking...' : 'Kick'}
                                </button>
                                <button
                                    onClick={() => handleBan(player)}
                                    disabled={!!busyAction}
                                    className="px-3 py-1 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-bold rounded-md transition-colors duration-200"
                                >
                                    {busyAction === `ban-${player.steamId}` ? 'Banning...' : 'Ban'}
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    const cardActions = (
        <button
            onClick={onDiagnoseRcon}
            disabled={!isRconEnabled || isDiagnosingRcon}
            className="flex items-center space-x-2 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700/50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-md transition-colors duration-200"
        >
            <WrenchScrewdriverIcon className="w-4 h-4" />
            <span>{isDiagnosingRcon ? 'Diagnosing...' : 'Diagnose RCON'}</span>
        </button>
    );

    return (
        <div className="max-w-4xl mx-auto">
            <Card 
                title={`Player Management (${profile.playerCount ?? 0} / ${profile.config.maxPlayers})`} 
                icon={<UsersIcon />}
                actions={cardActions}
            >
                {renderContent()}
            </Card>
        </div>
    );
};

export default PlayerManagement;