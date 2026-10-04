import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ServerStatus, ServerConfig, ModAnalysisResult, ServerProfile, BackupInfo, ModAnalysis, CurseForgeMod, AppSettings, AppNotification, PlayerInfo, RconDiagnosticStep, PlayerEventPayload, AnalyticsDataPoint } from '../types';
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
import AnalyticsDashboard from './AnalyticsDashboard';
import { ServerStartErrorModal } from './ServerStartErrorModal';
import * as dialog from '@tauri-apps/plugin-dialog';
import * as fs from '@tauri-apps/plugin-fs';
import { join, resolve } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface DashboardProps {
  appSettings: AppSettings;
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  profileToSelect: string | null;
  onUpdateAppSettings: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

const getDefaultServerConfig = (profileCount: number, defaultRconIp: string = '127.0.0.1'): ServerConfig => ({
    sessionName: `My Ark Server ${profileCount + 1}`,
    map: ARK_MAPS[0],
    maxPlayers: 20,
    mods: '',
    adminPassword: 'adminpassword',
    serverPassword: '',
    queryPort: 27015,
    gamePort: 7777,
    rconIp: defaultRconIp,
    rconPort: 27020,
    bEnableRcon: false,
    bDisableBattleEye: true,
    serverPlatform: 'All',
    rconPassword: '',

    // Game & General Multipliers (GameUserSettings.ini [ServerSettings])
    xpMultiplier: 1.0,
    tamingSpeedMultiplier: 1.0,
    harvestAmountMultiplier: 1.0,
    difficultyOffset: 1.0,
    overrideOfficialDifficulty: 5.0,
    dayTimeSpeedScale: 1.0,
    nightTimeSpeedScale: 1.0,
    autoSavePeriodMinutes: 15.0,

    // General Rates & XP Multipliers (Game.ini)
    harvestHealthMultiplier: 1.0,
    killXPMultiplier: 1.0,
    harvestXPMultiplier: 1.0,
    craftXPMultiplier: 1.0,
    genericXPMultiplier: 1.0,
    specialXPMultiplier: 1.0,

    // Breeding & Maturation (Game.ini)
    matingIntervalMultiplier: 1.0,
    matingSpeedMultiplier: 1.0,
    eggHatchSpeedMultiplier: 1.0,
    babyMatureSpeedMultiplier: 1.0,
    babyFoodConsumptionSpeedMultiplier: 1.0,
    babyCuddleIntervalMultiplier: 1.0,
    babyCuddleGracePeriodMultiplier: 1.0,
    babyCuddleLoseImprintQualitySpeedMultiplier: 1.0,
    babyImprintingStatScaleMultiplier: 1.0,
    bAllowAnyoneBabyImprintCuddle: false,
    bDisableImprintDinoBuff: false,

    // Player Settings
    bServerPVE: true,
    bAllowThirdPersonPlayer: true,
    bShowFloatingDamageText: true,
    bServerCrosshair: true,
    bShowMapPlayerLocation: true,
    bGlobalVoiceChat: true,
    bProximityChat: false,
    playerCharacterWaterDrainMultiplier: 1.0,
    playerCharacterFoodDrainMultiplier: 1.0,
    playerCharacterStaminaDrainMultiplier: 1.0,
    playerCharacterHealthRecoveryMultiplier: 1.0,
    bAllowSpeedLeveling: true,
    bUseCorpseLocator: true,
    bAllowUnlimitedRespecs: true,
    bAutoUnlockAllEngrams: false,

    // Dino Settings
    bAllowFlyerCarryPvE: false,
    bAllowFlyingStaminaRecovery: true,
    bAllowFlyerSpeedLeveling: false,
    bForceAllowCaveFlyers: true,
    bForceCanRideFliers: false,
    dinoCharacterFoodDrainMultiplier: 1.0,
    dinoCharacterStaminaDrainMultiplier: 1.0,
    dinoCharacterHealthRecoveryMultiplier: 1.0,
    tamedDinoDamageMultiplier: 1.0,
    tamedDinoResistanceMultiplier: 1.0,
    layEggIntervalMultiplier: 1.0,
    poopIntervalMultiplier: 1.0,

    // World, Spoil & Decomposition
    itemSpoilingTimeMultiplier: 1.0,
    fuelConsumptionIntervalMultiplier: 1.0,
    itemDecompositionTimeMultiplier: 1.0,
    corpseDecompositionTimeMultiplier: 1.0,
    cropGrowthSpeedMultiplier: 1.0,
    cropDecaySpeedMultiplier: 1.0,

    // Structures & Building
    bDisableStructurePlacementCollision: false,
    bAllowCaveBuildingPvE: true,
    bPvEAllowStructuresAtSupplyDrops: false,
    bAlwaysAllowStructurePickup: false,
    structurePickupTimeAfterPlacement: 30.0,
    bDisableStructureDecayPvE: false,
    bDisableDinoDecayPvE: false,
    bDisableFriendlyFire: false,
    bPvEDisableFriendlyFire: false,
    bPassiveDefensesDamageRiderlessImprintedDino: true,
    maxNumberOfPlayersInTribe: 0,

    // Tributes & Transfers
    bNoTributeDownloads: false,
    bPreventDownloadSurvivors: false,
    bPreventDownloadItems: false,
    bPreventDownloadDinos: false,

    // Custom INI Lines & Dino Spawn Entries
    npcSpawnEntries: [],
    customGameIni: '',
    customGameUserSettingsIni: '',
    customCommandLineArgs: '',

    // CPU Affinity & Process Optimization
    bEnableCpuAffinity: false,
    cpuAffinityCores: [],
    cpuAffinityMask: '',

    // Automation
    launchOnAppStart: false,
    autoUpdateEnabled: false,
    autoUpdateFrequency: 60,
    autoInstallUpdates: false,
    autoUpdateWaitForRestart: false,
    scheduledRestartEnabled: false,
    scheduledRestartTime: '04:00',
    scheduledRestartReason: '',
    updateOnRestart: true,
    wipeWildDinosOnRestart: false,
    saveWorldOnStopRestart: true,
    restartAnnouncementMinutes: 10,

    // Clustering
    bEnableClustering: false,
    clusterId: 'MyCluster123',
    clusterDirOverride: '',

    // Discord Integration
    discordWebhookUrl: '',
    discordNotificationsEnabled: false,
    discordBotToken: '',
    discordBotEnabled: false,
    discordBotChannelId: '',
});

const Dashboard: React.FC<DashboardProps> = ({ appSettings, setNotifications, profileToSelect, onUpdateAppSettings, onShowToast }) => {
  const [profiles, setProfiles] = useState<ServerProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'mods' | 'gameSettings' | 'clustering' | 'analytics' | 'backups' | 'serverManagement' | 'playerManagement' | 'console'>('config');
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
  
  const [playerListsByProfile, setPlayerListsByProfile] = useState<Record<string, PlayerInfo[]>>({});
  const playerListsByProfileRef = useRef<Record<string, PlayerInfo[]>>({});
  playerListsByProfileRef.current = playerListsByProfile;
  const playerList = useMemo(() => (activeProfileId ? playerListsByProfile[activeProfileId] || [] : []), [playerListsByProfile, activeProfileId]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isShutdownModalOpen, setIsShutdownModalOpen] = useState(false);
  const [activeShutdownEndTime, setActiveShutdownEndTime] = useState<number | null>(null);

  const [detectedConfig, setDetectedConfig] = useState<Partial<ServerConfig> | null>(null);
  const [isDiagnosingRcon, setIsDiagnosingRcon] = useState(false);
  const [localIps, setLocalIps] = useState<string[]>(['127.0.0.1']);

  const [isUnsavedChangesModalOpen, setIsUnsavedChangesModalOpen] = useState(false);
  const [pendingStartProfileId, setPendingStartProfileId] = useState<string | null>(null);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<{ id: string, name: string } | null>(null);

  const [isRestartModalOpen, setIsRestartModalOpen] = useState(false);
  const [activeRestartEndTime, setActiveRestartEndTime] = useState<number | null>(null);
  const timedRestartIntervalRef = useRef<number | null>(null);

  const [startErrorModalState, setStartErrorModalState] = useState<{
    isOpen: boolean;
    error: string;
    paths: string[];
    args: string[];
    profile: ServerProfile | null;
  }>({
    isOpen: false,
    error: '',
    paths: [],
    args: [],
    profile: null,
  });

  const startupTimerRef = useRef<number | null>(null);
  const updateCheckTimerRef = useRef<number | null>(null);
  const restartIntervalRef = useRef<number | null>(null);
  const statsIntervalRef = useRef<number | null>(null);
  const analyticsIntervalRef = useRef<number | null>(null);
  const shutdownTimerIntervalRef = useRef<number | null>(null);

  const lastRestartBroadcastMinuteRef = useRef<number | null>(null);
  const scheduledRestartWipeProfilesRef = useRef<Set<string>>(new Set());
  const lastSaveWorldTimeRef = useRef<Record<string, number>>({});
  
  const lastAnalyticsSaveTimeRef = useRef<number>(0);
  const shouldAutoRestartAfterUpdateRef = useRef<boolean>(false);
  const updatingProfileIdRef = useRef<string | null>(null);
  const isAutoUpdatingRef = useRef<boolean>(false);
  const hasAutoLaunchedOnStartRef = useRef<boolean>(false);
  const handleSaveConfigRef = useRef<() => Promise<void>>(async () => {});

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

  const onUpdate = useCallback(async (autoRestartAfter = false, targetProfileId?: string, forceCleanManifest = true) => {
    const profId = (typeof targetProfileId === 'string' && targetProfileId.trim())
        ? targetProfileId.trim()
        : activeProfileIdRef.current;
    if (!profId) return;
    const profileToUpdate = profilesRef.current.find(p => p.id === profId);
    if (!profileToUpdate || !profileToUpdate.path) return;

    shouldAutoRestartAfterUpdateRef.current = typeof autoRestartAfter === 'boolean' ? autoRestartAfter : false;
    updatingProfileIdRef.current = profileToUpdate.id;

    setIsUpdateFinished(false);
    updateProfile(profileToUpdate.id, { status: ServerStatus.Updating });
    setUpdateLog([
      forceCleanManifest 
        ? 'Initializing server file update (appmanifest_2430930.acf will be auto-cleaned to ensure latest build check)...'
        : 'Initializing server file update...'
    ]);
    notificationService.sendNotification('Update Started', `Updating server files for ${profileToUpdate.profileName}.`);
    
    const rootPath = directoryService.getRootInstallPath(profileToUpdate.path);
    try {
        await invoke('update_server_files', { 
            installPath: rootPath,
            serverPath: rootPath,
            forceClean: forceCleanManifest,
        });
    } catch (error: any) {
        shouldAutoRestartAfterUpdateRef.current = false;
        setUpdateLog(prev => [...prev, `❌ ERROR: Failed to start update process: ${error}`]);
        updateProfile(profileToUpdate.id, { status: ServerStatus.Error });
        notificationService.sendNotification('Update Failed', `Failed to update server files for ${profileToUpdate.profileName}.`);
        setIsUpdateFinished(true);
    }
  }, [updateProfile]);

  const handleCancelUpdate = useCallback(async () => {
    try {
      setUpdateLog(prev => [...prev, '🛑 User requested update cancellation. Sending quit to SteamCMD...']);
      await invoke('cancel_server_update');
    } catch (e: any) {
      setUpdateLog(prev => [...prev, `⚠️ Error while cancelling update: ${e}`]);
    }
  }, []);

  const executeServerStart = useCallback(async (profileIdToStart: string) => {
    const profileToStart = profilesRef.current.find(p => p.id === profileIdToStart);

    if (!profileToStart || !profileToStart.path) return;
    const profileId = profileToStart.id;
    setManagerLog([]); // Clear manager log on start
    setServerLog([]); // Clear server log on start
    setPlayerListsByProfile(prev => ({ ...prev, [profileId]: [] })); // Clear player list on start
    updateProfile(profileId, { status: ServerStatus.Starting, playerCount: 0 });
    notificationService.sendNotification('Server Starting', `The server "${profileToStart.profileName}" is starting up.`);

    if (startupTimerRef.current) clearTimeout(startupTimerRef.current);
    
    let launchArgs: string[] = [];
    let candidatePaths: string[] = [];
    
    try {
        const { map, sessionName, queryPort, gamePort, serverPassword, adminPassword, mods, bDisableBattleEye, maxPlayers, bServerPVE, bEnableRcon, rconPort, rconPassword, rconIp, bEnableClustering, clusterId, clusterDirOverride, serverPlatform, customCommandLineArgs, bEnableCpuAffinity, cpuAffinityCores, cpuAffinityMask } = profileToStart.config;
        
        const urlOptions = [];
        urlOptions.push(`SessionName=${sessionName}`);
        urlOptions.push(`ServerPVE=${bServerPVE}`);
        
        const mapAndOptionsArg = `${map}?${urlOptions.join('?')}`;
        
        launchArgs = [mapAndOptionsArg];
        launchArgs.push(`-Port=${gamePort}`);
        launchArgs.push(`-QueryPort=${queryPort}`);
        launchArgs.push(`-WinLiveMaxPlayers=${maxPlayers}`);
        launchArgs.push(`-MultiHome=${rconIp || '0.0.0.0'}`);
        launchArgs.push(`-ServerPlatform=${serverPlatform}`);
        launchArgs.push(`-servergamelog`);
        
        if (serverPassword) {
            launchArgs.push(`-ServerPassword=${serverPassword}`);
        }
        launchArgs.push(`-ServerAdminPassword=${adminPassword || 'password'}`);
        
        if (bEnableRcon) {
            launchArgs.push('-RCONEnabled');
            launchArgs.push(`-RCONPort=${rconPort}`);
            if (rconPassword && rconPassword.trim()) {
                launchArgs.push(`-RCONServerAdminPassword=${rconPassword.trim()}`);
            }
        }
        
        if (bDisableBattleEye) {
            launchArgs.push('-NoBattlEye');
        }
        if (mods.trim()) {
            launchArgs.push(`-mods=${mods.trim()}`);
        }

        if (bEnableClustering && clusterId && clusterDirOverride) {
            launchArgs.push(`-ClusterID=${clusterId}`);
            launchArgs.push(`-ClusterDirOverride=${clusterDirOverride}`);
            launchArgs.push(`-NoTransferFromFiltering`);
        }

        // Custom Command Line Arguments configured in Server Configuration
        if (customCommandLineArgs && customCommandLineArgs.trim()) {
            const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
            let match: RegExpExecArray | null;
            while ((match = regex.exec(customCommandLineArgs.trim())) !== null) {
                const arg = match[1] ?? match[2] ?? match[0];
                if (arg && arg.trim()) {
                    launchArgs.push(arg.trim());
                }
            }
        }

        // Calculate CPU Affinity Mask if enabled
        let affinityHex: string | undefined;
        let affinityDecimal: number | undefined;
        if (bEnableCpuAffinity) {
            if (cpuAffinityMask && cpuAffinityMask.trim()) {
                affinityHex = cpuAffinityMask.trim().startsWith('0x') || cpuAffinityMask.trim().startsWith('0X')
                    ? cpuAffinityMask.trim()
                    : '0x' + cpuAffinityMask.trim();
                try {
                    affinityDecimal = Number(BigInt(affinityHex));
                } catch {
                    affinityDecimal = undefined;
                }
            } else if (cpuAffinityCores && cpuAffinityCores.length > 0) {
                let mask = 0n;
                for (const core of cpuAffinityCores) {
                    if (core >= 0 && core < 128) {
                        mask |= (1n << BigInt(core));
                    }
                }
                affinityHex = '0x' + mask.toString(16).toUpperCase();
                affinityDecimal = Number(mask);
            }
        }
        
        const rootPath = directoryService.getRootInstallPath(profileToStart.path);
        
        // Prepare expected executable paths for diagnostics
        candidatePaths = [];
        try {
            if (profileToStart.path) {
                candidatePaths.push(await join(profileToStart.path, 'ShooterGame', 'Binaries', 'Win64', 'ArkAscendedServer.exe'));
                candidatePaths.push(await join(profileToStart.path, 'server', 'ShooterGame', 'Binaries', 'Win64', 'ArkAscendedServer.exe'));
            }
            if (rootPath && rootPath !== profileToStart.path) {
                candidatePaths.push(await join(rootPath, 'ShooterGame', 'Binaries', 'Win64', 'ArkAscendedServer.exe'));
                candidatePaths.push(await join(rootPath, 'server', 'ShooterGame', 'Binaries', 'Win64', 'ArkAscendedServer.exe'));
            }
        } catch {
            if (profileToStart.path) {
                candidatePaths.push(`${profileToStart.path}\\ShooterGame\\Binaries\\Win64\\ArkAscendedServer.exe`);
                candidatePaths.push(`${profileToStart.path}\\server\\ShooterGame\\Binaries\\Win64\\ArkAscendedServer.exe`);
            }
        }

        setManagerLog(prev => [
            ...prev,
            `[Manager] Attempting to start server "${profileToStart.profileName}"...`,
            `[Manager] Directory: "${profileToStart.path}"`,
        ]);

        // Start server process via Tauri backend
        const pid = await invoke<number>('start_ark_server', {
            profileId: profileId,
            serverPath: rootPath,
            installPath: rootPath,
            args: launchArgs,
            rconIp: rconIp,
            rconPort: rconPort,
            rconPassword: (rconPassword && rconPassword.trim()) ? rconPassword : adminPassword,
            bEnableRcon: bEnableRcon,
            affinityMask: affinityHex,
            cpuAffinityMask: affinityHex,
            cpuAffinityDecimal: affinityDecimal,
            cpuAffinityCores: (bEnableCpuAffinity && cpuAffinityCores) ? cpuAffinityCores : undefined,
        });

        updateProfile(profileId, { pid: pid });
        setManagerLog(prev => [
            ...prev,
            `[Manager] ✅ Server process successfully started with PID: ${pid}`,
            ...(bEnableCpuAffinity && affinityHex ? [`[Manager] CPU Affinity Applied: ${affinityHex} (Cores: ${cpuAffinityCores && cpuAffinityCores.length > 0 ? cpuAffinityCores.join(', ') : 'Custom Mask'})`] : []),
            `[Manager] Command Line: ${bEnableCpuAffinity && affinityHex ? `start /affinity ${affinityHex.replace(/^0x/i, '')} ` : ''}ArkAscendedServer.exe ${launchArgs.join(' ')}`
        ]);
        
    } catch (error) {
        const errorMsg = error instanceof Error 
            ? error.message 
            : (typeof error === 'string' ? error : JSON.stringify(error));
            
        console.error("Server start failure:", error);
        
        // Log detailed error report to the manager log
        setManagerLog(prev => [
            ...prev,
            `[Manager] ==========================================`,
            `[Manager] ❌ ERROR: Server "${profileToStart.profileName}" failed to start!`,
            `[Manager] Error Details: ${errorMsg}`,
            `[Manager] Configured Path: "${profileToStart.path}"`,
            `[Manager] Executable paths checked:`,
            ...candidatePaths.map(p => `[Manager]   • ${p}`),
            `[Manager] Launch Arguments: ${launchArgs.join(' ')}`,
            `[Manager] Troubleshooting Checklist:`,
            `[Manager]   1. Ensure server files are installed. Click "Update / Install" to download via SteamCMD.`,
            `[Manager]   2. Ensure Microsoft Visual C++ 2015-2022 Redistributable (x64) is installed.`,
            `[Manager]   3. Check Task Manager to confirm no stale ArkAscendedServer.exe is still running.`,
            `[Manager]   4. Ensure Windows Defender or Antivirus didn't block or quarantine ArkAscendedServer.exe.`,
            `[Manager] ==========================================`,
        ]);

        if (startupTimerRef.current) clearTimeout(startupTimerRef.current);
        scheduledRestartWipeProfilesRef.current.delete(profileId);
        updateProfile(profileId, { status: ServerStatus.Error });
        
        onShowToast(`Server start failed: ${errorMsg.slice(0, 80)}`, 'error');
        notificationService.sendNotification('Server Start Failed', `The server "${profileToStart.profileName}" failed to start: ${errorMsg}`);
        
        // Open detailed error modal with full diagnostics
        setStartErrorModalState({
            isOpen: true,
            error: errorMsg,
            paths: candidatePaths,
            args: launchArgs,
            profile: profileToStart
        });

        // Automatically switch to console so the manager log is right in front of the user
        setActiveTab('console');
    }
}, [updateProfile, onShowToast]);

  const onStart = useCallback(async (targetProfileId?: string) => {
    const currentActiveId = (typeof targetProfileId === 'string' && targetProfileId.trim()) 
        ? targetProfileId.trim() 
        : activeProfileIdRef.current;
    if (!currentActiveId) return;
    const profileToStart = profilesRef.current.find(p => p.id === currentActiveId);
    if (!profileToStart || !profileToStart.path) return;

    if (appSettings.autoSaveOnStart) {
        if (handleSaveConfigRef.current) {
            await handleSaveConfigRef.current();
        }
        await executeServerStart(currentActiveId);
        return;
    }

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
    
    await executeServerStart(currentActiveId);

  }, [appSettings.autoSaveOnStart, executeServerStart]);

  const handleUnsavedChangesConfirm = async (shouldAutoSave: boolean) => {
      if (shouldAutoSave) {
          onUpdateAppSettings('autoSaveOnStart', true);
      }
      if (handleSaveConfigRef.current) {
          await handleSaveConfigRef.current();
      }
      
      setIsUnsavedChangesModalOpen(false);
      if (pendingStartProfileId) {
          await executeServerStart(pendingStartProfileId);
          setPendingStartProfileId(null);
      }
  };

  const handleUnsavedChangesDiscard = async () => {
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


    const onStop = useCallback(async (targetProfileId?: string) => {
        const profileId = (typeof targetProfileId === 'string' && targetProfileId.trim()) 
            ? targetProfileId.trim() 
            : (activeProfileIdRef.current || activeProfile?.id);
        if (!profileId) return;
        const profileToStop = profilesRef.current.find(p => p.id === profileId);
        if (!profileToStop) return;

        if (profileToStop.status === ServerStatus.Starting && startupTimerRef.current) {
            clearTimeout(startupTimerRef.current);
            startupTimerRef.current = null;
        }

        scheduledRestartWipeProfilesRef.current.delete(profileId);

        if (profileId === activeProfileIdRef.current) {
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
        }

        // 1. Immediately indicate Stopping state so UI disables buttons and reflects state
        updateProfile(profileId, { status: ServerStatus.Stopping });

        // 2. Save world before stopping if configured and server was running
        if (profileToStop.status === ServerStatus.Running && (profileToStop.config.saveWorldOnStopRestart ?? true)) {
            const timeSinceLastSave = Date.now() - (lastSaveWorldTimeRef.current[profileId] || 0);
            if (timeSinceLastSave > 5000 && profileToStop.config.bEnableRcon) {
                try {
                    setManagerLog(prev => [...prev, `[Manager] 💾 Saving world progress (SaveWorld) before stopping "${profileToStop.profileName}"...`]);
                    const savePromise = invoke('send_rcon_command', {
                        profileId: profileId,
                        command: 'SaveWorld',
                    });
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('SaveWorld timeout (3.5s elapsed, continuing with stop)')), 3500)
                    );
                    await Promise.race([savePromise, timeoutPromise]);
                    lastSaveWorldTimeRef.current[profileId] = Date.now();
                    setManagerLog(prev => [
                        ...prev,
                        `[Manager] $ SaveWorld`,
                        `[Manager] ✅ SaveWorld completed successfully.`
                    ]);
                } catch (saveErr) {
                    console.warn(`[Manager] SaveWorld notice before stop:`, saveErr);
                    setManagerLog(prev => [...prev, `[Manager] ⚠️ SaveWorld notice: ${saveErr}`]);
                }
                // Brief pause to allow disk flush
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        }

        // 3. Attempt graceful DoExit via RCON if enabled
        if (profileToStop.config.bEnableRcon && profileToStop.status === ServerStatus.Running) {
            try {
                const exitPromise = invoke('send_rcon_command', {
                    profileId: profileId,
                    command: 'DoExit',
                });
                const exitTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('DoExit timeout')), 1000));
                await Promise.race([exitPromise, exitTimeout]);
            } catch {
                // DoExit initiates termination; socket closing is normal
            }
        }

        // 4. Guaranteed stop via process manager / taskkill
        try {
            await invoke('stop_ark_server', {
                profileId: profileId,
                pid: profileToStop.pid
            });
            setManagerLog(prev => [...prev, `[Manager] 🛑 Server stop command executed for "${profileToStop.profileName}".`]);
        } catch(error) {
            console.error("Failed to stop server:", error);
            onShowToast(`Failed to stop server: ${error}`, 'error');
            updateProfile(profileId, { status: ServerStatus.Error });
        }
    }, [activeProfile, updateProfile, onShowToast]);

    const onRestart = useCallback(async (isScheduled = false, targetProfileId?: string) => {
        const scheduled = typeof isScheduled === 'boolean' ? isScheduled : false;
        const profileId = (typeof targetProfileId === 'string' && targetProfileId.trim()) 
            ? targetProfileId.trim() 
            : activeProfileIdRef.current;
        if (!profileId) return;
        const profileToRestart = profilesRef.current.find(p => p.id === profileId);
        if (!profileToRestart || profileToRestart.status !== ServerStatus.Running) return;

        const { config, id, profileName } = profileToRestart;
        
        discordService.sendDiscordNotification(profileToRestart, 'Server Restarting', 'The server is restarting...', discordService.DiscordColors.YELLOW);

        if (scheduled) {
            notificationService.sendNotification('Scheduled Restart', `Server "${profileName}" is beginning its scheduled restart.`);
            if (config.wipeWildDinosOnRestart) {
                scheduledRestartWipeProfilesRef.current.add(id);
                setManagerLog(prev => [...prev, `[Scheduled Restart] 🦖 Automated dino wipe queued: 'DestroyWildDinos' / 'wipewilddinos' will execute as soon as "${profileName}" comes online.`]);
            }
        }

        // Save world before restart if configured
        if (config.saveWorldOnStopRestart ?? true) {
            const timeSinceLastSave = Date.now() - (lastSaveWorldTimeRef.current[id] || 0);
            if (timeSinceLastSave > 5000 && config.bEnableRcon) {
                try {
                    setManagerLog(prev => [...prev, `[Manager] 💾 Saving world progress (SaveWorld) before restarting "${profileName}"...`]);
                    const savePromise = invoke('send_rcon_command', {
                        profileId: id,
                        command: 'SaveWorld',
                    });
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('SaveWorld timeout (3.5s elapsed, continuing with restart)')), 3500)
                    );
                    await Promise.race([savePromise, timeoutPromise]);
                    lastSaveWorldTimeRef.current[id] = Date.now();
                    setManagerLog(prev => [
                        ...prev,
                        `[Manager] $ SaveWorld`,
                        `[Manager] ✅ SaveWorld completed successfully.`
                    ]);
                } catch (saveErr) {
                    console.warn(`[Manager] SaveWorld notice before restart:`, saveErr);
                    setManagerLog(prev => [...prev, `[Manager] ⚠️ SaveWorld notice: ${saveErr}`]);
                }
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        }

        if (scheduled && (config.updateOnRestart || config.autoInstallUpdates)) {
            console.log(`Scheduled restart for profile ${id}: Checking for updates first.`);
            const current = profileToRestart.currentBuildId;
            const latest = profileToRestart.latestBuildId;

            if (current && latest && current !== latest) {
                console.log(`Update found for profile ${id}. Updating during scheduled restart.`);
                notificationService.sendNotification('Update Found', `An update was found during the scheduled restart for "${profileName}". Updating now.`);
                setManagerLog(prev => [...prev, `[Scheduled Restart] Installing game update (${latest}) before restarting server...`]);
                
                if (config.bEnableRcon) {
                    try {
                        await invoke('send_rcon_command', {
                            profileId: id,
                            command: 'ServerChat Installing game update and restarting...',
                        });
                        await invoke('send_rcon_command', {
                            profileId: id,
                            command: 'SaveWorld',
                        });
                    } catch (rconErr) {
                        console.warn("Could not send RCON notice before scheduled restart update:", rconErr);
                    }
                }

                updateProfile(id, { status: ServerStatus.Updating });
                try {
                    await invoke('stop_ark_server', { profileId: id, pid: profileToRestart.pid });
                } catch (e) {
                    console.error("Failed stopping server before restart update:", e);
                }
                await onUpdate(true, id); 
                return;
            }
            console.log(`No update found for profile ${id}. Proceeding with normal restart.`);
        }

        if (id === activeProfileIdRef.current && timedRestartIntervalRef.current) {
            clearInterval(timedRestartIntervalRef.current);
            timedRestartIntervalRef.current = null;
            setActiveRestartEndTime(null);
        }

        updateProfile(id, { status: ServerStatus.Restarting });
        try {
            await invoke('stop_ark_server', { profileId: id, pid: profileToRestart.pid });
        } catch(error) {
            console.error("Failed to stop server for restart:", error);
            onShowToast(`Failed to stop server for restart: ${error}`, 'error');
            updateProfile(id, { status: ServerStatus.Error });
            scheduledRestartWipeProfilesRef.current.delete(id);
        }
    }, [updateProfile, onUpdate, onShowToast]);

    const sendDiscordStatusResponse = useCallback(async (targetProf: ServerProfile) => {
        const uptimeSec = targetProf.uptime || 0;
        const hours = Math.floor(uptimeSec / 3600);
        const minutes = Math.floor((uptimeSec % 3600) / 60);
        const seconds = uptimeSec % 60;
        const uptimeFormatted = `${hours}h ${minutes}m ${seconds}s`;
        const ramMb = targetProf.memoryUsage ? (targetProf.memoryUsage / (1024 * 1024)).toFixed(1) : '0';
        const players = playerListsByProfileRef.current[targetProf.id] || [];

        try {
            await invoke('discord_bot_status_response', {
                profileId: targetProf.id,
                profile_id: targetProf.id,
                channelId: targetProf.config?.discordBotChannelId?.trim() || '',
                channel_id: targetProf.config?.discordBotChannelId?.trim() || '',
                serverName: targetProf.profileName || targetProf.config.sessionName,
                status: targetProf.status,
                map: targetProf.config.map,
                playerCount: targetProf.playerCount || players.length || 0,
                maxPlayers: targetProf.config.maxPlayers,
                playerNames: players.map(p => p.name).join(', '),
                uptime: uptimeFormatted,
                ramUsage: `${ramMb} MB`,
                buildId: targetProf.currentBuildId || 'Unknown'
            });
            console.log(`[Discord Bot] Pushed live status response for profile: "${targetProf.profileName}"`);
        } catch (e) {
            console.error("Error sending status response to discord:", e);
        }
    }, []);

    const syncDiscordBots = useCallback(async (profilesToSync: ServerProfile[]) => {
        const enabledProfiles = profilesToSync.filter(p => 
            p.config?.discordBotEnabled && 
            p.config?.discordBotToken?.trim() && 
            p.config?.discordBotChannelId?.trim()
        );

        if (enabledProfiles.length === 0) return;

        console.log(`[Discord Bot] Synchronizing ${enabledProfiles.length} active bot profile(s)...`);
        for (const prof of enabledProfiles) {
            try {
                await invoke('start_discord_bot', {
                    token: prof.config.discordBotToken.trim(),
                    channelId: prof.config.discordBotChannelId.trim(),
                    channel_id: prof.config.discordBotChannelId.trim(),
                    profileId: prof.id,
                    profile_id: prof.id,
                    profileName: prof.profileName,
                    profile_name: prof.profileName,
                });
                console.log(`[Discord Bot] Initialized bot for profile "${prof.profileName}" (Channel: ${prof.config.discordBotChannelId})`);
            } catch (botErr) {
                console.error(`[Discord Bot] Failed to initialize bot for "${prof.profileName}":`, botErr);
            }
        }
    }, []);

  const handleManualUpdateCheck = useCallback(async (isScheduled = false) => {
    const profileToCheck = profilesRef.current.find(p => p.id === activeProfileIdRef.current);
    if (!profileToCheck?.path) return;

    const { id, path, profileName, config, status: currentStatus } = profileToCheck;
    const rootPath = directoryService.getRootInstallPath(path);
    
    setIsCheckingForUpdate(true);
    try {
        const [currentBuild, latestBuild] = await Promise.all([
            invoke<string>('get_server_build_info', { installPath: rootPath, serverPath: rootPath }).catch(() => ''),
            invoke<string>('get_latest_server_build', { installPath: rootPath, serverPath: rootPath }),
        ]);
        updateProfile(id, {
            currentBuildId: currentBuild,
            latestBuildId: latestBuild,
            lastUpdateCheck: new Date().toISOString()
        });
        if (currentBuild && latestBuild && currentBuild !== latestBuild) {
            notificationService.sendNotification('Update Available', `A new server version (${latestBuild}) is available for "${profileName}".`);
            setNotifications(prev => {
                const notifId = `update-${id}`;
                if (prev.some(n => n.id === notifId)) return prev;
                return [...prev, {
                    id: notifId,
                    type: 'update',
                    profileId: id,
                    profileName,
                    message: `Update ${latestBuild} available for server "${profileName}".`,
                    read: false,
                }];
            });

            // Handle auto-update logic if enabled for this profile
            if (config.autoInstallUpdates && !isAutoUpdatingRef.current) {
                if (config.autoUpdateWaitForRestart) {
                    // Staged mode: Queued for next scheduled restart
                    console.log(`[Auto-Update] Game update ${latestBuild} detected for "${profileName}". Queued for next scheduled restart.`);
                    setManagerLog(prev => [...prev, `[Auto-Update] New game build (${latestBuild}) detected. Staged for installation during next scheduled restart.`]);
                    if (!isScheduled) {
                        onShowToast(`Update (${latestBuild}) detected! It is queued to install during the next scheduled restart.`, 'success');
                    }
                } else {
                    // Immediate mode: apply auto update now
                    console.log(`[Auto-Update] Game update ${latestBuild} detected for "${profileName}". Applying immediate auto-update.`);
                    isAutoUpdatingRef.current = true;
                    setManagerLog(prev => [...prev, `[Auto-Update] New game build (${latestBuild}) detected! Initiating immediate automatic update...`]);
                    onShowToast(`Auto-updating "${profileName}" to latest build (${latestBuild})...`, 'success');

                    if (currentStatus === ServerStatus.Running) {
                        if (config.bEnableRcon) {
                            try {
                                await invoke('send_rcon_command', {
                                    profileId: id,
                                    command: 'ServerChat Game update detected. Saving world and restarting for update...',
                                });
                                await invoke('send_rcon_command', {
                                    profileId: id,
                                    command: 'SaveWorld',
                                });
                            } catch (rconErr) {
                                console.warn("Could not send RCON notice before auto update:", rconErr);
                            }
                        }
                        updateProfile(id, { status: ServerStatus.Updating });
                        try {
                            await invoke('stop_ark_server', { profileId: id });
                        } catch (e) {
                            console.error("Error stopping server before auto-update:", e);
                        }
                        await onUpdate(true, id);
                    } else if (currentStatus === ServerStatus.Stopped) {
                        await onUpdate(false, id);
                    }
                    setTimeout(() => {
                        isAutoUpdatingRef.current = false;
                    }, 5000);
                }
            }
        }
    } catch (error) {
        console.error("Failed to check for updates:", error);
        const errStr = String(error).toLowerCase();
        if (!errStr.includes('manifest')) {
            onShowToast(`Error checking for updates: ${error}`, 'error');
        }
        updateProfile(id, { lastUpdateCheck: new Date().toISOString() });
    } finally {
        setIsCheckingForUpdate(false);
    }
  }, [updateProfile, setNotifications, onShowToast, onUpdate]);

  const handleSendCommand = async (command: string, retries = 1) => {
    if (!activeProfile || activeProfile.status !== ServerStatus.Running) return;

    try {
        setManagerLog(prev => [...prev, `$ ${command}`]);
        
        await invoke('send_rcon_command', {
            profileId: activeProfile.id,
            command: command,
        });
    } catch (error: any) {
        if (retries > 0 && String(error).includes('10054')) {
            console.warn(`RCON connection reset. Retrying command: ${command}`);
            setTimeout(() => {
                handleSendCommand(command, retries - 1);
            }, 500); 
        } else {
            console.error(`Failed to send RCON command: ${error}`);
            setManagerLog(prev => [...prev, `❌ Error sending command: ${error}`]);
        }
    }
  };

  const handleWipeWildDinosOnStartup = useCallback(async (profId: string, profName: string, rconEnabled: boolean) => {
    if (!rconEnabled) {
        setManagerLog(prev => [
            ...prev,
            `[Automated Restart] ⚠️ Wild dino wipe skipped: RCON is disabled for "${profName}". Please enable RCON in Server Configuration to execute commands on restart.`
        ]);
        return;
    }

    setManagerLog(prev => [
        ...prev,
        `[Automated Restart] 🦖 Server "${profName}" is online! Executing wipewilddinos command (DestroyWildDinos)...`
    ]);

    // Initial delay to ensure the server's RCON socket is accepting commands
    await new Promise(resolve => setTimeout(resolve, 2500));

    let commandExecuted = false;

    // 1. Send native ARK Unreal engine console command 'DestroyWildDinos'
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            await invoke('send_rcon_command', {
                profileId: profId,
                command: 'DestroyWildDinos',
            });
            commandExecuted = true;
            setManagerLog(prev => [
                ...prev,
                `[Automated Restart] $ DestroyWildDinos`,
                `[Automated Restart] ✅ Executed DestroyWildDinos on "${profName}".`
            ]);
            break;
        } catch (err) {
            console.warn(`[Automated Restart] Attempt ${attempt} failed for DestroyWildDinos on "${profName}":`, err);
            if (attempt < 3) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    // 2. Also send 'wipewilddinos' command in case server mods or custom plugins register it
    try {
        await invoke('send_rcon_command', {
            profileId: profId,
            command: 'wipewilddinos',
        });
        setManagerLog(prev => [
            ...prev,
            `[Automated Restart] $ wipewilddinos`,
            `[Automated Restart] ✅ Executed wipewilddinos on "${profName}".`
        ]);
        commandExecuted = true;
    } catch {
        // Unrecognized custom alias on vanilla server is harmlessly ignored
    }

    if (commandExecuted) {
        notificationService.sendNotification(
            'Wild Dino Wipe Complete',
            `Wild dinos were wiped on "${profName}" following automated restart.`
        );
        const targetProf = profilesRef.current.find(p => p.id === profId);
        if (targetProf && targetProf.config.discordNotificationsEnabled) {
            discordService.sendDiscordNotification(
                targetProf,
                'Wild Dino Wipe Executed',
                'Automated wild dino wipe (DestroyWildDinos / wipewilddinos) was executed as the server came online following scheduled restart.',
                discordService.DiscordColors.GREEN
            );
        }
    } else {
        setManagerLog(prev => [
            ...prev,
            `[Automated Restart] ❌ Could not reach RCON to execute dino wipe on "${profName}". Please check server port and RCON settings.`
        ]);
    }
  }, []);

  const handleInitiateTimedShutdown = (minutes: number, reason?: string, shouldSaveWorld?: boolean) => {
    if (!activeProfile || activeProfile.status !== ServerStatus.Running) return;
    
    const durationMs = minutes * 60 * 1000;
    const endTime = Date.now() + durationMs;
    setActiveShutdownEndTime(endTime);
    
    if (shutdownTimerIntervalRef.current) clearInterval(shutdownTimerIntervalRef.current);

    const cleanReason = (reason && reason.trim()) ? reason.trim() : '';
    const reasonSuffix = cleanReason ? ` Reason: ${cleanReason}` : '';

    handleSendCommand(`ServerChat Server shutting down in ${minutes} minute${minutes === 1 ? '' : 's'}.${reasonSuffix}`);
    
    let lastAnnouncedRemaining = minutes * 60; 

    shutdownTimerIntervalRef.current = window.setInterval(() => {
        const now = Date.now();
        const remainingMs = endTime - now;
        const remainingSec = Math.ceil(remainingMs / 1000);

        if (remainingMs <= 0) {
            if (shutdownTimerIntervalRef.current) clearInterval(shutdownTimerIntervalRef.current);
            setActiveShutdownEndTime(null);
            handleSendCommand(`ServerChat Server shutting down NOW.${reasonSuffix}`);
            
            const doSave = shouldSaveWorld ?? (activeProfile?.config.saveWorldOnStopRestart ?? true);
            if (doSave) {
                handleSendCommand("SaveWorld");
                if (activeProfile?.id) {
                    lastSaveWorldTimeRef.current[activeProfile.id] = Date.now();
                }
            }
            setTimeout(() => onStop(), 2000);
            return;
        }

        const checkpoints = [1800, 900, 600, 300, 180, 60, 30, 10, 5, 4, 3, 2, 1];

        for (const cp of checkpoints) {
            if (lastAnnouncedRemaining > cp && remainingSec <= cp) {
                const timeStr = cp >= 60 ? `${cp / 60} minute${cp === 60 ? '' : 's'}` : `${cp} seconds`;
                handleSendCommand(`ServerChat Server shutting down in ${timeStr}.${reasonSuffix}`);
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

  const handleInitiateTimedRestart = (minutes: number, reason?: string, shouldSaveWorld?: boolean) => {
    if (!activeProfile || activeProfile.status !== ServerStatus.Running) return;
    
    const durationMs = minutes * 60 * 1000;
    const endTime = Date.now() + durationMs;
    setActiveRestartEndTime(endTime);
    
    if (timedRestartIntervalRef.current) clearInterval(timedRestartIntervalRef.current);

    const cleanReason = (reason && reason.trim()) ? reason.trim() : '';
    const reasonSuffix = cleanReason ? ` Reason: ${cleanReason}` : '';

    handleSendCommand(`ServerChat Server restarting in ${minutes} minute${minutes === 1 ? '' : 's'}.${reasonSuffix}`);
    
    let lastAnnouncedRemaining = minutes * 60; 

    timedRestartIntervalRef.current = window.setInterval(() => {
        const now = Date.now();
        const remainingMs = endTime - now;
        const remainingSec = Math.ceil(remainingMs / 1000);

        if (remainingMs <= 0) {
            if (timedRestartIntervalRef.current) clearInterval(timedRestartIntervalRef.current);
            setActiveRestartEndTime(null);
            handleSendCommand(`ServerChat Server restarting NOW.${reasonSuffix}`);
            
            const doSave = shouldSaveWorld ?? (activeProfile?.config.saveWorldOnStopRestart ?? true);
            if (doSave) {
                handleSendCommand("SaveWorld");
                if (activeProfile?.id) {
                    lastSaveWorldTimeRef.current[activeProfile.id] = Date.now();
                }
            }
            setTimeout(() => onRestart(false), 2000);
            return;
        }

        const checkpoints = [1800, 900, 600, 300, 180, 60, 30, 10, 5, 4, 3, 2, 1];

        for (const cp of checkpoints) {
            if (lastAnnouncedRemaining > cp && remainingSec <= cp) {
                const timeStr = cp >= 60 ? `${cp / 60} minute${cp === 60 ? '' : 's'}` : `${cp} seconds`;
                handleSendCommand(`ServerChat Server restarting in ${timeStr}.${reasonSuffix}`);
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
            handleManualUpdateCheck(true);
            updateCheckTimerRef.current = window.setInterval(
                () => handleManualUpdateCheck(true),
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
                                const scheduledReason = activeProfile?.config.scheduledRestartReason?.trim();
                                const scheduledReasonSuffix = scheduledReason ? ` Reason: ${scheduledReason}` : '';
                                handleSendCommand(`ServerChat Scheduled restart in ${minutesUntilRestart} minute(s).${scheduledReasonSuffix}`);
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
      activeProfile?.config.scheduledRestartReason,
      activeProfile?.config.restartAnnouncementMinutes,
      activeProfile?.config.bEnableRcon,
      handleManualUpdateCheck,
      onRestart
  ]);
  
  useEffect(() => {
    const RESTART_CHECK_INTERVAL = 30000; // 30 seconds
    const ONE_HOUR_MS = 60 * 60 * 1000;

    const intervalId = setInterval(() => {
      const profile = activeProfile; 
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
              return prev; 
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
      if (activeProfile) {
        setNotifications(prev => prev.filter(n => n.id !== `restart-${activeProfile.id}`));
      }
    };
  }, [activeProfile, setNotifications]);

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

            const now = Date.now();
            if (now - lastAnalyticsSaveTimeRef.current >= 60000) {
                lastAnalyticsSaveTimeRef.current = now;
                const profileObj = profilesRef.current.find(p => p.id === profileId);
                const currentPlayerCount = profileObj?.playerCount ?? (playerListsByProfile[profileId]?.length ?? 0);
                
                await directoryService.saveAnalyticsData({
                    profileId,
                    timestamp: now,
                    memoryUsage: stats.memoryBytes,
                    playerCount: currentPlayerCount
                });
            }

        } catch (error) {
            console.error(`Failed to fetch stats for profile ${profileId}:`, error);
        }
    };
    
    if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
    }

    if (activeProfile?.status === ServerStatus.Running) {
        fetchStats(); 
        statsIntervalRef.current = window.setInterval(fetchStats, 3000); 
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
    const rootPath = directoryService.getRootInstallPath(activeProfile.path);
    try {
        const result: BackupInfo[] = await invoke('list_backups', { installPath: rootPath, serverPath: rootPath });
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
    const rootPath = directoryService.getRootInstallPath(activeProfile.path);
    try {
        await invoke('create_backup', { installPath: rootPath, serverPath: rootPath });
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
        const rootPath = directoryService.getRootInstallPath(activeProfile.path);
        try {
            await invoke('restore_backup', {
                installPath: rootPath,
                serverPath: rootPath,
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
        const rootPath = directoryService.getRootInstallPath(activeProfile.path);
        try {
            await invoke('delete_backup', {
                installPath: rootPath,
                serverPath: rootPath,
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

  const detectAndAttachRunningServer = useCallback(async (profile: ServerProfile): Promise<{
      isRunning: boolean;
      pid?: number;
      uptime?: number;
      memoryUsage?: number;
  }> => {
      if (!profile.path) return { isRunning: false, pid: profile.pid };
      const rootPath = directoryService.getRootInstallPath(profile.path);
      
      const rawIp = profile.config?.rconIp?.trim() || '127.0.0.1';
      const primaryIp = (rawIp === '0.0.0.0' || !rawIp) ? '127.0.0.1' : rawIp;
      const candidateIps = Array.from(new Set([primaryIp, '127.0.0.1', ...(localIps || [])])).filter(Boolean);
      
      const rconPort = profile.config?.rconPort || 27020;
      const rconPassword = (profile.config?.rconPassword && profile.config.rconPassword.trim()) 
          ? profile.config.rconPassword.trim() 
          : (profile.config?.adminPassword?.trim() || '');
      const bEnableRcon = profile.config?.bEnableRcon ?? true;
      const gamePort = profile.config?.gamePort || 7777;
      const queryPort = profile.config?.queryPort || 27015;

      type RunningCheckRes = { isRunning?: boolean; is_running?: boolean; running?: boolean; pid?: number; process_id?: number; uptimeSeconds?: number; uptime_seconds?: number; memoryBytes?: number; memory_bytes?: number };
      type ServerStatsRes = { uptimeSeconds?: number; uptime_seconds?: number; memoryBytes?: number; memory_bytes?: number; pid?: number; process_id?: number };

      const tryAttach = async (ip: string, pidToUse?: number) => {
          try {
              await invoke('attach_running_server', {
                  profileId: profile.id,
                  profile_id: profile.id,
                  serverPath: rootPath,
                  server_path: rootPath,
                  installPath: rootPath,
                  install_path: rootPath,
                  pid: pidToUse || profile.pid,
                  rconIp: ip,
                  rcon_ip: ip,
                  rconPort: rconPort,
                  rcon_port: rconPort,
                  rconPassword: rconPassword,
                  rcon_password: rconPassword,
                  bEnableRcon: bEnableRcon,
                  b_enable_rcon: bEnableRcon,
                  gamePort: gamePort,
                  game_port: gamePort,
                  queryPort: queryPort,
                  query_port: queryPort
              });
          } catch {
              // Ignore attach error
          }
      };

      // Strategy 1: If we have a saved PID from a previously started server, check if that exact process is alive
      if (profile.pid && profile.pid > 0) {
          const pidCheckers = ['is_process_running', 'check_process_running', 'check_pid', 'is_pid_running'];
          for (const cmd of pidCheckers) {
              try {
                  const isAlive = await invoke<boolean | { isRunning?: boolean; is_running?: boolean; running?: boolean }>(cmd, {
                      pid: profile.pid,
                      processId: profile.pid,
                      process_id: profile.pid
                  });
                  const alive = typeof isAlive === 'boolean' ? isAlive : Boolean(isAlive && (isAlive.isRunning || isAlive.is_running || isAlive.running));
                  if (alive) {
                      await tryAttach(primaryIp, profile.pid);
                      // Query stats
                      try {
                          const stats = await invoke<ServerStatsRes>('get_server_stats', { profileId: profile.id, profile_id: profile.id });
                          const uptime = stats?.uptimeSeconds ?? stats?.uptime_seconds;
                          const memory = stats?.memoryBytes ?? stats?.memory_bytes;
                          return {
                              isRunning: true,
                              pid: profile.pid,
                              uptime: uptime && uptime > 0 ? uptime : undefined,
                              memoryUsage: memory && memory > 0 ? memory : undefined,
                          };
                      } catch {
                          return { isRunning: true, pid: profile.pid };
                      }
                  }
              } catch {
                  // Command may not exist or errored, continue to next strategies
              }
          }
      }

      // Strategy 2: Check via Tauri check_server_running command (native OS process & network scan)
      for (const testIp of candidateIps) {
          try {
              const checkPromise = invoke<RunningCheckRes | boolean>('check_server_running', {
                  profileId: profile.id,
                  profile_id: profile.id,
                  serverPath: rootPath,
                  server_path: rootPath,
                  installPath: rootPath,
                  install_path: rootPath,
                  pid: profile.pid,
                  rconIp: testIp,
                  rcon_ip: testIp,
                  rconPort: rconPort,
                  rcon_port: rconPort,
                  rconPassword: rconPassword,
                  rcon_password: rconPassword,
                  bEnableRcon: bEnableRcon,
                  b_enable_rcon: bEnableRcon,
                  gamePort: gamePort,
                  game_port: gamePort,
                  queryPort: queryPort,
                  query_port: queryPort
              });
              const timeoutPromise = new Promise<RunningCheckRes | boolean>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000));
              const res = await Promise.race([checkPromise, timeoutPromise]);
              
              const isRunning = typeof res === 'boolean' 
                  ? res 
                  : Boolean(res && (res.isRunning === true || res.is_running === true || res.running === true));

              if (isRunning) {
                  const foundPid = typeof res === 'object' && res !== null ? (res.pid || res.process_id) : undefined;
                  const uptime = typeof res === 'object' && res !== null ? (res.uptimeSeconds ?? res.uptime_seconds) : undefined;
                  const memory = typeof res === 'object' && res !== null ? (res.memoryBytes ?? res.memory_bytes) : undefined;
                  
                  await tryAttach(testIp, foundPid || profile.pid);
                  return {
                      isRunning: true,
                      pid: foundPid || profile.pid,
                      uptime: uptime,
                      memoryUsage: memory,
                  };
              }
          } catch {
              // Next IP
          }
      }

      // Strategy 3: Check live process telemetry if backend already tracks the process
      try {
          const statsPromise = invoke<ServerStatsRes>('get_server_stats', {
              profileId: profile.id,
              profile_id: profile.id
          });
          const timeoutPromise = new Promise<ServerStatsRes>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000));
          const stats = await Promise.race([statsPromise, timeoutPromise]);
          const uptime = stats?.uptimeSeconds ?? stats?.uptime_seconds ?? 0;
          const memory = stats?.memoryBytes ?? stats?.memory_bytes ?? 0;
          const foundPid = stats?.pid ?? stats?.process_id;

          if (uptime > 0 || memory > 0 || (foundPid && foundPid > 0)) {
              await tryAttach(primaryIp, foundPid || profile.pid);
              return {
                  isRunning: true,
                  pid: foundPid || profile.pid,
                  uptime: uptime > 0 ? uptime : undefined,
                  memoryUsage: memory > 0 ? memory : undefined,
              };
          }
      } catch {
          // Backend not actively tracking
      }

      // Strategy 4: Direct Attach and Live RCON Command Verification
      // If RCON is enabled, we attach and send a lightweight RCON query. If the ARK server is running, it responds.
      // If the ARK server is offline, the TCP connection is refused (error code 10061/refused/timeout).
      if (bEnableRcon && rconPort > 0) {
          for (const testIp of candidateIps) {
              try {
                  await tryAttach(testIp, profile.pid);
                  const rconTestPromise = invoke<string>('send_rcon_command', {
                      profileId: profile.id,
                      profile_id: profile.id,
                      command: 'GetChat'
                  });
                  const rconTimeoutPromise = new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500));
                  const rconRes = await Promise.race([rconTestPromise, rconTimeoutPromise]);
                  
                  // If send_rcon_command resolved (even with empty string or chat), RCON is connected to the running server!
                  if (typeof rconRes === 'string') {
                      let stats: ServerStatsRes | null = null;
                      try {
                          stats = await invoke<ServerStatsRes>('get_server_stats', { profileId: profile.id, profile_id: profile.id });
                      } catch {
                          // Ignore
                      }
                      const uptime = stats?.uptimeSeconds ?? stats?.uptime_seconds;
                      const memory = stats?.memoryBytes ?? stats?.memory_bytes;
                      const foundPid = stats?.pid ?? stats?.process_id;
                      return {
                          isRunning: true,
                          pid: foundPid || profile.pid,
                          uptime: uptime && uptime > 0 ? uptime : undefined,
                          memoryUsage: memory && memory > 0 ? memory : undefined,
                      };
                  }
              } catch {
                  // RCON connection failed (server offline or port closed)
              }
          }
      }

      // If all checks fail, the server is NOT running. Return isRunning: false, but preserve profile.pid
      return { isRunning: false, pid: profile.pid };
  }, [localIps]);

  useEffect(() => {
    const fetchIps = async () => {
      try {
        const ips = await invoke<string[]>('get_local_ips');
        if (Array.isArray(ips) && ips.length > 0) {
          // Identify LAN IPs (e.g. 192.168.x.x, 10.x.x.x, 172.16-31.x.x, etc.) excluding loopback
          const lanIps = ips.filter(ip => ip && ip !== '127.0.0.1' && ip !== 'localhost' && !ip.startsWith('127.'));
          const primaryIp = lanIps.length > 0 ? lanIps[0] : (ips[0] || '127.0.0.1');
          const orderedIps = [primaryIp, ...new Set(ips.filter(ip => ip !== primaryIp))];
          if (!orderedIps.includes('127.0.0.1')) {
            orderedIps.push('127.0.0.1');
          }
          setLocalIps(orderedIps);
        } else {
          setLocalIps(['127.0.0.1']);
        }
      } catch (error) {
        console.error("Failed to fetch local IP addresses:", error);
        setLocalIps(['127.0.0.1']);
      }
    };
    fetchIps();

    const loadAndVerifyProfiles = async () => {
        try {
            let loadedProfiles = await directoryService.getProfiles();
            
            // Immediately populate state so the user sees their existing profiles with zero delay
            if (Array.isArray(loadedProfiles) && loadedProfiles.length > 0) {
                setProfiles(loadedProfiles);
                if (!activeProfileIdRef.current) {
                    setActiveProfileId(loadedProfiles[0].id);
                }
            }

            const changesDetectedProfiles: string[] = [];
            const reconnectedProfiles: Array<{ name: string; pid?: number }> = [];

            const verifiedProfiles = await Promise.all(loadedProfiles.map(async (profile, index) => {
                try {
                    const defaultConfig = getDefaultServerConfig(index);
                    let mergedConfig = { ...defaultConfig, ...profile.config };
                    const isValid = await directoryService.verifyInstallation(profile.path);
                    
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

                    let initialStatus = isValid ? ServerStatus.Stopped : ServerStatus.Error;
                    let detectedPid: number | undefined = profile.pid;
                    let detectedUptime: number | undefined = undefined;
                    let detectedMemory: number | undefined = undefined;

                    if (isValid && profile.path) {
                        try {
                            const liveCheck = await detectAndAttachRunningServer({
                                ...profile,
                                config: mergedConfig
                            });
                            if (liveCheck.isRunning) {
                                initialStatus = ServerStatus.Running;
                                detectedPid = liveCheck.pid || profile.pid;
                                detectedUptime = liveCheck.uptime;
                                detectedMemory = liveCheck.memoryUsage;
                                reconnectedProfiles.push({ name: profile.profileName, pid: detectedPid });
                            } else {
                                detectedPid = liveCheck.pid || profile.pid;
                            }
                        } catch (checkErr) {
                            console.warn(`[Process Discovery] Check error for ${profile.profileName}:`, checkErr);
                        }
                    }

                    return {
                        ...profile,
                        config: mergedConfig,
                        status: initialStatus,
                        pid: detectedPid,
                        uptime: detectedUptime,
                        memoryUsage: detectedMemory,
                    };
                } catch (profErr) {
                    console.error(`Error verifying profile ${profile.profileName}:`, profErr);
                    return profile;
                }
            }));

            // Immediately persist verified state with any reconnected PIDs and statuses
            if (verifiedProfiles.length > 0) {
                setProfiles(verifiedProfiles);
                if (!activeProfileIdRef.current) {
                    setActiveProfileId(verifiedProfiles[0].id);
                }
                await directoryService.saveProfiles(verifiedProfiles);
            }

            if (reconnectedProfiles.length > 0) {
                const serverDetails = reconnectedProfiles.map(p => `${p.name}${p.pid ? ` (PID: ${p.pid})` : ''}`).join(', ');
                setManagerLog(prev => [
                    ...prev,
                    `[Process Recovery] Discovered ${reconnectedProfiles.length} active server(s) running on system: ${serverDetails}.`,
                    `[Process Recovery] Regained control and restored live monitoring & RCON communication.`
                ]);
                notificationService.sendNotification(
                    'Running Server(s) Reconnected',
                    `Discovered and regained control of ${reconnectedProfiles.length} active server(s): ${serverDetails}`
                );
                onShowToast(`Regained control of active server(s): ${serverDetails}`, 'success');
            }

            if (changesDetectedProfiles.length > 0) {
                const names = changesDetectedProfiles.join(', ');
                setNotifications(prev => [
                    ...prev, 
                    {
                        id: `ext-change-${Date.now()}`,
                        type: 'update',
                        profileId: verifiedProfiles[0]?.id || '1',
                        profileName: 'System',
                        message: `External settings changes detected and applied for: ${names}`,
                        read: false
                    }
                ]);
            }
            
            const checkAllProfilesForUpdates = async (profilesToCheck: ServerProfile[]) => {
              const updateNotifications: AppNotification[] = [];
              const updatedProfilesWithBuilds = await Promise.all(profilesToCheck.map(async (profile) => {
                if (!profile.path) return profile;
                const rootPath = directoryService.getRootInstallPath(profile.path);
                try {
                  const [currentBuild, latestBuild] = await Promise.all([
                    invoke<string>('get_server_build_info', { installPath: rootPath, serverPath: rootPath }),
                    invoke<string>('get_latest_server_build', { installPath: rootPath, serverPath: rootPath }),
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
              await directoryService.saveProfiles(updatedProfilesWithBuilds);

              setNotifications(prev => {
                const otherNotifications = prev.filter(n => n.type !== 'update' || n.id.startsWith('ext-change'));
                return [...otherNotifications, ...updateNotifications];
              });
            };

            if (verifiedProfiles.length > 0) {
                syncDiscordBots(verifiedProfiles);
                checkAllProfilesForUpdates(verifiedProfiles);

                // Auto-launch profiles configured to start on application open (only if not already running)
                if (!hasAutoLaunchedOnStartRef.current) {
                    hasAutoLaunchedOnStartRef.current = true;
                    const autoStartProfiles = verifiedProfiles.filter(p => 
                        p.config?.launchOnAppStart && 
                        p.status === ServerStatus.Stopped && 
                        p.path &&
                        !reconnectedProfiles.some(rp => rp.name === p.profileName)
                    );
                    if (autoStartProfiles.length > 0) {
                        console.log(`[AppStart] Found ${autoStartProfiles.length} profile(s) configured to auto-launch on startup.`);
                        autoStartProfiles.forEach((prof, idx) => {
                            setTimeout(() => {
                                setManagerLog(prev => [...prev, `[Auto-Start] Launching server profile "${prof.profileName}" on application start...`]);
                                onShowToast(`Auto-starting server "${prof.profileName}" on application launch...`, 'success');
                                executeServerStart(prof.id);
                            }, idx * 2500);
                        });
                    }
                }
            }
        } catch (error) {
            console.error("Error loading profiles:", error);
        }
    };
    loadAndVerifyProfiles();
  }, [setNotifications, onShowToast, executeServerStart, syncDiscordBots]);

  useEffect(() => {
    interface LogStatsPayload { profile_id: string; memoryMb: number; }

    let isMounted = true;
    const unlistenFunctions: Array<() => void> = [];

    const setupListeners = async () => {
        try {
            const promises = [
                listen<string>('update-log', (event) => setUpdateLog((prev: string[]) => [...prev, event.payload as string])),
                listen<{success: boolean}>('update-finished', async (event) => {
                    setIsUpdateFinished(true);
                    isAutoUpdatingRef.current = false;
                    const targetId = updatingProfileIdRef.current || activeProfileIdRef.current;
                    const currentActiveProfile = profilesRef.current.find(p => p.id === targetId);
                    const shouldRestart = shouldAutoRestartAfterUpdateRef.current;
                    shouldAutoRestartAfterUpdateRef.current = false;
                    updatingProfileIdRef.current = null;

                    if (currentActiveProfile) {
                        const newStatus = event.payload.success ? ServerStatus.Stopped : ServerStatus.Error;
                        updateProfile(currentActiveProfile.id, { status: newStatus });

                        if (event.payload.success) {
                            notificationService.sendNotification('Update Complete', `Server files for "${currentActiveProfile.profileName}" updated successfully.`);
                            discordService.sendDiscordNotification(currentActiveProfile, 'Update Complete', 'Server files have been updated successfully.', discordService.DiscordColors.BLUE);
                            setNotifications(prev => prev.filter(n => n.id !== `update-${currentActiveProfile.id}`));
                            try {
                                const rootPath = directoryService.getRootInstallPath(currentActiveProfile.path);
                                const newBuildId = await invoke<string>('get_server_build_info', { installPath: rootPath, serverPath: rootPath });
                                updateProfile(currentActiveProfile.id, { currentBuildId: newBuildId, latestBuildId: newBuildId });
                            } catch (err) {
                                console.error("Failed to re-fetch build ID after update:", err);
                            }

                            if (shouldRestart) {
                                setManagerLog(prev => [...prev, `[Auto-Update] Update completed successfully. Automatically starting server "${currentActiveProfile.profileName}"...`]);
                                executeServerStart(currentActiveProfile.id);
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
                        sendDiscordStatusResponse({ ...runningProfile, status: ServerStatus.Running });
                    }
                    if (startupTimerRef.current) {
                        clearTimeout(startupTimerRef.current);
                        startupTimerRef.current = null;
                    }
                    updateProfile(profile_id, { status: ServerStatus.Running });

                    // Only run wipewilddinos if this startup was triggered by an automated scheduled restart
                    if (scheduledRestartWipeProfilesRef.current.has(profile_id)) {
                        scheduledRestartWipeProfilesRef.current.delete(profile_id);
                        const prof = profilesRef.current.find(p => p.id === profile_id);
                        if (prof && prof.config.wipeWildDinosOnRestart) {
                            handleWipeWildDinosOnStartup(profile_id, prof.profileName, prof.config.bEnableRcon);
                        }
                    }
                }),
                listen<{profile_id: string, exit_code?: number}>('server-stopped', (event) => {
                    const { profile_id } = event.payload;
                    const stoppedProfile = profilesRef.current.find(p => p.id === profile_id);

                    if (startupTimerRef.current) {
                        clearTimeout(startupTimerRef.current);
                        startupTimerRef.current = null;
                    }
                    
                    setPlayerListsByProfile(prev => ({ ...prev, [profile_id]: [] }));

                    const latestProfile = profilesRef.current.find(p => p.id === profile_id);
                    if (latestProfile && latestProfile.status === ServerStatus.Restarting) {
                        onStart(profile_id); 
                    } else {
                        scheduledRestartWipeProfilesRef.current.delete(profile_id);
                        if (stoppedProfile) {
                            notificationService.sendNotification('Server Stopped', `Server "${stoppedProfile.profileName}" has stopped.`);
                            discordService.sendDiscordNotification(stoppedProfile, 'Server Stopped', 'The server has stopped.', discordService.DiscordColors.RED);
                            sendDiscordStatusResponse({ ...stoppedProfile, status: ServerStatus.Stopped, playerCount: 0, uptime: 0, memoryUsage: 0 });
                        }
                        updateProfile(profile_id, { status: ServerStatus.Stopped, playerCount: 0 });
                    }
                }),
                listen<string>('map-update-log', (event) => setMapUpdateLog((prev: string[]) => [...prev, event.payload as string])),
                listen('map-update-finished', () => setIsMapUpdateFinished(true)),
                listen<string>('mod-update-log', (event) => setModUpdateLog((prev: string[]) => [...prev, event.payload as string])),
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
                    setPlayerListsByProfile(prev => {
                        const currentList = prev[profileId] || [];
                        if (currentList.some(p => p.steamId === playerId)) return prev;
                        const updated = [...currentList, { name: playerName, steamId: playerId, playTime: 0 }];
                        updateProfile(profileId, { playerCount: updated.length });
                        return { ...prev, [profileId]: updated };
                    });
                }),
                listen<PlayerEventPayload>('player-left', (event) => {
                    const { profileId, playerId } = event.payload;
                    setPlayerListsByProfile(prev => {
                        const currentList = prev[profileId] || [];
                        const updated = currentList.filter(p => p.steamId !== playerId);
                        updateProfile(profileId, { playerCount: updated.length });
                        return { ...prev, [profileId]: updated };
                    });
                }),
                listen<any>('discord-server-command', async (event) => {
                    let cmd = '';
                    let targetProfileId: string | undefined = undefined;
                    let targetChannelId: string | undefined = undefined;

                    if (typeof event.payload === 'string') {
                        cmd = event.payload;
                    } else if (event.payload && typeof event.payload === 'object') {
                        cmd = event.payload.command || event.payload.cmd || '';
                        targetProfileId = event.payload.profile_id || event.payload.profileId;
                        targetChannelId = event.payload.channel_id || event.payload.channelId;
                    }

                    console.log('[Discord Bot Event] Received command:', cmd, { targetProfileId, targetChannelId });

                    // Find the matching profile based on profile ID or channel ID
                    const targetProfile = profilesRef.current.find(p => 
                        (targetProfileId && p.id === targetProfileId) ||
                        (targetChannelId && p.config?.discordBotChannelId?.trim() === targetChannelId.trim())
                    ) || profilesRef.current.find(p => p.id === activeProfileIdRef.current) || profilesRef.current[0];

                    if (!targetProfile) {
                        console.warn('[Discord Bot Event] No profile available for command:', cmd);
                        return;
                    }

                    console.log(`[Discord Bot Event] Processing '${cmd}' for profile "${targetProfile.profileName}" (ID: ${targetProfile.id})`);

                    if (cmd === 'start') {
                        executeServerStart(targetProfile.id);
                    } else if (cmd === 'stop') {
                        onStop(targetProfile.id);
                    } else if (cmd === 'restart') {
                        onRestart(false, targetProfile.id);
                    } else if (cmd === 'update') {
                        onUpdate(false, targetProfile.id);
                    } else if (cmd === 'get-status' || cmd === 'status') {
                        await sendDiscordStatusResponse(targetProfile);
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
}, [onStart, onStop, onRestart, onUpdate, updateProfile, setNotifications, executeServerStart, sendDiscordStatusResponse, handleWipeWildDinosOnStartup]);
  
  useEffect(() => {
    setActiveTab('config');
    setManagerLog([]);
    setServerLog([]);
    if (activeProfile?.path) {
        handleListBackups();
    } else {
        setBackups([]); 
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
        logoUrl: mod.logo?.url,
        authors: Array.isArray(mod.authors) ? mod.authors.map(a => a.name).join(', ') : undefined,
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

      console.group('🔧 [Save Config Debug]');
      console.log('1. Active Profile info:', {
          id: activeProf?.id,
          name: activeProf?.profileName,
          basePath: activeProf?.path,
          status: activeProf?.status
      });

      if (!activeProf || !activeProf.path) {
          console.error('❌ [Save Config] Aborted: activeProf or activeProf.path is null/empty!');
          console.groupEnd();
          onShowToast('Cannot save: Server installation path is not set.', 'error');
          return;
      }
      setIsSaving(true);
      try {
          console.log(`2. Resolving target INI config path for base path: "${activeProf.path}"...`);
          // Dynamically resolve existing or correct config directory structure
          const configPath = await iniParsingService.findIniConfigPath(activeProf.path);
          console.log(`3. Target config directory resolved to: "${configPath}"`);

          const dirExistsBefore = await fs.exists(configPath);
          console.log(`4. Target directory exists on disk before mkdir: ${dirExistsBefore}`);
          if (!dirExistsBefore) {
              console.log(`Creating target directory recursively: "${configPath}"...`);
              await fs.mkdir(configPath, { recursive: true });
              console.log(`Directory created successfully.`);
          }

          const { config } = activeProf;
          console.log('5. ServerConfig state to be written:', config);

          // GameUserSettings.ini: Server engine, network, and world server settings
          const gusIniLines = [
              `[ServerSettings]`,
              `SessionName=${config.sessionName}`,
              `ServerPassword=${config.serverPassword || ''}`,
              `ServerAdminPassword=${config.adminPassword || 'adminpassword'}`,
              `RCONEnabled=${config.bEnableRcon ? 'True' : 'False'}`,
              `RCONPort=${config.rconPort}`,
              `RCONServerAdminPassword=${config.rconPassword || ''}`,
              `ServerPVE=${config.bServerPVE ? 'True' : 'False'}`,
              `ServerCrosshair=${config.bServerCrosshair ? 'True' : 'False'}`,
              `ShowMapPlayerLocation=${config.bShowMapPlayerLocation ? 'True' : 'False'}`,
              `AllowThirdPersonPlayer=${config.bAllowThirdPersonPlayer ? 'True' : 'False'}`,
              `ShowFloatingDamageText=${config.bShowFloatingDamageText ? 'True' : 'False'}`,
              `AllowFlyerCarryPvE=${config.bAllowFlyerCarryPvE ? 'True' : 'False'}`,
              `ForceAllowCaveFlyers=${config.bForceAllowCaveFlyers ? 'True' : 'False'}`,
              `bForceCanRideFliers=${config.bForceCanRideFliers ? 'True' : 'False'}`,
              `DisableStructurePlacementCollision=${config.bDisableStructurePlacementCollision ? 'True' : 'False'}`,
              `AllowCaveBuildingPvE=${config.bAllowCaveBuildingPvE ? 'True' : 'False'}`,
              `PvEAllowStructuresAtSupplyDrops=${config.bPvEAllowStructuresAtSupplyDrops ? 'True' : 'False'}`,
              `AlwaysAllowStructurePickup=${config.bAlwaysAllowStructurePickup ? 'True' : 'False'}`,
              `AllowFlyingStaminaRecovery=${config.bAllowFlyingStaminaRecovery ? 'True' : 'False'}`,
              `StructurePickupTimeAfterPlacement=${(config.structurePickupTimeAfterPlacement ?? 30.0).toFixed(6)}`,
              `StructurePickupHoldDuration=0.500000`,
              `DisableStructureDecayPvE=${config.bDisableStructureDecayPvE ? 'True' : 'False'}`,
              `DisableDinoDecayPvE=${config.bDisableDinoDecayPvE ? 'True' : 'False'}`,
              `DifficultyOffset=${config.difficultyOffset.toFixed(6)}`,
              `OverrideOfficialDifficulty=${(config.overrideOfficialDifficulty ?? 5.0).toFixed(6)}`,
              `XPMultiplier=${config.xpMultiplier.toFixed(6)}`,
              `TamingSpeedMultiplier=${config.tamingSpeedMultiplier.toFixed(6)}`,
              `HarvestAmountMultiplier=${config.harvestAmountMultiplier.toFixed(6)}`,
              `DayTimeSpeedScale=${(config.dayTimeSpeedScale ?? 1.0).toFixed(6)}`,
              `NightTimeSpeedScale=${config.nightTimeSpeedScale.toFixed(6)}`,
              `AutoSavePeriodMinutes=${config.autoSavePeriodMinutes.toFixed(6)}`,
              `GlobalVoiceChat=${config.bGlobalVoiceChat ? 'True' : 'False'}`,
              `ProximityChat=${config.bProximityChat ? 'True' : 'False'}`,
              `NoTributeDownloads=${config.bNoTributeDownloads ? 'True' : 'False'}`,
              `PreventDownloadSurvivors=${config.bPreventDownloadSurvivors ? 'True' : 'False'}`,
              `PreventDownloadItems=${config.bPreventDownloadItems ? 'True' : 'False'}`,
              `PreventDownloadDinos=${config.bPreventDownloadDinos ? 'True' : 'False'}`,
              `EnablePvPGamma=False`,
              `DisablePvEGamma=False`,
          ];

          if (config.mods && config.mods.trim()) {
              gusIniLines.push(`ActiveMods=${config.mods.trim()}`);
          }

          // Custom lines appended to GameUserSettings.ini [ServerSettings]
          if (config.customGameUserSettingsIni && config.customGameUserSettingsIni.trim()) {
              gusIniLines.push(``, `; --- Custom GameUserSettings.ini Lines ---`);
              config.customGameUserSettingsIni.split(/\r?\n/).forEach(line => {
                  if (line.trim()) gusIniLines.push(line);
              });
          }

          gusIniLines.push(
              ``,
              `[MultiHome]`,
              `MultiHome=${config.rconIp || '0.0.0.0'}`,
              ``,
              `[/Script/Engine.GameSession]`,
              `MaxPlayers=${config.maxPlayers}`
          );

          const gusFilePath = await join(configPath, 'GameUserSettings.ini');
          const gusText = gusIniLines.join('\r\n');
          console.log(`6. Writing GameUserSettings.ini -> Path: "${gusFilePath}" (${gusIniLines.length} lines, ${gusText.length} chars)`);
          
          if (typeof fs.writeTextFile === 'function') {
              console.log('   Using fs.writeTextFile...');
              await fs.writeTextFile(gusFilePath, gusText);
          } else {
              console.log('   Using fs.writeFile (encoded bytes)...');
              await fs.writeFile(gusFilePath, new TextEncoder().encode(gusText));
          }

          const gusExistsAfter = await fs.exists(gusFilePath);
          console.log(`   GameUserSettings.ini write complete. Exists verification: ${gusExistsAfter}`);

          // Game.ini: Gameplay rules, breeding, drains, advanced XP, speed leveling, and tribe settings
          const gameIniLines = [
              `[/script/shootergame.shootergamemode]`,
              `MatingIntervalMultiplier=${config.matingIntervalMultiplier.toFixed(6)}`,
              `MatingSpeedMultiplier=${(config.matingSpeedMultiplier ?? 1.0).toFixed(6)}`,
              `EggHatchSpeedMultiplier=${config.eggHatchSpeedMultiplier.toFixed(6)}`,
              `BabyMatureSpeedMultiplier=${config.babyMatureSpeedMultiplier.toFixed(6)}`,
              `BabyFoodConsumptionSpeedMultiplier=${(config.babyFoodConsumptionSpeedMultiplier ?? 1.0).toFixed(6)}`,
              `BabyCuddleIntervalMultiplier=${(config.babyCuddleIntervalMultiplier ?? 1.0).toFixed(6)}`,
              `BabyCuddleGracePeriodMultiplier=${(config.babyCuddleGracePeriodMultiplier ?? 1.0).toFixed(6)}`,
              `BabyCuddleLoseImprintQualitySpeedMultiplier=${(config.babyCuddleLoseImprintQualitySpeedMultiplier ?? 1.0).toFixed(6)}`,
              `BabyImprintingStatScaleMultiplier=${(config.babyImprintingStatScaleMultiplier ?? 1.0).toFixed(6)}`,
              `bAllowAnyoneBabyImprintCuddle=${config.bAllowAnyoneBabyImprintCuddle ? 'True' : 'False'}`,
              `bDisableImprintDinoBuff=${config.bDisableImprintDinoBuff ? 'True' : 'False'}`,
              `PlayerCharacterWaterDrainMultiplier=${config.playerCharacterWaterDrainMultiplier.toFixed(6)}`,
              `PlayerCharacterFoodDrainMultiplier=${config.playerCharacterFoodDrainMultiplier.toFixed(6)}`,
              `PlayerCharacterStaminaDrainMultiplier=${(config.playerCharacterStaminaDrainMultiplier ?? 1.0).toFixed(6)}`,
              `PlayerCharacterHealthRecoveryMultiplier=${(config.playerCharacterHealthRecoveryMultiplier ?? 1.0).toFixed(6)}`,
              `DinoCharacterFoodDrainMultiplier=${config.dinoCharacterFoodDrainMultiplier.toFixed(6)}`,
              `DinoCharacterStaminaDrainMultiplier=${config.dinoCharacterStaminaDrainMultiplier.toFixed(6)}`,
              `DinoCharacterHealthRecoveryMultiplier=${config.dinoCharacterHealthRecoveryMultiplier.toFixed(6)}`,
              `TamedDinoDamageMultiplier=${config.tamedDinoDamageMultiplier.toFixed(6)}`,
              `TamedDinoResistanceMultiplier=${config.tamedDinoResistanceMultiplier.toFixed(6)}`,
              `HarvestHealthMultiplier=${config.harvestHealthMultiplier.toFixed(6)}`,
              `GlobalSpoilingTimeMultiplier=${config.itemSpoilingTimeMultiplier.toFixed(6)}`,
              `FuelConsumptionIntervalMultiplier=${config.fuelConsumptionIntervalMultiplier.toFixed(6)}`,
              `GlobalItemDecompositionTimeMultiplier=${(config.itemDecompositionTimeMultiplier ?? 1.0).toFixed(6)}`,
              `GlobalCorpseDecompositionTimeMultiplier=${(config.corpseDecompositionTimeMultiplier ?? 1.0).toFixed(6)}`,
              `CropGrowthSpeedMultiplier=${(config.cropGrowthSpeedMultiplier ?? 1.0).toFixed(6)}`,
              `CropDecaySpeedMultiplier=${(config.cropDecaySpeedMultiplier ?? 1.0).toFixed(6)}`,
              `LayEggIntervalMultiplier=${(config.layEggIntervalMultiplier ?? 1.0).toFixed(6)}`,
              `PoopIntervalMultiplier=${(config.poopIntervalMultiplier ?? 1.0).toFixed(6)}`,
              `KillXPMultiplier=${(config.killXPMultiplier ?? 1.0).toFixed(6)}`,
              `HarvestXPMultiplier=${(config.harvestXPMultiplier ?? 1.0).toFixed(6)}`,
              `CraftXPMultiplier=${(config.craftXPMultiplier ?? 1.0).toFixed(6)}`,
              `GenericXPMultiplier=${(config.genericXPMultiplier ?? 1.0).toFixed(6)}`,
              `SpecialXPMultiplier=${(config.specialXPMultiplier ?? 1.0).toFixed(6)}`,
              `bDisableFriendlyFire=${config.bDisableFriendlyFire ? 'True' : 'False'}`,
              `bPvEDisableFriendlyFire=${config.bPvEDisableFriendlyFire ? 'True' : 'False'}`,
              `bAllowFlyerSpeedLeveling=${config.bAllowFlyerSpeedLeveling ? 'True' : 'False'}`,
              `bAllowSpeedLeveling=${(config.bAllowSpeedLeveling ?? true) ? 'True' : 'False'}`,
              `bUseCorpseLocator=${(config.bUseCorpseLocator ?? true) ? 'True' : 'False'}`,
              `bAllowUnlimitedRespecs=${(config.bAllowUnlimitedRespecs ?? true) ? 'True' : 'False'}`,
              `bPassiveDefensesDamageRiderlessImprintedDino=${(config.bPassiveDefensesDamageRiderlessImprintedDino ?? true) ? 'True' : 'False'}`,
              `bAutoUnlockAllEngrams=${config.bAutoUnlockAllEngrams ? 'True' : 'False'}`,
          ];

          if (config.maxNumberOfPlayersInTribe && config.maxNumberOfPlayersInTribe > 0) {
              gameIniLines.push(`MaxNumberOfPlayersInTribe=${config.maxNumberOfPlayersInTribe}`);
          }

          // Dynamic / Structured NPC Spawn Entries (ConfigAddNPCSpawnEntriesContainer)
          if (config.npcSpawnEntries && config.npcSpawnEntries.length > 0) {
              gameIniLines.push(``, `; --- Custom NPC Spawn Entries ---`);
              config.npcSpawnEntries.forEach(entry => {
                  if (entry.enabled) {
                      if (entry.rawOverride && entry.rawOverride.trim()) {
                          gameIniLines.push(entry.rawOverride.trim());
                      } else {
                          const container = entry.containerClass.trim();
                          const npc = entry.npcClass.trim();
                          const name = (entry.name || 'CustomDino').trim();
                          const weight = typeof entry.entryWeight === 'number' ? entry.entryWeight : 1.0;
                          const maxPct = typeof entry.maxPercentage === 'number' ? entry.maxPercentage : 0.2;
                          gameIniLines.push(
                              `ConfigAddNPCSpawnEntriesContainer=(NPCSpawnEntriesContainerClassString="${container}",NPCSpawnEntries=((AnEntryName="${name}",EntryWeight=${weight.toFixed(2)},NPCsToSpawnStrings=("${npc}"))),NPCClassString="${npc}",MaxPercentageOfDesiredNumToAllow=${maxPct.toFixed(2)})`
                          );
                      }
                  }
              });
          }

          // Custom lines appended to Game.ini [/script/shootergame.shootergamemode]
          if (config.customGameIni && config.customGameIni.trim()) {
              gameIniLines.push(``, `; --- Custom Game.ini Lines ---`);
              config.customGameIni.split(/\r?\n/).forEach(line => {
                  if (line.trim()) gameIniLines.push(line);
              });
          }

          const gameFilePath = await join(configPath, 'Game.ini');
          const gameText = gameIniLines.join('\r\n');
          console.log(`7. Writing Game.ini -> Path: "${gameFilePath}" (${gameIniLines.length} lines, ${gameText.length} chars)`);

          if (typeof fs.writeTextFile === 'function') {
              console.log('   Using fs.writeTextFile...');
              await fs.writeTextFile(gameFilePath, gameText);
          } else {
              console.log('   Using fs.writeFile (encoded bytes)...');
              await fs.writeFile(gameFilePath, new TextEncoder().encode(gameText));
          }

          const gameExistsAfter = await fs.exists(gameFilePath);
          console.log(`   Game.ini write complete. Exists verification: ${gameExistsAfter}`);

          console.log(`✅ [Save Config] Both INI files saved successfully to "${configPath}"`);

          // Attempt to start or synchronize discord bots for configured profiles
          await syncDiscordBots(profilesRef.current);

          console.groupEnd();

          setManagerLog(prev => [...prev, `[Manager] Config saved to: ${configPath}`]);
          onShowToast("Settings saved successfully!", 'success');
      } catch (error) {
          console.error("❌ [Save Config Error] Failed to save settings:", error);
          console.groupEnd();
          onShowToast(`Error saving settings: ${error instanceof Error ? error.message : String(error)}`, 'error');
      }
      setIsSaving(false);
  };
  handleSaveConfigRef.current = handleSaveConfig;
  
  const onUpdateMap = useCallback(async () => {
    if (!activeProfile || !activeProfile.path) return;
    setIsUpdatingMap(true);
    setIsMapUpdateFinished(false);
    setMapUpdateLog(['Initializing map update...']);
    const rootPath = directoryService.getRootInstallPath(activeProfile.path);
    try {
      await invoke('update_map', {
        installPath: rootPath,
        serverPath: rootPath,
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
    const rootPath = directoryService.getRootInstallPath(activeProfile.path);

    try {
        await invoke('update_mods', {
            installPath: rootPath,
            serverPath: rootPath,
            modIds: activeProfile.config.mods
        });
    } catch (error: any) {
        setModUpdateLog(prev => [...prev, `❌ ERROR: Failed to start mod update process: ${error}`]);
        setIsModUpdateFinished(true);
    }
  }, [activeProfile]);

  const onCreateProfile = () => {
    const defaultIp = localIps[0] || '127.0.0.1';
    const newProfile: ServerProfile = {
      id: Date.now().toString(),
      profileName: `Server Profile ${profiles.length + 1}`,
      path: null,
      status: ServerStatus.NotInstalled,
      config: getDefaultServerConfig(profiles.length, defaultIp),
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
        log(`[*] Initializing config structure in root...`);
        
        // Ensure the config directory structure exists directly in the selected path
        await fs.mkdir(await join(selectedPath, 'ShooterGame', 'Saved', 'Config', 'WindowsServer'), { recursive: true });
        
        const updatedProfile = { ...activeProfile, path: selectedPath, status: ServerStatus.Stopped };
        const newProfiles = profiles.map(p => p.id === activeProfile.id ? updatedProfile : p);
        
        setProfiles(newProfiles);
        await directoryService.saveProfiles(newProfiles);

        const foundConfig = await checkForExistingConfig(selectedPath);
        
        if (!foundConfig) {
          log("✅ Structure initialized! You can now use 'Update Server Files' to download the game.");
          setTimeout(() => setIsInstalling(false), 4000);
        }

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
        }, 20000); 

        try {
            const { rconPort, rconPassword, rconIp, adminPassword } = activeProfile.config;
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
        defaultSaveWorld={activeProfile?.config.saveWorldOnStopRestart ?? true}
      />
      <ShutdownModal
        isOpen={isRestartModalOpen}
        onClose={() => setIsRestartModalOpen(false)}
        onConfirm={handleInitiateTimedRestart}
        type="restart"
        defaultSaveWorld={activeProfile?.config.saveWorldOnStopRestart ?? true}
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
      <ServerStartErrorModal
        isOpen={startErrorModalState.isOpen}
        onClose={() => setStartErrorModalState(prev => ({ ...prev, isOpen: false }))}
        profile={startErrorModalState.profile}
        errorMessage={startErrorModalState.error}
        expectedPaths={startErrorModalState.paths}
        launchArgs={startErrorModalState.args}
        onOpenConsole={() => setActiveTab('console')}
      />

      {status === ServerStatus.Updating && (
          <UpdateProgressModal 
            log={updateLog} 
            isFinished={isUpdateFinished}
            profileName={activeProfile?.profileName}
            onClose={() => updateProfile(activeProfileId!, { status: ServerStatus.Stopped })}
            onCancelUpdate={handleCancelUpdate}
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
                            onStart={() => onStart()} 
                            onStop={() => onStop()} 
                            onRestart={() => onRestart(false)}
                            onUpdate={(forceClean) => onUpdate(false, undefined, forceClean !== false)}
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
                                    onClick={() => setActiveTab('analytics')}
                                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === 'analytics'
                                        ? 'border-cyan-500 text-cyan-400'
                                        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
                                    }`}
                                >
                                    Analytics
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
                        onSave={handleSaveConfig}
                        isSaving={isSaving}
                        isActionInProgress={isActionInProgress}
                      />
                  )}
                  {activeTab === 'clustering' && (
                      <ClusterVisualization 
                        profiles={profiles}
                        onSelectProfile={setActiveProfileId}
                      />
                  )}
                  {activeTab === 'analytics' && (
                      <AnalyticsDashboard 
                        profileId={activeProfile.id}
                        profileName={activeProfile.profileName}
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
