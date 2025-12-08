

import React, { useMemo } from 'react';
import { ServerConfig, ServerProfile } from '../types';
import { ARK_MAPS } from '../constants';
import { FolderIcon, UpdateIcon, LinkIcon, DiscordIcon } from './icons';
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

  // Extract unique existing Cluster IDs
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

  // Check if current cluster ID exists in other profiles and has a directory we can sync
  const matchingClusterProfile = useMemo(() => {
      if (!config.clusterId) return null;
      return profiles.find(p => 
          p.config.bEnableClustering && 
          p.config.clusterId === config.clusterId && 
          p.config.clusterDirOverride && 
          p.config.clusterDirOverride !== config.clusterDirOverride
      );
  }, [profiles, config.clusterId, config.clusterDirOverride]);

  const handleSyncDirectory = () => {
      if (matchingClusterProfile) {
          onConfigChange({ clusterDirOverride: matchingClusterProfile.config.clusterDirOverride });
      }
  };

  return (
    <div className="space-y-6">
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
                        disabled={isActionInProgress}
                        placeholder="e.g., C:\ark-server"
                    />
                    <button
                        onClick={onBrowsePath}
                        disabled={isActionInProgress}
                        className="flex items-center justify-center px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-md transition-colors duration-200"
                    >
                        <FolderIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
            <hr className="border-gray-700 my-2" />
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
                    <Label htmlFor="map">Map</Label>
                    <Select id="map" name="map" value={config.map} onChange={handleChange} disabled={isActionInProgress}>
                        {ARK_MAPS.map(map => <option key={map} value={map}>{map}</option>)}
                    </Select>
                </div>
                <div>
                    <Label htmlFor="serverPlatform">Server Platform</Label>
                    <Select id="serverPlatform" name="serverPlatform" value={config.serverPlatform} onChange={handleChange} disabled={isActionInProgress}>
                        <option value="All">All (PC & Console)</option>
                        <option value="PC">PC Only</option>
                    </Select>
                    <p className="text-xs text-gray-400 mt-1">Determines which platforms can join.</p>
                </div>
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
                      title="Peer port is automatically set to Game Port + 1 and is not directly editable."
                  />
                </div>
                <div>
                    <Label htmlFor="rconIp">RCON IP Address</Label>
                    <Select id="rconIp" name="rconIp" value={config.rconIp} onChange={handleChange} disabled={isActionInProgress}>
                        {localIps.map(ip => <option key={ip} value={ip}>{ip}</option>)}
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
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Checkbox id="bEnableRcon" name="bEnableRcon" label="Enable RCON" checked={config.bEnableRcon} onChange={handleChange} disabled={isActionInProgress} />
                <Checkbox id="bDisableBattleEye" name="bDisableBattleEye" label="Disable BattleEye" checked={config.bDisableBattleEye} onChange={handleChange} disabled={isActionInProgress} />
            </div>
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
                         <p className="text-xs text-gray-400 mt-1">All servers in the same cluster must have the exact same Cluster ID.</p>
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
                        <p className="text-xs text-gray-400 mt-1">A shared directory where all servers in the cluster will store transfer data.</p>
                    </div>
                </div>
            )}
        </Card>
        
        <Card title="Discord Integration">
            <div className="flex items-center mb-4 text-gray-200">
                <DiscordIcon className="w-6 h-6 mr-2 text-[#5865F2]" />
                <span className="font-semibold">Discord Webhook Notifications</span>
            </div>
            <Checkbox id="discordNotificationsEnabled" name="discordNotificationsEnabled" label="Enable Discord Notifications" checked={config.discordNotificationsEnabled} onChange={handleChange} disabled={isActionInProgress} />
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
                            Paste the full Webhook URL from your Discord channel settings. 
                            Notifications will be sent for Server Start, Stop, Updates, and Restarts.
                        </p>
                    </div>
                </div>
            )}
        </Card>

        <div className="p-4 bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-700 text-sm">
            <h3 className="text-md font-bold text-cyan-400 mb-2">Port Forwarding Information</h3>
            <div className="text-gray-300 space-y-2">
                <p>For your ARK server to be accessible from the internet, you need to forward the following ports in your router:</p>
                <div>
                    <p className="font-semibold text-gray-200">UDP Ports:</p>
                    <ul className="list-disc list-inside pl-4">
                        <li>Game Port: <code className="text-cyan-300">{config.gamePort || 0}</code> - Main game traffic</li>
                        <li>Peer Port: <code className="text-cyan-300">{(config.gamePort || 0) + 1}</code> - Server-to-server communication</li>
                        <li>Query Port: <code className="text-cyan-300">{config.queryPort || 0}</code> - For server listing and queries</li>
                    </ul>
                </div>
                <div>
                    <p className="font-semibold text-gray-200">TCP Ports:</p>
                     <ul className="list-disc list-inside pl-4">
                        <li>RCON Port: <code className="text-cyan-300">{config.rconPort || 0}</code> - For remote console access (if enabled)</li>
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