import React, { useState } from 'react';
import { ServerConfig } from '../types';

interface ImportSettingsModalProps {
  isOpen: boolean;
  onClose: (imported: boolean) => void;
  onImport: () => void;
  detectedConfig: Partial<ServerConfig> | null;
}

const CONFIG_KEY_TO_LABEL: { [key in keyof ServerConfig]?: string } = {
  sessionName: 'Server Name',
  serverPassword: 'Server Password',
  adminPassword: 'Admin Password',
  map: 'Map',
  maxPlayers: 'Max Players',
  mods: 'Mod IDs',
  queryPort: 'Query Port',
  gamePort: 'Game Port',
  rconPort: 'RCON Port',
  rconPassword: 'RCON Password',
  bEnableRcon: 'RCON Enabled',
  bServerPVE: 'PvE Mode',
  xpMultiplier: 'XP Multiplier',
  tamingSpeedMultiplier: 'Taming Speed Multiplier',
  harvestAmountMultiplier: 'Harvest Amount Multiplier',
  matingIntervalMultiplier: 'Mating Interval Multiplier',
  matingSpeedMultiplier: 'Mating Speed Multiplier',
  eggHatchSpeedMultiplier: 'Egg Hatch Speed Multiplier',
  babyMatureSpeedMultiplier: 'Baby Mature Speed Multiplier',
  babyFoodConsumptionSpeedMultiplier: 'Baby Food Consumption Speed',
  babyCuddleIntervalMultiplier: 'Baby Cuddle Interval',
  babyCuddleGracePeriodMultiplier: 'Baby Cuddle Grace Period',
  babyCuddleLoseImprintQualitySpeedMultiplier: 'Baby Cuddle Lose Imprint Quality',
  babyImprintingStatScaleMultiplier: 'Baby Imprinting Stat Scale',
  bAllowThirdPersonPlayer: 'Allow Third Person',
  bShowFloatingDamageText: 'Show Floating Damage Text',
  bAllowFlyerCarryPvE: 'Allow Flyer Carry (PvE)',
  bAllowFlyingStaminaRecovery: 'Allow Flying Stamina Recovery',
  bAllowFlyerSpeedLeveling: 'Allow Flyer Speed Leveling (ASA)',
  bForceAllowCaveFlyers: 'Force Allow Cave Flyers',
  bForceCanRideFliers: 'Force Allow Riding Flyers (Genesis / Caves)',
  bAllowSpeedLeveling: 'Allow Speed Leveling (ASA)',
  bUseCorpseLocator: 'Corpse Locator Light Beam',
  bAllowUnlimitedRespecs: 'Unlimited Mindwipe Respecs',
  bAutoUnlockAllEngrams: 'Auto Unlock All Engrams (On Level Up)',
  playerCharacterWaterDrainMultiplier: 'Player Water Drain',
  playerCharacterFoodDrainMultiplier: 'Player Food Drain',
  playerCharacterStaminaDrainMultiplier: 'Player Stamina Drain',
  playerCharacterHealthRecoveryMultiplier: 'Player Health Recovery',
  bServerCrosshair: 'Enable Crosshair',
  bShowMapPlayerLocation: 'Show Player on Map',
  bGlobalVoiceChat: 'Global Voice Chat',
  bProximityChat: 'Proximity Chat',
  dinoCharacterFoodDrainMultiplier: 'Dino Food Drain',
  dinoCharacterStaminaDrainMultiplier: 'Dino Stamina Drain',
  dinoCharacterHealthRecoveryMultiplier: 'Dino Health Recovery',
  bAllowAnyoneBabyImprintCuddle: 'Allow Anyone to Imprint',
  bDisableImprintDinoBuff: 'Disable Imprint Buff',
  tamedDinoDamageMultiplier: 'Tamed Dino Damage',
  tamedDinoResistanceMultiplier: 'Tamed Dino Resistance',
  difficultyOffset: 'Difficulty Offset',
  overrideOfficialDifficulty: 'Override Official Difficulty (Max Dino Level)',
  dayTimeSpeedScale: 'Day Time Speed',
  nightTimeSpeedScale: 'Night Time Speed',
  harvestHealthMultiplier: 'Harvest Node Health',
  killXPMultiplier: 'Kill XP Multiplier',
  harvestXPMultiplier: 'Harvest XP Multiplier',
  craftXPMultiplier: 'Crafting XP Multiplier',
  genericXPMultiplier: 'Generic XP Multiplier',
  autoSavePeriodMinutes: 'Auto Save Interval (Mins)',
  itemSpoilingTimeMultiplier: 'Item Spoil Time Multiplier',
  fuelConsumptionIntervalMultiplier: 'Fuel Consumption Interval',
  itemDecompositionTimeMultiplier: 'Item Decomposition Time',
  corpseDecompositionTimeMultiplier: 'Corpse Decomposition Time',
  cropGrowthSpeedMultiplier: 'Crop Growth Speed',
  cropDecaySpeedMultiplier: 'Crop Decay Speed',
  layEggIntervalMultiplier: 'Lay Egg Interval',
  poopIntervalMultiplier: 'Poop Interval',
  bDisableFriendlyFire: 'Disable Friendly Fire',
  bPvEDisableFriendlyFire: 'Disable Friendly Fire (PvE)',
  bAllowCaveBuildingPvE: 'Allow Cave Building (PvE)',
  bPvEAllowStructuresAtSupplyDrops: 'Allow Structures at Supply Drops (PvE)',
  bAlwaysAllowStructurePickup: 'Always Allow Structure Pickup',
  structurePickupTimeAfterPlacement: 'Structure Pickup Window (Seconds)',
  bDisableStructurePlacementCollision: 'Disable Structure Collision (No-Clip)',
  bDisableStructureDecayPvE: 'Disable Structure Decay (PvE)',
  bDisableDinoDecayPvE: 'Disable Dino Decay (PvE)',
  maxNumberOfPlayersInTribe: 'Max Players in Tribe',
  bNoTributeDownloads: 'Disable Tribute Downloads',
  bPreventDownloadSurvivors: 'Prevent Survivor Downloads',
  bPreventDownloadItems: 'Prevent Item Downloads',
  bPreventDownloadDinos: 'Prevent Dino Downloads',
  customGameIni: 'Custom Game.ini Lines',
  customGameUserSettingsIni: 'Custom GameUserSettings.ini Lines',
};

const ImportSettingsModal: React.FC<ImportSettingsModalProps> = ({ isOpen, onImport, onClose, detectedConfig }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!isOpen || !detectedConfig) return null;
  
  const handleImport = () => {
    onImport();
    onClose(true);
  };
  
  const summaryItems = [
    { label: 'Server Name', value: detectedConfig.sessionName },
    { label: 'Map', value: detectedConfig.map },
    { label: 'Max Players', value: detectedConfig.maxPlayers },
    { label: 'Mods', value: detectedConfig.mods ? `${detectedConfig.mods.split(',').filter(Boolean).length} mod(s) found` : 'None' },
    { label: 'PvE Mode', value: detectedConfig.bServerPVE === undefined ? undefined : (detectedConfig.bServerPVE ? 'Enabled' : 'Disabled') },
    { label: 'XP Multiplier', value: detectedConfig.xpMultiplier !== undefined ? `${detectedConfig.xpMultiplier}x` : undefined },
    { label: 'Taming Multiplier', value: detectedConfig.tamingSpeedMultiplier !== undefined ? `${detectedConfig.tamingSpeedMultiplier}x` : undefined },
    { label: 'Harvest Multiplier', value: detectedConfig.harvestAmountMultiplier !== undefined ? `${detectedConfig.harvestAmountMultiplier}x` : undefined },
    { label: 'Custom Dino Spawns', value: detectedConfig.npcSpawnEntries && detectedConfig.npcSpawnEntries.length > 0 ? `${detectedConfig.npcSpawnEntries.length} spawn rule(s)` : undefined },
  ].filter(item => item.value !== undefined && item.value !== null && item.value !== '');
  
  const allDetectedItems = Object.entries(detectedConfig)
    .map(([key, value]) => {
      const label = CONFIG_KEY_TO_LABEL[key as keyof ServerConfig];
      if (!label || value === null || value === undefined) return null;
      
      let displayValue = String(value);
      if (typeof value === 'boolean') {
        displayValue = value ? 'Enabled' : 'Disabled';
      }
      
      return { label, value: displayValue };
    })
    .filter((item): item is { label: string, value: string } => item !== null);

  if (detectedConfig.gamePort) {
    allDetectedItems.push({ label: 'Peer Port (Auto)', value: String(detectedConfig.gamePort + 1) });
  }

  allDetectedItems.sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-lg p-8 bg-gray-800 rounded-lg shadow-2xl shadow-cyan-500/20 border border-gray-700">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Existing Server Configuration Found!</h2>
        <p className="text-gray-300 mb-6">
          We've detected existing <code className="bg-black/50 text-cyan-300 px-1 py-0.5 rounded-sm text-xs">GameUserSettings.ini</code> and <code className="bg-black/50 text-purple-300 px-1 py-0.5 rounded-sm text-xs">Game.ini</code> files in the selected directory. 
          Would you like to import these settings into your server profile?
        </p>
        
        <div className="bg-gray-900/50 p-4 rounded-md border border-gray-700 mb-6">
            <h4 className="font-semibold text-gray-200 mb-2">Detected Settings Summary:</h4>
            {summaryItems.length > 0 ? (
                <ul className="space-y-1 text-sm">
                    {summaryItems.map(item => (
                        <li key={item.label} className="flex justify-between">
                            <span className="text-gray-400">{item.label}:</span>
                            <span className="font-semibold text-gray-200 truncate ml-4">{String(item.value)}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-400 text-sm">Configuration files are present in the directory.</p>
            )}

            <div className="mt-4">
              <button onClick={() => setIsExpanded(!isExpanded)} className="text-sm text-cyan-400 hover:underline flex items-center">
                {isExpanded ? 'Hide' : 'Show'} All Detected Settings ({allDetectedItems.length})
                <svg className={`w-4 h-4 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </button>
              {isExpanded && (
                <div className="mt-2 border-t border-gray-700 pt-2 max-h-48 overflow-y-auto pr-2">
                   <ul className="space-y-1 text-sm">
                    {allDetectedItems.map(item => (
                        <li key={item.label} className="flex justify-between">
                            <span className="text-gray-400">{item.label}:</span>
                            <span className="font-semibold text-gray-200 truncate ml-4">{item.value}</span>
                        </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
        </div>
        
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => onClose(false)}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-md transition-colors duration-200"
          >
            Use Default Settings
          </button>
          <button
            onClick={handleImport}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-md transition-colors duration-200 shadow-md"
          >
            Import Existing Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportSettingsModal;
