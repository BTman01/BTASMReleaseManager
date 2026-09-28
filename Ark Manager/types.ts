

export enum ServerStatus {
  Verifying = 'VERIFYING',
  NotInstalled = 'NOT_INSTALLED',
  Stopped = 'STOPPED',
  Running = 'RUNNING',
  Updating = 'UPDATING',
  Starting = 'STARTING',
  Stopping = 'STOPPING',
  Restarting = 'RESTARTING',
  Error = 'ERROR'
}

export interface ServerConfig {
  sessionName: string;
  adminPassword?: string;
  serverPassword?: string;
  map: string;
  maxPlayers: number;
  mods: string;
  queryPort: number;
  gamePort: number;
  rconIp: string;
  rconPort: number;
  rconPassword?: string;
  bEnableRcon: boolean;
  bDisableBattleEye: boolean;
  serverPlatform: 'All' | 'PC';
  
  // Game & General Multipliers (GameUserSettings.ini [ServerSettings])
  xpMultiplier: number;
  tamingSpeedMultiplier: number;
  harvestAmountMultiplier: number;
  difficultyOffset: number;
  overrideOfficialDifficulty: number; // e.g. 5.0 for max level 150 wild dinos
  dayTimeSpeedScale: number;
  nightTimeSpeedScale: number;
  autoSavePeriodMinutes: number;

  // General Rates & XP Multipliers (Game.ini [/script/shootergame.shootergamemode])
  harvestHealthMultiplier: number;
  killXPMultiplier: number;
  harvestXPMultiplier: number;
  craftXPMultiplier: number;
  genericXPMultiplier: number;
  specialXPMultiplier: number;

  // Breeding & Maturation (Game.ini [/script/shootergame.shootergamemode])
  matingIntervalMultiplier: number;
  matingSpeedMultiplier: number;
  eggHatchSpeedMultiplier: number;
  babyMatureSpeedMultiplier: number;
  babyFoodConsumptionSpeedMultiplier: number;
  babyCuddleIntervalMultiplier: number;
  babyCuddleGracePeriodMultiplier: number;
  babyCuddleLoseImprintQualitySpeedMultiplier: number;
  babyImprintingStatScaleMultiplier: number;
  bAllowAnyoneBabyImprintCuddle: boolean;
  bDisableImprintDinoBuff: boolean;

  // Player Settings (GameUserSettings.ini & Game.ini)
  bServerPVE: boolean;
  bAllowThirdPersonPlayer: boolean;
  bShowFloatingDamageText: boolean;
  bServerCrosshair: boolean;
  bShowMapPlayerLocation: boolean;
  bGlobalVoiceChat: boolean;
  bProximityChat: boolean;
  playerCharacterWaterDrainMultiplier: number;
  playerCharacterFoodDrainMultiplier: number;
  playerCharacterStaminaDrainMultiplier: number;
  playerCharacterHealthRecoveryMultiplier: number;
  bAllowSpeedLeveling: boolean; // ASA setting: allow leveling movement speed on player & dinos
  bUseCorpseLocator: boolean; // Green beacon light on corpse
  bAllowUnlimitedRespecs: boolean; // Unlimited Mindwipe Tonics
  bAutoUnlockAllEngrams: boolean; // Game.ini bAutoUnlockAllEngrams=True / bAutoUnlockEngrams=True (Auto unlocks all engrams as player levels up)

  // Dino Settings (GameUserSettings.ini & Game.ini)
  bAllowFlyerCarryPvE: boolean;
  bAllowFlyingStaminaRecovery: boolean;
  bAllowFlyerSpeedLeveling: boolean; // ASA setting: allow leveling flyer movement speed
  bForceAllowCaveFlyers: boolean; // ForceAllowCaveFlyers=True (Allows flyer dinos to be ridden inside caves)
  bForceCanRideFliers: boolean; // Forces flyer riding on maps/areas like Genesis & caves
  dinoCharacterFoodDrainMultiplier: number;
  dinoCharacterStaminaDrainMultiplier: number;
  dinoCharacterHealthRecoveryMultiplier: number;
  tamedDinoDamageMultiplier: number;
  tamedDinoResistanceMultiplier: number;
  layEggIntervalMultiplier: number;
  poopIntervalMultiplier: number;

  // World, Spoil & Decomposition (Game.ini)
  itemSpoilingTimeMultiplier: number; // GlobalSpoilingTimeMultiplier
  fuelConsumptionIntervalMultiplier: number;
  itemDecompositionTimeMultiplier: number; // GlobalItemDecompositionTimeMultiplier
  corpseDecompositionTimeMultiplier: number; // GlobalCorpseDecompositionTimeMultiplier
  cropGrowthSpeedMultiplier: number;
  cropDecaySpeedMultiplier: number;

  // Structure & Building Settings (GameUserSettings.ini & Game.ini)
  bDisableStructurePlacementCollision: boolean;
  bAllowCaveBuildingPvE: boolean;
  bPvEAllowStructuresAtSupplyDrops: boolean;
  bAlwaysAllowStructurePickup: boolean;
  structurePickupTimeAfterPlacement: number; // in seconds
  bDisableStructureDecayPvE: boolean;
  bDisableDinoDecayPvE: boolean;
  bDisableFriendlyFire: boolean;
  bPvEDisableFriendlyFire: boolean;
  bPassiveDefensesDamageRiderlessImprintedDino: boolean;
  maxNumberOfPlayersInTribe: number;

  // Tribute & Transfer Settings (GameUserSettings.ini [ServerSettings])
  bNoTributeDownloads: boolean;
  bPreventDownloadSurvivors: boolean;
  bPreventDownloadItems: boolean;
  bPreventDownloadDinos: boolean;

  // Custom INI Lines & Dino Spawn Entries
  npcSpawnEntries?: NpcSpawnEntry[];
  customGameIni?: string; // Custom lines appended into Game.ini [/script/shootergame.shootergamemode]
  customGameUserSettingsIni?: string; // Custom lines appended into GameUserSettings.ini [ServerSettings]
  customCommandLineArgs?: string; // Custom launch parameters passed to ArkAscendedServer.exe upon server start

  // CPU Affinity & Process Optimization
  bEnableCpuAffinity?: boolean; // Enable CPU core affinity constraint
  cpuAffinityCores?: number[];  // Specific logical core indices selected (e.g. [0, 1, 2, 3])
  cpuAffinityMask?: string;     // Hex affinity mask string (e.g. "F", "0xF", "FF")

  // Automation Settings
  launchOnAppStart?: boolean; // Automatically launch this server when the application opens
  autoUpdateEnabled: boolean;
  autoUpdateFrequency: number; // in minutes
  autoInstallUpdates: boolean; // Auto update when game update is available
  autoUpdateWaitForRestart: boolean; // Wait for next scheduled server restart vs immediate update
  scheduledRestartEnabled: boolean;
  scheduledRestartTime: string; // HH:MM format
  scheduledRestartReason?: string; // Optional message/reason broadcast in chat with restart countdown
  updateOnRestart: boolean;
  wipeWildDinosOnRestart: boolean; // Wipe wild dinos (DestroyWildDinos/wipewilddinos) as soon as server comes up after automated restart
  saveWorldOnStopRestart: boolean; // Automatically execute SaveWorld via RCON before stopping or restarting server
  restartAnnouncementMinutes: number; // Lead time for restart announcements

  // Clustering
  bEnableClustering: boolean;
  clusterId: string;
  clusterDirOverride: string;

  // Discord Integration
  discordWebhookUrl: string;
  discordNotificationsEnabled: boolean;
  discordBotToken: string;
  discordBotEnabled: boolean;
  discordBotChannelId: string;
}

export interface ServerProfile {
  id: string;
  profileName: string;
  path: string | null;
  config: ServerConfig;
  status: ServerStatus;
  modAnalysis?: ModAnalysisResult | null;

  // Update Status
  currentBuildId?: string;
  latestBuildId?: string;

  lastUpdateCheck?: string; // ISO String
  
  // Real-time Stats
  uptime?: number; // in seconds
  memoryUsage?: number; // in bytes
  playerCount?: number;
  pid?: number; // Process ID for monitoring
}

export interface PlayerInfo {
  name: string;
  steamId: string;
  playTime: number; // in seconds
}

export interface ModAnalysis {
  id: string;
  name: string;
  summary: string;
  logoUrl?: string;
  authors?: string;
}

export interface ModAnalysisResult {
  modAnalyses: ModAnalysis[];
  overallSummary: string;
  potentialConflicts: string[];
}

export interface CurseForgeMod {
  id: number;
  name: string;
  summary: string;
  logo: {
    url: string;
  };
  authors: {
    name: string;
  }[];
}

export interface BackupInfo {
  filename: string;
  created_at: string;
  size: number;
}

export interface AppSettings {
  startWithWindows: boolean;
  theme: 'dark' | 'light';
  notificationsEnabled: boolean;
  defaultServerPath: string | null;
  autoSaveOnStart: boolean;
}

export interface AppNotification {
  id: string; // e.g., `update-${profileId}` or `restart-${profileId}`
  type: 'update' | 'restart';
  profileId: string;
  profileName: string;
  message: string;
  read: boolean;
}

export interface PlayerEventPayload {
  profileId: string;
  playerId: string;
  playerName: string;
}

export type RconDiagnosticStatus = 'Success' | 'Failure';

export interface RconDiagnosticStep {
    name: string;
    status: RconDiagnosticStatus;
    details: string;
}

export interface AnalyticsDataPoint {
  profileId: string;
  timestamp: number;
  memoryUsage: number; // in bytes
  playerCount: number;
}

export interface NpcSpawnEntry {
  id: string;
  name: string; // e.g. "Griffin"
  containerClass: string; // e.g. "DinoSpawnEntries_ChalkHills_C" or "DinoSpawnEntriesMountain_C"
  npcClass: string; // e.g. "Griffin_Character_BP_C"
  entryWeight: number; // e.g. 1.0
  maxPercentage: number; // e.g. 0.2
  enabled: boolean;
  rawOverride?: string; // Optional custom raw INI line
}

export interface OfficialServerStatus {
  raw: string;
  statusText: string;
  version: string | null;
  isOnline: boolean;
  statusType: 'online' | 'degraded' | 'offline' | 'unknown';
  color?: string;
  lastChecked: Date;
  error?: string | null;
}
