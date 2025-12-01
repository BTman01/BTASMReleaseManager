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
  eggHatchSpeedMultiplier: 'Egg Hatch Speed Multiplier',
  babyMatureSpeedMultiplier: 'Baby Mature Speed Multiplier',
  bAllowThirdPersonPlayer: 'Allow Third Person',
  bShowFloatingDamageText: 'Show Floating Damage Text',
  bAllowFlyerCarryPvE: 'Allow Flyer Carry (PvE)',
  playerCharacterWaterDrainMultiplier: 'Player Water Drain',
  playerCharacterFoodDrainMultiplier: 'Player Food Drain',
  bServerCrosshair: 'Enable Crosshair',
  bShowMapPlayerLocation: 'Show Player on Map',
  bGlobalVoiceChat: 'Global Voice Chat',
  bProximityChat: 'Proximity Chat',
  dinoCharacterFoodDrainMultiplier: 'Dino Food Drain',
  dinoCharacterStaminaDrainMultiplier: 'Dino Stamina Drain',
  dinoCharacterHealthRecoveryMultiplier: 'Dino Health Recovery',
  bAllowAnyoneBabyImprintCuddle: 'Allow Anyone to Imprint',
  bAllowFlyingStaminaRecovery: 'Allow Flying Stamina Recovery',
  bDisableImprintDinoBuff: 'Disable Imprint Buff',
  tamedDinoDamageMultiplier: 'Tamed Dino Damage',
  tamedDinoResistanceMultiplier: 'Tamed Dino Resistance',
  difficultyOffset: 'Difficulty Offset',
  nightTimeSpeedScale: 'Night Time Speed',
  harvestHealthMultiplier: 'Harvest Health',
  autoSavePeriodMinutes: 'Auto Save Interval (Mins)',
  itemSpoilingTimeMultiplier: 'Item Spoil Time Multiplier',
  fuelConsumptionIntervalMultiplier: 'Fuel Consumption Interval',
  bDisableFriendlyFire: 'Disable Friendly Fire',
  bAllowCaveBuildingPvE: 'Allow Cave Building (PvE)',
  bAlwaysAllowStructurePickup: 'Always Allow Structure Pickup',
  bNoTributeDownloads: 'Disable Tribute Downloads',
  bPreventDownloadSurvivors: 'Prevent Survivor Downloads',
  bPreventDownloadItems: 'Prevent Item Downloads',
  bPreventDownloadDinos: 'Prevent Dino Downloads',
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
          We've detected existing <code className="bg-black/50 text-cyan-300 px-1 py-0.5 rounded-sm text-xs">.ini</code> files in the selected directory. 
          Would you like to import these settings into your new profile?
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
                <p className="text-gray-400 text-sm">No specific settings were found to summarize, but configuration files are present.</p>
            )}

            <div className="mt-4">
              <button onClick={() => setIsExpanded(!isExpanded)} className="text-sm text-cyan-400 hover:underline flex items-center">
                {isExpanded ? 'Hide' : 'Show'} All Detected Settings
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
            Use New Profile Settings
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