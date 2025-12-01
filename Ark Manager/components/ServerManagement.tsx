
import React, { useMemo } from 'react';
import { ServerProfile, ServerConfig } from '../types';
import { ClockIcon, AlertTriangleIcon } from './icons';

interface ServerManagementProps {
  profile: ServerProfile;
  onConfigChange: (newConfig: Partial<ServerConfig>) => void;
  onManualCheck: () => void;
  isCheckingForUpdate: boolean;
  isActionInProgress: boolean;
}

const Card: React.FC<{ title: string; icon?: React.ReactNode, children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="p-6 bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-700 h-full flex flex-col">
        <div className="flex items-center space-x-2 text-lg font-bold text-cyan-400 mb-4">
            {icon}
            <h3>{title}</h3>
        </div>
        <div className="flex-grow flex flex-col space-y-6">{children}</div>
    </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h4 className="text-md font-semibold text-gray-300 mb-3 border-b border-gray-700 pb-2">{title}</h4>
        <div className="space-y-4">{children}</div>
    </div>
);

const CheckboxInput: React.FC<{
  label: string;
  name: keyof ServerConfig;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
}> = ({ label, name, checked, onChange, disabled }) => (
    <div className="flex items-center">
        <input
            id={name}
            name={name}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-600 focus:ring-cyan-500 disabled:cursor-not-allowed"
        />
        <label htmlFor={name} className="ml-3 block text-sm font-medium text-gray-300">{label}</label>
    </div>
);

const ServerManagement: React.FC<ServerManagementProps> = ({ 
    profile, onConfigChange, onManualCheck, isCheckingForUpdate, isActionInProgress 
}) => {
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        if (type === 'checkbox') {
            onConfigChange({ [name]: checked } as Partial<ServerConfig>);
        } else if (type === 'number') {
            onConfigChange({ [name]: parseInt(value, 10) } as Partial<ServerConfig>);
        } else {
            onConfigChange({ [name]: value } as Partial<ServerConfig>);
        }
    };
    
    const { config } = profile;

    const updateFrequencies = [
        { label: 'Every 30 Minutes', value: 30 },
        { label: 'Every Hour', value: 60 },
        { label: 'Every 2 Hours', value: 120 },
        { label: 'Every 4 Hours', value: 240 },
        { label: 'Every 6 Hours', value: 360 },
    ];
    
    const isUpdateAvailable = profile.currentBuildId && profile.latestBuildId && profile.currentBuildId !== profile.latestBuildId;

    const lastCheckedDate = useMemo(() => {
        return profile.lastUpdateCheck ? new Date(profile.lastUpdateCheck).toLocaleString() : 'Never';
    }, [profile.lastUpdateCheck]);

    return (
        <div className="max-w-4xl mx-auto">
            <Card title="Server Management & Automation" icon={<ClockIcon />}>
                
                <Section title="Automatic Updates">
                    <CheckboxInput 
                        label="Enable automatic update checks"
                        name="autoUpdateEnabled"
                        checked={config.autoUpdateEnabled}
                        onChange={handleChange}
                        disabled={isActionInProgress}
                    />

                    {config.autoUpdateEnabled && (
                        <div className="pl-7 space-y-2 animate-fade-in">
                            <label htmlFor="autoUpdateFrequency" className="block text-sm font-medium text-gray-300 mb-1">Check for updates every...</label>
                             <select
                                id="autoUpdateFrequency"
                                name="autoUpdateFrequency"
                                value={config.autoUpdateFrequency}
                                onChange={handleChange}
                                disabled={isActionInProgress}
                                className="w-full max-w-xs bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition disabled:bg-gray-700 disabled:cursor-not-allowed"
                            >
                                {updateFrequencies.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="p-4 bg-gray-900/50 rounded-md border border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div>
                           <p className="text-sm text-gray-400">Current Installed Build ID</p>
                           <p className="font-mono text-lg text-cyan-300">{profile.currentBuildId || 'N/A'}</p>
                       </div>
                       <div>
                           <p className="text-sm text-gray-400">Latest Available Build ID</p>
                           <p className="font-mono text-lg text-cyan-300">{profile.latestBuildId || 'N/A'}</p>
                       </div>
                        <div className="col-span-full">
                           <p className="text-xs text-gray-500">Last checked: {lastCheckedDate}</p>
                       </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={onManualCheck}
                            disabled={isActionInProgress || isCheckingForUpdate}
                            className="w-48 flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-md transition-colors duration-200 shadow-md"
                        >
                            {isCheckingForUpdate ? 'Checking...' : 'Check Now'}
                        </button>
                        {isUpdateAvailable && <p className="text-green-400 font-semibold animate-fade-in">An update is available!</p>}
                    </div>

                </Section>
                
                <hr className="border-gray-700" />

                <Section title="Scheduled Restarts">
                    <CheckboxInput 
                        label="Enable scheduled daily restarts"
                        name="scheduledRestartEnabled"
                        checked={config.scheduledRestartEnabled}
                        onChange={handleChange}
                        disabled={isActionInProgress}
                    />

                     {config.scheduledRestartEnabled && (
                        <div className="pl-7 space-y-4 animate-fade-in">
                            <div>
                                <label htmlFor="scheduledRestartTime" className="block text-sm font-medium text-gray-300 mb-1">Restart server at (24h format)</label>
                                <input
                                    type="time"
                                    id="scheduledRestartTime"
                                    name="scheduledRestartTime"
                                    value={config.scheduledRestartTime}
                                    onChange={handleChange}
                                    disabled={isActionInProgress}
                                    className="max-w-xs bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition disabled:bg-gray-700 disabled:cursor-not-allowed"
                                />
                            </div>
                            
                            <div>
                                <label htmlFor="restartAnnouncementMinutes" className="block text-sm font-medium text-gray-300 mb-1">
                                    Announcement Lead Time (Minutes)
                                </label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="number"
                                        id="restartAnnouncementMinutes"
                                        name="restartAnnouncementMinutes"
                                        min="0"
                                        max="60"
                                        value={config.restartAnnouncementMinutes ?? 10}
                                        onChange={handleChange}
                                        disabled={isActionInProgress}
                                        className="w-24 bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition disabled:bg-gray-700 disabled:cursor-not-allowed"
                                    />
                                    <span className="text-sm text-gray-400">minutes before restart</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Set to 0 to disable announcements.</p>
                            </div>

                            <CheckboxInput 
                                label="Check for and apply updates during scheduled restart"
                                name="updateOnRestart"
                                checked={config.updateOnRestart}
                                onChange={handleChange}
                                disabled={isActionInProgress}
                            />
                            
                            {!profile.config.bEnableRcon && (
                                <div className="p-3 bg-yellow-900/50 border border-yellow-700 rounded-md text-yellow-300 text-sm flex items-start space-x-2 mt-2">
                                    <AlertTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <p>
                                        <strong>Warning:</strong> RCON is disabled. Server chat announcements for restarts will NOT be sent. 
                                        Please enable RCON in the 'Server Configuration' tab to use this feature.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </Section>
            </Card>
        </div>
    );
};

export default ServerManagement;
