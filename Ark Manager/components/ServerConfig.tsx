import React, { useMemo, useState, useEffect } from 'react';
import { ServerConfig, ServerProfile } from '../types';
import { ARK_MAPS } from '../constants';
import { FolderIcon, UpdateIcon, LinkIcon, DiscordIcon, AlertTriangleIcon, CheckCircleIcon, TerminalIcon, CopyIcon, ZapIcon, CpuIcon, InfoIcon } from './icons';
import { open } from '@tauri-apps/plugin-shell';
import * as dialog from '@tauri-apps/plugin-dialog';

interface ServerConfigProps {
  config: ServerConfig;
  path: string | null;
  profiles: ServerProfile[];
  onConfigChange: (newConfig: Partial<ServerConfig>) => void;
  onPathChange: (newPath: string) => void;
  onBrowsePath: () => void;
  onSave: () => void;
  isActionInProgress: boolean;
  isSaving: boolean;
  localIps: string[];
}

// Helpers for CPU Affinity Calculation
function calculateAffinityHex(cores: number[]): string {
  if (!cores || cores.length === 0) return '0x0';
  let mask = 0n;
  for (const c of cores) {
    if (c >= 0 && c < 128) {
      mask |= (1n << BigInt(c));
    }
  }
  return '0x' + mask.toString(16).toUpperCase();
}

function calculateAffinityDecimal(cores: number[]): string {
  if (!cores || cores.length === 0) return '0';
  let mask = 0n;
  for (const c of cores) {
    if (c >= 0 && c < 128) {
      mask |= (1n << BigInt(c));
    }
  }
  return mask.toString(10);
}

function parseMaskToCores(maskStr: string, maxCores: number = 64): number[] {
  if (!maskStr || !maskStr.trim()) return [];
  try {
    const trimmed = maskStr.trim();
    const isHex = trimmed.startsWith('0x') || trimmed.startsWith('0X') || /^[0-9a-fA-F]+$/.test(trimmed);
    const num = isHex
      ? BigInt(trimmed.startsWith('0x') || trimmed.startsWith('0X') ? trimmed : '0x' + trimmed)
      : BigInt(trimmed);
    const cores: number[] = [];
    for (let i = 0; i < maxCores; i++) {
      if ((num & (1n << BigInt(i))) !== 0n) {
        cores.push(i);
      }
    }
    return cores;
  } catch {
    return [];
  }
}

function formatBinaryBitmask(cores: number[], totalBits: number = 16): string {
  const bits: string[] = [];
  for (let i = totalBits - 1; i >= 0; i--) {
    bits.push(cores.includes(i) ? '1' : '0');
  }
  // Group in 4s
  const grouped: string[] = [];
  for (let i = 0; i < bits.length; i += 4) {
    grouped.push(bits.slice(i, i + 4).join(''));
  }
  return grouped.join(' ');
}

const Card: React.FC<{ title: string, children: React.ReactNode, footer?: React.ReactNode }> = ({ title, children, footer }) => (
  <div className="p-6 bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-700 h-full flex flex-col">
    <h3 className="text-lg font-bold text-cyan-400 mb-4">{title}</h3>
    <div className="flex-grow space-y-4">
        {children}
    </div>
    {footer && <div className="pt-4 mt-auto">{footer}</div>}
  </div>
);

const Label: React.FC<{ htmlFor: string, children: React.ReactNode }> = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-300 mb-1">{children}</label>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input 
    {...props}
    className="w-full bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition disabled:bg-gray-700 disabled:cursor-not-allowed"
  />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <select
        {...props}
        className="w-full bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition disabled:bg-gray-700 disabled:cursor-not-allowed"
    >
        {props.children}
    </select>
);

const Checkbox: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div className="flex items-center">
        <input
            {...props}
            type="checkbox"
            className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-600 focus:ring-cyan-500 disabled:cursor-not-allowed"
        />
        <label htmlFor={props.id} className="ml-3 block text-sm font-medium text-gray-300">{label}</label>
    </div>
);


const ServerConfigComponent: React.FC<ServerConfigProps> = ({ config, path, profiles, onConfigChange, onPathChange, onBrowsePath, onSave, isActionInProgress, isSaving, localIps }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    let processedValue: string | number | boolean;
    if (type === 'checkbox') {
        processedValue = checked;
    } else if (type === 'number') {
        processedValue = parseInt(value, 10) || 0;
    } else {
        processedValue = value;
    }

    onConfigChange({ 
      [name]: processedValue
    });
  };
  
  const handleLinkClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    try {
      await open(e.currentTarget.href);
    } catch (err) {
      console.error(`Failed to open link: ${err}`);
    }
  };

  const handleBrowseClusterPath = async () => {
      const selected = await dialog.open({
          directory: true,
          title: 'Select Shared Cluster Directory',
          defaultPath: config.clusterDirOverride || undefined
      });
      if (typeof selected === 'string') {
          onConfigChange({ clusterDirOverride: selected });
      }
  };

  const existingClusters = useMemo(() => {
      const ids = new Set<string>();
      profiles.forEach(p => {
          if (p.config.bEnableClustering && p.config.clusterId) {
              ids.add(p.config.clusterId);
          }
      });
      return Array.from(ids);
  }, [profiles]);

  const generateClusterId = () => {
      const randomId = 'Cluster_' + Math.random().toString(36).substring(2, 8).toUpperCase();
      onConfigChange({ clusterId: randomId });
  };

  const matchingClusterProfile = useMemo(() => {
      if (!config.clusterId) return null;
      return profiles.find(p => 
          p.config.bEnableClustering && 
          p.config.clusterId === config.clusterId && 
          p.config.clusterDirOverride && 
          p.config.clusterDirOverride !== config.clusterDirOverride
      );
  }, [profiles, config.clusterId, config.clusterDirOverride]);

  const [copiedCommandLine, setCopiedCommandLine] = useState(false);

  // CPU Affinity state & detected host logical cores
  const detectedHostCores = useMemo(() => {
    return typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 16;
  }, []);

  const [viewCoreCount, setViewCoreCount] = useState<number>(() => {
    const maxConfigured = config.cpuAffinityCores && config.cpuAffinityCores.length > 0 
      ? Math.max(...config.cpuAffinityCores) + 1 
      : 0;
    const detected = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 16;
    return Math.max(detected, maxConfigured, 8);
  });

  // Ensure viewCoreCount accommodates configured cores if changed externally
  useEffect(() => {
    if (config.cpuAffinityCores && config.cpuAffinityCores.length > 0) {
      const maxCore = Math.max(...config.cpuAffinityCores);
      if (maxCore >= viewCoreCount) {
        setViewCoreCount(Math.min(64, maxCore + 1));
      }
    }
  }, [config.cpuAffinityCores, viewCoreCount]);

  const toggleCore = (coreIndex: number) => {
    const current = config.cpuAffinityCores || [];
    let updated: number[];
    if (current.includes(coreIndex)) {
      updated = current.filter(c => c !== coreIndex);
    } else {
      updated = [...current, coreIndex].sort((a, b) => a - b);
    }
    const hex = calculateAffinityHex(updated);
    onConfigChange({
      cpuAffinityCores: updated,
      cpuAffinityMask: hex,
    });
  };

  const applyCorePreset = (preset: 'all' | 'first2' | 'first4' | 'first6' | 'first8' | 'even' | 'odd' | 'clear') => {
    let cores: number[] = [];
    const max = viewCoreCount;
    switch (preset) {
      case 'all':
        cores = Array.from({ length: max }, (_, i) => i);
        break;
      case 'first2':
        cores = Array.from({ length: Math.min(2, max) }, (_, i) => i);
        break;
      case 'first4':
        cores = Array.from({ length: Math.min(4, max) }, (_, i) => i);
        break;
      case 'first6':
        cores = Array.from({ length: Math.min(6, max) }, (_, i) => i);
        break;
      case 'first8':
        cores = Array.from({ length: Math.min(8, max) }, (_, i) => i);
        break;
      case 'even':
        cores = Array.from({ length: max }, (_, i) => i).filter(i => i % 2 === 0);
        break;
      case 'odd':
        cores = Array.from({ length: max }, (_, i) => i).filter(i => i % 2 !== 0);
        break;
      case 'clear':
        cores = [];
        break;
    }
    const hex = calculateAffinityHex(cores);
    onConfigChange({
      cpuAffinityCores: cores,
      cpuAffinityMask: hex,
    });
  };

  const handleMaskInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const parsed = parseMaskToCores(val, 64);
    if (parsed.length > 0 && Math.max(...parsed) >= viewCoreCount) {
      setViewCoreCount(Math.min(64, Math.max(...parsed) + 1));
    }
    onConfigChange({
      cpuAffinityMask: val,
      cpuAffinityCores: parsed,
    });
  };

  const handleToggleCpuAffinity = (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    if (enabled && (!config.cpuAffinityCores || config.cpuAffinityCores.length === 0)) {
      const defaultCount = Math.min(4, viewCoreCount);
      const defaultCores = Array.from({ length: defaultCount }, (_, i) => i);
      onConfigChange({
        bEnableCpuAffinity: true,
        cpuAffinityCores: defaultCores,
        cpuAffinityMask: calculateAffinityHex(defaultCores),
      });
    } else {
      onConfigChange({
        bEnableCpuAffinity: enabled,
      });
    }
  };

  const fullCommandLinePreview = useMemo(() => {
    const urlOptions = [];
    urlOptions.push(`SessionName=${config.sessionName || 'MyArkServer'}`);
    urlOptions.push(`ServerPVE=${config.bServerPVE ?? true}`);
    
    const mapAndOptionsArg = `${config.map || 'TheIsland_WP'}?${urlOptions.join('?')}`;
    const args: string[] = [mapAndOptionsArg];
    args.push(`-Port=${config.gamePort || 7777}`);
    args.push(`-QueryPort=${config.queryPort || 27015}`);
    args.push(`-WinLiveMaxPlayers=${config.maxPlayers || 70}`);
    args.push(`-MultiHome=${config.rconIp || '0.0.0.0'}`);
    args.push(`-ServerPlatform=${config.serverPlatform || 'All'}`);
    args.push(`-servergamelog`);

    if (config.serverPassword) {
        args.push(`-ServerPassword=${config.serverPassword}`);
    }
    args.push(`-ServerAdminPassword=${config.adminPassword || 'password'}`);

    if (config.bEnableRcon) {
        args.push('-RCONEnabled');
        args.push(`-RCONPort=${config.rconPort || 27020}`);
        if (config.rconPassword && config.rconPassword.trim()) {
            args.push(`-RCONServerAdminPassword=${config.rconPassword.trim()}`);
        }
    }

    if (config.bDisableBattleEye) {
        args.push('-NoBattlEye');
    }

    if (config.mods && config.mods.trim()) {
        args.push(`-mods=${config.mods.trim()}`);
    }

    if (config.bEnableClustering && config.clusterId && config.clusterDirOverride) {
        args.push(`-ClusterID=${config.clusterId}`);
        args.push(`-ClusterDirOverride=${config.clusterDirOverride}`);
        args.push(`-NoTransferFromFiltering`);
    }

    if (config.customCommandLineArgs && config.customCommandLineArgs.trim()) {
        const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(config.customCommandLineArgs.trim())) !== null) {
            const arg = match[1] ?? match[2] ?? match[0];
            if (arg && arg.trim()) {
                args.push(arg.trim());
            }
        }
    }

    const baseCmd = `ArkAscendedServer.exe ${args.join(' ')}`;
    if (config.bEnableCpuAffinity && config.cpuAffinityMask && config.cpuAffinityMask !== '0x0' && config.cpuAffinityMask !== '0') {
        const hexClean = config.cpuAffinityMask.replace(/^0x/i, '');
        return `start /affinity ${hexClean} ${baseCmd}`;
    }
    return baseCmd;
  }, [config]);

  const handleCopyCommandLine = async () => {
    try {
      await navigator.clipboard.writeText(fullCommandLinePreview);
      setCopiedCommandLine(true);
      setTimeout(() => setCopiedCommandLine(false), 2000);
    } catch (err) {
      console.error('Failed to copy command line:', err);
    }
  };

  const popularCommandLinePresets = [
    { flag: '-ForceRespawnDinos', label: 'Force Dino Respawn', desc: 'Wipes and respawns all wild dinos on boot' },
    { flag: '-culture=en', label: 'Force English Language', desc: 'Enforces English localized messages and assets' },
    { flag: '-automanagedmods', label: 'Auto-Managed Mods', desc: 'Enables automated CurseForge mod checks and downloads' },
    { flag: '-UseVivox', label: 'Enable Vivox Voice', desc: 'Activates integrated spatial voice chat engine' },
    { flag: '-crossplay', label: 'Enable Crossplay', desc: 'Allows cross-platform network players' },
    { flag: '?AllowCrateSpawnsOnTopOfStructures=True', label: 'Supply Drops On Structures', desc: 'Allows beacon crates to spawn on player structures' },
    { flag: '-nosteamclient', label: 'No Steam Client', desc: 'Runs without requiring local Steam client connection' },
  ];

  const togglePresetArg = (flag: string) => {
    const current = config.customCommandLineArgs || '';
    if (current.includes(flag)) {
        // Remove flag
        const updated = current.replace(flag, '').replace(/\s+/g, ' ').trim();
        onConfigChange({ customCommandLineArgs: updated });
    } else {
        // Append flag
        const updated = current.trim() ? `${current.trim()} ${flag}` : flag;
        onConfigChange({ customCommandLineArgs: updated });
    }
  };

  const handleSyncDirectory = () => {
      if (matchingClusterProfile) {
          onConfigChange({ clusterDirOverride: matchingClusterProfile.config.clusterDirOverride });
      }
  };

  return (
    <div className="space-y-6">
        {config.map === 'SELECT_MAP' && (
            <div className="p-4 bg-yellow-900/30 border border-yellow-700/50 rounded-lg animate-pulse flex items-center space-x-3">
                <AlertTriangleIcon className="w-6 h-6 text-yellow-500" />
                <p className="text-yellow-200 text-sm">Please select a Map and configure your server before starting the installation.</p>
            </div>
        )}

        <Card title="Server Configuration" footer={
            <button
                onClick={onSave}
                disabled={isActionInProgress || isSaving}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-md transition-colors duration-200 shadow-md"
            >
                {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
        }>
            <div>
                <Label htmlFor="serverPath">Server Path</Label>
                <div className="flex space-x-2">
                    <Input
                        id="serverPath"
                        name="serverPath"
                        type="text"
                        value={path || ''}
                        onChange={(e) => onPathChange(e.target.value)}
                        disabled={isActionInProgress || !!path} 
                        placeholder="Not Installed"
                    />
                    <button
                        onClick={onBrowsePath}
                        disabled={isActionInProgress}
                        title="Browse Server Directory"
                        className="flex items-center justify-center px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 text-white font-bold rounded-md transition-colors duration-200 border border-gray-600"
                    >
                        <FolderIcon className="w-5 h-5 text-cyan-400" />
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Base installation folder (e.g., <code>I:\NewpostSU\server</code> containing <code>ShooterGame</code>).</p>
            </div>
            <hr className="border-gray-700 my-2" />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="map">Map Selection</Label>
                    <Select id="map" name="map" value={config.map} onChange={handleChange} disabled={isActionInProgress}>
                        <option value="SELECT_MAP" disabled>-- Choose a Map --</option>
                        {ARK_MAPS.map(map => <option key={map} value={map}>{map}</option>)}
                    </Select>
                </div>
                <div>
                    <Label htmlFor="serverPlatform">Server Platform</Label>
                    <Select id="serverPlatform" name="serverPlatform" value={config.serverPlatform} onChange={handleChange} disabled={isActionInProgress}>
                        <option value="All">All (PC & Console)</option>
                        <option value="PC">PC Only</option>
                    </Select>
                </div>
            </div>

            <div>
              <Label htmlFor="sessionName">Session Name (Server Name)</Label>
              <Input 
                id="sessionName" 
                name="sessionName" 
                type="text" 
                value={config.sessionName} 
                onChange={handleChange} 
                disabled={isActionInProgress}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="maxPlayers">Max Players</Label>
                    <Input id="maxPlayers" name="maxPlayers" type="number" value={config.maxPlayers || 0} onChange={handleChange} disabled={isActionInProgress} />
                </div>
                 <div>
                    <Label htmlFor="queryPort">Query Port</Label>
                    <Input id="queryPort" name="queryPort" type="number" value={config.queryPort || 0} onChange={handleChange} disabled={isActionInProgress} />
                </div>
                 <div>
                    <Label htmlFor="gamePort">Game Port</Label>
                    <Input id="gamePort" name="gamePort" type="number" value={config.gamePort || 0} onChange={handleChange} disabled={isActionInProgress} />
                </div>
                <div>
                  <Label htmlFor="peerPort">Peer Port (Auto)</Label>
                  <Input
                      id="peerPort"
                      name="peerPort"
                      type="number"
                      value={(config.gamePort || 0) + 1}
                      disabled
                      title="Peer port is automatically set to Game Port + 1."
                  />
                </div>
                <div>
                    <Label htmlFor="rconIp">RCON IP Address</Label>
                    <Select id="rconIp" name="rconIp" value={config.rconIp || (localIps[0] || '127.0.0.1')} onChange={handleChange} disabled={isActionInProgress}>
                        {Array.from(new Set([config.rconIp, ...localIps].filter(Boolean) as string[])).map(ip => (
                            <option key={ip} value={ip}>{ip}</option>
                        ))}
                    </Select>
                </div>
                <div>
                    <Label htmlFor="rconPort">RCON Port</Label>
                    <Input id="rconPort" name="rconPort" type="number" value={config.rconPort || 0} onChange={handleChange} disabled={isActionInProgress} />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="adminPassword">Admin Password</Label>
                  <Input id="adminPassword" name="adminPassword" type="password" value={config.adminPassword || ''} onChange={handleChange} disabled={isActionInProgress} />
                </div>
                <div>
                  <Label htmlFor="serverPassword">Server Password (optional)</Label>
                  <Input id="serverPassword" name="serverPassword" type="password" value={config.serverPassword || ''} onChange={handleChange} disabled={isActionInProgress} />
                </div>
            </div>
             <div>
                <Label htmlFor="rconPassword">RCON Password (optional)</Label>
                <Input id="rconPassword" name="rconPassword" type="password" value={config.rconPassword || ''} onChange={handleChange} disabled={isActionInProgress} />
            </div>
            <hr className="border-gray-700 my-2" />
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col space-y-0.5">
                    <Checkbox id="launchOnAppStart" name="launchOnAppStart" label="Launch on App Start" checked={config.launchOnAppStart || false} onChange={handleChange} disabled={isActionInProgress} />
                    <span className="text-[11px] text-gray-400 pl-7">Auto-boots when application opens</span>
                </div>
                <Checkbox id="bEnableRcon" name="bEnableRcon" label="Enable RCON" checked={config.bEnableRcon} onChange={handleChange} disabled={isActionInProgress} />
                <Checkbox id="bDisableBattleEye" name="bDisableBattleEye" label="Disable BattleEye" checked={config.bDisableBattleEye} onChange={handleChange} disabled={isActionInProgress} />
            </div>

            <hr className="border-gray-700/80 my-4" />

            {/* Custom Launch Arguments Section */}
            <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <TerminalIcon className="w-5 h-5 text-cyan-400" />
                        <Label htmlFor="customCommandLineArgs">
                            <span className="font-semibold text-gray-200">Custom Command Line & Launch Arguments</span>
                        </Label>
                    </div>
                    <span className="text-xs text-gray-400">Appended directly to executable on start</span>
                </div>

                <div className="relative">
                    <input
                        id="customCommandLineArgs"
                        name="customCommandLineArgs"
                        type="text"
                        value={config.customCommandLineArgs || ''}
                        onChange={handleChange}
                        disabled={isActionInProgress}
                        placeholder="e.g. -ForceRespawnDinos -culture=en -UseVivox ?AllowCrateSpawnsOnTopOfStructures=True"
                        className="w-full bg-gray-900/80 border border-gray-600 rounded-md px-3 py-2.5 font-mono text-sm text-cyan-300 placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition disabled:bg-gray-700 disabled:cursor-not-allowed"
                    />
                    {config.customCommandLineArgs && (
                        <button
                            type="button"
                            onClick={() => onConfigChange({ customCommandLineArgs: '' })}
                            disabled={isActionInProgress}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-red-400 bg-gray-800/80 px-1.5 py-0.5 rounded transition"
                            title="Clear custom arguments"
                        >
                            Clear
                        </button>
                    )}
                </div>

                <p className="text-xs text-gray-400 leading-relaxed">
                    Add any extra ARK: Survival Ascended command-line parameters or URL options. Separate flags with spaces.
                </p>

                {/* Popular Arg Quick-Pills */}
                <div className="space-y-1.5 pt-1">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Quick Add Presets:</span>
                    <div className="flex flex-wrap gap-1.5">
                        {popularCommandLinePresets.map((preset) => {
                            const isIncluded = (config.customCommandLineArgs || '').includes(preset.flag);
                            return (
                                <button
                                    key={preset.flag}
                                    type="button"
                                    onClick={() => togglePresetArg(preset.flag)}
                                    disabled={isActionInProgress}
                                    title={`${preset.desc} (${preset.flag})`}
                                    className={`text-xs px-2.5 py-1 rounded-md transition-all duration-150 border font-mono flex items-center space-x-1 ${
                                        isIncluded
                                            ? 'bg-cyan-950/70 border-cyan-500/80 text-cyan-300 font-semibold shadow-sm shadow-cyan-900/30'
                                            : 'bg-gray-900/60 border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white'
                                    }`}
                                >
                                    <span>{isIncluded ? '✓' : '+'}</span>
                                    <span>{preset.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Live Command Line Preview Box */}
                <div className="mt-3 bg-gray-950/90 border border-gray-700/80 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs font-semibold text-gray-300">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Live Server Launch Command Preview</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleCopyCommandLine}
                            className="flex items-center space-x-1 text-xs px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-cyan-400 border border-gray-700 hover:border-cyan-500/50 transition"
                            title="Copy full launch command to clipboard"
                        >
                            {copiedCommandLine ? (
                                <>
                                    <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-400 font-medium">Copied!</span>
                                </>
                            ) : (
                                <>
                                    <CopyIcon className="w-3.5 h-3.5" />
                                    <span>Copy Command</span>
                                </>
                            )}
                        </button>
                    </div>
                    <div className="p-2.5 bg-black/60 rounded border border-gray-800 font-mono text-xs text-gray-300 overflow-x-auto select-all whitespace-pre-wrap break-all leading-relaxed max-h-28">
                        <span className="text-cyan-400">ArkAscendedServer.exe</span>{' '}
                        <span className="text-emerald-300">{fullCommandLinePreview.split(' ')[1]}</span>{' '}
                        <span className="text-gray-300">{fullCommandLinePreview.split(' ').slice(2).join(' ')}</span>
                    </div>
                </div>
            </div>
        </Card>

        <Card title="CPU Core Affinity & Processor Optimization">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                    <CpuIcon className="w-5 h-5 text-cyan-400" />
                    <span className="text-sm font-semibold text-gray-200">Process Affinity Binding</span>
                </div>
                {config.bEnableCpuAffinity ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-cyan-950/80 border border-cyan-500/80 text-cyan-300 shadow-sm shadow-cyan-900/30">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 mr-1.5 animate-pulse"></span>
                        Pinned: {(config.cpuAffinityCores || []).length} { (config.cpuAffinityCores || []).length === 1 ? 'Core' : 'Cores' } Active
                    </span>
                ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-gray-900 border border-gray-700 text-gray-400">
                        Dynamic (All Cores / Unrestricted)
                    </span>
                )}
            </div>

            <Checkbox 
                id="bEnableCpuAffinity" 
                name="bEnableCpuAffinity" 
                label="Enable CPU Core Affinity" 
                checked={config.bEnableCpuAffinity || false} 
                onChange={handleToggleCpuAffinity} 
                disabled={isActionInProgress} 
            />
            <p className="text-xs text-gray-400 pl-7 leading-relaxed">
                Pin <code>ArkAscendedServer.exe</code> to designated logical processor cores. If disabled, Windows automatically distributes the server workload across all available cores.
            </p>

            {config.bEnableCpuAffinity && (
                <div className="space-y-4 animate-fade-in pl-7 pt-2 border-t border-gray-700/60 mt-2">
                    {/* View options and presets */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium text-gray-300">Host Core Matrix:</span>
                            <select
                                value={viewCoreCount}
                                onChange={(e) => setViewCoreCount(parseInt(e.target.value, 10))}
                                disabled={isActionInProgress}
                                className="bg-gray-900/80 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:ring-1 focus:ring-cyan-500"
                            >
                                {[4, 6, 8, 12, 16, 24, 32, 48, 64].map(count => (
                                    <option key={count} value={count}>
                                        {count} Cores {count === detectedHostCores ? '(Host Detected)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center flex-wrap gap-1">
                            <span className="text-xs text-gray-400 mr-1">Quick Select:</span>
                            <button
                                type="button"
                                onClick={() => applyCorePreset('all')}
                                disabled={isActionInProgress}
                                className="text-xs px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-cyan-300 transition"
                            >
                                All Cores
                            </button>
                            <button
                                type="button"
                                onClick={() => applyCorePreset('first2')}
                                disabled={isActionInProgress}
                                className="text-xs px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-cyan-300 transition"
                            >
                                2 Cores
                            </button>
                            <button
                                type="button"
                                onClick={() => applyCorePreset('first4')}
                                disabled={isActionInProgress}
                                className="text-xs px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-cyan-300 transition"
                            >
                                4 Cores
                            </button>
                            <button
                                type="button"
                                onClick={() => applyCorePreset('first6')}
                                disabled={isActionInProgress}
                                className="text-xs px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-cyan-300 transition"
                            >
                                6 Cores
                            </button>
                            <button
                                type="button"
                                onClick={() => applyCorePreset('first8')}
                                disabled={isActionInProgress}
                                className="text-xs px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-cyan-300 transition"
                            >
                                8 Cores
                            </button>
                            <button
                                type="button"
                                onClick={() => applyCorePreset('even')}
                                disabled={isActionInProgress}
                                className="text-xs px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-cyan-300 transition"
                                title="Even numbered cores (Core 0, 2, 4...) typically represent primary physical cores"
                            >
                                Even (Physical)
                            </button>
                            <button
                                type="button"
                                onClick={() => applyCorePreset('odd')}
                                disabled={isActionInProgress}
                                className="text-xs px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-cyan-300 transition"
                                title="Odd numbered cores (Core 1, 3, 5...) typically represent SMT / HyperThreads"
                            >
                                Odd (SMT)
                            </button>
                            <button
                                type="button"
                                onClick={() => applyCorePreset('clear')}
                                disabled={isActionInProgress}
                                className="text-xs px-2 py-0.5 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 transition"
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    {/* Interactive Core Matrix Grid */}
                    <div className="bg-gray-950/70 border border-gray-700/80 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>Click individual CPU cores to toggle allocation:</span>
                            <span className="font-mono text-cyan-300 font-medium">
                                {(config.cpuAffinityCores || []).length} of {viewCoreCount} cores selected ({Math.round(((config.cpuAffinityCores || []).length / viewCoreCount) * 100)}%)
                            </span>
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 pt-1">
                            {Array.from({ length: viewCoreCount }, (_, i) => {
                                const isSelected = (config.cpuAffinityCores || []).includes(i);
                                return (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => toggleCore(i)}
                                        disabled={isActionInProgress}
                                        className={`flex flex-col items-center justify-center p-2 rounded-md transition-all duration-150 border text-center select-none ${
                                            isSelected
                                                ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 font-bold shadow-md shadow-cyan-900/40 scale-[1.02]'
                                                : 'bg-gray-900/60 border-gray-700/80 text-gray-400 hover:border-gray-500 hover:text-gray-200 hover:bg-gray-800/60'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-1">
                                            <span className="text-xs">Core {i}</span>
                                            {isSelected && <span className="text-cyan-400 text-xs">✓</span>}
                                        </div>
                                        <span className={`text-[10px] font-mono mt-0.5 ${isSelected ? 'text-cyan-300' : 'text-gray-500'}`}>
                                            {isSelected ? 'ACTIVE' : 'OFF'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Metrics and Mask Representation */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-gray-900/60 border border-gray-700/80 rounded-lg p-3">
                            <span className="text-xs font-medium text-gray-400 block mb-1">Affinity Mask (Hexadecimal)</span>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    value={config.cpuAffinityMask || calculateAffinityHex(config.cpuAffinityCores || [])}
                                    onChange={handleMaskInputChange}
                                    disabled={isActionInProgress}
                                    placeholder="e.g. 0x0F or FF"
                                    className="w-full bg-gray-950 border border-gray-600 rounded px-2.5 py-1.5 font-mono text-sm text-cyan-300 focus:ring-1 focus:ring-cyan-500"
                                />
                            </div>
                            <span className="text-[11px] text-gray-500 mt-1 block">Standard Windows process bitmask</span>
                        </div>

                        <div className="bg-gray-900/60 border border-gray-700/80 rounded-lg p-3">
                            <span className="text-xs font-medium text-gray-400 block mb-1">Decimal Mask Value</span>
                            <div className="p-1.5 bg-gray-950 rounded border border-gray-800 font-mono text-sm text-gray-200 truncate">
                                {calculateAffinityDecimal(config.cpuAffinityCores || [])}
                            </div>
                            <span className="text-[11px] text-gray-500 mt-1 block">Integer bitwise equivalent</span>
                        </div>

                        <div className="bg-gray-900/60 border border-gray-700/80 rounded-lg p-3">
                            <span className="text-xs font-medium text-gray-400 block mb-1">Binary Bitmask (MSB → LSB)</span>
                            <div className="p-1.5 bg-gray-950 rounded border border-gray-800 font-mono text-xs text-emerald-300 overflow-x-auto whitespace-nowrap">
                                {formatBinaryBitmask(config.cpuAffinityCores || [], Math.min(32, Math.max(16, viewCoreCount)))}
                            </div>
                            <span className="text-[11px] text-gray-500 mt-1 block">Active bits: 1, Inactive bits: 0</span>
                        </div>
                    </div>

                    {/* Windows Execution Info */}
                    <div className="p-3 bg-cyan-950/20 border border-cyan-900/50 rounded-lg text-xs space-y-1 text-gray-300">
                        <div className="flex items-center space-x-1.5 text-cyan-300 font-medium">
                            <TerminalIcon className="w-4 h-4" />
                            <span>Windows Execution Behavior:</span>
                        </div>
                        <p className="leading-relaxed">
                            Upon server boot, the process will execute with affinity flag: <code className="text-cyan-300 font-mono font-semibold">start /affinity {(config.cpuAffinityMask || calculateAffinityHex(config.cpuAffinityCores || [])).replace(/^0x/i, '')} ArkAscendedServer.exe</code>.
                        </p>
                    </div>
                </div>
            )}
        </Card>
        
        <Card title="Clustering">
            <Checkbox id="bEnableClustering" name="bEnableClustering" label="Enable Clustering" checked={config.bEnableClustering} onChange={handleChange} disabled={isActionInProgress} />
            {config.bEnableClustering && (
                <div className="space-y-4 animate-fade-in pl-7">
                    <div>
                        <Label htmlFor="clusterId">Cluster ID</Label>
                        <div className="flex space-x-2">
                            <input 
                                id="clusterId"
                                name="clusterId"
                                list="existing-clusters"
                                type="text"
                                value={config.clusterId}
                                onChange={handleChange}
                                disabled={isActionInProgress}
                                placeholder="A unique ID shared by all servers in the cluster"
                                className="w-full bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition disabled:bg-gray-700 disabled:cursor-not-allowed"
                            />
                            <datalist id="existing-clusters">
                                {existingClusters.map(id => (
                                    <option key={id} value={id} />
                                ))}
                            </datalist>
                            <button
                                onClick={generateClusterId}
                                disabled={isActionInProgress}
                                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-cyan-400 font-bold rounded-md transition-colors duration-200 border border-gray-600 whitespace-nowrap text-sm"
                                title="Generate Random ID"
                            >
                                Generate ID
                            </button>
                        </div>
                    </div>
                     <div>
                        <div className="flex justify-between items-center mb-1">
                            <Label htmlFor="clusterDirOverride">Cluster Directory Override</Label>
                            {matchingClusterProfile && (
                                <button 
                                    onClick={handleSyncDirectory}
                                    className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline flex items-center animate-fade-in"
                                >
                                    <UpdateIcon className="w-3 h-3 mr-1" />
                                    Sync from {matchingClusterProfile.profileName}
                                </button>
                            )}
                        </div>
                        <div className="flex space-x-2">
                            <Input
                                id="clusterDirOverride"
                                name="clusterDirOverride"
                                type="text"
                                value={config.clusterDirOverride}
                                onChange={handleChange}
                                disabled={isActionInProgress}
                                placeholder="e.g., C:\ArkCluster"
                            />
                            <button
                                onClick={handleBrowseClusterPath}
                                disabled={isActionInProgress}
                                className="flex items-center justify-center px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-md transition-colors duration-200"
                            >
                                <FolderIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Card>
        
        <Card title="Discord Integration">
            <div className="flex items-center mb-4 text-gray-200">
                <DiscordIcon className="w-6 h-6 mr-2 text-[#5865F2]" />
                <span className="font-semibold">Discord Notifications & Remote Control</span>
            </div>
            
            <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">1. One-Way Notifications (Webhook)</h4>
                <Checkbox id="discordNotificationsEnabled" name="discordNotificationsEnabled" label="Enable Webhook Notifications" checked={config.discordNotificationsEnabled} onChange={handleChange} disabled={isActionInProgress} />
                {config.discordNotificationsEnabled && (
                    <div className="space-y-4 animate-fade-in pl-7 mt-2">
                         <div>
                            <Label htmlFor="discordWebhookUrl">Webhook URL</Label>
                            <Input
                                id="discordWebhookUrl"
                                name="discordWebhookUrl"
                                type="text"
                                value={config.discordWebhookUrl || ''}
                                onChange={handleChange}
                                disabled={isActionInProgress}
                                placeholder="https://discord.com/api/webhooks/..."
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Notifications will be sent for Server Start, Stop, Updates, and Restarts.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <hr className="border-gray-700 mb-4" />

            <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">2. Two-Way Remote Control (Discord Bot)</h4>
                <Checkbox id="discordBotEnabled" name="discordBotEnabled" label="Enable Discord Bot Commands (Slash Commands)" checked={config.discordBotEnabled} onChange={handleChange} disabled={isActionInProgress} />
                {config.discordBotEnabled && (
                    <div className="space-y-4 animate-fade-in pl-7 mt-2">
                         <div>
                            <Label htmlFor="discordBotToken">Bot Token</Label>
                            <Input
                                id="discordBotToken"
                                name="discordBotToken"
                                type="password"
                                value={config.discordBotToken || ''}
                                onChange={handleChange}
                                disabled={isActionInProgress}
                                placeholder="Enter your Discord Bot Token..."
                            />
                        </div>
                        <div>
                            <Label htmlFor="discordBotChannelId">Target Channel ID</Label>
                            <Input
                                id="discordBotChannelId"
                                name="discordBotChannelId"
                                type="text"
                                value={config.discordBotChannelId || ''}
                                onChange={handleChange}
                                disabled={isActionInProgress}
                                placeholder="Enter the Discord Channel ID..."
                            />
                        </div>
                        <div className="bg-blue-900/20 border border-blue-700/50 rounded-md p-3 text-sm">
                            <h5 className="font-bold text-blue-400 mb-1 flex items-center">
                                <InfoIcon className="w-4 h-4 mr-1" />
                                How to setup your Discord Bot
                            </h5>
                            <ol className="list-decimal list-inside text-blue-200 space-y-1.5 ml-1 text-xs">
                                <li>Go to the <a href="https://discord.com/developers/applications" onClick={handleLinkClick} className="text-cyan-400 hover:underline">Discord Developer Portal</a>.</li>
                                <li>Click <strong>New Application</strong> and give it a name.</li>
                                <li>Navigate to the <strong>Bot</strong> tab and click <strong>Reset Token</strong> to copy your Bot Token.</li>
                                <li>Paste the token into the field above.</li>
                                <li>Under the <strong>OAuth2</strong> &gt; <strong>URL Generator</strong> tab, check <strong>bot</strong> and <strong>applications.commands</strong>.</li>
                                <li>Use the generated URL to invite the bot to your server.</li>
                            </ol>
                            <p className="text-xs text-blue-300 mt-2">
                                The bot will listen for Slash Commands (e.g. <code>/start</code>, <code>/status</code>, <code>/stop</code>) to remotely manage this server profile.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </Card>

        <div className="p-4 bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-700 text-sm">
            <h3 className="text-md font-bold text-cyan-400 mb-2">Port Forwarding Information</h3>
            <div className="text-gray-300 space-y-2">
                <p>For your ARK server to be accessible from the internet, you need to forward the following ports in your router:</p>
                <div>
                    <p className="font-semibold text-gray-200">UDP Ports:</p>
                    <ul className="list-disc list-inside pl-4">
                        <li>Game Port: <code className="text-cyan-300">{config.gamePort || 0}</code></li>
                        <li>Peer Port: <code className="text-cyan-300">{(config.gamePort || 0) + 1}</code></li>
                        <li>Query Port: <code className="text-cyan-300">{config.queryPort || 0}</code></li>
                    </ul>
                </div>
                <a 
                    href="https://portforward.com/ark-survival-ascended/"
                    onClick={handleLinkClick}
                    className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center mt-2"
                >
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Click here for detailed port forwarding instructions
                </a>
            </div>
        </div>
    </div>
  );
};

export default ServerConfigComponent;
