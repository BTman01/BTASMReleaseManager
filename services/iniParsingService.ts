import * as fs from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { ServerConfig } from '../types';

// A more robust INI parser that handles comments, empty lines, and is case-insensitive.
const parseIni = (content: string): Record<string, Record<string, string>> => {
    const sections: Record<string, Record<string, string>> = {};
    let currentSection = '';
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
        const trimmedLine = line.trim();
        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith(';') || trimmedLine.startsWith('#')) {
            continue;
        }

        // Check for section header, store as lowercase
        if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
            currentSection = trimmedLine.substring(1, trimmedLine.length - 1).toLowerCase();
            if (!sections[currentSection]) {
                sections[currentSection] = {};
            }
            continue;
        }

        // Check for key-value pair
        const separatorIndex = trimmedLine.indexOf('=');
        if (separatorIndex !== -1 && currentSection) {
            const key = trimmedLine.substring(0, separatorIndex).trim();
            const value = trimmedLine.substring(separatorIndex + 1).trim();
            sections[currentSection][key] = value;
        }
    }
    return sections;
};

const mapIniToConfig = (gus: Record<string, Record<string, string>>, game: Record<string, Record<string, string>>): Partial<ServerConfig> => {
    const config: Partial<ServerConfig> = {};

    // GameUserSettings.ini parsing (using lowercase section keys)
    const gusServerSettings = gus['serversettings'] || {};
    if(gusServerSettings['SessionName'] || gusServerSettings['ServerName']) config.sessionName = gusServerSettings['SessionName'] || gusServerSettings['ServerName'];
    if(gusServerSettings['ServerPassword']) config.serverPassword = gusServerSettings['ServerPassword'].split('?')[0];
    if(gusServerSettings['ServerAdminPassword']) config.adminPassword = gusServerSettings['ServerAdminPassword'].split('?')[0];
    if(gusServerSettings['RCONEnabled']) config.bEnableRcon = gusServerSettings['RCONEnabled'].toLowerCase() === 'true';
    if(gusServerSettings['RCONPort']) config.rconPort = parseInt(gusServerSettings['RCONPort'], 10);
    if(gusServerSettings['RCONServerAdminPassword']) config.rconPassword = gusServerSettings['RCONServerAdminPassword'];
    if(gusServerSettings['ServerPVE'] || gusServerSettings['serverPVE']) config.bServerPVE = (gusServerSettings['ServerPVE'] || gusServerSettings['serverPVE'])?.toLowerCase() === 'true';
    if(gusServerSettings['XPMultiplier']) config.xpMultiplier = parseFloat(gusServerSettings['XPMultiplier']);
    if(gusServerSettings['TamingSpeedMultiplier']) config.tamingSpeedMultiplier = parseFloat(gusServerSettings['TamingSpeedMultiplier']);
    if(gusServerSettings['HarvestAmountMultiplier']) config.harvestAmountMultiplier = parseFloat(gusServerSettings['HarvestAmountMultiplier']);
    if(gusServerSettings['MatingIntervalMultiplier']) config.matingIntervalMultiplier = parseFloat(gusServerSettings['MatingIntervalMultiplier']);
    if(gusServerSettings['EggHatchSpeedMultiplier']) config.eggHatchSpeedMultiplier = parseFloat(gusServerSettings['EggHatchSpeedMultiplier']);
    if(gusServerSettings['BabyMatureSpeedMultiplier']) config.babyMatureSpeedMultiplier = parseFloat(gusServerSettings['BabyMatureSpeedMultiplier']);
    if(gusServerSettings['MapName']) config.map = gusServerSettings['MapName'];
    
    // New GUS ServerSettings
    if(gusServerSettings['DifficultyOffset']) config.difficultyOffset = parseFloat(gusServerSettings['DifficultyOffset']);
    if(gusServerSettings['NightTimeSpeedScale']) config.nightTimeSpeedScale = parseFloat(gusServerSettings['NightTimeSpeedScale']);
    if(gusServerSettings['PlayerCharacterWaterDrainMultiplier']) config.playerCharacterWaterDrainMultiplier = parseFloat(gusServerSettings['PlayerCharacterWaterDrainMultiplier']);
    if(gusServerSettings['PlayerCharacterFoodDrainMultiplier']) config.playerCharacterFoodDrainMultiplier = parseFloat(gusServerSettings['PlayerCharacterFoodDrainMultiplier']);
    if(gusServerSettings['DinoCharacterFoodDrainMultiplier']) config.dinoCharacterFoodDrainMultiplier = parseFloat(gusServerSettings['DinoCharacterFoodDrainMultiplier']);
    if(gusServerSettings['DinoCharacterStaminaDrainMultiplier']) config.dinoCharacterStaminaDrainMultiplier = parseFloat(gusServerSettings['DinoCharacterStaminaDrainMultiplier']);
    if(gusServerSettings['DinoCharacterHealthRecoveryMultiplier']) config.dinoCharacterHealthRecoveryMultiplier = parseFloat(gusServerSettings['DinoCharacterHealthRecoveryMultiplier']);
    if(gusServerSettings['HarvestHealthMultiplier']) config.harvestHealthMultiplier = parseFloat(gusServerSettings['HarvestHealthMultiplier']);
    if(gusServerSettings['ItemSpoilingTimeMultiplier']) config.itemSpoilingTimeMultiplier = parseFloat(gusServerSettings['ItemSpoilingTimeMultiplier']);
    if(gusServerSettings['ServerCrosshair']) config.bServerCrosshair = gusServerSettings['ServerCrosshair'].toLowerCase() === 'true';
    if(gusServerSettings['ShowMapPlayerLocation']) config.bShowMapPlayerLocation = gusServerSettings['ShowMapPlayerLocation'].toLowerCase() === 'true';
    if(gusServerSettings['AllowAnyoneBabyImprintCuddle']) config.bAllowAnyoneBabyImprintCuddle = gusServerSettings['AllowAnyoneBabyImprintCuddle'].toLowerCase() === 'true';
    if(gusServerSettings['AllowFlyingStaminaRecovery']) config.bAllowFlyingStaminaRecovery = gusServerSettings['AllowFlyingStaminaRecovery'].toLowerCase() === 'true';
    if(gusServerSettings['DisableImprintDinoBuff']) config.bDisableImprintDinoBuff = gusServerSettings['DisableImprintDinoBuff'].toLowerCase() === 'true';
    if(gusServerSettings['TamedDinoDamageMultiplier']) config.tamedDinoDamageMultiplier = parseFloat(gusServerSettings['TamedDinoDamageMultiplier']);
    if(gusServerSettings['TamedDinoResistanceMultiplier']) config.tamedDinoResistanceMultiplier = parseFloat(gusServerSettings['TamedDinoResistanceMultiplier']);
    if(gusServerSettings['AllowCaveBuildingPvE']) config.bAllowCaveBuildingPvE = gusServerSettings['AllowCaveBuildingPvE'].toLowerCase() === 'true';
    if(gusServerSettings['AlwaysAllowStructurePickup']) config.bAlwaysAllowStructurePickup = gusServerSettings['AlwaysAllowStructurePickup'].toLowerCase() === 'true';
    if(gusServerSettings['AutoSavePeriodMinutes']) config.autoSavePeriodMinutes = parseFloat(gusServerSettings['AutoSavePeriodMinutes']);
    if(gusServerSettings['FuelConsumptionIntervalMultiplier']) config.fuelConsumptionIntervalMultiplier = parseFloat(gusServerSettings['FuelConsumptionIntervalMultiplier']);
    if(gusServerSettings['globalVoiceChat']) config.bGlobalVoiceChat = gusServerSettings['globalVoiceChat'].toLowerCase() === 'true';
    if(gusServerSettings['ProximityChat']) config.bProximityChat = gusServerSettings['ProximityChat'].toLowerCase() === 'true';
    if(gusServerSettings['noTributeDownloads']) config.bNoTributeDownloads = gusServerSettings['noTributeDownloads'].toLowerCase() === 'true';
    if(gusServerSettings['PreventDownloadSurvivors']) config.bPreventDownloadSurvivors = gusServerSettings['PreventDownloadSurvivors'].toLowerCase() === 'true';
    if(gusServerSettings['PreventDownloadItems']) config.bPreventDownloadItems = gusServerSettings['PreventDownloadItems'].toLowerCase() === 'true';
    if(gusServerSettings['PreventDownloadDinos']) config.bPreventDownloadDinos = gusServerSettings['PreventDownloadDinos'].toLowerCase() === 'true';


    const gusSessionSettings = gus['sessionsettings'] || {};
    if(gusSessionSettings['Port']) config.gamePort = parseInt(gusSessionSettings['Port'], 10);
    if(gusSessionSettings['QueryPort']) config.queryPort = parseInt(gusSessionSettings['QueryPort'], 10);
    if(gusSessionSettings['MaxPlayers']) config.maxPlayers = parseInt(gusSessionSettings['MaxPlayers'], 10);


    const gusEngineSession = gus['/script/engine.gamesession'] || {};
    if(gusEngineSession['MaxPlayers']) config.maxPlayers = parseInt(gusEngineSession['MaxPlayers'], 10);
    
    const gusMultiHome = gus['multihome'] || {};
    if (gusMultiHome['MultiHome']) {
        config.rconIp = gusMultiHome['MultiHome'];
    }

    // FIX: Default to an empty object `{}` if the section does not exist to prevent a crash.
    const gusShooterGameUserSettings = gus['/script/shootergame.shootergamesettings'] || gus['/script/shootergame.shootergamemode'] || {};
    const thirdPersonKey = gusShooterGameUserSettings['bAllowThirdPersonPlayer'] || gusShooterGameUserSettings['bThirdPersonPlayer'];
    if (thirdPersonKey !== undefined) config.bAllowThirdPersonPlayer = thirdPersonKey.toLowerCase() === 'true';
    if(gusShooterGameUserSettings['bShowFloatingDamageText'] !== undefined) config.bShowFloatingDamageText = gusShooterGameUserSettings['bShowFloatingDamageText'].toLowerCase() === 'true';
    const flyerCarryKey = gusShooterGameUserSettings['bAllowFlyerCarryPvE'] || gusShooterGameUserSettings['bAllowFlyerCarryPVE'];
    if(flyerCarryKey !== undefined) config.bAllowFlyerCarryPvE = flyerCarryKey.toLowerCase() === 'true';
    if(gusShooterGameUserSettings['bDisableStructurePlacementCollision'] !== undefined) config.bDisableStructurePlacementCollision = gusShooterGameUserSettings['bDisableStructurePlacementCollision'].toLowerCase() === 'true';
    
    // Game.ini parsing (using lowercase section keys)
    const gameShooterGameMode = game['/script/shootergame.shootergamemode'] || {};
    if(gameShooterGameMode['bDisableFriendlyFire'] !== undefined) config.bDisableFriendlyFire = gameShooterGameMode['bDisableFriendlyFire'].toLowerCase() === 'true';
    
    // Mods can be in either file. Prioritize GUS.ini as it's often used as a launch param override.
    const modsFromGus = gusServerSettings['ActiveMods'];
    const modsFromGameIni = gameShooterGameMode['ActiveMods'];

    if (modsFromGus) {
        config.mods = modsFromGus;
    } else if (modsFromGameIni) {
        config.mods = modsFromGameIni;
    }

    return config;
};

export async function parseIniFiles(installPath: string): Promise<Partial<ServerConfig> | null> {
    const configPath = await join(installPath, 'ShooterGame', 'Saved', 'Config', 'WindowsServer');
    
    // User requested debugging, so let's log the path we are checking.
    console.log(`[iniParser] Checking for config files in: ${configPath}`);

    let gusContent = '';
    let gameContent = '';
    let filesFound = 0;

    try {
        const dirEntries = await fs.readDir(configPath);
        console.log(`[iniParser] Found ${dirEntries.length} entries in config directory.`);

        const gusFile = dirEntries.find(entry => entry.name?.toLowerCase() === 'gameusersettings.ini');
        const gameFile = dirEntries.find(entry => entry.name?.toLowerCase() === 'game.ini');

        if (gusFile?.name) {
            const gusFilePath = await join(configPath, gusFile.name);
            console.log(`[iniParser] Found GameUserSettings.ini at path: ${gusFilePath}`);
            gusContent = await fs.readTextFile(gusFilePath);
            filesFound++;
            console.log("[iniParser] Successfully read GameUserSettings.ini");
        } else {
            console.log("[iniParser] GameUserSettings.ini not found in directory.");
        }

        if (gameFile?.name) {
            const gameFilePath = await join(configPath, gameFile.name);
            console.log(`[iniParser] Found Game.ini at path: ${gameFilePath}`);
            gameContent = await fs.readTextFile(gameFilePath);
            filesFound++;
            console.log("[iniParser] Successfully read Game.ini");
        } else {
            console.log("[iniParser] Game.ini not found in directory.");
        }

    } catch (error) {
        console.error(`[iniParser] Error reading config directory '${configPath}':`, error);
        return null; // The directory probably doesn't exist, so no point continuing.
    }
    
    if (filesFound === 0) {
        console.log("[iniParser] No INI files were found or read.");
        return null;
    }

    const parsedGus = parseIni(gusContent);
    const parsedGame = parseIni(gameContent);

    const mappedConfig = mapIniToConfig(parsedGus, parsedGame);
    
    if (Object.keys(mappedConfig).length === 0) {
        console.log("[iniParser] Files were read, but no mappable config values were found.");
        return null;
    }

    console.log("[iniParser] Successfully parsed config:", mappedConfig);
    return mappedConfig;
}

export function areConfigsDifferent(current: ServerConfig, fromDisk: Partial<ServerConfig>): boolean {
    for (const key in fromDisk) {
        const k = key as keyof ServerConfig;
        const diskValue = fromDisk[k];
        const currentValue = current[k];

        // Skip undefined or null values
        if (diskValue === undefined || diskValue === null) continue;

        // Strict inequality check
        if (diskValue !== currentValue) {
            // Special handling for mods string to ignore whitespace differences
            if (k === 'mods' && typeof diskValue === 'string' && typeof currentValue === 'string') {
                if (diskValue.trim() !== currentValue.trim()) {
                    console.log(`Config difference found in ${k}: '${currentValue}' vs '${diskValue}'`);
                    return true;
                }
                continue;
            }

            console.log(`Config difference found in ${k}: '${currentValue}' vs '${diskValue}'`);
            return true;
        }
    }
    return false;
}