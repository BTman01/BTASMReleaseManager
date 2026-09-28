
import React, { useMemo, useState } from 'react';
import { ServerProfile, ServerConfig, ServerStatus } from '../types';
import { ClockIcon, AlertTriangleIcon, CheckCircleIcon, WrenchScrewdriverIcon, FolderIcon, ServerIcon, RefreshCwIcon, ZapIcon } from './icons';
import * as fs from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';

interface ServerManagementProps {
  profile: ServerProfile;
  onConfigChange: (newConfig: Partial<ServerConfig>) => void;
  onManualCheck: () => void;
  isCheckingForUpdate: boolean;
  isActionInProgress: boolean;
}

interface IntegrityStatus {
    name: string;
    path: string;
    exists: boolean;
    critical: boolean;
    warning?: boolean;
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
    const [integrityReport, setIntegrityReport] = useState<IntegrityStatus[] | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    
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
    
    const handleVerifyIntegrity = async () => {
        if (!profile.path) return;
        setIsVerifying(true);
        const p = profile.path;
        
        const checks = [
            { name: 'Root Directory', path: '', critical: true },
            { name: 'ShooterGame Folder', path: 'ShooterGame', critical: true },
            { name: 'Server Executable', path: 'ShooterGame/Binaries/Win64/ArkAscendedServer.exe', critical: true },
            { name: 'Config Directory', path: 'ShooterGame/Saved/Config/WindowsServer', critical: true },
        ];

        const results: IntegrityStatus[] = [];
        for (const check of checks) {
            const fullPath = check.path ? await join(p, ...check.path.split('/')) : p;
            const exists = await fs.exists(fullPath);
            results.push({ ...check, exists });
        }

        setIntegrityReport(results);
        setIsVerifying(false);
    };
    
    const { config } = profile;
    const isUpdateAvailable = profile.currentBuildId && profile.latestBuildId && profile.currentBuildId !== profile.latestBuildId;

    const formattedLastCheck = useMemo(() => {
        if (!profile.lastUpdateCheck) return 'Never';
        try {
            const date = new Date(profile.lastUpdateCheck);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', month: 'short', day: 'numeric' });
        } catch {
            return profile.lastUpdateCheck;
        }
    }, [profile.lastUpdateCheck]);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Card title="Server Management & Automation" icon={<ClockIcon />}>
                <Section title="Automatic Updates">
                    <div className="space-y-4">
                        <CheckboxInput 
                            label="Enable scheduled update checks"
                            name="autoUpdateEnabled"
                            checked={config.autoUpdateEnabled}
                            onChange={handleChange}
                            disabled={isActionInProgress}
                        />

                        {config.autoUpdateEnabled && (
                            <div className="pl-7 space-y-4 animate-fade-in border-l-2 border-cyan-500/40 ml-2">
                                <div>
                                    <label htmlFor="autoUpdateFrequency" className="block text-sm font-medium text-gray-300 mb-1.5">
                                        Check for updates every...
                                    </label>
                                    <select
                                        id="autoUpdateFrequency"
                                        name="autoUpdateFrequency"
                                        value={config.autoUpdateFrequency}
                                        onChange={handleChange}
                                        disabled={isActionInProgress}
                                        className="w-full max-w-xs bg-gray-900/70 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition disabled:bg-gray-700 disabled:cursor-not-allowed text-sm"
                                    >
                                        <option value={15}>Every 15 Minutes</option>
                                        <option value={30}>Every 30 Minutes</option>
                                        <option value={60}>Every Hour</option>
                                        <option value={120}>Every 2 Hours</option>
                                        <option value={240}>Every 4 Hours</option>
                                        <option value={480}>Every 8 Hours</option>
                                        <option value={720}>Every 12 Hours</option>
                                    </select>
                                </div>

                                <div className="space-y-2 pt-1">
                                    <CheckboxInput 
                                        label="Auto update when game update is available"
                                        name="autoInstallUpdates"
                                        checked={config.autoInstallUpdates ?? false}
                                        onChange={handleChange}
                                        disabled={isActionInProgress}
                                    />

                                    {config.autoInstallUpdates && (
                                        <div className="pl-7 pt-2 space-y-3 animate-fade-in">
                                            <CheckboxInput 
                                                label="Wait for next scheduled server restart"
                                                name="autoUpdateWaitForRestart"
                                                checked={config.autoUpdateWaitForRestart ?? false}
                                                onChange={handleChange}
                                                disabled={isActionInProgress}
                                            />

                                            <div className="p-3 bg-gray-900/60 rounded-md border border-gray-700/80 text-xs space-y-1.5 max-w-lg">
                                                {config.autoUpdateWaitForRestart ? (
                                                    <>
                                                        <div className="flex items-center text-cyan-300 font-semibold">
                                                            <ClockIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                                                            <span>Staged Update on Restart</span>
                                                        </div>
                                                        <p className="text-gray-300">
                                                            When an update is detected during the scheduled check, it will be queued and safely installed during the next scheduled daily restart.
                                                        </p>
                                                        {!config.scheduledRestartEnabled && (
                                                            <div className="flex items-start text-amber-400 bg-amber-400/10 p-2 rounded border border-amber-500/30 mt-2">
                                                                <AlertTriangleIcon className="w-4 h-4 mr-1.5 flex-shrink-0 mt-0.5" />
                                                                <span>Scheduled daily restarts are currently disabled. Please enable scheduled restarts below for this staging option to trigger.</span>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center text-green-400 font-semibold">
                                                            <CheckCircleIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                                                            <span>Immediate Auto-Update</span>
                                                        </div>
                                                        <p className="text-gray-300">
                                                            When a game update is detected during the scheduled check, the server will immediately initiate an update (saving world progress, stopping, applying the update, and automatically restarting the server).
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="p-4 bg-gray-900/50 rounded-md border border-gray-700 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Installed Build ID</p>
                                <p className="font-mono text-base text-cyan-300 mt-1">{profile.currentBuildId || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Latest Build ID</p>
                                <p className="font-mono text-base text-cyan-300 mt-1">{profile.latestBuildId || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Last Checked</p>
                                <p className="font-mono text-sm text-gray-300 mt-1">{formattedLastCheck}</p>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 pt-1">
                            <button
                                onClick={onManualCheck}
                                disabled={isActionInProgress || isCheckingForUpdate}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-md transition-colors duration-200 shadow-md text-sm flex items-center space-x-2"
                            >
                                {isCheckingForUpdate ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Checking...</span>
                                    </>
                                ) : (
                                    <span>Check for Updates Now</span>
                                )}
                            </button>
                            
                            {isUpdateAvailable ? (
                                <div className="flex items-center text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-md border border-amber-500/30 text-sm font-semibold animate-fade-in">
                                    <AlertTriangleIcon className="w-4 h-4 mr-2 text-amber-400" />
                                    <span>
                                        Game update available! {config.autoInstallUpdates && config.autoUpdateWaitForRestart ? '(Staged for next scheduled restart)' : ''}
                                    </span>
                                </div>
                            ) : profile.currentBuildId && profile.latestBuildId ? (
                                <div className="flex items-center text-green-400 bg-green-500/10 px-3 py-1.5 rounded-md border border-green-500/30 text-sm font-semibold">
                                    <CheckCircleIcon className="w-4 h-4 mr-2 text-green-400" />
                                    <span>Server files are up to date</span>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </Section>
                
                <hr className="border-gray-700" />

                <Section title="World Saving & Graceful Operations">
                    <div className="space-y-4">
                        <CheckboxInput 
                            label="Save world before stop or restart (SaveWorld)"
                            name="saveWorldOnStopRestart"
                            checked={config.saveWorldOnStopRestart ?? true}
                            onChange={handleChange}
                            disabled={isActionInProgress}
                        />
                        <p className="text-xs text-gray-400 ml-7 mt-1">
                            Automatically executes the <code className="text-cyan-300 bg-gray-900/60 px-1 py-0.5 rounded font-mono text-[11px]">SaveWorld</code> command via RCON to flush and persist world progress to disk before any server stop or restart occurs.
                        </p>
                        {!config.bEnableRcon && (config.saveWorldOnStopRestart ?? true) && (
                            <p className="text-xs text-amber-400/90 ml-7 mt-1 flex items-center gap-1.5 bg-amber-950/30 border border-amber-800/40 rounded px-2.5 py-1">
                                <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                <span>Note: RCON must be enabled in Server Configuration for the SaveWorld command to be sent.</span>
                            </p>
                        )}
                    </div>
                </Section>
                
                <hr className="border-gray-700" />

                <Section title="Scheduled Restarts">
                    <div className="space-y-4">
                        <CheckboxInput 
                            label="Enable scheduled daily restarts"
                            name="scheduledRestartEnabled"
                            checked={config.scheduledRestartEnabled}
                            onChange={handleChange}
                            disabled={isActionInProgress}
                        />

                        {config.scheduledRestartEnabled && (
                            <div className="pl-7 space-y-4 animate-fade-in border-l-2 border-cyan-500/40 ml-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                                    <div>
                                        <label htmlFor="scheduledRestartTime" className="block text-sm font-medium text-gray-300 mb-1.5">
                                            Daily restart time
                                        </label>
                                        <input
                                            type="time"
                                            id="scheduledRestartTime"
                                            name="scheduledRestartTime"
                                            value={config.scheduledRestartTime}
                                            onChange={handleChange}
                                            disabled={isActionInProgress}
                                            className="w-full bg-gray-900/70 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="restartAnnouncementMinutes" className="block text-sm font-medium text-gray-300 mb-1.5">
                                            Warning countdown (minutes)
                                        </label>
                                        <input
                                            type="number"
                                            id="restartAnnouncementMinutes"
                                            name="restartAnnouncementMinutes"
                                            min={0}
                                            max={60}
                                            value={config.restartAnnouncementMinutes ?? 10}
                                            onChange={handleChange}
                                            disabled={isActionInProgress}
                                            className="w-full bg-gray-900/70 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="max-w-lg">
                                    <label htmlFor="scheduledRestartReason" className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center justify-between">
                                        <span>Scheduled restart reason / message</span>
                                        <span className="text-gray-500 font-normal text-xs">Optional</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="scheduledRestartReason"
                                        name="scheduledRestartReason"
                                        value={config.scheduledRestartReason ?? ''}
                                        onChange={handleChange}
                                        disabled={isActionInProgress}
                                        placeholder="e.g. Daily Server Maintenance, Scheduled Reboot"
                                        className="w-full bg-gray-900/70 border border-gray-600 rounded-md px-3 py-2 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        Included with the ServerChat countdown announcements leading up to the daily restart.
                                    </p>
                                </div>

                                <div className="pt-1">
                                    <CheckboxInput 
                                        label="Update server files on restart"
                                        name="updateOnRestart"
                                        checked={config.updateOnRestart ?? true}
                                        onChange={handleChange}
                                        disabled={isActionInProgress}
                                    />
                                    <p className="text-xs text-gray-400 ml-7 mt-1">
                                        Checks and downloads the latest game build before starting the server back up during scheduled restarts.
                                    </p>
                                </div>

                                <div className="pt-1">
                                    <CheckboxInput 
                                        label="Wipe wild dinos on automated restart (wipewilddinos)"
                                        name="wipeWildDinosOnRestart"
                                        checked={config.wipeWildDinosOnRestart ?? false}
                                        onChange={handleChange}
                                        disabled={isActionInProgress}
                                    />
                                    <p className="text-xs text-gray-400 ml-7 mt-1">
                                        Executes the wild dino wipe command (<code className="text-cyan-300 bg-gray-900/60 px-1 py-0.5 rounded font-mono text-[11px]">DestroyWildDinos</code> / <code className="text-cyan-300 bg-gray-900/60 px-1 py-0.5 rounded font-mono text-[11px]">wipewilddinos</code>) via RCON as soon as the server comes back online following an automated restart.
                                    </p>
                                    {!config.bEnableRcon && config.wipeWildDinosOnRestart && (
                                        <p className="text-xs text-amber-400/90 ml-7 mt-1.5 flex items-center gap-1.5 bg-amber-950/30 border border-amber-800/40 rounded px-2.5 py-1">
                                            <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                            <span>RCON is currently disabled. Please enable RCON in Server Configuration so the command can be sent to the server upon startup.</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </Section>
            </Card>

            <Card title="File System Health" icon={<FolderIcon />}>
                <div className="flex flex-col space-y-4">
                    <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-md text-sm text-blue-300">
                        <p className="font-bold mb-1">💡 Installation Info:</p>
                        <p>The manager uses a central SteamCMD location (C:\BTASM) but installs game files directly into your chosen profile folder.</p>
                    </div>
                    
                    <button
                        onClick={handleVerifyIntegrity}
                        disabled={isVerifying || !profile.path}
                        className="w-48 flex items-center justify-center px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-bold rounded-md transition-colors border border-gray-600 shadow-sm"
                    >
                        {isVerifying ? 'Checking...' : 'Verify File Integrity'}
                    </button>

                    {integrityReport && (
                        <div className="mt-4 animate-fade-in border border-gray-700 rounded-lg overflow-hidden bg-gray-900/30">
                            <ul className="divide-y divide-gray-800">
                                {integrityReport.map((item, idx) => (
                                    <li key={idx} className="p-3 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-gray-200">{item.name}</span>
                                            <span className="text-xs font-mono text-gray-500 truncate max-w-xs">{item.path || './'}</span>
                                        </div>
                                        <div className="flex items-center">
                                            {item.exists ? (
                                                <div className="flex items-center text-green-500 bg-green-500/10 px-2 py-1 rounded text-xs">
                                                    <CheckCircleIcon className="w-3 h-3 mr-1" />
                                                    Healthy
                                                </div>
                                            ) : (
                                                <div className={`flex items-center ${item.critical ? 'text-red-500 bg-red-500/10' : 'text-yellow-500 bg-yellow-500/10'} px-2 py-1 rounded text-xs`}>
                                                    {item.critical ? <AlertTriangleIcon className="w-3 h-3 mr-1" /> : null}
                                                    {item.critical ? 'MISSING' : 'Info'}
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </Card>

            <Card title="Active Process & Session Recovery" icon={<ServerIcon />}>
                <div className="space-y-4">
                    <p className="text-sm text-gray-300">
                        The manager automatically checks for active ARK server processes on program launch, regaining control of running instances, reconnecting RCON telemetry, and restoring live stats seamlessly.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                        <div>
                            <span className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Process Status</span>
                            <div className="flex items-center space-x-2">
                                {profile.status === ServerStatus.Running ? (
                                    <span className="flex items-center text-emerald-400 font-semibold text-sm">
                                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping mr-2"></span>
                                        Active & Monitored
                                    </span>
                                ) : (
                                    <span className="text-gray-400 text-sm font-semibold">
                                        {profile.status === ServerStatus.Starting ? 'Starting...' : profile.status === ServerStatus.Stopped ? 'Not Running' : profile.status}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div>
                            <span className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Process ID (PID)</span>
                            <span className="font-mono text-sm text-cyan-300 font-semibold">
                                {profile.pid ? profile.pid : 'None (Server Idle)'}
                            </span>
                        </div>

                        <div>
                            <span className="text-xs text-gray-400 uppercase tracking-wider block mb-1">RCON Remote Control</span>
                            <span className="text-sm text-gray-200">
                                {profile.config.bEnableRcon 
                                    ? `Enabled (Port: ${profile.config.rconPort || 27020})` 
                                    : 'Disabled'}
                            </span>
                        </div>

                        <div>
                            <span className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Auto-Recovery on Restart</span>
                            <span className="flex items-center text-xs text-green-400 font-semibold">
                                <CheckCircleIcon className="w-3.5 h-3.5 mr-1" /> Active
                            </span>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ServerManagement;
