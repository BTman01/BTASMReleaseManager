import React from 'react';
import { ServerConfig } from '../types';
import { CogIcon, InfoIcon } from './icons';

interface GameSettingsProps {
  config: ServerConfig;
  onConfigChange: (newConfig: Partial<ServerConfig>) => void;
  isActionInProgress: boolean;
}

const Card: React.FC<{ title: string; icon?: React.ReactNode, children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="p-6 bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-700 h-full flex flex-col">
        <div className="flex items-center space-x-2 text-lg font-bold text-cyan-400 mb-4">
            {icon}
            <h3>{title}</h3>
        </div>
        <div className="flex-grow flex flex-col space-y-4">{children}</div>
    </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h4 className="text-md font-semibold text-gray-300 mb-3 border-b border-gray-700 pb-2">{title}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {children}
        </div>
    </div>
);

const SliderInput: React.FC<{
  label: string;
  name: keyof ServerConfig;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
  min?: number;
  max?: number;
  step?: number;
}> = ({ label, name, value, onChange, disabled, min = 0.1, max = 10, step = 0.1 }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <div className="flex items-center space-x-3">
            <input
                id={name}
                name={name}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={onChange}
                disabled={disabled}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <input
                type="number"
                name={name}
                value={value}
                onChange={onChange}
                disabled={disabled}
                min={min}
                max={max}
                step={step}
                className="w-24 bg-gray-900/50 border border-gray-600 rounded-md px-3 py-1 text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition disabled:bg-gray-700 disabled:cursor-not-allowed"
            />
        </div>
    </div>
);

const CheckboxInput: React.FC<{
  label: string;
  name: keyof ServerConfig;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
}> = ({ label, name, checked, onChange, disabled }) => (
    <div className="flex items-center col-span-1">
        <input
            id={name}
            name={name}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-600 focus:ring-cyan-500 disabled:cursor-not-allowed"
        />
        <label htmlFor={name} className="ml-3 block text-sm font-medium text-gray-300">{label}</label>
    </div>
);

const NumberInput: React.FC<{
  label: string;
  name: keyof ServerConfig;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
}> = ({ label, name, value, onChange, disabled }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <input
            type="number"
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className="w-full bg-gray-900/50 border border-gray-600 rounded-md px-3 py-1 text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition disabled:bg-gray-700 disabled:cursor-not-allowed"
        />
    </div>
);

const GameSettings: React.FC<GameSettingsProps> = ({ config, onConfigChange, isActionInProgress }) => {
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        const key = name as keyof ServerConfig;

        if (type === 'checkbox') {
            onConfigChange({ [key]: checked });
        } else if (type === 'number' || type === 'range') {
            onConfigChange({ [key]: parseFloat(value) || 0 });
        }
    };
    
    return (
        <div className="max-w-4xl mx-auto">
            <Card title="Game & Player Settings" icon={<CogIcon />}>
                <p className="text-sm text-gray-400 -mt-2 mb-2">
                    Adjust gameplay multipliers and settings. These changes will be written to your
                    <code className="bg-black/50 text-cyan-300 px-1 py-0.5 rounded-sm text-xs mx-1">GameUserSettings.ini</code> file when you click "Save Settings" on the Server Configuration tab.
                </p>

                <Section title="Rate Multipliers">
                    <SliderInput label="XP Multiplier" name="xpMultiplier" value={config.xpMultiplier} onChange={handleChange} disabled={isActionInProgress} max={50} />
                    <SliderInput label="Taming Speed" name="tamingSpeedMultiplier" value={config.tamingSpeedMultiplier} onChange={handleChange} disabled={isActionInProgress} max={50} />
                    <SliderInput label="Harvest Amount" name="harvestAmountMultiplier" value={config.harvestAmountMultiplier} onChange={handleChange} disabled={isActionInProgress} max={50} />
                    <SliderInput label="Harvest Health" name="harvestHealthMultiplier" value={config.harvestHealthMultiplier} onChange={handleChange} disabled={isActionInProgress} max={10} />
                </Section>
                
                <hr className="border-gray-700" />
                
                <Section title="Breeding Multipliers">
                     <SliderInput label="Mating Interval" name="matingIntervalMultiplier" value={config.matingIntervalMultiplier} onChange={handleChange} disabled={isActionInProgress} max={1} step={0.01} />
                     <SliderInput label="Egg Hatch Speed" name="eggHatchSpeedMultiplier" value={config.eggHatchSpeedMultiplier} onChange={handleChange} disabled={isActionInProgress} max={100} />
                     <SliderInput label="Baby Mature Speed" name="babyMatureSpeedMultiplier" value={config.babyMatureSpeedMultiplier} onChange={handleChange} disabled={isActionInProgress} max={100} />
                </Section>

                 <hr className="border-gray-700" />
                
                <Section title="Player Settings">
                    <SliderInput label="Food Drain" name="playerCharacterFoodDrainMultiplier" value={config.playerCharacterFoodDrainMultiplier} onChange={handleChange} disabled={isActionInProgress} max={5} />
                    <SliderInput label="Water Drain" name="playerCharacterWaterDrainMultiplier" value={config.playerCharacterWaterDrainMultiplier} onChange={handleChange} disabled={isActionInProgress} max={5} />
                    <CheckboxInput label="Enable PvE Mode" name="bServerPVE" checked={config.bServerPVE} onChange={handleChange} disabled={isActionInProgress} />
                    <CheckboxInput label="Allow Third Person" name="bAllowThirdPersonPlayer" checked={config.bAllowThirdPersonPlayer} onChange={handleChange} disabled={isActionInProgress} />
                    <CheckboxInput label="Show Floating Damage Text" name="bShowFloatingDamageText" checked={config.bShowFloatingDamageText} onChange={handleChange} disabled={isActionInProgress} />
                    <CheckboxInput label="Allow Flyer Carry (PvE)" name="bAllowFlyerCarryPvE" checked={config.bAllowFlyerCarryPvE} onChange={handleChange} disabled={isActionInProgress} />
                    <CheckboxInput label="Enable Crosshair" name="bServerCrosshair" checked={config.bServerCrosshair} onChange={handleChange} disabled={isActionInProgress} />
                    <CheckboxInput label="Show Player on Map" name="bShowMapPlayerLocation" checked={config.bShowMapPlayerLocation} onChange={handleChange} disabled={isActionInProgress} />
                    <CheckboxInput label="Enable Global Voice Chat" name="bGlobalVoiceChat" checked={config.bGlobalVoiceChat} onChange={handleChange} disabled={isActionInProgress} />
                    <CheckboxInput label="Enable Proximity Chat" name="bProximityChat" checked={config.bProximityChat} onChange={handleChange} disabled={isActionInProgress} />
                </Section>

                <hr className="border-gray-700" />

                <Section title="Dino Settings">
                    <SliderInput label="Food Drain" name="dinoCharacterFoodDrainMultiplier" value={config.dinoCharacterFoodDrainMultiplier} onChange={handleChange} disabled={isActionInProgress} max={5} />
                    <SliderInput label="Stamina Drain" name="dinoCharacterStaminaDrainMultiplier" value={config.dinoCharacterStaminaDrainMultiplier} onChange={handleChange} disabled={isActionInProgress} max={5} />
                    <SliderInput label="Health Recovery" name="dinoCharacterHealthRecoveryMultiplier" value={config.dinoCharacterHealthRecoveryMultiplier} onChange={handleChange} disabled={isActionInProgress} max={10} />
                    <SliderInput label="Tamed Damage" name="tamedDinoDamageMultiplier" value={config.tamedDinoDamageMultiplier} onChange={handleChange} disabled={isActionInProgress} max={10} />
                    <SliderInput label="Tamed Resistance" name="tamedDinoResistanceMultiplier" value={config.tamedDinoResistanceMultiplier} onChange={handleChange} disabled={isActionInProgress} max={10} />
                    <CheckboxInput label="Allow Anyone to Imprint" name="bAllowAnyoneBabyImprintCuddle" checked={config.bAllowAnyoneBabyImprintCuddle} onChange={handleChange} disabled={isActionInProgress} />
                    <CheckboxInput label="Allow Flying Stamina Recovery" name="bAllowFlyingStaminaRecovery" checked={config.bAllowFlyingStaminaRecovery} onChange={handleChange} disabled={isActionInProgress} />
                    <CheckboxInput label="Disable Imprint Buff" name="bDisableImprintDinoBuff" checked={config.bDisableImprintDinoBuff} onChange={handleChange} disabled={isActionInProgress} />
                </Section>

                <hr className="border-gray-700" />
                
                <Section title="World & Server Settings">
                    <SliderInput label="Difficulty Offset" name="difficultyOffset" value={config.difficultyOffset} onChange={handleChange} disabled={isActionInProgress} max={5} />
                    <SliderInput label="Night Time Speed" name="nightTimeSpeedScale" value={config.nightTimeSpeedScale} onChange={handleChange} disabled={isActionInProgress} max={5} />
                    <div>
                        <SliderInput label="Item Spoil Time Multiplier" name="itemSpoilingTimeMultiplier" value={config.itemSpoilingTimeMultiplier} onChange={handleChange} disabled={isActionInProgress} />
                        <p className="text-xs text-gray-400 mt-1 pl-1">Controls how long items take to spoil. Higher values make items spoil slower.</p>
                    </div>
                    <NumberInput label="Auto Save Interval (Minutes)" name="autoSavePeriodMinutes" value={config.autoSavePeriodMinutes} onChange={handleChange} disabled={isActionInProgress} />
                    <div>
                        <SliderInput label="Fuel Consumption Interval" name="fuelConsumptionIntervalMultiplier" value={config.fuelConsumptionIntervalMultiplier} onChange={handleChange} disabled={isActionInProgress} />
                        <p className="text-xs text-gray-400 mt-1 pl-1">Controls how long fuel lasts. Higher values make fuel burn slower (e.g., 2.0 makes it last twice as long).</p>
                    </div>
                    <CheckboxInput label="Disable Friendly Fire" name="bDisableFriendlyFire" checked={config.bDisableFriendlyFire} onChange={handleChange} disabled={isActionInProgress} />
                    <CheckboxInput label="Allow Cave Building (PvE)" name="bAllowCaveBuildingPvE" checked={config.bAllowCaveBuildingPvE} onChange={handleChange} disabled={isActionInProgress} />
                    <CheckboxInput label="Allow Structure Pickup Always" name="bAlwaysAllowStructurePickup" checked={config.bAlwaysAllowStructurePickup} onChange={handleChange} disabled={isActionInProgress} />
                    <CheckboxInput label="Disable Structure Placement Collision" name="bDisableStructurePlacementCollision" checked={config.bDisableStructurePlacementCollision} onChange={handleChange} disabled={isActionInProgress} />
                </Section>

                <hr className="border-gray-700" />

                <Section title="Tribute & Transfer Settings">
                    {config.bEnableClustering && (
                        <div className="col-span-full p-3 bg-blue-900/50 border border-blue-700 rounded-md text-blue-300 text-sm flex items-center space-x-2">
                            <InfoIcon className="w-5 h-5 flex-shrink-0" />
                            <p>Clustering is enabled on the Server Configuration tab. The settings below might be overridden by the cluster configuration.</p>
                        </div>
                    )}
                    <CheckboxInput label="Disable All Tribute Downloads" name="bNoTributeDownloads" checked={config.bNoTributeDownloads} onChange={handleChange} disabled={isActionInProgress} />
                    <CheckboxInput label="Prevent Survivor Downloads" name="bPreventDownloadSurvivors" checked={config.bPreventDownloadSurvivors} onChange={handleChange} disabled={isActionInProgress} />
                    <CheckboxInput label="Prevent Item Downloads" name="bPreventDownloadItems" checked={config.bPreventDownloadItems} onChange={handleChange} disabled={isActionInProgress} />
                    <CheckboxInput label="Prevent Dino Downloads" name="bPreventDownloadDinos" checked={config.bPreventDownloadDinos} onChange={handleChange} disabled={isActionInProgress} />
                </Section>
            </Card>
        </div>
    );
};

export default GameSettings;