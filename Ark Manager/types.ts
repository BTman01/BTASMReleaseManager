

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
  
  // Game Settings
  xpMultiplier: number;
  tamingSpeedMultiplier: number;
  harvestAmountMultiplier: number;
  matingIntervalMultiplier: number;
  eggHatchSpeedMultiplier: number;
  babyMatureSpeedMultiplier: number;
  
  // Player Settings
  bAllowThirdPersonPlayer: boolean;
  bShowFloatingDamageText: boolean;
  bAllowFlyerCarryPvE: boolean;
  bDisableStructurePlacementCollision: boolean;
  bServerPVE: boolean;

  // Automation Settings
  autoUpdateEnabled: boolean;
  autoUpdateFrequency: number; // in minutes
  scheduledRestartEnabled: boolean;
  scheduledRestartTime: string; // HH:MM format
  updateOnRestart: boolean;
  restartAnnouncementMinutes: number; // New: Lead time for restart announcements

  // New Detailed Settings
  // Player
  playerCharacterWaterDrainMultiplier: number;
  playerCharacterFoodDrainMultiplier: number;
  bServerCrosshair: boolean;
  bShowMapPlayerLocation: boolean;
  bGlobalVoiceChat: boolean;
  bProximityChat: boolean;

  // Dino
  dinoCharacterFoodDrainMultiplier: number;
  dinoCharacterStaminaDrainMultiplier: number;
  dinoCharacterHealthRecoveryMultiplier: number;
  bAllowAnyoneBabyImprintCuddle: boolean;
  bAllowFlyingStaminaRecovery: boolean;
  bDisableImprintDinoBuff: boolean;
  tamedDinoDamageMultiplier: number;
  tamedDinoResistanceMultiplier: number;

  // World & Server
  difficultyOffset: number;
  nightTimeSpeedScale: number;
  harvestHealthMultiplier: number;
  autoSavePeriodMinutes: number;
  bDisableFriendlyFire: boolean;
  itemSpoilingTimeMultiplier: number;

  // Structure
  bAllowCaveBuildingPvE: boolean;
  bAlwaysAllowStructurePickup: boolean;
  fuelConsumptionIntervalMultiplier: number;

  // Transfers
  bNoTributeDownloads: boolean;
  bPreventDownloadSurvivors: boolean;
  bPreventDownloadItems: boolean;
  bPreventDownloadDinos: boolean;

  // Clustering
  bEnableClustering: boolean;
  clusterId: string;
  clusterDirOverride: string;

  // Discord Integration
  discordWebhookUrl: string;
  discordNotificationsEnabled: boolean;
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