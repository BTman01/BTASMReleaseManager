import * as fs from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { ServerConfig, NpcSpawnEntry } from '../types';

/**
 * Parses ConfigAddNPCSpawnEntriesContainer lines from Game.ini
 */
export const parseSpawnEntriesFromIni = (gameIniContent: string): NpcSpawnEntry[] => {
    const entries: NpcSpawnEntry[] = [];
    const lines = gameIniContent.split(/\r?\n/);
    let counter = 0;
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.toLowerCase().startsWith('configaddnpcspawnentriescontainer=')) {
            counter++;
            const val = trimmed.substring(trimmed.indexOf('=') + 1).trim();
            const containerMatch = val.match(/NPCSpawnEntriesContainerClassString\s*=\s*["']?([^"',)]+)["']?/i);
            const entryNameMatch = val.match(/AnEntryName\s*=\s*["']?([^"',)]+)["']?/i);
            const weightMatch = val.match(/EntryWeight\s*=\s*([0-9.]+)/i);
            const npcClassMatch = val.match(/NPCClassString\s*=\s*["']?([^"',)]+)["']?/i) || val.match(/NPCsToSpawnStrings\s*=\s*\(\s*["']?([^"',)]+)["']?\s*\)/i);
            const maxPctMatch = val.match(/MaxPercentageOfDesiredNumToAllow\s*=\s*([0-9.]+)/i);

            const containerClass = containerMatch ? containerMatch[1] : 'DinoSpawnEntries_ChalkHills_C';
            const npcClass = npcClassMatch ? npcClassMatch[1] : 'Griffin_Character_BP_C';
            const name = entryNameMatch ? entryNameMatch[1] : (npcClass.replace(/_Character_BP_C$/i, '').replace(/_C$/i, '') || `Spawn ${counter}`);
            const entryWeight = weightMatch ? parseFloat(weightMatch[1]) : 1.0;
            const maxPercentage = maxPctMatch ? parseFloat(maxPctMatch[1]) : 0.2;

            entries.push({
                id: `spawn-imported-${counter}-${Date.now()}`,
                name,
                containerClass,
                npcClass,
                entryWeight: isNaN(entryWeight) ? 1.0 : entryWeight,
                maxPercentage: isNaN(maxPercentage) ? 0.2 : maxPercentage,
                enabled: true,
                rawOverride: trimmed,
            });
        }
    }
    return entries;
};

/**
 * Parses INI content into a normalized record of sections and key-value pairs (case-insensitive keys).
 */
const parseIni = (content: string): Record<string, Record<string, string>> => {
    const sections: Record<string, Record<string, string>> = {};
    let currentSection = '';
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith(';') || trimmedLine.startsWith('#')) continue;
        if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
            currentSection = trimmedLine.substring(1, trimmedLine.length - 1).toLowerCase();
            if (!sections[currentSection]) sections[currentSection] = {};
            continue;
        }
        const separatorIndex = trimmedLine.indexOf('=');
        if (separatorIndex !== -1 && currentSection) {
            const rawKey = trimmedLine.substring(0, separatorIndex).trim();
            const value = trimmedLine.substring(separatorIndex + 1).trim();
            sections[currentSection][rawKey.toLowerCase()] = value;
        }
    }
    return sections;
};

/**
 * Searches for a value across multiple possible sections and alias keys (case-insensitive).
 */
const getIniValue = (
    sections: Array<Record<string, string> | undefined>,
    ...keys: string[]
): string | undefined => {
    for (const sec of sections) {
        if (!sec) continue;
        for (const key of keys) {
            const lowerKey = key.toLowerCase();
            if (sec[lowerKey] !== undefined) {
                return sec[lowerKey];
            }
        }
    }
    return undefined;
};

const getIniBool = (
    sections: Array<Record<string, string> | undefined>,
    ...keys: string[]
): boolean | undefined => {
    const val = getIniValue(sections, ...keys);
    if (val === undefined) return undefined;
    const lower = val.toLowerCase();
    return lower === 'true' || lower === '1';
};

const getIniFloat = (
    sections: Array<Record<string, string> | undefined>,
    ...keys: string[]
): number | undefined => {
    const val = getIniValue(sections, ...keys);
    if (val === undefined) return undefined;
    const num = parseFloat(val);
    return isNaN(num) ? undefined : num;
};

const getIniInt = (
    sections: Array<Record<string, string> | undefined>,
    ...keys: string[]
): number | undefined => {
    const val = getIniValue(sections, ...keys);
    if (val === undefined) return undefined;
    const num = parseInt(val, 10);
    return isNaN(num) ? undefined : num;
};

const mapIniToConfig = (
    gus: Record<string, Record<string, string>>,
    game: Record<string, Record<string, string>>
): Partial<ServerConfig> => {
    const config: Partial<ServerConfig> = {};

    const gusServerSettings = gus['serversettings'];
    const gusSessionSettings = gus['sessionsettings'];
    const gusMultiHome = gus['multihome'];
    const gusGameSession = gus['/script/engine.gamesession'];
    const gusShooterSettings = gus['/script/shootergame.shootergameusersettings'];

    const gameShooterMode = game['/script/shootergame.shootergamemode'];

    const allGusSections = [gusServerSettings, gusShooterSettings, gusSessionSettings];
    const allGameSections = [gameShooterMode];
    const bothFiles = [gusServerSettings, gameShooterMode, gusShooterSettings, gusSessionSettings];

    // Identity & Passwords
    const sessionName = getIniValue([gusServerSettings, gusSessionSettings], 'SessionName', 'ServerName');
    if (sessionName !== undefined) config.sessionName = sessionName;

    const serverPassword = getIniValue([gusServerSettings], 'ServerPassword');
    if (serverPassword !== undefined) config.serverPassword = serverPassword.split('?')[0];

    const adminPassword = getIniValue([gusServerSettings], 'ServerAdminPassword');
    if (adminPassword !== undefined) config.adminPassword = adminPassword.split('?')[0];

    // RCON
    const rconEnabled = getIniBool([gusServerSettings], 'RCONEnabled', 'bEnableRcon');
    if (rconEnabled !== undefined) config.bEnableRcon = rconEnabled;

    const rconPort = getIniInt([gusServerSettings], 'RCONPort');
    if (rconPort !== undefined) config.rconPort = rconPort;

    const rconPassword = getIniValue([gusServerSettings], 'RCONServerAdminPassword', 'RCONPassword');
    if (rconPassword !== undefined) config.rconPassword = rconPassword;

    const rconIp = getIniValue([gusMultiHome, gusServerSettings], 'MultiHome', 'RCONIp');
    if (rconIp !== undefined) config.rconIp = rconIp;

    // Ports & Max Players
    const gamePort = getIniInt([gusSessionSettings, gusServerSettings], 'Port');
    if (gamePort !== undefined) config.gamePort = gamePort;

    const queryPort = getIniInt([gusSessionSettings, gusServerSettings], 'QueryPort');
    if (queryPort !== undefined) config.queryPort = queryPort;

    const maxPlayers = getIniInt([gusGameSession, gusSessionSettings, gusServerSettings], 'MaxPlayers', 'WinLiveMaxPlayers');
    if (maxPlayers !== undefined) config.maxPlayers = maxPlayers;

    const mapName = getIniValue([gusServerSettings, gusSessionSettings], 'MapName');
    if (mapName !== undefined) config.map = mapName;

    // Active Mods
    const activeMods = getIniValue(bothFiles, 'ActiveMods', 'mods');
    if (activeMods !== undefined) config.mods = activeMods;

    // Rates & Multipliers (GameUserSettings.ini [ServerSettings])
    const xpMult = getIniFloat([gusServerSettings, gameShooterMode], 'XPMultiplier');
    if (xpMult !== undefined) config.xpMultiplier = xpMult;

    const tamingMult = getIniFloat([gusServerSettings, gameShooterMode], 'TamingSpeedMultiplier');
    if (tamingMult !== undefined) config.tamingSpeedMultiplier = tamingMult;

    const harvestAmountMult = getIniFloat([gusServerSettings, gameShooterMode], 'HarvestAmountMultiplier');
    if (harvestAmountMult !== undefined) config.harvestAmountMultiplier = harvestAmountMult;

    const diffOffset = getIniFloat([gusServerSettings], 'DifficultyOffset');
    if (diffOffset !== undefined) config.difficultyOffset = diffOffset;

    const overrideOfficialDiff = getIniFloat([gusServerSettings], 'OverrideOfficialDifficulty');
    if (overrideOfficialDiff !== undefined) config.overrideOfficialDifficulty = overrideOfficialDiff;

    const daySpeed = getIniFloat([gusServerSettings], 'DayTimeSpeedScale');
    if (daySpeed !== undefined) config.dayTimeSpeedScale = daySpeed;

    const nightSpeed = getIniFloat([gusServerSettings], 'NightTimeSpeedScale');
    if (nightSpeed !== undefined) config.nightTimeSpeedScale = nightSpeed;

    const autoSaveMins = getIniFloat([gusServerSettings], 'AutoSavePeriodMinutes');
    if (autoSaveMins !== undefined) config.autoSavePeriodMinutes = autoSaveMins;

    // XP Breakdown (Game.ini)
    const harvestHealth = getIniFloat(bothFiles, 'HarvestHealthMultiplier');
    if (harvestHealth !== undefined) config.harvestHealthMultiplier = harvestHealth;

    const killXp = getIniFloat(allGameSections, 'KillXPMultiplier');
    if (killXp !== undefined) config.killXPMultiplier = killXp;

    const harvestXp = getIniFloat(allGameSections, 'HarvestXPMultiplier');
    if (harvestXp !== undefined) config.harvestXPMultiplier = harvestXp;

    const craftXp = getIniFloat(allGameSections, 'CraftXPMultiplier');
    if (craftXp !== undefined) config.craftXPMultiplier = craftXp;

    const genericXp = getIniFloat(allGameSections, 'GenericXPMultiplier');
    if (genericXp !== undefined) config.genericXPMultiplier = genericXp;

    const specialXp = getIniFloat(allGameSections, 'SpecialXPMultiplier');
    if (specialXp !== undefined) config.specialXPMultiplier = specialXp;

    // Breeding & Maturation (Game.ini)
    const matingInt = getIniFloat(bothFiles, 'MatingIntervalMultiplier');
    if (matingInt !== undefined) config.matingIntervalMultiplier = matingInt;

    const matingSpeed = getIniFloat(bothFiles, 'MatingSpeedMultiplier');
    if (matingSpeed !== undefined) config.matingSpeedMultiplier = matingSpeed;

    const eggHatch = getIniFloat(bothFiles, 'EggHatchSpeedMultiplier');
    if (eggHatch !== undefined) config.eggHatchSpeedMultiplier = eggHatch;

    const babyMature = getIniFloat(bothFiles, 'BabyMatureSpeedMultiplier');
    if (babyMature !== undefined) config.babyMatureSpeedMultiplier = babyMature;

    const babyFood = getIniFloat(bothFiles, 'BabyFoodConsumptionSpeedMultiplier');
    if (babyFood !== undefined) config.babyFoodConsumptionSpeedMultiplier = babyFood;

    const cuddleInt = getIniFloat(bothFiles, 'BabyCuddleIntervalMultiplier');
    if (cuddleInt !== undefined) config.babyCuddleIntervalMultiplier = cuddleInt;

    const cuddleGrace = getIniFloat(bothFiles, 'BabyCuddleGracePeriodMultiplier');
    if (cuddleGrace !== undefined) config.babyCuddleGracePeriodMultiplier = cuddleGrace;

    const cuddleLose = getIniFloat(bothFiles, 'BabyCuddleLoseImprintQualitySpeedMultiplier');
    if (cuddleLose !== undefined) config.babyCuddleLoseImprintQualitySpeedMultiplier = cuddleLose;

    const imprintStat = getIniFloat(bothFiles, 'BabyImprintingStatScaleMultiplier');
    if (imprintStat !== undefined) config.babyImprintingStatScaleMultiplier = imprintStat;

    const allowAnyoneImprint = getIniBool(bothFiles, 'AllowAnyoneBabyImprintCuddle', 'bAllowAnyoneBabyImprintCuddle');
    if (allowAnyoneImprint !== undefined) config.bAllowAnyoneBabyImprintCuddle = allowAnyoneImprint;

    const disableImprintBuff = getIniBool(bothFiles, 'DisableImprintDinoBuff', 'bDisableImprintDinoBuff');
    if (disableImprintBuff !== undefined) config.bDisableImprintDinoBuff = disableImprintBuff;

    // Player Settings
    const serverPve = getIniBool(allGusSections, 'ServerPVE', 'bServerPVE');
    if (serverPve !== undefined) config.bServerPVE = serverPve;

    const allowThirdPerson = getIniBool(allGusSections, 'AllowThirdPersonPlayer', 'bAllowThirdPersonPlayer');
    if (allowThirdPerson !== undefined) config.bAllowThirdPersonPlayer = allowThirdPerson;

    const floatingDamage = getIniBool(allGusSections, 'ShowFloatingDamageText', 'bShowFloatingDamageText');
    if (floatingDamage !== undefined) config.bShowFloatingDamageText = floatingDamage;

    const crosshair = getIniBool(allGusSections, 'ServerCrosshair', 'bServerCrosshair');
    if (crosshair !== undefined) config.bServerCrosshair = crosshair;

    const mapLocation = getIniBool(allGusSections, 'ShowMapPlayerLocation', 'bShowMapPlayerLocation');
    if (mapLocation !== undefined) config.bShowMapPlayerLocation = mapLocation;

    const globalVoice = getIniBool(allGusSections, 'GlobalVoiceChat', 'bGlobalVoiceChat');
    if (globalVoice !== undefined) config.bGlobalVoiceChat = globalVoice;

    const proxChat = getIniBool(allGusSections, 'ProximityChat', 'bProximityChat');
    if (proxChat !== undefined) config.bProximityChat = proxChat;

    const playerWaterDrain = getIniFloat(bothFiles, 'PlayerCharacterWaterDrainMultiplier');
    if (playerWaterDrain !== undefined) config.playerCharacterWaterDrainMultiplier = playerWaterDrain;

    const playerFoodDrain = getIniFloat(bothFiles, 'PlayerCharacterFoodDrainMultiplier');
    if (playerFoodDrain !== undefined) config.playerCharacterFoodDrainMultiplier = playerFoodDrain;

    const playerStamDrain = getIniFloat(bothFiles, 'PlayerCharacterStaminaDrainMultiplier');
    if (playerStamDrain !== undefined) config.playerCharacterStaminaDrainMultiplier = playerStamDrain;

    const playerHealthRecov = getIniFloat(bothFiles, 'PlayerCharacterHealthRecoveryMultiplier');
    if (playerHealthRecov !== undefined) config.playerCharacterHealthRecoveryMultiplier = playerHealthRecov;

    const allowSpeedLeveling = getIniBool(bothFiles, 'bAllowSpeedLeveling', 'AllowSpeedLeveling');
    if (allowSpeedLeveling !== undefined) config.bAllowSpeedLeveling = allowSpeedLeveling;

    const corpseLocator = getIniBool(bothFiles, 'bUseCorpseLocator', 'UseCorpseLocator');
    if (corpseLocator !== undefined) config.bUseCorpseLocator = corpseLocator;

    const unlimitedRespecs = getIniBool(bothFiles, 'bAllowUnlimitedRespecs', 'AllowUnlimitedRespecs');
    if (unlimitedRespecs !== undefined) config.bAllowUnlimitedRespecs = unlimitedRespecs;

    const autoUnlockEngrams = getIniBool(bothFiles, 'bAutoUnlockAllEngrams', 'AutoUnlockAllEngrams', 'bAutoUnlockEngrams', 'AutoUnlockEngrams');
    if (autoUnlockEngrams !== undefined) config.bAutoUnlockAllEngrams = autoUnlockEngrams;

    // Dino Settings
    const flyerCarry = getIniBool(bothFiles, 'AllowFlyerCarryPvE', 'AllowFlyerCarryPVE', 'bAllowFlyerCarryPvE', 'bAllowFlyerCarryPVE');
    if (flyerCarry !== undefined) config.bAllowFlyerCarryPvE = flyerCarry;

    const flyerStam = getIniBool(bothFiles, 'AllowFlyingStaminaRecovery', 'bAllowFlyingStaminaRecovery');
    if (flyerStam !== undefined) config.bAllowFlyingStaminaRecovery = flyerStam;

    const flyerSpeed = getIniBool(bothFiles, 'bAllowFlyerSpeedLeveling', 'AllowFlyerSpeedLeveling');
    if (flyerSpeed !== undefined) config.bAllowFlyerSpeedLeveling = flyerSpeed;

    const forceCaveFlyers = getIniBool(bothFiles, 'ForceAllowCaveFlyers', 'bForceAllowCaveFlyers', 'AllowCaveFlyers');
    if (forceCaveFlyers !== undefined) config.bForceAllowCaveFlyers = forceCaveFlyers;

    const forceRideFliers = getIniBool(bothFiles, 'bForceCanRideFliers', 'ForceCanRideFliers');
    if (forceRideFliers !== undefined) config.bForceCanRideFliers = forceRideFliers;

    const dinoFoodDrain = getIniFloat(bothFiles, 'DinoCharacterFoodDrainMultiplier');
    if (dinoFoodDrain !== undefined) config.dinoCharacterFoodDrainMultiplier = dinoFoodDrain;

    const dinoStamDrain = getIniFloat(bothFiles, 'DinoCharacterStaminaDrainMultiplier');
    if (dinoStamDrain !== undefined) config.dinoCharacterStaminaDrainMultiplier = dinoStamDrain;

    const dinoHealthRecov = getIniFloat(bothFiles, 'DinoCharacterHealthRecoveryMultiplier');
    if (dinoHealthRecov !== undefined) config.dinoCharacterHealthRecoveryMultiplier = dinoHealthRecov;

    const tamedDmg = getIniFloat(bothFiles, 'TamedDinoDamageMultiplier');
    if (tamedDmg !== undefined) config.tamedDinoDamageMultiplier = tamedDmg;

    const tamedRes = getIniFloat(bothFiles, 'TamedDinoResistanceMultiplier');
    if (tamedRes !== undefined) config.tamedDinoResistanceMultiplier = tamedRes;

    const layEgg = getIniFloat(bothFiles, 'LayEggIntervalMultiplier');
    if (layEgg !== undefined) config.layEggIntervalMultiplier = layEgg;

    const poopInt = getIniFloat(bothFiles, 'PoopIntervalMultiplier');
    if (poopInt !== undefined) config.poopIntervalMultiplier = poopInt;

    // World & Spoil & Decomposition
    const spoilTime = getIniFloat(bothFiles, 'GlobalSpoilingTimeMultiplier', 'ItemSpoilingTimeMultiplier');
    if (spoilTime !== undefined) config.itemSpoilingTimeMultiplier = spoilTime;

    const fuelConsump = getIniFloat(bothFiles, 'FuelConsumptionIntervalMultiplier');
    if (fuelConsump !== undefined) config.fuelConsumptionIntervalMultiplier = fuelConsump;

    const itemDecomp = getIniFloat(bothFiles, 'GlobalItemDecompositionTimeMultiplier', 'ItemDecompositionTimeMultiplier');
    if (itemDecomp !== undefined) config.itemDecompositionTimeMultiplier = itemDecomp;

    const corpseDecomp = getIniFloat(bothFiles, 'GlobalCorpseDecompositionTimeMultiplier', 'CorpseDecompositionTimeMultiplier');
    if (corpseDecomp !== undefined) config.corpseDecompositionTimeMultiplier = corpseDecomp;

    const cropGrowth = getIniFloat(bothFiles, 'CropGrowthSpeedMultiplier');
    if (cropGrowth !== undefined) config.cropGrowthSpeedMultiplier = cropGrowth;

    const cropDecay = getIniFloat(bothFiles, 'CropDecaySpeedMultiplier');
    if (cropDecay !== undefined) config.cropDecaySpeedMultiplier = cropDecay;

    // Structures & Building
    const disableCol = getIniBool(bothFiles, 'DisableStructurePlacementCollision', 'bDisableStructurePlacementCollision');
    if (disableCol !== undefined) config.bDisableStructurePlacementCollision = disableCol;

    const caveBuild = getIniBool(bothFiles, 'AllowCaveBuildingPvE', 'bAllowCaveBuildingPvE');
    if (caveBuild !== undefined) config.bAllowCaveBuildingPvE = caveBuild;

    const supplyDropBuild = getIniBool(bothFiles, 'PvEAllowStructuresAtSupplyDrops', 'bPvEAllowStructuresAtSupplyDrops');
    if (supplyDropBuild !== undefined) config.bPvEAllowStructuresAtSupplyDrops = supplyDropBuild;

    const alwaysPickup = getIniBool(bothFiles, 'AlwaysAllowStructurePickup', 'bAlwaysAllowStructurePickup');
    if (alwaysPickup !== undefined) config.bAlwaysAllowStructurePickup = alwaysPickup;

    const pickupTime = getIniFloat(bothFiles, 'StructurePickupTimeAfterPlacement');
    if (pickupTime !== undefined) config.structurePickupTimeAfterPlacement = pickupTime;

    const disableStructDecay = getIniBool(bothFiles, 'DisableStructureDecayPvE', 'bDisableStructureDecayPvE');
    if (disableStructDecay !== undefined) config.bDisableStructureDecayPvE = disableStructDecay;

    const disableDinoDecay = getIniBool(bothFiles, 'DisableDinoDecayPvE', 'bDisableDinoDecayPvE');
    if (disableDinoDecay !== undefined) config.bDisableDinoDecayPvE = disableDinoDecay;

    const disableFF = getIniBool(bothFiles, 'bDisableFriendlyFire', 'DisableFriendlyFire');
    if (disableFF !== undefined) config.bDisableFriendlyFire = disableFF;

    const pveDisableFF = getIniBool(bothFiles, 'bPvEDisableFriendlyFire', 'PvEDisableFriendlyFire');
    if (pveDisableFF !== undefined) config.bPvEDisableFriendlyFire = pveDisableFF;

    const passiveDefImprinted = getIniBool(bothFiles, 'bPassiveDefensesDamageRiderlessImprintedDino', 'PassiveDefensesDamageRiderlessImprintedDino');
    if (passiveDefImprinted !== undefined) config.bPassiveDefensesDamageRiderlessImprintedDino = passiveDefImprinted;

    const maxTribe = getIniInt(bothFiles, 'MaxNumberOfPlayersInTribe');
    if (maxTribe !== undefined) config.maxNumberOfPlayersInTribe = maxTribe;

    // Transfers & Tributes
    const noTributes = getIniBool(bothFiles, 'NoTributeDownloads', 'noTributeDownloads', 'bNoTributeDownloads');
    if (noTributes !== undefined) config.bNoTributeDownloads = noTributes;

    const prevSurvivors = getIniBool(bothFiles, 'PreventDownloadSurvivors', 'bPreventDownloadSurvivors');
    if (prevSurvivors !== undefined) config.bPreventDownloadSurvivors = prevSurvivors;

    const prevItems = getIniBool(bothFiles, 'PreventDownloadItems', 'bPreventDownloadItems');
    if (prevItems !== undefined) config.bPreventDownloadItems = prevItems;

    const prevDinos = getIniBool(bothFiles, 'PreventDownloadDinos', 'bPreventDownloadDinos');
    if (prevDinos !== undefined) config.bPreventDownloadDinos = prevDinos;

    return config;
};

export async function findIniConfigPath(installPath: string): Promise<string> {
    console.log(`[Config Path Resolution] Resolving config path for base directory: "${installPath}"`);
    const possiblePaths = [
        ['server', 'ShooterGame', 'Saved', 'Config', 'WindowsServer'],
        ['Server', 'ShooterGame', 'Saved', 'Config', 'WindowsServer'],
        ['ShooterGame', 'Saved', 'Config', 'WindowsServer'],
        ['Saved', 'Config', 'WindowsServer'],
        ['Config', 'WindowsServer'],
        ['WindowsServer']
    ];

    // If installPath itself ends with WindowsServer or has ShooterGame in it
    for (const pathParts of possiblePaths) {
        try {
            const testPath = await join(installPath, ...pathParts);
            const exists = await fs.exists(testPath);
            console.log(`[Config Path Resolution] Checking candidate path: "${testPath}" -> Exists: ${exists}`);
            if (exists) {
                console.log(`[Config Path Resolution] ✅ Found existing config path: "${testPath}"`);
                return testPath;
            }
        } catch (err) {
            console.warn(`[Config Path Resolution] Error testing path for parts:`, pathParts, err);
        }
    }

    // If direct check: check if installPath already is the WindowsServer directory or contains GameUserSettings.ini
    const isWindowsServerFolder = installPath.toLowerCase().endsWith('windowsserver');
    const directGusPath = await join(installPath, 'GameUserSettings.ini');
    let directGusExists = false;
    try {
        directGusExists = await fs.exists(directGusPath);
    } catch {
        // ignore
    }

    console.log(`[Config Path Resolution] Direct checks -> isWindowsServerFolder: ${isWindowsServerFolder}, GameUserSettings.ini exists in root: ${directGusExists}`);

    if (isWindowsServerFolder || directGusExists) {
        console.log(`[Config Path Resolution] ✅ Using root/direct path as config directory: "${installPath}"`);
        return installPath;
    }

    // Default fallback path for standard ASA server installations
    const fallbackPath = await join(installPath, 'ShooterGame', 'Saved', 'Config', 'WindowsServer');
    console.log(`[Config Path Resolution] ℹ️ Using standard default path: "${fallbackPath}"`);
    return fallbackPath;
}

export async function parseIniFiles(installPath: string): Promise<Partial<ServerConfig> | null> {
    const foundPath = await findIniConfigPath(installPath);
    if (!foundPath || !(await fs.exists(foundPath))) {
        console.log(`[Parse INI Debug] Config path not found or does not exist: "${foundPath}"`);
        return null;
    }
    let gusContent = '', gameContent = '', filesFound = 0;
    try {
        const dirEntries = await fs.readDir(foundPath);
        console.log(`[Parse INI Debug] Reading directory "${foundPath}" entries:`, dirEntries.map(e => e.name));
        const gusFile = dirEntries.find(entry => entry.name?.toLowerCase() === 'gameusersettings.ini');
        const gameFile = dirEntries.find(entry => entry.name?.toLowerCase() === 'game.ini');
        if (gusFile?.name) {
            const fullGus = await join(foundPath, gusFile.name);
            gusContent = await fs.readTextFile(fullGus);
            console.log(`[Parse INI Debug] Read ${gusContent.length} chars from "${fullGus}"`);
            filesFound++;
        }
        if (gameFile?.name) {
            const fullGame = await join(foundPath, gameFile.name);
            gameContent = await fs.readTextFile(fullGame);
            console.log(`[Parse INI Debug] Read ${gameContent.length} chars from "${fullGame}"`);
            filesFound++;
        }
    } catch (error) {
        console.error(`[Parse INI Debug] Error reading INI files from "${foundPath}":`, error);
        return null;
    }
    if (filesFound === 0) {
        console.log(`[Parse INI Debug] No INI files found in "${foundPath}"`);
        return null;
    }
    const configResult = mapIniToConfig(parseIni(gusContent), parseIni(gameContent));
    
    // Parse structured NPC spawn entries if found in Game.ini
    if (gameContent) {
        const spawns = parseSpawnEntriesFromIni(gameContent);
        if (spawns.length > 0) {
            configResult.npcSpawnEntries = spawns;
        }
    }
    
    return configResult;
}

export function areConfigsDifferent(current: ServerConfig, fromDisk: Partial<ServerConfig>): boolean {
    for (const key in fromDisk) {
        const k = key as keyof ServerConfig;
        if (fromDisk[k] === undefined || fromDisk[k] === null) continue;
        if (typeof fromDisk[k] === 'number' && typeof current[k] === 'number') {
            if (Math.abs((fromDisk[k] as number) - (current[k] as number)) > 0.0001) {
                return true;
            }
        } else if (fromDisk[k] !== current[k]) {
            return true;
        }
    }
    return false;
}
