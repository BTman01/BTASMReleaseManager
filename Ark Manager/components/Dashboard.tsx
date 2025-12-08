

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ServerStatus, ServerConfig, ModAnalysisResult, ServerProfile, BackupInfo, ModAnalysis, CurseForgeMod, AppSettings, AppNotification, PlayerInfo, RconDiagnosticStep, PlayerEventPayload } from '../types';
import { ARK_MAPS } from '../constants';
import * as directoryService from '../services/directoryService';
import * as notificationService from '../services/notificationService';
import * as discordService from '../services/discordService';
import * as iniParsingService from '../services/iniParsingService';
import ServerControls from './ServerControls';
import ServerConfigComponent from './ServerConfig';
import ModManager from './ModManager';
import InstallProgress from './InstallProgress';
import ProfileManager from './ProfileManager';
import UpdateProgressModal from './UpdateProgressModal';
import ModUpdateProgressModal from './ModUpdateProgressModal';
import MapUpdateProgressModal from './MapUpdateProgressModal';
import GameSettings from './GameSettings';
import BackupManager from './BackupManager';
import ServerManagement from './ServerManagement';
import PlayerManagement from './PlayerManagement';
import Console from './Console';
import ImportSettingsModal from './ImportSettingsModal';
import ShutdownModal from './ShutdownModal';
import UnsavedChangesModal from './UnsavedChangesModal';
import ClusterVisualization from './ClusterVisualization';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import * as dialog from '@tauri-apps/plugin-dialog';
import * as fs from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface DashboardProps {
  appSettings: AppSettings;
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  profileToSelect: string | null;
  onUpdateAppSettings: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

const getDefaultServerConfig = (profileCount: number): ServerConfig => ({
    sessionName: `My Ark Server ${profileCount + 1}`,
    map: ARK_MAPS[0],
    maxPlayers: 20,
    mods: '',
    adminPassword: 'adminpassword',
    serverPassword: '',
    queryPort: 27015,
    gamePort: 7777,
    rconIp: '127.0.0.1',
    rconPort: 27020,
    bEnableRcon: false,
    bDisableBattleEye: true,
    serverPlatform: 'All',
    rconPassword: '',
    xpMultiplier: 1.0,
    tamingSpeedMultiplier: 1.0,
    harvestAmountMultiplier: 1.0,
    matingIntervalMultiplier: 1.0,
    eggHatchSpeedMultiplier: 1.0,
    babyMatureSpeedMultiplier: 1.0,
    bAllowThirdPersonPlayer: true,
    bShowFloatingDamageText: true,
    bAllowFlyerCarryPvE: false,
    bDisableStructurePlacementCollision: false,
    bServerPVE: true,
    autoUpdateEnabled: false,
    autoUpdateFrequency: 60,
    scheduledRestartEnabled: false,
    scheduledRestartTime: '04:00',
    updateOnRestart: true,
    restartAnnouncementMinutes: 10, // Default to 10 minutes
    playerCharacterWaterDrainMultiplier: 1.0,
    playerCharacterFoodDrainMultiplier: 1.0,
    bServerCrosshair: true,
    bShowMapPlayerLocation: true,
    bGlobalVoiceChat: true,
    bProximityChat: false,
    dinoCharacterFoodDrainMultiplier: 1.0,
    dinoCharacterStaminaDrainMultiplier: 1.0,
    dinoCharacterHealthRecoveryMultiplier: 1.0,
    bAllowAnyoneBabyImprintCuddle: false,
    bAllowFlyingStaminaRecovery: true,
    bDisableImprintDinoBuff: false,
    tamedDinoDamageMultiplier: 1.0,
    tamedDinoResistanceMultiplier: 1.0,
    difficultyOffset: 1.0,
    nightTimeSpeedScale: 1.0,
    harvestHealthMultiplier: 1.0,
    autoSavePeriodMinutes: 15.0,
    bDisableFriendlyFire: false,
    itemSpoilingTimeMultiplier: 1.0,
    bAllowCaveBuildingPvE: true,
    bAlwaysAllowStructurePickup: false,
    fuelConsumptionIntervalMultiplier: 1.0,
    bNoTributeDownloads: false,
    bPreventDownloadSurvivors: false,
    bPreventDownloadItems: false,
    bPreventDownloadDinos: false,
    bEnableClustering: false,
    clusterId: 'MyCluster123',
    clusterDirOverride: '',
    discordWebhookUrl: '',
    discordNotificationsEnabled: false,
});


const Dashboard: React.FC<DashboardProps> = ({ appSettings, setNotifications, profileToSelect, onUpdateAppSettings, onShowToast }) => {
  const [profiles, setProfiles] = useState<ServerProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'mods' | 'gameSettings' | 'clustering' | 'backups' | 'serverManagement' | 'playerManagement' | 'console'>('config');
  const [isAnalyzingMods, setIsAnalyzingMods] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installLog, setInstallLog] = useState<string[]>([]);
  const [installProgress, setInstallProgress] = useState(0);
  
  const [updateLog, setUpdateLog] = useState<string[]>([]);
  const [isUpdateFinished, setIsUpdateFinished] = useState(false);

  const [isUpdatingMap, setIsUpdatingMap] = useState(false);
  const [mapUpdateLog, setMapUpdateLog] = useState<string[]>([]);
  const [isMapUpdateFinished, setIsMapUpdateFinished] = useState(false);

  const [isUpdatingMods, setIsUpdatingMods] = useState(false);
  const [modUpdateLog, setModUpdateLog] = useState<string[]>([]);
  const [isModUpdateFinished, setIsModUpdateFinished] = useState(false);
  
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  
  const [isCheckingForUpdate, setIsCheckingForUpdate] = useState(false);
  const [managerLog, setManagerLog] = useState<string[]>([]);
  const [serverLog, setServerLog] = useState<string[]>([]);
  
  const [playerList, setPlayerList] = useState<PlayerInfo[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isShutdownModalOpen, setIsShutdownModalOpen] = useState(false);
  const [activeShutdownEndTime, setActiveShutdownEndTime] = useState<number | null>(null);

  const [detectedConfig, setDetectedConfig] = useState<Partial<ServerConfig> | null>(null);
  const [isDiagnosingRcon, setIsDiagnosingRcon] = useState(false);
  const [localIps, setLocalIps] = useState<string[]>(['127.0.0.1']);

  const [isUnsavedChangesModalOpen, setIsUnsavedChangesModalOpen] = useState(false);
  const [pendingStartProfileId, setPendingStartProfileId] = useState<string | null>(null);
  
  // Delete Profile Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<{ id: string, name: string } | null>(null);

  // Timed Restart State
  const [isRestartModalOpen, setIsRestartModalOpen] = useState(false);
  const [activeRestartEndTime, setActiveRestartEndTime] = useState<number | null>(null);
  const timedRestartIntervalRef = useRef<number | null>(null);

  const startupTimerRef = useRef<number | null>(null);
  const updateCheckTimerRef = useRef<number | null>(null);
  const restartIntervalRef = useRef<number | null>(null);
  const statsIntervalRef = useRef<number | null>(null);
  const shutdownTimerIntervalRef = useRef<number | null>(null);

  const lastRestartBroadcastMinuteRef = useRef<number | null>(null);

  const activeProfile = useMemo(() => profiles.find(p => p.id === activeProfileId) || null, [profiles, activeProfileId]);
  const status = activeProfile?.status || ServerStatus.NotInstalled;
  
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;
  const activeProfileIdRef = useRef(activeProfileId);
  activeProfileIdRef.current = activeProfileId;
  
  useEffect(() => {
    if (profileToSelect) {
        setActiveProfileId(profileToSelect);
    }
  }, [profileToSelect]);

  const updateProfile = useCallback((id: string, updates: Partial<ServerProfile>) => {
      if (updates.status && id === activeProfileIdRef.current) {
          setManagerLog(prev => [...prev, `[Manager] Server status changed to: ${updates.status}`]);
      }

      setProfiles(prevProfiles => {
          const newProfiles = prevProfiles.map(p => p.id === id ? { ...p, ...updates } : p);
          directoryService.saveProfiles(newProfiles);
          return newProfiles;
      });
  }, []);

  useEffect(() => {
    if (activeProfileId) {
        updateProfile(activeProfileId, { playerCount: playerList.length });
    }
  }, [playerList, activeProfileId, updateProfile]);
  

  const onUpdate = useCallback(async () => {
    const profileToUpdate = profilesRef.current.find(p => p.id === activeProfileIdRef.current);
    if (!profileToUpdate || !profileToUpdate.path) return;

    setIsUpdateFinished(false);
    updateProfile(profileToUpdate.id, { status: ServerStatus.Updating });
    setUpdateLog(['Initializing server file update...']);
    notificationService.sendNotification('Update Started', `Updating server files for ${profileToUpdate.profileName}.`);
    
    try {
        await invoke('update_server_files', { 
            installPath: profileToUpdate.path,
        });
    } catch (error: any) {
        setUpdateLog(prev => [...prev, `❌ ERROR: Failed to start update process: ${error}`]);
        updateProfile(profileToUpdate.id, { status: ServerStatus.Error });
        notificationService.sendNotification('Update Failed', `Failed to update server files for ${profileToUpdate.profileName}.`);
        setIsUpdateFinished(true);
    }
  }, [updateProfile]);

  const executeServerStart = useCallback(async (profileIdToStart: string) => {
    const profileToStart = profilesRef.current.find(p => p.id === profileIdToStart);

    if (!profileToStart || !profileToStart.path) return;
    const profileId = profileToStart.id;
    setManagerLog([]); // Clear manager log on start
    setServerLog([]); // Clear server log on start
    setPlayerList([]); // Clear player list on start
    updateProfile(profileId, { status: ServerStatus.Starting });
    notificationService.sendNotification('Server Starting', `The server "${profileToStart.profileName}" is starting up.`);

    if (startupTimerRef.current) clearTimeout(startupTimerRef.current);
    
    try {
        const { map, sessionName, queryPort, gamePort, serverPassword, adminPassword, mods, bDisableBattleEye, maxPlayers, bServerPVE, bEnableRcon, rconPort, rconPassword, rconIp, bEnableClustering, clusterId, clusterDirOverride, serverPlatform } = profileToStart.config;
        
        // Options that MUST be in the URL
        const urlOptions = [];
        urlOptions.push(`SessionName=${sessionName}`);
        urlOptions.push(`ServerPVE=${bServerPVE}`);
        
        const mapAndOptionsArg = `${map}?${urlOptions.join('?')}`;
        
        // All other arguments as separate array elements for robustness
        const launchArgs = [mapAndOptionsArg];
        launchArgs.push(`-Port=${gamePort}`);
        launchArgs.push(`-QueryPort=${queryPort}`);
        launchArgs.push(`-WinLiveMaxPlayers=${maxPlayers}`);
        launchArgs.push(`-MultiHome=${rconIp || '0.0.0.0'}`);
        launchArgs.push(`-ServerPlatform=${serverPlatform}`);
        launchArgs.push(`-servergamelog`); // Enable reliable player logging
        
        // Passwords
        if (serverPassword) {
            launchArgs.push(`-ServerPassword=${serverPassword}`);
        }
        launchArgs.push(`-ServerAdminPassword=${adminPassword || 'password'}`);
        
        // RCON settings as flags
        if (bEnableRcon) {
            launchArgs.push('-RCONEnabled');
            launchArgs.push(`-RCONPort=${rconPort}`);
            if (rconPassword && rconPassword.trim()) {
                launchArgs.push(`-RCONServerAdminPassword=${rconPassword.trim()}`);
            }
        }
        
        // Other flags
        if (bDisableBattleEye) {
            launchArgs.push('-NoBattlEye');
        }
        if (mods.trim()) {
            launchArgs.push(`-mods=${mods.trim()}`);
        }

        // Clustering
        if (bEnableClustering && clusterId && clusterDirOverride) {
            launchArgs.push(`-ClusterID=${clusterId}`);
            launchArgs.push(`-ClusterDirOverride=${clusterDirOverride}`);
            launchArgs.push(`-NoTransferFromFiltering`);
        }
        
        const serverExePath = await join(profileToStart.path, 'ShooterGame', 'Binaries', 'Win64', 'ArkAscendedServer.exe');
        
        await invoke('start_ark_server', {
            profileId: profileId,
            installPath: profileToStart.path,
            serverPath: serverExePath,
            args: launchArgs,
            rconIp: rconIp,
            rconPort: rconPort,
            rconPassword: (rconPassword && rconPassword.trim()) ? rconPassword : adminPassword,
            bEnableRcon: bEnableRcon,
        });
        
    } catch (error) {
        onShowToast('Error starting server. See console for details.', 'error');
        console.error(error);
        if (startupTimerRef.current) clearTimeout(startupTimerRef.current);
        updateProfile(profileId, { status: ServerStatus.Error });
        notificationService.sendNotification('Server Start Failed', `The server "${profileToStart.profileName}" failed to start.`);
    }
  }, [updateProfile, onShowToast]);

  const onStart = useCallback(async () => {
    const currentActiveId = activeProfileIdRef.current;
    if (!currentActiveId) return;
    const profileToStart = profilesRef.current.find(p => p.id === currentActiveId);
    if (!profileToStart || !profileToStart.path) return;

    // 1. Check Auto Save setting
    if (appSettings.autoSaveOnStart) {
        await handleSaveConfig();
        await executeServerStart(currentActiveId);
        return;
    }

    // 2. Check for diffs between app state and file on disk
    try {
        const diskConfig = await iniParsingService.parseIniFiles(profileToStart.path);
        if (diskConfig) {
            const hasUnsavedChanges = iniParsingService.areConfigsDifferent(profileToStart.config, diskConfig);
            if (hasUnsavedChanges) {
                setPendingStartProfileId(currentActiveId);
                setIsUnsavedChangesModalOpen(true);
                return;
            }
        }
    } catch (error) {
        console.error("Error checking for unsaved changes:", error);
    }
    
    // 3. No changes or check failed, just start
    await executeServerStart(currentActiveId);

  }, [appSettings.autoSaveOnStart, executeServerStart]);

  const handleUnsavedChangesConfirm = async (shouldAutoSave: boolean) => {
      if (shouldAutoSave) {
          onUpdateAppSettings('autoSaveOnStart', true);
      }
      
      // Save changes (App state -> Disk)
      await handleSaveConfig();
      
      setIsUnsavedChangesModalOpen(false);
      if (pendingStartProfileId) {
          await executeServerStart(pendingStartProfileId);
          setPendingStartProfileId(null);
      }
  };

  const handleUnsavedChangesDiscard = async () => {
      // Discard changes (Disk -> App State)
      if (pendingStartProfileId) {
          const profile = profilesRef.current.find(p => p.id === pendingStartProfileId);
          if (profile && profile.path) {
               const diskConfig = await iniParsingService.parseIniFiles(profile.path);
               if (diskConfig) {
                   const updatedConfig = { ...profile.config, ...diskConfig };
                   updateProfile(profile.id, { config: updatedConfig });
                   console.log(`[Dashboard] Changes discarded. Re-loaded settings from disk for ${profile.profileName}.`);
               }
          }
      }

      setIsUnsavedChangesModalOpen(false);
      if (pendingStartProfileId) {
          await executeServerStart(pendingStartProfileId);
          setPendingStartProfileId(null);
      }
  };

  const handleUnsavedChangesCancel = () => {
      setIsUnsavedChangesModalOpen(false);
      setPendingStartProfileId(null);
  };


    const onStop = useCallback(async () => {
        if (!activeProfile) return;
        const profileId = activeProfile.id;

        if (activeProfile.status === ServerStatus.Starting && startupTimerRef.current) {
            clearTimeout(startupTimerRef.current);
            startupTimerRef.current = null;
        }

        if (shutdownTimerIntervalRef.current) {
            clearInterval(shutdownTimerIntervalRef.current);
            shutdownTimerIntervalRef.current = null;
            setActiveShutdownEndTime(null);
        }

        if (timedRestartIntervalRef.current) {
            clearInterval(timedRestartIntervalRef.current);
            timedRestartIntervalRef.current = null;
            setActiveRestartEndTime(null);
        }

        updateProfile(profileId, { status: ServerStatus.Stopping });
        try {
            await invoke('stop_ark_server', {
                profileId: profileId
            });
        } catch(error) {
            console.error("Failed to stop server:", error);
            onShowToast(`Failed to stop server: ${error}`, 'error');
            updateProfile(profileId, { status: ServerStatus.Error });
        }
    }, [activeProfile, updateProfile, onShowToast]);

    const onRestart = useCallback(async (isScheduled = false) => {
        const profileToRestart = profilesRef.current.find(p => p.id === activeProfileIdRef.current);
        if (!profileToRestart || profileToRestart.status !== ServerStatus.Running) return;

        const { config, id, profileName } = profileToRestart;
        
        discordService.sendDiscordNotification(profileToRestart, 'Server Restarting', 'The server is restarting...', discordService.DiscordColors.YELLOW);

        if (isScheduled) {
            notificationService.sendNotification('Scheduled Restart', `Server "${profileName}" is beginning its scheduled restart.`);
        }

        if (isScheduled && config.updateOnRestart) {
            console.log(`Scheduled restart for profile ${id}: Checking for updates first.`);
            const current = profileToRestart.currentBuildId;
            const latest = profileToRestart.latestBuildId;

            if (current && latest && current !== latest) {
                console.log(`Update found for profile ${id}. Updating before restart.`);
                notificationService.sendNotification('Update Found', `An update was found during the scheduled restart for "${profileName}". Updating now.`);
                updateProfile(id, { status: ServerStatus.Updating });
                await onUpdate(); 
                return;
            }
            console.log(`No update found for profile ${id}. Proceeding with normal restart.`);
        }

        if (timedRestartIntervalRef.current) {
            clearInterval(timedRestartIntervalRef.current);
            timedRestartIntervalRef.current = null;
            setActiveRestartEndTime(null);
        }

        updateProfile(id, { status: ServerStatus.Restarting });
        try {
            await invoke('stop_ark_server', { profileId: id });
        } catch(error) {
            console.error("Failed to stop server for restart:", error);
            onShowToast(`Failed to stop server for restart: ${error}`, 'error');
            updateProfile(id, { status: ServerStatus.Error });
        }
    }, [updateProfile, onUpdate, onShowToast]);

  const handleManualUpdateCheck = useCallback(async () => {
    const profileToCheck = profilesRef.current.find(p => p.id === activeProfileIdRef.current);
    if (!profileToCheck?.path) return;

    const { id, path, profileName } = profileToCheck;
    
    setIsCheckingForUpdate(true);
    try {
        const [currentBuild, latestBuild] = await Promise.all([
            invoke<string>('get_server_build_info', { installPath: path }),
            invoke<string>('get_latest_server_build', { installPath: path }),
        ]);
        updateProfile(id, {
            currentBuildId: currentBuild,
            latestBuildId: latestBuild,
            lastUpdateCheck: new Date().toISOString()
        });
        if (currentBuild && latestBuild && currentBuild !== latestBuild) {
            notificationService.sendNotification('Update Available', `A new server version is available for "${profileName}".`);
            setNotifications(prev => {
                const notifId = `update-${id}`;
                if (prev.some(n => n.id === notifId)) return prev;
                return [...prev, {
                    id: notifId,
                    type: 'update',
                    profileId: id,
                    profileName,
                    message: `Update available for server "${profileName}".`,
                    read: false,
                }];
            });
        }
    } catch (error) {
        console.error("Failed to check for updates:", error);
        onShowToast(`Error checking for updates: ${error}`, 'error');
        updateProfile(id, { lastUpdateCheck: new Date().toISOString() });
    } finally {
        setIsCheckingForUpdate(false);
    }
  }, [updateProfile, setNotifications, onShowToast]);

  const handleSendCommand = async (command: string, retries = 1) => {
    if (!activeProfile || activeProfile.status !== ServerStatus.Running) return;

    try {
        setManagerLog(prev => [...prev, `$ ${command}`]);
        
        await invoke('send_rcon_command', {
            profileId: activeProfile.id,
            command: command,
        });
    } catch (error: any) {
        // If it's a connection reset error and we have retries left, try again after a short delay
        if (retries > 0 && String(error).includes('10054')) {
            console.warn(`RCON connection reset. Retrying command: ${command}`);
            setTimeout(() => {
                handleSendCommand(command, retries - 1);
            }, 500); // Wait 500ms before retrying
        } else {
            console.error(`Failed to send RCON command: ${error}`);
            setManagerLog(prev => [...prev, `❌ Error sending command: ${error}`]);
        }
    }
  };

  const handleInitiateTimedShutdown = (minutes: number) => {
    if (!activeProfile || activeProfile.status !== ServerStatus.Running) return;
    
    const durationMs = minutes * 60 * 1000;
    const endTime = Date.now() + durationMs;
    setActiveShutdownEndTime(endTime);
    
    if (shutdownTimerIntervalRef.current) clearInterval(shutdownTimerIntervalRef.current);

    handleSendCommand(`ServerChat Server shutting down in ${minutes} minutes.`);
    
    let lastAnnouncedRemaining = minutes * 60; 

    shutdownTimerIntervalRef.current = window.setInterval(() => {
        const now = Date.now();
        const remainingMs = endTime - now;
        const remainingSec = Math.ceil(remainingMs / 1000);

        if (remainingMs <= 0) {
            if (shutdownTimerIntervalRef.current) clearInterval(shutdownTimerIntervalRef.current);
            setActiveShutdownEndTime(null);
            handleSendCommand("ServerChat Server shutting down NOW.");
            handleSendCommand("SaveWorld");
            setTimeout(() => onStop(), 2000);
            return;
        }

        const checkpoints = [1800, 900, 600, 300, 180, 60, 30, 10, 5, 4, 3, 2, 1];

        for (const cp of checkpoints) {
            if (lastAnnouncedRemaining > cp && remainingSec <= cp) {
                const timeStr = cp >= 60 ? `${cp / 60} minute${cp === 60 ? '' : 's'}` : `${cp} seconds`;
                handleSendCommand(`ServerChat Server shutting down in ${timeStr}.`);
                lastAnnouncedRemaining = cp;
                break;
            }
        }
    }, 1000);
  };

  const handleCancelTimedShutdown = () => {
    if (shutdownTimerIntervalRef.current) {
        clearInterval(shutdownTimerIntervalRef.current);
        shutdownTimerIntervalRef.current = null;
    }
    setActiveShutdownEndTime(null);
    handleSendCommand("ServerChat Shutdown cancelled.");
  };

  const handleInitiateTimedRestart = (minutes: number) => {
    if (!activeProfile || activeProfile.status !== ServerStatus.Running) return;
    
    const durationMs = minutes * 60 * 1000;
    const endTime = Date.now() + durationMs;
    setActiveRestartEndTime(endTime);
    
    if (timedRestartIntervalRef.current) clearInterval(timedRestartIntervalRef.current);

    handleSendCommand(`ServerChat Server restarting in ${minutes} minutes.`);
    
    let lastAnnouncedRemaining = minutes * 60; 

    timedRestartIntervalRef.current = window.setInterval(() => {
        const now = Date.now();
        const remainingMs = endTime - now;
        const remainingSec = Math.ceil(remainingMs / 1000);

        if (remainingMs <= 0) {
            if (timedRestartIntervalRef.current) clearInterval(timedRestartIntervalRef.current);
            setActiveRestartEndTime(null);
            handleSendCommand("ServerChat Server restarting NOW.");
            handleSendCommand("SaveWorld");
            setTimeout(() => onRestart(false), 2000);
            return;
        }

        const checkpoints = [1800, 900, 600, 300, 180, 60, 30, 10, 5, 4, 3, 2, 1];

        for (const cp of checkpoints) {
            if (lastAnnouncedRemaining > cp && remainingSec <= cp) {
                const timeStr = cp >= 60 ? `${cp / 60} minute${cp === 60 ? '' : 's'}` : `${cp} seconds`;
                handleSendCommand(`ServerChat Server restarting in ${timeStr}.`);
                lastAnnouncedRemaining = cp;
                break;
            }
        }
    }, 1000);
  };

  const handleCancelTimedRestart = () => {
    if (timedRestartIntervalRef.current) {
        clearInterval(timedRestartIntervalRef.current);
        timedRestartIntervalRef.current = null;
    }
    setActiveRestartEndTime(null);
    handleSendCommand("ServerChat Restart cancelled.");
  };

  useEffect(() => {
    if (updateCheckTimerRef.current) clearInterval(updateCheckTimerRef.current);
    if (restartIntervalRef.current) clearInterval(restartIntervalRef.current);

    const profileId = activeProfile?.id;
    const autoUpdateEnabled = activeProfile?.config.autoUpdateEnabled;
    const autoUpdateFrequency = activeProfile?.config.autoUpdateFrequency;
    const scheduledRestartEnabled = activeProfile?.config.scheduledRestartEnabled;
    const scheduledRestartTime = activeProfile?.config.scheduledRestartTime;
    const restartAnnouncementMinutes = activeProfile?.config.restartAnnouncementMinutes ?? 0;
    const rconEnabled = activeProfile?.config.bEnableRcon;

    if (profileId) {
        if (autoUpdateEnabled && autoUpdateFrequency && autoUpdateFrequency > 0) {
            handleManualUpdateCheck();
            updateCheckTimerRef.current = window.setInterval(
                () => handleManualUpdateCheck(),
                autoUpdateFrequency * 60 * 1000
            );
        }

        if (scheduledRestartEnabled && scheduledRestartTime) {
            const checkRestartStatus = () => {
                const [hours, minutes] = scheduledRestartTime.split(':').map(Number);
                const now = new Date();
                const restartTime = new Date(now);
                restartTime.setHours(hours, minutes, 0, 0);

                let msUntilRestart = restartTime.getTime() - now.getTime();
                if (msUntilRestart < 0) {
                    msUntilRestart += 24 * 60 * 60 * 1000;
                }
                
                if (rconEnabled && restartAnnouncementMinutes > 0 && activeProfile?.status === ServerStatus.Running) {
                    const minutesUntilRestart = Math.ceil(msUntilRestart / 60000);
                    
                    if (minutesUntilRestart <= restartAnnouncementMinutes) {
                        const announcementPoints = [60, 45, 30, 15, 10, 5, 3, 2, 1];
                        
                        if (announcementPoints.includes(minutesUntilRestart)) {
                            if (lastRestartBroadcastMinuteRef.current !== minutesUntilRestart) {
                                handleSendCommand(`ServerChat Scheduled restart in ${minutesUntilRestart} minute(s).`);
                                lastRestartBroadcastMinuteRef.current = minutesUntilRestart;
                            }
                        }
                    }
                }

                if (msUntilRestart <= 5000 && msUntilRestart > -5000) { 
                    if (activeProfile?.status === ServerStatus.Running) {
                        onRestart(true);
                    }
                }
            };

            restartIntervalRef.current = window.setInterval(checkRestartStatus, 5000);
        }
    }

    return () => {
        if (updateCheckTimerRef.current) clearInterval(updateCheckTimerRef.current);
        if (restartIntervalRef.current) clearInterval(restartIntervalRef.current);
    };
  }, [
      activeProfile?.id,
      activeProfile?.status,
      activeProfile?.config.autoUpdateEnabled,
      activeProfile?.config.autoUpdateFrequency,
      activeProfile?.config.scheduledRestartEnabled,
      activeProfile?.config.scheduledRestartTime,
      activeProfile?.config.restartAnnouncementMinutes,
      activeProfile?.config.bEnableRcon,
      handleManualUpdateCheck,
      onRestart
  ]);
  
  // Effect for scheduled restart warnings
  useEffect(() => {
    const RESTART_CHECK_INTERVAL = 30000; // 30 seconds
    const ONE_HOUR_MS = 60 * 60 * 1000;

    const intervalId = setInterval(() => {
      const profile = activeProfile; // use the state variable from render scope
      if (profile && profile.config.scheduledRestartEnabled && profile.config.scheduledRestartTime) {
        const [hours, minutes] = profile.config.scheduledRestartTime.split(':').map(Number);
        const now = new Date();
        const restartTime = new Date(now);
        restartTime.setHours(hours, minutes, 0, 0);

        let msUntilRestart = restartTime.getTime() - now.getTime();
        if (msUntilRestart < 0) {
          msUntilRestart += 24 * 60 * 60 * 1000; // It's for tomorrow
        }

        const notificationId = `restart-${profile.id}`;

        if (msUntilRestart > 0 && msUntilRestart < ONE_HOUR_MS) {
          setNotifications(prev => {
            if (prev.some(n => n.id === notificationId)) {
              return prev; // Already exists, do nothing
            }
            const minutesUntil = Math.round(msUntilRestart / 1000 / 60);
            return [...prev, {
              id: notificationId,
              type: 'restart',
              profileId: profile.id,
              profileName: profile.profileName,
              message: `Server "${profile.profileName}" will restart in ~${minutesUntil} minutes.`,
              read: false,
            }];
          });
        } else {
          setNotifications(prev => prev.filter(n => n.id !== notificationId));
        }
      }
    }, RESTART_CHECK_INTERVAL);

    return () => {
      clearInterval(intervalId);
      // Clean up notification when profile changes or component unmounts
      if (activeProfile) {
        setNotifications(prev => prev.filter(n => n.id !== `restart-${activeProfile.id}`));
      }
    };
  }, [activeProfile, setNotifications]);

   // Effect for polling server stats (uptime, memory)
  useEffect(() => {
    const fetchStats = async () => {
        const profileId = activeProfileIdRef.current;
        if (!profileId) return;

        try {
            const stats = await invoke<{ uptimeSeconds: number; memoryBytes: number; }>('get_server_stats', { profileId });
            updateProfile(profileId, {
                uptime: stats.uptimeSeconds,
                memoryUsage: stats.memoryBytes,
            });
        } catch (error) {
            console.error(`Failed to fetch stats for profile ${profileId}:`, error);
            updateProfile(profileId, { uptime: undefined, memoryUsage: undefined });
            if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
        }
    };
    
    if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
    }

    if (activeProfile?.status === ServerStatus.Running) {
        fetchStats(); // Fetch immediately
        statsIntervalRef.current = window.setInterval(fetchStats, 5000); // Poll every 5 seconds
    } else {
        if (activeProfile && (activeProfile.uptime || activeProfile.memoryUsage)) {
            updateProfile(activeProfile.id, { uptime: undefined, memoryUsage: undefined });
        }
    }

    return () => {
        if (statsIntervalRef.current) {
            clearInterval(statsIntervalRef.current);
        }
    };
  }, [activeProfile?.status, activeProfile?.id, updateProfile]);

  const handleListBackups = useCallback(async () => {
    if (!activeProfile?.path) return;
    setIsLoadingBackups(true);
    try {
        const result: BackupInfo[] = await invoke('list_backups', { installPath: activeProfile.path });
        setBackups(result);
    } catch (error) {
        console.error('Failed to list backups:', error);
        onShowToast(`Error fetching backups: ${error}`, 'error');
    } finally {
        setIsLoadingBackups(false);
    }
  }, [activeProfile?.path, onShowToast]);

  const handleCreateBackup = async () => {
    if (!activeProfile?.path) return;
    setIsCreatingBackup(true);
    try {
        await invoke('create_backup', { installPath: activeProfile.path });
        await handleListBackups();
        notificationService.sendNotification('Backup Created', `Successfully created a backup for "${activeProfile.profileName}".`);
        onShowToast('Backup created successfully!', 'success');
    } catch (error) {
        console.error('Failed to create backup:', error);
        onShowToast(`Error creating backup: ${error}`, 'error');
        notificationService.sendNotification('Backup Failed', `Failed to create a backup for "${activeProfile.profileName}".`);
    } finally {
        setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (!activeProfile?.path) return;
    const confirmed = await dialog.confirm(
        `Are you sure you want to restore the backup "${filename}"?\n\nThis will OVERWRITE your current server save files. This action cannot be undone.`,
        { title: 'Confirm Restore' }
    );
    if (confirmed) {
        try {
            await invoke('restore_backup', {
                installPath: activeProfile.path,
                backupFilename: filename,
            });
            onShowToast('Backup restored successfully!', 'success');
            notificationService.sendNotification('Backup Restored', `Restored backup "${filename}" for "${activeProfile.profileName}".`);
        } catch (error) {
            console.error('Failed to restore backup:', error);
            onShowToast(`Error restoring backup: ${error}`, 'error');
        }
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (!activeProfile?.path) return;
    const confirmed = await dialog.confirm(`Are you sure you want to delete the backup "${filename}"?`, {
        title: 'Confirm Deletion',
    });
    if (confirmed) {
        try {
            await invoke('delete_backup', {
                installPath: activeProfile.path,
                backupFilename: filename,
            });
            await handleListBackups();
            onShowToast('Backup deleted successfully.', 'success');
        } catch (error) {
            console.error('Failed to delete backup:', error);
            onShowToast(`Error deleting backup: ${error}`, 'error');
        }
    }
  };

  useEffect(() => {
    const fetchIps = async () => {
      try {
        const ips = await invoke<string[]>('get_local_ips');
        const uniqueIps = ['127.0.0.1', ...new Set(ips.filter(ip => ip !== '127.0.0.1'))];
        setLocalIps(uniqueIps);
      } catch (error) {
        console.error("Failed to fetch local IP addresses:", error);
        setLocalIps(['127.0.0.1']);
      }
    };
    fetchIps();

    const loadAndVerifyProfiles = async () => {
        try {
            let loadedProfiles = await directoryService.getProfiles();
            const changesDetectedProfiles: string[] = [];

            const verifiedProfiles = await Promise.all(loadedProfiles.map(async (profile, index) => {
                const defaultConfig = getDefaultServerConfig(index);
                let mergedConfig = { ...defaultConfig, ...profile.config };
                const isValid = await directoryService.verifyInstallation(profile.path);
                
                // --- NEW LOGIC: Check for external changes on load ---
                if (isValid && profile.path) {
                    try {
                        const diskConfig = await iniParsingService.parseIniFiles(profile.path);
                        if (diskConfig) {
                            const hasChanges = iniParsingService.areConfigsDifferent(mergedConfig, diskConfig);
                            if (hasChanges) {
                                mergedConfig = { ...mergedConfig, ...diskConfig };
                                changesDetectedProfiles.push(profile.profileName);
                                console.log(`[Dashboard] Profile '${profile.profileName}' updated with changes from disk.`);
                            }
                        }
                    } catch (err) {
                        console.error(`[Dashboard] Failed to parse INI for ${profile.profileName} on load:`, err);
                    }
                }
                // ----------------------------------------------------

                return {
                    ...profile,
                    config: mergedConfig,
                    status: isValid ? ServerStatus.Stopped : ServerStatus.Error,
                };
            }));

            // Notify user if changes were detected
            if (changesDetectedProfiles.length > 0) {
                const names = changesDetectedProfiles.join(', ');
                setNotifications(prev => [
                    ...prev, 
                    {
                        id: `ext-change-${Date.now()}`,
                        type: 'update',
                        profileId: verifiedProfiles[0].id, // Just link to first valid
                        profileName: 'System',
                        message: `External settings changes detected and applied for: ${names}`,
                        read: false
                    }
                ]);
            }
            
            // Check for updates logic (unchanged)
            const checkAllProfilesForUpdates = async (profilesToCheck: ServerProfile[]) => {
              const updateNotifications: AppNotification[] = [];
              const updatedProfilesWithBuilds = await Promise.all(profilesToCheck.map(async (profile) => {
                if (!profile.path) return profile;
                try {
                  const [currentBuild, latestBuild] = await Promise.all([
                    invoke<string>('get_server_build_info', { installPath: profile.path }),
                    invoke<string>('get_latest_server_build', { installPath: profile.path }),
                  ]);
                  if (currentBuild && latestBuild && currentBuild !== latestBuild) {
                    updateNotifications.push({
                      id: `update-${profile.id}`,
                      type: 'update',
                      profileId: profile.id,
                      profileName: profile.profileName,
                      message: `Update available for server "${profile.profileName}".`,
                      read: false,
                    });
                  }
                  return { ...profile, currentBuildId: currentBuild, latestBuildId: latestBuild };
                } catch (error) {
                  console.error(`Failed update check for ${profile.profileName}`, error);
                  return profile;
                }
              }));
              
              setProfiles(updatedProfilesWithBuilds);
              // Save the profiles back to DB because we might have updated configs from disk
              await directoryService.saveProfiles(updatedProfilesWithBuilds);

              setNotifications(prev => {
                const otherNotifications = prev.filter(n => n.type !== 'update' || n.id.startsWith('ext-change'));
                return [...otherNotifications, ...updateNotifications];
              });
            };

            if (verifiedProfiles.length > 0) {
                // Initial set before update checks finishes
                setProfiles(verifiedProfiles);
                setActiveProfileId(verifiedProfiles[0].id);
                checkAllProfilesForUpdates(verifiedProfiles);
            }
        } catch (error) {
            console.error("Error loading profiles:", error);
        }
    };
    loadAndVerifyProfiles();
  }, [setNotifications]);

  useEffect(() => {
    interface LogStatsPayload { profile_id: string; memoryMb: number; }

    let isMounted = true;
    const unlistenFunctions: Array<() => void> = [];

    const setupListeners = async () => {
        try {
            const promises = [
                listen<string>('update-log', (event) => setUpdateLog((prev: string[]) => [...prev, event.payload])),
                listen<{success: boolean}>('update-finished', async (event) => {
                    setIsUpdateFinished(true);
                    const currentActiveProfile = profilesRef.current.find(p => p.id === activeProfileIdRef.current);
                    if (currentActiveProfile) {
                        const newStatus = event.payload.success ? ServerStatus.Stopped : ServerStatus.Error;
                        updateProfile(currentActiveProfile.id, { status: newStatus });

                        if (event.payload.success) {
                            notificationService.sendNotification('Update Complete', `Server files for "${currentActiveProfile.profileName}" updated successfully.`);
                            discordService.sendDiscordNotification(currentActiveProfile, 'Update Complete', 'Server files have been updated successfully.', discordService.DiscordColors.BLUE);
                            setNotifications(prev => prev.filter(n => n.id !== `update-${currentActiveProfile.id}`));
                            try {
                                const newBuildId = await invoke<string>('get_server_build_info', { installPath: currentActiveProfile.path });
                                updateProfile(currentActiveProfile.id, { currentBuildId: newBuildId });
                            } catch (err) {
                                console.error("Failed to re-fetch build ID after update:", err);
                            }
                        } else {
                            notificationService.sendNotification('Update Failed', `Failed to update server files for "${currentActiveProfile.profileName}".`);
                            discordService.sendDiscordNotification(currentActiveProfile, 'Update Failed', 'Failed to update server files.', discordService.DiscordColors.RED);
                        }
                    }
                }),
                listen<{profile_id: string}>('server-running', (event) => {
                    const { profile_id } = event.payload;
                    const runningProfile = profilesRef.current.find(p => p.id === profile_id);
                    if (runningProfile) {
                        notificationService.sendNotification('Server Running', `Server "${runningProfile.profileName}" is now running.`);
                        discordService.sendDiscordNotification(runningProfile, 'Server Started', 'The server is now online.', discordService.DiscordColors.GREEN);
                    }
                    if (startupTimerRef.current) {
                        clearTimeout(startupTimerRef.current);
                        startupTimerRef.current = null;
                    }
                    updateProfile(profile_id, { status: ServerStatus.Running });
                }),
                listen<{profile_id: string, exit_code?: number}>('server-stopped', (event) => {
                    const { profile_id } = event.payload;
                    const stoppedProfile = profilesRef.current.find(p => p.id === profile_id);

                    if (startupTimerRef.current) {
                        clearTimeout(startupTimerRef.current);
                        startupTimerRef.current = null;
                    }
                    
                    setPlayerList([]);

                    const latestProfile = profilesRef.current.find(p => p.id === profile_id);
                    if (latestProfile && latestProfile.status === ServerStatus.Restarting) {
                        onStart(); 
                    } else {
                        if (stoppedProfile) {
                            notificationService.sendNotification('Server Stopped', `Server "${stoppedProfile.profileName}" has stopped.`);
                            discordService.sendDiscordNotification(stoppedProfile, 'Server Stopped', 'The server has stopped.', discordService.DiscordColors.RED);
                        }
                        updateProfile(profile_id, { status: ServerStatus.Stopped });
                    }
                }),
                listen<string>('map-update-log', (event) => setMapUpdateLog((prev: string[]) => [...prev, event.payload])),
                listen('map-update-finished', () => setIsMapUpdateFinished(true)),
                listen<string>('mod-update-log', (event) => setModUpdateLog((prev: string[]) => [...prev, event.payload])),
                listen('mod-update-finished', () => setIsModUpdateFinished(true)),
                listen<{profile_id: string; line: string}>('manager-log-line', (event) => {
                    if (event.payload.profile_id === activeProfileIdRef.current) {
                        setManagerLog((prev: string[]) => [...prev, event.payload.line]);
                    }
                }),
                listen<{profile_id: string; line: string}>('server-log-line', (event) => {
                    if (event.payload.profile_id === activeProfileIdRef.current) {
                        setServerLog((prev: string[]) => [...prev, event.payload.line]);
                    }
                }),
                listen<LogStatsPayload>('log-stats-update', (event) => {
                    const { profile_id, memoryMb } = event.payload;
                    if (profile_id === activeProfileIdRef.current) {
                        updateProfile(profile_id, { memoryUsage: memoryMb * 1024 * 1024 });
                    }
                }),
                listen<PlayerEventPayload>('player-joined', (event) => {
                    const { profileId, playerName, playerId } = event.payload;
                    if (profileId === activeProfileIdRef.current) {
                        setPlayerList(prev => {
                            if (prev.some(p => p.steamId === playerId)) return prev;
                            return [...prev, { name: playerName, steamId: playerId, playTime: 0 }];
                        });
                    }
                }),
                listen<PlayerEventPayload>('player-left', (event) => {
                    const { profileId, playerId } = event.payload;
                    if (profileId === activeProfileIdRef.current) {
                        setPlayerList(prev => prev.filter(p => p.steamId !== playerId));
                    }
                }),
            ];

            const resolvedUnlisteners = await Promise.all(promises);
            if (isMounted) {
                unlistenFunctions.push(...resolvedUnlisteners);
            } else {
                resolvedUnlisteners.forEach(unlisten => unlisten());
            }
        } catch (error) {
            console.error("Failed to set up Tauri event listeners:", error);
        }
    };

    setupListeners();

    return () => {
        isMounted = false;
        unlistenFunctions.forEach(unlisten => unlisten());
        if (startupTimerRef.current) {
            clearTimeout(startupTimerRef.current);
        }
    };
}, [onStart, updateProfile, setNotifications]);
  
  useEffect(() => {
    setActiveTab('config');
    setManagerLog([]);
    setServerLog([]);
    setPlayerList([]);
    if (activeProfile?.path) {
        handleListBackups();
    } else {
        setBackups([]); // Clear backups if profile has no path
    }
  }, [activeProfileId, handleListBackups]);

  const handleUpdateProfileName = (id: string, newName: string) => {
    setProfiles(prevProfiles => {
        const newProfiles = prevProfiles.map(p => p.id === id ? { ...p, profileName: newName } : p);
        directoryService.saveProfiles(newProfiles);
        return newProfiles;
    });
  };

  const handleDeleteProfile = async (id: string) => {
    const profileToDelete = profiles.find(p => p.id === id);
    if (!profileToDelete) return;

    if ([ServerStatus.Running, ServerStatus.Starting, ServerStatus.Stopping, ServerStatus.Updating].includes(profileToDelete.status)) {
        await dialog.message('Cannot delete a profile while the server is running or updating. Please stop the server first.', {
            title: 'Action Prohibited',
        });
        return;
    }

    setProfileToDelete({ id: profileToDelete.id, name: profileToDelete.profileName });
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteProfile = () => {
    if (profileToDelete) {
        const newProfiles = profiles.filter(p => p.id !== profileToDelete.id);
        setProfiles(newProfiles);
        directoryService.saveProfiles(newProfiles);

        if (activeProfileId === profileToDelete.id) {
            setActiveProfileId(newProfiles.length > 0 ? newProfiles[0].id : null);
        }
        onShowToast(`Profile "${profileToDelete.name}" deleted.`, 'success');
    }
    setIsDeleteModalOpen(false);
    setProfileToDelete(null);
  };

  const cancelDeleteProfile = () => {
      setIsDeleteModalOpen(false);
      setProfileToDelete(null);
  };

  const handleConfigChange = useCallback((newConfig: Partial<ServerConfig>) => {
    if (!activeProfile) return;
    
    const updatedConfig = { ...activeProfile.config, ...newConfig };
    const profileUpdates: Partial<ServerProfile> = { config: updatedConfig };

    if ('mods' in newConfig && newConfig.mods !== activeProfile.config.mods) {
        const newModIds = new Set(newConfig.mods?.split(',').map(id => id.trim()).filter(Boolean) || []);
        const existingAnalysis = activeProfile.modAnalysis;

        if (existingAnalysis) {
            const updatedAnalyses = existingAnalysis.modAnalyses.filter(analysis => newModIds.has(analysis.id));
            profileUpdates.modAnalysis = { ...existingAnalysis, modAnalyses: updatedAnalyses };
        }
    }

    updateProfile(activeProfile.id, profileUpdates);
  }, [activeProfile, updateProfile]);

  const handleAddModFromSearch = (mod: CurseForgeMod) => {
    if (!activeProfile) return;

    const modIdStr = String(mod.id);
    const currentModIds = new Set(activeProfile.config.mods.split(',').map(id => id.trim()).filter(Boolean));

    if (currentModIds.has(modIdStr)) return;

    const newMods = activeProfile.config.mods.trim() 
        ? `${activeProfile.config.mods.trim()},${modIdStr}` 
        : modIdStr;
    
    const newAnalysisEntry: ModAnalysis = {
        id: modIdStr,
        name: mod.name,
        summary: mod.summary,
    };

    const currentAnalysis = activeProfile.modAnalysis;
    const newAnalysisResult: ModAnalysisResult = {
        overallSummary: currentAnalysis?.overallSummary || "Mod details populated from CurseForge search.",
        potentialConflicts: currentAnalysis?.potentialConflicts || [],
        modAnalyses: [...(currentAnalysis?.modAnalyses || []), newAnalysisEntry],
    };
    
    updateProfile(activeProfile.id, {
        config: { ...activeProfile.config, mods: newMods },
        modAnalysis: newAnalysisResult,
    });
  };

  const checkForExistingConfig = useCallback(async (path: string) => {
    try {
        const foundConfig = await iniParsingService.parseIniFiles(path);
        if (foundConfig) {
            console.log("Found existing config:", foundConfig);
            setDetectedConfig(foundConfig);
            setIsImportModalOpen(true);
            return true;
        }
    } catch (error) {
        console.error("Error checking for existing config:", error);
    }
    return false;
  }, []);

  const handlePathChange = useCallback((newPath: string) => {
    if (!activeProfile) return;
    const oldPath = activeProfile.path;
    updateProfile(activeProfile.id, { path: newPath });
    if (newPath && newPath !== oldPath) {
        checkForExistingConfig(newPath);
    }
  }, [activeProfile, updateProfile, checkForExistingConfig]);

  const handleBrowsePath = async () => {
      if (!activeProfile) return;
      const oldPath = activeProfile.path;
      const selected = await dialog.open({
          directory: true,
          title: 'Select Server Installation Directory',
          defaultPath: activeProfile.path || undefined
      });
      if (typeof selected === 'string' && selected !== oldPath) {
          updateProfile(activeProfile.id, { path: selected });
          checkForExistingConfig(selected);
      }
  };

  const handleSaveConfig = async () => {
      const activeProf = profilesRef.current.find(p => p.id === activeProfileIdRef.current);

      if (!activeProf || !activeProf.path) return;
      setIsSaving(true);
      try {
          const configPath = await join(activeProf.path, 'ShooterGame', 'Saved', 'Config', 'WindowsServer');
          await fs.mkdir(configPath, { recursive: true });

          const { config } = activeProf;

          const gusIniContent = [
              `[ServerSettings]`,
              `SessionName=${config.sessionName}`,
              `ServerPassword=${config.serverPassword || ''}`,
              `ServerAdminPassword=${config.adminPassword}`,
              `RCONEnabled=${config.bEnableRcon}`,
              `RCONPort=${config.rconPort}`,
              `RCONServerAdminPassword=${config.rconPassword || ''}`,
              `ServerPVE=${config.bServerPVE}`,
              `ServerCrosshair=${config.bServerCrosshair}`,
              `ShowMapPlayerLocation=${config.bShowMapPlayerLocation}`,
              `EnablePvPGamma=${false}`, // Hardcoded for now
              `DisablePvEGamma=${false}`, // Hardcoded for now
              `AllowThirdPersonPlayer=${config.bAllowThirdPersonPlayer}`,
              `AlwaysAllowStructurePickup=${config.bAlwaysAllowStructurePickup}`,
              `DifficultyOffset=${config.difficultyOffset.toFixed(6)}`,
              `XPMultiplier=${config.xpMultiplier.toFixed(6)}`,
              `TamingSpeedMultiplier=${config.tamingSpeedMultiplier.toFixed(6)}`,
              `HarvestAmountMultiplier=${config.harvestAmountMultiplier.toFixed(6)}`,
              `HarvestHealthMultiplier=${config.harvestHealthMultiplier.toFixed(6)}`,
              `MatingIntervalMultiplier=${config.matingIntervalMultiplier.toFixed(6)}`,
              `EggHatchSpeedMultiplier=${config.eggHatchSpeedMultiplier.toFixed(6)}`,
              `BabyMatureSpeedMultiplier=${config.babyMatureSpeedMultiplier.toFixed(6)}`,
              `PlayerCharacterWaterDrainMultiplier=${config.playerCharacterWaterDrainMultiplier.toFixed(6)}`,
              `PlayerCharacterFoodDrainMultiplier=${config.playerCharacterFoodDrainMultiplier.toFixed(6)}`,
              `DinoCharacterFoodDrainMultiplier=${config.dinoCharacterFoodDrainMultiplier.toFixed(6)}`,
              `DinoCharacterStaminaDrainMultiplier=${config.dinoCharacterStaminaDrainMultiplier.toFixed(6)}`,
              `DinoCharacterHealthRecoveryMultiplier=${config.dinoCharacterHealthRecoveryMultiplier.toFixed(6)}`,
              `TamedDinoDamageMultiplier=${config.tamedDinoDamageMultiplier.toFixed(6)}`,
              `TamedDinoResistanceMultiplier=${config.tamedDinoResistanceMultiplier.toFixed(6)}`,
              `NightTimeSpeedScale=${config.nightTimeSpeedScale.toFixed(6)}`,
              `AutoSavePeriodMinutes=${config.autoSavePeriodMinutes.toFixed(6)}`,
              `ItemSpoilingTimeMultiplier=${config.itemSpoilingTimeMultiplier.toFixed(6)}`,
              `FuelConsumptionIntervalMultiplier=${config.fuelConsumptionIntervalMultiplier.toFixed(6)}`,
              `AllowAnyoneBabyImprintCuddle=${config.bAllowAnyoneBabyImprintCuddle}`,
              `AllowCaveBuildingPvE=${config.bAllowCaveBuildingPvE}`,
              `AllowFlyingStaminaRecovery=${config.bAllowFlyingStaminaRecovery}`,
              `DisableImprintDinoBuff=${config.bDisableImprintDinoBuff}`,
              `globalVoiceChat=${config.bGlobalVoiceChat}`,
              `ProximityChat=${config.bProximityChat}`,
              `noTributeDownloads=${config.bNoTributeDownloads}`,
              `PreventDownloadSurvivors=${config.bPreventDownloadSurvivors}`,
              `PreventDownloadItems=${config.bPreventDownloadItems}`,
              `PreventDownloadDinos=${config.bPreventDownloadDinos}`,
              `ActiveMods=${config.mods}`,
              ``,
              `[MultiHome]`,
              `MultiHome=${config.rconIp || '0.0.0.0'}`,
              ``,
              `[/Script/Engine.GameSession]`,
              `MaxPlayers=${config.maxPlayers}`,
              ``,
              `[/Script/ShooterGame.ShooterGameUserSettings]`,
              `bAllowThirdPersonPlayer=${config.bAllowThirdPersonPlayer}`,
              `bShowFloatingDamageText=${config.bShowFloatingDamageText}`,
              `bAllowFlyerCarryPvE=${config.bAllowFlyerCarryPvE}`,
              `bDisableStructurePlacementCollision=${config.bDisableStructurePlacementCollision}`,
          ].join('\n');
          await fs.writeFile(await join(configPath, 'GameUserSettings.ini'), new TextEncoder().encode(gusIniContent));

          const gameIniContent = [
              `[/script/shootergame.shootergamemode]`,
              `bDisableFriendlyFire=${config.bDisableFriendlyFire}`
          ].join('\n');
          await fs.writeFile(await join(configPath, 'Game.ini'), new TextEncoder().encode(gameIniContent));

          onShowToast("Settings saved successfully!", 'success');
      } catch (error) {
          console.error("Failed to save settings:", error);
          onShowToast('Error saving settings. See console for details.', 'error');
      }
      setIsSaving(false);
  };
  
  const onUpdateMap = useCallback(async () => {
    if (!activeProfile || !activeProfile.path) return;
    setIsUpdatingMap(true);
    setIsMapUpdateFinished(false);
    setMapUpdateLog(['Initializing map update...']);
    try {
      await invoke('update_map', {
        installPath: activeProfile.path,
        mapId: activeProfile.config.map,
      });
    } catch (error: any) {
      setMapUpdateLog(prev => [...prev, `❌ ERROR: Failed to start map update process: ${error}`]);
      setIsMapUpdateFinished(true);
    }
  }, [activeProfile]);

  const onUpdateMods = useCallback(async () => {
    if (!activeProfile || !activeProfile.path) return;
    setIsUpdatingMods(true);
    setIsModUpdateFinished(false);
    setModUpdateLog(['Initializing mod update...']);

    try {
        await invoke('update_mods', {
            installPath: activeProfile.path,
            modIds: activeProfile.config.mods
        });
    } catch (error: any) {
        setModUpdateLog(prev => [...prev, `❌ ERROR: Failed to start mod update process: ${error}`]);
        setIsModUpdateFinished(true);
    }
  }, [activeProfile]);

  const onCreateProfile = () => {
    const newProfile: ServerProfile = {
      id: Date.now().toString(),
      profileName: `Server Profile ${profiles.length + 1}`,
      path: null,
      status: ServerStatus.NotInstalled,
      config: getDefaultServerConfig(profiles.length),
    };
    const newProfiles = [...profiles, newProfile];
    setProfiles(newProfiles);
    setActiveProfileId(newProfile.id);
    setIsInstalling(true);
    setInstallProgress(0);
    setInstallLog([]);
  };

  const handleInstall = async () => {
    if (!activeProfile) return;
    const log = (message: string) => setInstallLog((prev: string[]) => [...prev, message]);
    
    try {
        const selectedPath = await dialog.open({ 
            directory: true, 
            title: 'Select Server Installation Directory',
            defaultPath: appSettings.defaultServerPath || undefined,
        }) as string;
        if (!selectedPath) {
            log("❌ Installation cancelled by user.");
            setTimeout(() => {
                const newProfiles = profiles.filter(p => p.id !== activeProfile.id);
                setProfiles(newProfiles);
                setActiveProfileId(profiles[0]?.id || null);
                setIsInstalling(false);
            }, 2000);
            return;
        }
        
        log(`✅ Directory selected: '${selectedPath}'`);
        await fs.mkdir(await join(selectedPath, 'ShooterGame', 'Saved', 'Config', 'WindowsServer'), { recursive: true });
        
        const updatedProfile = { ...activeProfile, path: selectedPath, status: ServerStatus.Stopped };
        const newProfiles = profiles.map(p => p.id === activeProfile.id ? updatedProfile : p);
        
        // This is a critical step: update state *before* checking for config,
        // so the activeProfile reference is correct when the modal opens.
        setProfiles(newProfiles);
        await directoryService.saveProfiles(newProfiles);

        const foundConfig = await checkForExistingConfig(selectedPath);
        
        if (!foundConfig) {
          // If no config is found, the modal won't open, so we finish the installation process here.
          log("✅ Installation successful! You can now update the server files and mods.");
          setTimeout(() => setIsInstalling(false), 4000);
        }
        // If config *is* found, the modal will open, and its onClose handler will finish the installation UI.


    } catch (error: any) {
        log(`❌ ERROR: Installation failed. ${String(error)}`);
        const newProfiles = profiles.filter(p => p.id !== activeProfile.id);
        setProfiles(newProfiles);
        setActiveProfileId(profiles[0]?.id || null);
        setTimeout(() => setIsInstalling(false), 5000);
    }
  };
  
    const handleKickPlayer = async (steamId: string) => {
        await handleSendCommand(`KickPlayer ${steamId}`);
    };
    
    const handleBanPlayer = async (steamId: string) => {
        await handleSendCommand(`BanPlayer ${steamId}`);
    };

    const handleDiagnoseRcon = async () => {
        if (!activeProfile) return;
        setIsDiagnosingRcon(true);
        setActiveTab('console');
        setManagerLog(prev => [...prev, "[Manager] Starting RCON diagnostics..."]);

        const unlisteners: (() => void)[] = [];
        let safetyTimeout: number;

        const cleanup = () => {
            unlisteners.forEach(u => u());
            clearTimeout(safetyTimeout);
        };

        const unlistenStep = await listen<RconDiagnosticStep>('rcon-diag-step', (event) => {
            const step = event.payload;
            const icon = step.status.toLowerCase() === 'success' ? '✅' : '❌';
            setManagerLog(prev => [...prev, `[RCON Diag] ${icon} ${step.name}: ${step.details}`]);
        });
        unlisteners.push(unlistenStep);

        const unlistenFinished = await listen('rcon-diag-finished', () => {
            setManagerLog(prev => [...prev, "[Manager] RCON diagnostics finished."]);
            setIsDiagnosingRcon(false);
            cleanup();
        });
        unlisteners.push(unlistenFinished);
        
        safetyTimeout = window.setTimeout(() => {
            setManagerLog(prev => [...prev, "[Manager] ❌ RCON diagnostics timed out. The backend might be unresponsive."]);
            setIsDiagnosingRcon(false);
            cleanup();
        }, 20000); // 10s safety net

        try {
            const { rconPort, rconPassword, rconIp, adminPassword } = activeProfile.config;
            
            // FIX: Use adminPassword as fallback if rconPassword is empty or not set
            const passwordToUse = (rconPassword && rconPassword.trim()) ? rconPassword : adminPassword;
            
            await invoke('diagnose_rcon', {
                rconIp: rconIp,
                rconPort,
                rconPassword: passwordToUse,
            });
        } catch (error: any) {
            console.error(`RCON diagnosis failed to invoke: ${error}`);
            setManagerLog(prev => [...prev, `[Manager] ❌ RCON diagnostics failed to run: ${error}`]);
            setIsDiagnosingRcon(false);
            cleanup();
        }
    };

  const isActionInProgress = status === ServerStatus.Stopping || status === ServerStatus.Updating || status === ServerStatus.Verifying || status === ServerStatus.Restarting || isUpdatingMods || isUpdatingMap || isDiagnosingRcon;

  return (
    <div className="h-full flex flex-col">
      {/* Modals are kept in the render tree and controlled by their isOpen props */}
      <ImportSettingsModal
        isOpen={isImportModalOpen}
        detectedConfig={detectedConfig}
        onImport={() => {
            if (activeProfile && detectedConfig) {
                handleConfigChange(detectedConfig);
                notificationService.sendNotification('Settings Imported', `Successfully imported settings for "${activeProfile.profileName}".`);
            }
        }}
        onClose={(imported) => {
            setIsImportModalOpen(false);
            setDetectedConfig(null);
            if (isInstalling) {
                const message = imported
                    ? "✅ Settings imported successfully! Profile setup complete."
                    : "✅ Profile created successfully! Using default settings.";
                setInstallLog((prev: string[]) => [...prev, message]);
                setTimeout(() => setIsInstalling(false), 4000);
            }
        }}
      />
      <ShutdownModal
        isOpen={isShutdownModalOpen}
        onClose={() => setIsShutdownModalOpen(false)}
        onConfirm={handleInitiateTimedShutdown}
        type="shutdown"
      />
      <ShutdownModal
        isOpen={isRestartModalOpen}
        onClose={() => setIsRestartModalOpen(false)}
        onConfirm={handleInitiateTimedRestart}
        type="restart"
      />
      <UnsavedChangesModal
        isOpen={isUnsavedChangesModalOpen}
        onSave={handleUnsavedChangesConfirm}
        onDiscard={handleUnsavedChangesDiscard}
        onCancel={handleUnsavedChangesCancel}
      />
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        profileName={profileToDelete?.name || ''}
        onConfirm={confirmDeleteProfile}
        onCancel={cancelDeleteProfile}
      />

      {status === ServerStatus.Updating && (
          <UpdateProgressModal 
            log={updateLog} 
            isFinished={isUpdateFinished}
            onClose={() => updateProfile(activeProfileId!, { status: ServerStatus.Stopped })}
          />
        )
      }
      {isUpdatingMap && (
        <MapUpdateProgressModal
          log={mapUpdateLog}
          isFinished={isMapUpdateFinished}
          onClose={() => setIsUpdatingMap(false)}
        />
      )}
      {isUpdatingMods && (
          <ModUpdateProgressModal 
            log={modUpdateLog}
            isFinished={isModUpdateFinished}
            onClose={() => setIsUpdatingMods(false)}
          />
      )}

      {/* Main Layout Logic */}
      {isInstalling ? (
        <div className="flex-grow flex items-center justify-center p-8 overflow-y-auto custom-scrollbar">
            <InstallProgress progress={installProgress} log={installLog} onStartInstall={handleInstall} />
        </div>
      ) : profiles.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center p-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">Welcome to Ark Server Manager</h2>
            <p className="text-gray-400 mb-8">It looks like you don't have any server profiles yet. Let's create one!</p>
            <button
                onClick={onCreateProfile}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-md transition-colors duration-200 shadow-lg text-lg"
            >
                Create Your First Server Profile
            </button>
        </div>
      ) : (
        <>
          {/* Fixed Top Section: Profiles, Controls, Tabs */}
          <div className="flex-shrink-0 z-20 bg-gray-900/50 backdrop-blur-sm border-b border-gray-800/50 shadow-sm">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-0 space-y-6">
                <ProfileManager 
                    profiles={profiles}
                    activeProfileId={activeProfileId}
                    onSelectProfile={setActiveProfileId}
                    onCreateProfile={onCreateProfile}
                    onUpdateProfileName={handleUpdateProfileName}
                    onDeleteProfile={handleDeleteProfile}
                    isActionInProgress={isActionInProgress}
                />

                {activeProfile && (
                    <>
                        <ServerControls 
                            profile={activeProfile}
                            onStart={onStart} 
                            onStop={onStop} 
                            onRestart={() => onRestart(false)}
                            onUpdate={onUpdate}
                            onInstall={() => {}}
                            onOpenTimedShutdown={() => setIsShutdownModalOpen(true)}
                            onCancelTimedShutdown={handleCancelTimedShutdown}
                            activeShutdownEndTime={activeShutdownEndTime}
                            onOpenTimedRestart={() => setIsRestartModalOpen(true)}
                            onCancelTimedRestart={handleCancelTimedRestart}
                            activeRestartEndTime={activeRestartEndTime}
                            isActionInProgress={isActionInProgress}
                        />
                        
                        <div className="border-b border-gray-700">
                            <nav className="-mb-px flex space-x-6 overflow-x-auto custom-scrollbar" aria-label="Tabs">
                                <button
                                    onClick={() => setActiveTab('config')}
                                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === 'config'
                                        ? 'border-cyan-500 text-cyan-400'
                                        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
                                    }`}
                                >
                                    Server Configuration
                                </button>
                                <button
                                    onClick={() => setActiveTab('mods')}
                                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === 'mods'
                                        ? 'border-cyan-500 text-cyan-400'
                                        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
                                    }`}
                                >
                                    Mod Manager
                                </button>
                                <button
                                    onClick={() => setActiveTab('gameSettings')}
                                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === 'gameSettings'
                                        ? 'border-cyan-500 text-cyan-400'
                                        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
                                    }`}
                                >
                                    Game Settings
                                </button>
                                <button
                                    onClick={() => setActiveTab('clustering')}
                                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === 'clustering'
                                        ? 'border-cyan-500 text-cyan-400'
                                        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
                                    }`}
                                >
                                    Clustering
                                </button>
                                <button
                                    onClick={() => setActiveTab('backups')}
                                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === 'backups'
                                        ? 'border-cyan-500 text-cyan-400'
                                        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
                                    }`}
                                >
                                    Backups
                                </button>
                                <button
                                    onClick={() => setActiveTab('serverManagement')}
                                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === 'serverManagement'
                                        ? 'border-cyan-500 text-cyan-400'
                                        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
                                    }`}
                                >
                                    Server Management
                                </button>
                                <button
                                    onClick={() => setActiveTab('playerManagement')}
                                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === 'playerManagement'
                                        ? 'border-cyan-500 text-cyan-400'
                                        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
                                    }`}
                                >
                                    Player Management
                                </button>
                                <button
                                    onClick={() => setActiveTab('console')}
                                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === 'console'
                                        ? 'border-cyan-500 text-cyan-400'
                                        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
                                    }`}
                                >
                                    Console
                                </button>
                            </nav>
                        </div>
                    </>
                )}
            </div>
          </div>
          
          {/* Scrollable Content Section */}
          <div className={`flex-grow relative ${activeTab === 'console' ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'}`}>
            <div className={`container mx-auto px-4 sm:px-6 lg:px-8 h-full ${activeTab === 'console' ? 'py-0' : 'py-6'}`}>
              {activeProfile && (
                <div key={activeTab} className="animate-fade-in h-full">
                  {activeTab === 'config' && (
                      <div className="max-w-3xl mx-auto">
                          <ServerConfigComponent
                              config={activeProfile.config}
                              path={activeProfile.path}
                              profiles={profiles}
                              onConfigChange={handleConfigChange}
                              onPathChange={handlePathChange}
                              onBrowsePath={handleBrowsePath}
                              onSave={handleSaveConfig}
                              isActionInProgress={isActionInProgress}
                              isSaving={isSaving}
                              localIps={localIps}
                          />
                      </div>
                  )}
                  {activeTab === 'mods' && (
                      <ModManager 
                          mods={activeProfile.config.mods} 
                          onModsChange={(mods) => handleConfigChange({ mods })}
                          onAddMod={handleAddModFromSearch}
                          isActionInProgress={isActionInProgress}
                          analysisResult={activeProfile.modAnalysis || null}
                          setAnalysisResult={(result) => updateProfile(activeProfile.id, { modAnalysis: result })}
                          isAnalyzing={isAnalyzingMods}
                          setIsAnalyzing={setIsAnalyzingMods}
                          onUpdateMods={onUpdateMods}
                          isUpdatingMods={isUpdatingMods}
                      />
                  )}
                  {activeTab === 'gameSettings' && (
                      <GameSettings
                        config={activeProfile.config}
                        onConfigChange={handleConfigChange}
                        isActionInProgress={isActionInProgress}
                      />
                  )}
                  {activeTab === 'clustering' && (
                      <ClusterVisualization 
                        profiles={profiles}
                        onSelectProfile={setActiveProfileId}
                      />
                  )}
                  {activeTab === 'backups' && (
                      <BackupManager
                        backups={backups}
                        onCreateBackup={handleCreateBackup}
                        onRestoreBackup={handleRestoreBackup}
                        onDeleteBackup={handleDeleteBackup}
                        isActionInProgress={isActionInProgress}
                        isLoading={isLoadingBackups}
                        isCreating={isCreatingBackup}
                      />
                  )}
                  {activeTab === 'serverManagement' && (
                      <ServerManagement
                          profile={activeProfile}
                          onConfigChange={handleConfigChange}
                          onManualCheck={handleManualUpdateCheck}
                          isCheckingForUpdate={isCheckingForUpdate}
                          isActionInProgress={isActionInProgress}
                      />
                  )}
                   {activeTab === 'playerManagement' && (
                      <PlayerManagement
                        profile={activeProfile}
                        players={playerList}
                        isLoading={false}
                        onKickPlayer={handleKickPlayer}
                        onBanPlayer={handleBanPlayer}
                        onDiagnoseRcon={handleDiagnoseRcon}
                        isDiagnosingRcon={isDiagnosingRcon}
                      />
                  )}
                  {activeTab === 'console' && (
                      <Console
                          profile={activeProfile}
                          managerLog={managerLog}
                          serverLog={serverLog}
                          onSendCommand={handleSendCommand}
                          isActionInProgress={isActionInProgress}
                      />
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;