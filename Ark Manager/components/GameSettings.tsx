import React, { useState } from 'react';
import { ServerConfig } from '../types';
import { CogIcon, InfoIcon, SaveIcon } from './icons';
import { CustomSpawnAndIniSettings } from './CustomSpawnAndIniSettings';

interface GameSettingsProps {
  config: ServerConfig;
  onConfigChange: (newConfig: Partial<ServerConfig>) => void;
  onSave?: () => void;
  isSaving?: boolean;
  isActionInProgress: boolean;
}

type SettingsCategory = 
  | 'all'
  | 'custom_ini'
  | 'general_xp'
  | 'breeding'
  | 'player'
  | 'dino'
  | 'world_decay'
  | 'structures'
  | 'tributes';

const CATEGORIES: { id: SettingsCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'All Settings', icon: '⚡' },
  { id: 'custom_ini', label: 'Dino Spawns & Custom INI', icon: '🧬' },
  { id: 'general_xp', label: 'General & XP Rates', icon: '📈' },
  { id: 'breeding', label: 'Breeding & Maturation', icon: '🥚' },
  { id: 'player', label: 'Player Rules & Drains', icon: '👤' },
  { id: 'dino', label: 'Dino Rules & Stats', icon: '🦖' },
  { id: 'world_decay', label: 'World & Environment', icon: '🌍' },
  { id: 'structures', label: 'Structures & Building', icon: '🏰' },
  { id: 'tributes', label: 'Transfers & Tributes', icon: '🔄' },
];

const SliderInput: React.FC<{
  label: string;
  name: keyof ServerConfig;
  value: number;
  onChange: (name: keyof ServerConfig, val: number) => void;
  disabled: boolean;
  min?: number;
  max?: number;
  step?: number;
  fileTag?: 'GameUserSettings.ini' | 'Game.ini';
  description?: string;
  defaultVal?: number;
}> = ({ label, name, value, onChange, disabled, min = 0.1, max = 10, step = 0.1, fileTag, description, defaultVal }) => (
  <div className="bg-gray-900/40 p-4 rounded-lg border border-gray-700/70 hover:border-gray-600 transition flex flex-col justify-between">
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={name} className="block text-sm font-semibold text-gray-200">{label}</label>
        {fileTag && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
            fileTag === 'Game.ini' ? 'bg-purple-900/50 text-purple-300 border border-purple-700/50' : 'bg-cyan-900/50 text-cyan-300 border border-cyan-700/50'
          }`}>
            {fileTag}
          </span>
        )}
      </div>
      {description && <p className="text-xs text-gray-400 mb-3 leading-relaxed">{description}</p>}
    </div>
    <div className="flex items-center space-x-3 mt-1">
      <input
        id={name}
        name={name}
        type="range"
        min={min}
        max={max}
        step={step}
        value={isNaN(value) ? min : value}
        onChange={(e) => onChange(name, parseFloat(e.target.value) || 0)}
        disabled={disabled}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
      />
      <div className="flex items-center space-x-1">
        <input
          type="number"
          name={name}
          value={isNaN(value) ? min : value}
          onChange={(e) => onChange(name, parseFloat(e.target.value) || 0)}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          className="w-20 bg-gray-900 border border-gray-600 rounded-md px-2.5 py-1 text-right text-gray-100 font-mono text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition disabled:bg-gray-700 disabled:cursor-not-allowed"
        />
        {defaultVal !== undefined && (
          <button
            type="button"
            title={`Reset to default (${defaultVal})`}
            onClick={() => onChange(name, defaultVal)}
            disabled={disabled || value === defaultVal}
            className="text-xs text-gray-500 hover:text-cyan-400 disabled:opacity-30 px-1 py-1"
          >
            ↺
          </button>
        )}
      </div>
    </div>
  </div>
);

const CheckboxInput: React.FC<{
  label: string;
  name: keyof ServerConfig;
  checked: boolean;
  onChange: (name: keyof ServerConfig, val: boolean) => void;
  disabled: boolean;
  fileTag?: 'GameUserSettings.ini' | 'Game.ini';
  description?: string;
}> = ({ label, name, checked, onChange, disabled, fileTag, description }) => (
  <div className="bg-gray-900/40 p-4 rounded-lg border border-gray-700/70 hover:border-gray-600 transition flex items-start space-x-3">
    <input
      id={name}
      name={name}
      type="checkbox"
      checked={!!checked}
      onChange={(e) => onChange(name, e.target.checked)}
      disabled={disabled}
      className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-600 focus:ring-cyan-500 disabled:cursor-not-allowed cursor-pointer"
    />
    <div className="flex-grow">
      <div className="flex items-center justify-between">
        <label htmlFor={name} className="block text-sm font-semibold text-gray-200 cursor-pointer">{label}</label>
        {fileTag && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
            fileTag === 'Game.ini' ? 'bg-purple-900/50 text-purple-300 border border-purple-700/50' : 'bg-cyan-900/50 text-cyan-300 border border-cyan-700/50'
          }`}>
            {fileTag}
          </span>
        )}
      </div>
      {description && <p className="text-xs text-gray-400 mt-1 leading-relaxed">{description}</p>}
    </div>
  </div>
);

const GameSettings: React.FC<GameSettingsProps> = ({ config, onConfigChange, onSave, isSaving = false, isActionInProgress }) => {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleValueChange = (name: keyof ServerConfig, val: number | boolean) => {
    onConfigChange({ [name]: val });
  };

  const isMatching = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header Banner */}
      <div className="p-6 bg-gray-800/60 backdrop-blur-md rounded-lg shadow-lg border border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xl font-bold text-cyan-400">
            <CogIcon className="w-6 h-6" />
            <h2>Ark: Ascended Server & Gameplay Settings</h2>
          </div>
          <p className="text-sm text-gray-300 mt-1">
            Configure gameplay rules, rates, breeding, and engine variables. Settings are cleanly separated and written to <span className="text-cyan-300 font-mono text-xs">GameUserSettings.ini [ServerSettings]</span> and <span className="text-purple-300 font-mono text-xs">Game.ini [/script/shootergame.shootergamemode]</span> with modern ASA syntax.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Quick Save in Header */}
          {onSave && (
            <button
              onClick={onSave}
              disabled={isSaving || isActionInProgress}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-md transition-all shadow-md hover:shadow-cyan-500/20 disabled:bg-gray-700 disabled:cursor-not-allowed text-sm whitespace-nowrap"
              title="Save all changes directly to GameUserSettings.ini and Game.ini"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <SaveIcon className="w-4 h-4" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          )}

          {/* Search Bar */}
          <div className="w-full sm:w-64 relative">
            <input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 pl-9 text-sm text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-xs text-gray-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 pb-2">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-md text-xs font-semibold transition shadow-sm ${
                isActive
                  ? 'bg-cyan-600 text-white shadow-cyan-500/20'
                  : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700 border border-gray-700/60'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION: Custom Dino Spawns & Custom INI Lines */}
      {(activeCategory === 'all' || activeCategory === 'custom_ini' || isMatching('spawn griffin wyvern dino custom ini configaddnpcspawnentriescontainer')) && (
        <div className="p-6 bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-cyan-400 flex items-center space-x-2">
                <span>🧬</span>
                <span>Custom Dino Spawn Entries & INI Configuration</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Add custom creature spawns (e.g. Griffins, Wyverns, Snow Owls) to any map via <code className="text-purple-300">ConfigAddNPCSpawnEntriesContainer</code> or append raw lines to <code className="text-cyan-300">GameUserSettings.ini</code> and <code className="text-purple-300">Game.ini</code>.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 text-xs font-mono rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                {(config.npcSpawnEntries || []).length} Custom Spawns
              </span>
            </div>
          </div>

          <CustomSpawnAndIniSettings
            config={config}
            onConfigChange={onConfigChange}
            disabled={isActionInProgress}
          />
        </div>
      )}

      {/* SECTION 1: General Rates & XP */}
      {(activeCategory === 'all' || activeCategory === 'general_xp') && (
        <div className="p-6 bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-700">
          <h3 className="text-lg font-bold text-cyan-400 mb-1 flex items-center space-x-2">
            <span>📈</span>
            <span>General Rates & Experience Multipliers</span>
          </h3>
          <p className="text-xs text-gray-400 mb-4">Core harvest, taming, and experience scaling rates.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isMatching('XP Multiplier Experience') && (
              <SliderInput
                label="Global XP Multiplier"
                name="xpMultiplier"
                value={config.xpMultiplier}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                max={50}
                defaultVal={1.0}
                fileTag="GameUserSettings.ini"
                description="Master multiplier for all earned experience points."
              />
            )}
            {isMatching('Taming Speed Multiplier') && (
              <SliderInput
                label="Taming Speed Multiplier"
                name="tamingSpeedMultiplier"
                value={config.tamingSpeedMultiplier}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                max={50}
                defaultVal={1.0}
                fileTag="GameUserSettings.ini"
                description="Controls how quickly wild creatures are tamed."
              />
            )}
            {isMatching('Harvest Amount Multiplier') && (
              <SliderInput
                label="Harvest Amount Multiplier"
                name="harvestAmountMultiplier"
                value={config.harvestAmountMultiplier}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                max={50}
                defaultVal={1.0}
                fileTag="GameUserSettings.ini"
                description="Controls the quantity of items received per harvest hit."
              />
            )}
            {isMatching('Harvest Health Multiplier') && (
              <SliderInput
                label="Harvest Node Health Multiplier"
                name="harvestHealthMultiplier"
                value={config.harvestHealthMultiplier}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                max={10}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Controls how much damage resource nodes can take before depleting."
              />
            )}
            {isMatching('Kill XP Multiplier') && (
              <SliderInput
                label="Kill XP Multiplier"
                name="killXPMultiplier"
                value={config.killXPMultiplier ?? 1.0}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                max={20}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Multiplier for XP gained from killing wild or enemy creatures."
              />
            )}
            {isMatching('Harvest XP Multiplier') && (
              <SliderInput
                label="Harvest XP Multiplier"
                name="harvestXPMultiplier"
                value={config.harvestXPMultiplier ?? 1.0}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                max={20}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Multiplier for XP gained from harvesting resources."
              />
            )}
            {isMatching('Craft XP Multiplier') && (
              <SliderInput
                label="Crafting XP Multiplier"
                name="craftXPMultiplier"
                value={config.craftXPMultiplier ?? 1.0}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                max={20}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Multiplier for XP gained from crafting items and structures."
              />
            )}
            {isMatching('Generic XP Multiplier') && (
              <SliderInput
                label="Generic / Passive XP Multiplier"
                name="genericXPMultiplier"
                value={config.genericXPMultiplier ?? 1.0}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                max={20}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Multiplier for passive over-time experience gain."
              />
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: Breeding & Maturation */}
      {(activeCategory === 'all' || activeCategory === 'breeding') && (
        <div className="p-6 bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-700">
          <h3 className="text-lg font-bold text-cyan-400 mb-1 flex items-center space-x-2">
            <span>🥚</span>
            <span>Breeding, Gestation & Baby Maturation (Game.ini)</span>
          </h3>
          <p className="text-xs text-gray-400 mb-4">Settings governing dinosaur mating cooldowns, egg hatching speed, baby growth, and imprinting.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isMatching('Mating Interval Multiplier') && (
              <SliderInput
                label="Mating Interval Multiplier"
                name="matingIntervalMultiplier"
                value={config.matingIntervalMultiplier}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                min={0.001}
                max={1.0}
                step={0.01}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Lower values shorten the wait time between mating cycles (e.g. 0.1 = 10x faster mating availability)."
              />
            )}
            {isMatching('Mating Speed Multiplier') && (
              <SliderInput
                label="Mating Speed Multiplier"
                name="matingSpeedMultiplier"
                value={config.matingSpeedMultiplier ?? 1.0}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                min={0.1}
                max={50}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Higher values speed up how quickly creatures complete the mating process."
              />
            )}
            {isMatching('Egg Hatch Speed Multiplier Gestation') && (
              <SliderInput
                label="Egg Hatch / Gestation Speed Multiplier"
                name="eggHatchSpeedMultiplier"
                value={config.eggHatchSpeedMultiplier}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                min={0.1}
                max={100}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Higher values speed up egg incubation and mammal pregnancy times."
              />
            )}
            {isMatching('Baby Mature Speed Multiplier Growth') && (
              <SliderInput
                label="Baby Mature Speed Multiplier"
                name="babyMatureSpeedMultiplier"
                value={config.babyMatureSpeedMultiplier}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                min={0.1}
                max={100}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Higher values cause baby dinos to grow up into adults significantly faster."
              />
            )}
            {isMatching('Baby Cuddle Interval Multiplier Imprint') && (
              <SliderInput
                label="Baby Cuddle / Imprint Interval"
                name="babyCuddleIntervalMultiplier"
                value={config.babyCuddleIntervalMultiplier ?? 1.0}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                min={0.01}
                max={5.0}
                step={0.05}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Lower values reduce the interval between cuddle/imprinting care prompts."
              />
            )}
            {isMatching('Baby Imprinting Stat Scale Multiplier') && (
              <SliderInput
                label="Baby Imprinting Stat Scale"
                name="babyImprintingStatScaleMultiplier"
                value={config.babyImprintingStatScaleMultiplier ?? 1.0}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                min={0.1}
                max={10.0}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Multiplier for the stat bonus awarded by achieving 100% imprint on a creature."
              />
            )}
            {isMatching('Baby Food Consumption Speed Multiplier') && (
              <SliderInput
                label="Baby Food Consumption Speed"
                name="babyFoodConsumptionSpeedMultiplier"
                value={config.babyFoodConsumptionSpeedMultiplier ?? 1.0}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                min={0.1}
                max={5.0}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Controls how fast baby dinosaurs consume food from inventory/troughs."
              />
            )}
            {isMatching('Baby Cuddle Grace Period') && (
              <SliderInput
                label="Baby Cuddle Grace Period"
                name="babyCuddleGracePeriodMultiplier"
                value={config.babyCuddleGracePeriodMultiplier ?? 1.0}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                min={0.1}
                max={10.0}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Multiplier for the grace period before an un-cuddled baby starts losing imprint quality."
              />
            )}
            {isMatching('Allow Anyone Baby Imprint Cuddle Tribe') && (
              <CheckboxInput
                label="Allow Anyone to Imprint Cuddle"
                name="bAllowAnyoneBabyImprintCuddle"
                checked={config.bAllowAnyoneBabyImprintCuddle}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="Game.ini"
                description="When enabled, any tribe member can cuddle and fulfill imprinting care, not just the original claimer."
              />
            )}
            {isMatching('Disable Imprint Dino Buff') && (
              <CheckboxInput
                label="Disable Imprint Buff"
                name="bDisableImprintDinoBuff"
                checked={config.bDisableImprintDinoBuff}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="Game.ini"
                description="When enabled, turns off the player-rider damage and resistance bonus gained from imprinted dinos."
              />
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: Player Rules & Drains */}
      {(activeCategory === 'all' || activeCategory === 'player') && (
        <div className="p-6 bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-700">
          <h3 className="text-lg font-bold text-cyan-400 mb-1 flex items-center space-x-2">
            <span>👤</span>
            <span>Player Rules, Stats & Quality of Life</span>
          </h3>
          <p className="text-xs text-gray-400 mb-4">Player character survival drains, view modes, speed leveling, and map utilities.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isMatching('Food Drain Player Character') && (
              <SliderInput
                label="Player Food Drain Multiplier"
                name="playerCharacterFoodDrainMultiplier"
                value={config.playerCharacterFoodDrainMultiplier}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                max={5}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Lower values make players get hungry slower."
              />
            )}
            {isMatching('Water Drain Player Character') && (
              <SliderInput
                label="Player Water Drain Multiplier"
                name="playerCharacterWaterDrainMultiplier"
                value={config.playerCharacterWaterDrainMultiplier}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                max={5}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Lower values make players get thirsty slower."
              />
            )}
            {isMatching('Stamina Drain Player Character') && (
              <SliderInput
                label="Player Stamina Drain Multiplier"
                name="playerCharacterStaminaDrainMultiplier"
                value={config.playerCharacterStaminaDrainMultiplier ?? 1.0}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                max={5}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Lower values make sprinting and jumping consume less stamina."
              />
            )}
            {isMatching('Health Recovery Player Character') && (
              <SliderInput
                label="Player Health Recovery Multiplier"
                name="playerCharacterHealthRecoveryMultiplier"
                value={config.playerCharacterHealthRecoveryMultiplier ?? 1.0}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                max={10}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Higher values cause player health to regenerate faster."
              />
            )}
            {isMatching('Allow Speed Leveling ASA Movement Speed') && (
              <CheckboxInput
                label="Allow Speed Leveling (ASA Feature)"
                name="bAllowSpeedLeveling"
                checked={config.bAllowSpeedLeveling ?? true}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="Game.ini"
                description="Re-enables the movement speed stat point leveling on players and ground creatures in Ark: Ascended."
              />
            )}
            {isMatching('Corpse Locator Death Beam Light') && (
              <CheckboxInput
                label="Enable Corpse Locator Light Beam"
                name="bUseCorpseLocator"
                checked={config.bUseCorpseLocator ?? true}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="Game.ini"
                description="Shows a glowing green vertical light beam over the player's death cache."
              />
            )}
            {isMatching('Allow Unlimited Respecs Mindwipe') && (
              <CheckboxInput
                label="Allow Unlimited Mindwipe Respecs"
                name="bAllowUnlimitedRespecs"
                checked={config.bAllowUnlimitedRespecs ?? true}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="Game.ini"
                description="Removes the 24-hour cooldown timer on using Mindwipe Tonics."
              />
            )}
            {isMatching('Auto Unlock All Engrams bAutoUnlockEngrams bAutoUnlockAllEngrams Recipes Blueprints') && (
              <CheckboxInput
                label="Auto-Unlock All Engrams on Level Up"
                name="bAutoUnlockAllEngrams"
                checked={config.bAutoUnlockAllEngrams ?? false}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="Game.ini"
                description="Automatically learns all engrams/recipes (including DLC & Tek engrams) as players reach the required levels without spending engram points."
              />
            )}
            {isMatching('PvE Mode Server') && (
              <CheckboxInput
                label="Enable PvE Mode"
                name="bServerPVE"
                checked={config.bServerPVE}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="GameUserSettings.ini"
                description="Disables direct player-vs-player damage and raiding."
              />
            )}
            {isMatching('Allow Third Person Camera') && (
              <CheckboxInput
                label="Allow Third Person Player Camera"
                name="bAllowThirdPersonPlayer"
                checked={config.bAllowThirdPersonPlayer}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="GameUserSettings.ini"
                description="Allows players to toggle between 1st person and 3rd person camera views."
              />
            )}
            {isMatching('Show Floating Damage Text Hit Numbers') && (
              <CheckboxInput
                label="Show Floating Damage Numbers"
                name="bShowFloatingDamageText"
                checked={config.bShowFloatingDamageText}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="GameUserSettings.ini"
                description="Displays floating numeric damage values when attacking targets."
              />
            )}
            {isMatching('Server Crosshair Reticle') && (
              <CheckboxInput
                label="Enable Weapon Crosshair"
                name="bServerCrosshair"
                checked={config.bServerCrosshair}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="GameUserSettings.ini"
                description="Enables on-screen crosshair reticles for ranged weapons."
              />
            )}
            {isMatching('Show Map Player Location GPS') && (
              <CheckboxInput
                label="Show Player Position on In-Game Map"
                name="bShowMapPlayerLocation"
                checked={config.bShowMapPlayerLocation}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="GameUserSettings.ini"
                description="Renders the player's real-time position icon on the in-game mini-map."
              />
            )}
            {isMatching('Global Voice Chat Radio') && (
              <CheckboxInput
                label="Enable Global Voice Chat"
                name="bGlobalVoiceChat"
                checked={config.bGlobalVoiceChat}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="GameUserSettings.ini"
                description="Broadcasts voice chat to all players on the server rather than local proximity."
              />
            )}
            {isMatching('Proximity Text Chat Local') && (
              <CheckboxInput
                label="Enable Proximity-Only Chat"
                name="bProximityChat"
                checked={config.bProximityChat}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="GameUserSettings.ini"
                description="Restricts in-game text chat messages to nearby players."
              />
            )}
          </div>
        </div>
      )}

      {/* SECTION 4: Dino Rules & Stats */}
      {(activeCategory === 'all' || activeCategory === 'dino') && (
        <div className="p-6 bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-700">
          <h3 className="text-lg font-bold text-cyan-400 mb-1 flex items-center space-x-2">
            <span>🦖</span>
            <span>Dino Rules, Drains, Combat & Flyers</span>
          </h3>
          <p className="text-xs text-gray-400 mb-4">Tamed dino damage, resistance, stamina, flyer carry, and flyer speed leveling.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isMatching('Tamed Dino Damage Multiplier') && (
              <SliderInput
                label="Tamed Dino Damage Multiplier"
                name="tamedDinoDamageMultiplier"
                value={config.tamedDinoDamageMultiplier}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                max={10}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Multiplier for the melee and ranged damage dealt by tamed dinosaurs."
              />
            )}
            {isMatching('Tamed Dino Resistance Multiplier Defense') && (
              <SliderInput
                label="Tamed Dino Resistance (Defense)"
                name="tamedDinoResistanceMultiplier"
                value={config.tamedDinoResistanceMultiplier}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                max={10}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Lower values reduce damage taken by tamed dinosaurs (e.g. 0.5 = take half damage)."
              />
            )}
            {isMatching('Dino Food Drain Multiplier Tamed Hunger') && (
              <SliderInput
                label="Dino Food Drain Multiplier"
                name="dinoCharacterFoodDrainMultiplier"
                value={config.dinoCharacterFoodDrainMultiplier}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                max={5}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Controls how quickly dinosaurs consume food. Higher values can speed up wild taming food drop."
              />
            )}
            {isMatching('Dino Stamina Drain Multiplier') && (
              <SliderInput
                label="Dino Stamina Drain Multiplier"
                name="dinoCharacterStaminaDrainMultiplier"
                value={config.dinoCharacterStaminaDrainMultiplier}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                max={5}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Lower values allow dinosaurs to sprint and attack longer before getting exhausted."
              />
            )}
            {isMatching('Dino Health Recovery Multiplier') && (
              <SliderInput
                label="Dino Health Recovery Multiplier"
                name="dinoCharacterHealthRecoveryMultiplier"
                value={config.dinoCharacterHealthRecoveryMultiplier}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                max={10}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Controls the rate at which resting dinosaurs naturally regenerate health."
              />
            )}
            {isMatching('Lay Egg Interval Multiplier Unfertilized') && (
              <SliderInput
                label="Lay Egg Interval Multiplier"
                name="layEggIntervalMultiplier"
                value={config.layEggIntervalMultiplier ?? 1.0}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                min={0.1}
                max={10}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Lower values make female dinos lay unfertilized eggs more frequently."
              />
            )}
            {isMatching('Poop Interval Multiplier Feces Fertilizer') && (
              <SliderInput
                label="Poop Interval Multiplier"
                name="poopIntervalMultiplier"
                value={config.poopIntervalMultiplier ?? 1.0}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                min={0.1}
                max={10}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Lower values make creatures defecate more frequently for fertilizer collection."
              />
            )}
            {isMatching('Allow Flyer Carry PvE Pick Up Wild') && (
              <CheckboxInput
                label="Allow Flyer Carry in PvE"
                name="bAllowFlyerCarryPvE"
                checked={config.bAllowFlyerCarryPvE}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="GameUserSettings.ini"
                description="Allows flyers (Argentavis, Quetzal, Wyvern, etc.) to grab and carry wild/tamed creatures in PvE mode."
              />
            )}
            {isMatching('Allow Flyer Speed Leveling ASA Movement Speed Wyvern') && (
              <CheckboxInput
                label="Allow Flyer Speed Leveling (ASA Feature)"
                name="bAllowFlyerSpeedLeveling"
                checked={config.bAllowFlyerSpeedLeveling}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="Game.ini"
                description="Allows players to invest earned level-up points into flying creature movement speed."
              />
            )}
            {isMatching('Allow Flying Stamina Recovery Hover Regen') && (
              <CheckboxInput
                label="Allow Flying Stamina Recovery"
                name="bAllowFlyingStaminaRecovery"
                checked={config.bAllowFlyingStaminaRecovery}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="GameUserSettings.ini"
                description="Allows flyers to slowly recover stamina while hovering or standing on high structures."
              />
            )}
            {isMatching('Force Allow Cave Flyers CaveFlyers Riding bForceAllowCaveFlyers ForceAllowCaveFlyers') && (
              <CheckboxInput
                label="Force Allow Cave Flyers"
                name="bForceAllowCaveFlyers"
                checked={config.bForceAllowCaveFlyers ?? true}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="GameUserSettings.ini"
                description="Allows players to mount and fly creatures inside caves and underground dungeons (ForceAllowCaveFlyers=True in GameUserSettings.ini [ServerSettings])."
              />
            )}
            {isMatching('Force Can Ride Fliers Genesis Flyers Allowed Caves bForceCanRideFliers') && (
              <CheckboxInput
                label="Force Allow Riding Flyers (Genesis / Caves)"
                name="bForceCanRideFliers"
                checked={config.bForceCanRideFliers ?? false}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="GameUserSettings.ini"
                description="Forces flyer riding on maps and zones where flyers are normally restricted (such as Genesis Part 1, space/lunar simulation areas, and certain caves)."
              />
            )}
          </div>
        </div>
      )}

      {/* SECTION 5: World, Environment & Decay */}
      {(activeCategory === 'all' || activeCategory === 'world_decay') && (
        <div className="p-6 bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-700">
          <h3 className="text-lg font-bold text-cyan-400 mb-1 flex items-center space-x-2">
            <span>🌍</span>
            <span>World Difficulty, Time Progression, Spoiling & Decay</span>
          </h3>
          <p className="text-xs text-gray-400 mb-4">Official difficulty overrides (max level 150 dinos), day/night speed, and item decomposition.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isMatching('Override Official Difficulty Max Dino Level 150') && (
              <SliderInput
                label="Override Official Difficulty (Max Wild Level)"
                name="overrideOfficialDifficulty"
                value={config.overrideOfficialDifficulty ?? 5.0}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                min={1.0}
                max={30.0}
                step={1.0}
                defaultVal={5.0}
                fileTag="GameUserSettings.ini"
                description="Sets the max level for wild dinos (5.0 = Level 150 max, 6.0 = Level 180 max, 10.0 = Level 300 max)."
              />
            )}
            {isMatching('Difficulty Offset World') && (
              <SliderInput
                label="Difficulty Offset"
                name="difficultyOffset"
                value={config.difficultyOffset}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                min={0.1}
                max={1.0}
                step={0.1}
                defaultVal={1.0}
                fileTag="GameUserSettings.ini"
                description="Official difficulty scalar from 0.0 to 1.0."
              />
            )}
            {isMatching('Day Time Speed Scale') && (
              <SliderInput
                label="Day Time Speed Scale"
                name="dayTimeSpeedScale"
                value={config.dayTimeSpeedScale ?? 1.0}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                min={0.1}
                max={5.0}
                step={0.1}
                defaultVal={1.0}
                fileTag="GameUserSettings.ini"
                description="Lower values make daytime last longer."
              />
            )}
            {isMatching('Night Time Speed Scale') && (
              <SliderInput
                label="Night Time Speed Scale"
                name="nightTimeSpeedScale"
                value={config.nightTimeSpeedScale}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                min={0.1}
                max={5.0}
                step={0.1}
                defaultVal={1.0}
                fileTag="GameUserSettings.ini"
                description="Higher values make nighttime pass quicker."
              />
            )}
            {isMatching('Item Spoil Time Multiplier Meat Berries') && (
              <SliderInput
                label="Item Spoil Time Multiplier"
                name="itemSpoilingTimeMultiplier"
                value={config.itemSpoilingTimeMultiplier}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                max={20}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Higher values make perishable foods and meats last longer before spoiling (e.g. 5.0 = 5x longer)."
              />
            )}
            {isMatching('Fuel Consumption Interval Gasoline Wood') && (
              <SliderInput
                label="Fuel Consumption Interval"
                name="fuelConsumptionIntervalMultiplier"
                value={config.fuelConsumptionIntervalMultiplier}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                max={20}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Higher values make wood, sparkpowder, and gasoline burn slower in forges and generators."
              />
            )}
            {isMatching('Item Decomposition Time Dropped Bag Cache') && (
              <SliderInput
                label="Dropped Item Decomposition Time"
                name="itemDecompositionTimeMultiplier"
                value={config.itemDecompositionTimeMultiplier ?? 1.0}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                max={10}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Higher values make dropped item bags persist on the ground longer before vanishing."
              />
            )}
            {isMatching('Corpse Decomposition Time Death Bag') && (
              <SliderInput
                label="Player / Dino Corpse Decomposition Time"
                name="corpseDecompositionTimeMultiplier"
                value={config.corpseDecompositionTimeMultiplier ?? 1.0}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                max={10}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Higher values give players more time to retrieve their gear after dying."
              />
            )}
            {isMatching('Crop Growth Speed Multiplier Farming') && (
              <SliderInput
                label="Crop Growth Speed Multiplier"
                name="cropGrowthSpeedMultiplier"
                value={config.cropGrowthSpeedMultiplier ?? 1.0}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                max={20}
                defaultVal={1.0}
                fileTag="Game.ini"
                description="Higher values speed up greenhouse and crop plot growth rates."
              />
            )}
            {isMatching('Auto Save Period Minutes Interval') && (
              <SliderInput
                label="World Auto Save Interval (Minutes)"
                name="autoSavePeriodMinutes"
                value={config.autoSavePeriodMinutes}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                min={1}
                max={60}
                step={1}
                defaultVal={15.0}
                fileTag="GameUserSettings.ini"
                description="Frequency at which the server automatically writes world progress to the save database."
              />
            )}
          </div>
        </div>
      )}

      {/* SECTION 6: Structures & Building */}
      {(activeCategory === 'all' || activeCategory === 'structures') && (
        <div className="p-6 bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-700">
          <h3 className="text-lg font-bold text-cyan-400 mb-1 flex items-center space-x-2">
            <span>🏰</span>
            <span>Structures, Building, Friendly Fire & Tribe Rules</span>
          </h3>
          <p className="text-xs text-gray-400 mb-4">Structure collision clipping, pickup windows, decay timers, and tribe limits.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isMatching('Structure Placement Collision Disable Clipping Mesh') && (
              <CheckboxInput
                label="Disable Structure Placement Collision (No Clip)"
                name="bDisableStructurePlacementCollision"
                checked={config.bDisableStructurePlacementCollision}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="GameUserSettings.ini"
                description="Allows structures to clip and snap smoothly into terrain and rocks without collision errors."
              />
            )}
            {isMatching('Always Allow Structure Pickup Timer') && (
              <CheckboxInput
                label="Always Allow Structure Pickup (Unlimited Window)"
                name="bAlwaysAllowStructurePickup"
                checked={config.bAlwaysAllowStructurePickup}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="GameUserSettings.ini"
                description="Allows picking up placed structures at any time, bypassing the 30-second placement timer."
              />
            )}
            {isMatching('Allow Cave Building PvE') && (
              <CheckboxInput
                label="Allow Cave Building in PvE"
                name="bAllowCaveBuildingPvE"
                checked={config.bAllowCaveBuildingPvE}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="GameUserSettings.ini"
                description="Enables placing foundations and structures inside artifact and resource caves."
              />
            )}
            {isMatching('Allow Structures at Supply Drops PvE SupplyDrop PvEAllowStructuresAtSupplyDrops') && (
              <CheckboxInput
                label="Allow Structures at Supply Drops (PvE)"
                name="bPvEAllowStructuresAtSupplyDrops"
                checked={config.bPvEAllowStructuresAtSupplyDrops}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="GameUserSettings.ini"
                description="If True, allows building near supply drop points in PvE mode. (PvEAllowStructuresAtSupplyDrops)"
              />
            )}
            {isMatching('Disable Friendly Fire Tribe PvP') && (
              <CheckboxInput
                label="Disable Friendly Fire (Tribe Protection)"
                name="bDisableFriendlyFire"
                checked={config.bDisableFriendlyFire}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="Game.ini"
                description="Prevents tribe members and tribe dinosaurs from damaging each other."
              />
            )}
            {isMatching('Disable Structure Decay PvE Demolish') && (
              <CheckboxInput
                label="Disable PvE Structure Decay"
                name="bDisableStructureDecayPvE"
                checked={config.bDisableStructureDecayPvE}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="GameUserSettings.ini"
                description="Disables automatic structure auto-demolish timers for abandoned bases."
              />
            )}
            {isMatching('Disable Dino Decay PvE Claim') && (
              <CheckboxInput
                label="Disable PvE Dino Decay"
                name="bDisableDinoDecayPvE"
                checked={config.bDisableDinoDecayPvE}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="GameUserSettings.ini"
                description="Disables automatic dino unclaim and death timers when players are offline."
              />
            )}
            {isMatching('Structure Pickup Time After Placement Window Seconds') && (
              <SliderInput
                label="Structure Pickup Time Window (Seconds)"
                name="structurePickupTimeAfterPlacement"
                value={config.structurePickupTimeAfterPlacement ?? 30.0}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                min={5}
                max={300}
                step={5}
                defaultVal={30.0}
                fileTag="GameUserSettings.ini"
                description="Number of seconds players have to freely pick up a newly placed structure."
              />
            )}
            {isMatching('Max Number Of Players In Tribe Size Limit') && (
              <SliderInput
                label="Max Players in Tribe (0 = Unlimited)"
                name="maxNumberOfPlayersInTribe"
                value={config.maxNumberOfPlayersInTribe ?? 0}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                min={0}
                max={100}
                step={1}
                defaultVal={0}
                fileTag="Game.ini"
                description="Restricts the maximum number of players permitted in a single tribe (0 for default/unlimited)."
              />
            )}
          </div>
        </div>
      )}

      {/* SECTION 7: Transfers & Tributes */}
      {(activeCategory === 'all' || activeCategory === 'tributes') && (
        <div className="p-6 bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-700">
          <h3 className="text-lg font-bold text-cyan-400 mb-1 flex items-center space-x-2">
            <span>🔄</span>
            <span>Transfers, Obelisks & Tributes (GameUserSettings.ini)</span>
          </h3>
          <p className="text-xs text-gray-400 mb-4">Control survivor, item, and dinosaur cross-ark downloads and obelisk uploads.</p>

          {config.bEnableClustering && (
            <div className="p-3 bg-blue-900/50 border border-blue-700 rounded-md text-blue-300 text-xs flex items-center space-x-2 mb-4">
              <InfoIcon className="w-4 h-4 flex-shrink-0" />
              <p>Clustering is enabled for this server profile. Cross-server transfers within your cluster directory are active.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isMatching('Disable All Tribute Downloads Obelisk') && (
              <CheckboxInput
                label="Disable All Tribute Downloads"
                name="bNoTributeDownloads"
                checked={config.bNoTributeDownloads}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="GameUserSettings.ini"
                description="Completely prevents downloading any external survivors, items, or dinos from obelisks."
              />
            )}
            {isMatching('Prevent Survivor Downloads Character') && (
              <CheckboxInput
                label="Prevent Survivor Downloads"
                name="bPreventDownloadSurvivors"
                checked={config.bPreventDownloadSurvivors}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="GameUserSettings.ini"
                description="Prevents uploading or downloading player character avatars from other servers."
              />
            )}
            {isMatching('Prevent Item Downloads Inventory') && (
              <CheckboxInput
                label="Prevent Item Downloads"
                name="bPreventDownloadItems"
                checked={config.bPreventDownloadItems}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="GameUserSettings.ini"
                description="Prevents transferring items, gear, and materials from external servers."
              />
            )}
            {isMatching('Prevent Dino Downloads Creature Cryopod') && (
              <CheckboxInput
                label="Prevent Dino Downloads"
                name="bPreventDownloadDinos"
                checked={config.bPreventDownloadDinos}
                onChange={handleValueChange}
                disabled={isActionInProgress}
                fileTag="GameUserSettings.ini"
                description="Prevents transferring tamed creatures from external servers."
              />
            )}
          </div>
        </div>
      )}

      {/* Sticky Bottom Save Bar */}
      {onSave && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-gray-900/90 backdrop-blur-md border-t border-gray-700/80 shadow-2xl py-3 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-300">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>
                Changes take effect after saving and writing to <span className="text-cyan-300 font-mono">GameUserSettings.ini</span> & <span className="text-purple-300 font-mono">Game.ini</span>
              </span>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving || isActionInProgress}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-bold rounded-lg transition-all duration-200 shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving INI Files...</span>
                  </>
                ) : (
                  <>
                    <SaveIcon className="w-5 h-5" />
                    <span>Save All Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameSettings;
