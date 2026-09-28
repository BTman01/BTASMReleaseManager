import React, { useState } from 'react';
import { ServerConfig, NpcSpawnEntry } from '../types';

interface CustomSpawnAndIniSettingsProps {
  config: ServerConfig;
  onConfigChange: (newConfig: Partial<ServerConfig>) => void;
  disabled: boolean;
}

interface DinoPreset {
  name: string;
  blueprint: string;
  defaultContainer: string;
  defaultWeight: number;
  defaultMaxPct: number;
  description: string;
  category: string;
}

const DINO_PRESETS: DinoPreset[] = [
  {
    name: 'Griffin',
    blueprint: 'Griffin_Character_BP_C',
    defaultContainer: 'DinoSpawnEntries_ChalkHills_C',
    defaultWeight: 1.0,
    defaultMaxPct: 0.2,
    description: 'High-speed flying mount with dive attack and passenger seat.',
    category: 'Flyers',
  },
  {
    name: 'Snow Owl',
    blueprint: 'Owl_Character_BP_C',
    defaultContainer: 'DinoSpawnEntriesSnow_C',
    defaultWeight: 1.0,
    defaultMaxPct: 0.2,
    description: 'Thermal vision and healing predator flyer from Extinction.',
    category: 'Flyers',
  },
  {
    name: 'Deinonychus',
    blueprint: 'Deinonychus_Character_BP_C',
    defaultContainer: 'DinoSpawnEntriesRedwoods_C',
    defaultWeight: 0.8,
    defaultMaxPct: 0.15,
    description: 'Wall-climbing bleed pack hunter from Valguero.',
    category: 'Carnivores',
  },
  {
    name: 'Wyvern (Fire)',
    blueprint: 'Wyvern_Character_BP_Fire_C',
    defaultContainer: 'DinoSpawnEntries_Scorched_Dunes_C',
    defaultWeight: 0.5,
    defaultMaxPct: 0.1,
    description: 'Apex flying predator with flamethrower breath.',
    category: 'Apex',
  },
  {
    name: 'Wyvern (Lightning)',
    blueprint: 'Wyvern_Character_BP_Lightning_C',
    defaultContainer: 'DinoSpawnEntries_Scorched_Mountains_C',
    defaultWeight: 0.5,
    defaultMaxPct: 0.1,
    description: 'High-DPS beam attack wyvern.',
    category: 'Apex',
  },
  {
    name: 'Wyvern (Poison)',
    blueprint: 'Wyvern_Character_BP_Poison_C',
    defaultContainer: 'DinoSpawnEntries_Scorched_Canyons_C',
    defaultWeight: 0.5,
    defaultMaxPct: 0.1,
    description: 'Ranged explosive venom projectile wyvern.',
    category: 'Apex',
  },
  {
    name: 'Rock Drake',
    blueprint: 'RockDrake_Character_BP_C',
    defaultContainer: 'DinoSpawnEntries_Aberration_BioLum_C',
    defaultWeight: 0.7,
    defaultMaxPct: 0.15,
    description: 'Camouflage, gliding, and wall-crawling drake from Aberration.',
    category: 'Aberration',
  },
  {
    name: 'Shadowmane',
    blueprint: 'LionfishLion_Character_BP_C',
    defaultContainer: 'DinoSpawnEntriesJungle_C',
    defaultWeight: 0.6,
    defaultMaxPct: 0.1,
    description: 'Teleport striking stealth lion predator.',
    category: 'Apex',
  },
  {
    name: 'Gacha',
    blueprint: 'Gacha_Character_BP_C',
    defaultContainer: 'DinoSpawnEntriesRedwoods_C',
    defaultWeight: 0.8,
    defaultMaxPct: 0.15,
    description: 'Resource-producing friendly sloth creature.',
    category: 'Utility',
  },
  {
    name: 'Magmasaur',
    blueprint: 'Cherufe_Character_BP_C',
    defaultContainer: 'DinoSpawnEntriesMountain_C',
    defaultWeight: 0.5,
    defaultMaxPct: 0.1,
    description: 'Mobile forge and explosive molten mortar beast.',
    category: 'Apex',
  },
  {
    name: 'Reaper King',
    blueprint: 'Xenomorph_Character_BP_Male_C',
    defaultContainer: 'DinoSpawnEntries_Aberration_Element_C',
    defaultWeight: 0.3,
    defaultMaxPct: 0.05,
    description: 'Burrowing armored tail-spinning horror predator.',
    category: 'Apex',
  },
  {
    name: 'Velonasaur',
    blueprint: 'Spindles_Character_BP_C',
    defaultContainer: 'DinoSpawnEntries_Scorched_Dunes_C',
    defaultWeight: 0.8,
    defaultMaxPct: 0.15,
    description: 'Gatling quill firing desert turret dinosaur.',
    category: 'Carnivores',
  },
  {
    name: 'Managarmr',
    blueprint: 'IceJumper_Character_BP_C',
    defaultContainer: 'DinoSpawnEntriesSnow_C',
    defaultWeight: 0.6,
    defaultMaxPct: 0.1,
    description: 'Jet-powered ice breath hound flyer.',
    category: 'Apex',
  },
  {
    name: 'Bloodstalker',
    blueprint: 'BogSpider_Character_BP_C',
    defaultContainer: 'DinoSpawnEntriesSwamp_C',
    defaultWeight: 0.6,
    defaultMaxPct: 0.1,
    description: 'Web-slinging multi-directional spider mount.',
    category: 'Utility',
  },
  {
    name: 'Ferox',
    blueprint: 'Shapeshifter_Small_Character_BP_C',
    defaultContainer: 'DinoSpawnEntriesSnow_C',
    defaultWeight: 0.7,
    defaultMaxPct: 0.12,
    description: 'Element-consuming transforming shoulder pet / brawler.',
    category: 'Utility',
  },
  {
    name: 'Fasolasuchus',
    blueprint: 'Fasolasuchus_Character_BP_C',
    defaultContainer: 'DinoSpawnEntries_Scorched_Dunes_C',
    defaultWeight: 0.8,
    defaultMaxPct: 0.15,
    description: 'Sand-swimming ASA apex crocodile.',
    category: 'Apex',
  },
  {
    name: 'Oasisaur',
    blueprint: 'Oasisaur_Character_BP_C',
    defaultContainer: 'DinoSpawnEntries_Scorched_Oasis_C',
    defaultWeight: 0.4,
    defaultMaxPct: 0.08,
    description: 'Colossal floating living island with resurrection pool.',
    category: 'Utility',
  },
  {
    name: 'Gigantoraptor',
    blueprint: 'Gigantoraptor_Character_BP_C',
    defaultContainer: 'DinoSpawnEntriesGrassland_C',
    defaultWeight: 0.8,
    defaultMaxPct: 0.15,
    description: 'Feathered dinosaur with baby nurturing & training abilities.',
    category: 'Utility',
  },
  {
    name: 'Ceratosaurus',
    blueprint: 'Ceratosaurus_Character_BP_C',
    defaultContainer: 'DinoSpawnEntriesJungle_C',
    defaultWeight: 0.8,
    defaultMaxPct: 0.15,
    description: 'Venom-bursting aggressive mid-tier theropod.',
    category: 'Carnivores',
  },
  {
    name: 'Pyroraptor',
    blueprint: 'Pyroraptor_Character_BP_C',
    defaultContainer: 'DinoSpawnEntriesMountain_C',
    defaultWeight: 0.7,
    defaultMaxPct: 0.12,
    description: 'Flame-igniting dashing predator.',
    category: 'Carnivores',
  },
  {
    name: 'Dreadmare',
    blueprint: 'Dreadmare_Character_BP_C',
    defaultContainer: 'DinoSpawnEntriesCave1_C',
    defaultWeight: 0.5,
    defaultMaxPct: 0.1,
    description: 'Mythical dark pegasus creature with shadow magic.',
    category: 'Flyers',
  },
];

interface ContainerPreset {
  className: string;
  label: string;
  biome: string;
}

const CONTAINER_PRESETS: ContainerPreset[] = [
  { className: 'DinoSpawnEntries_ChalkHills_C', label: 'Chalk Hills (Valguero / Custom)', biome: 'Hills' },
  { className: 'DinoSpawnEntriesMountain_C', label: 'Mountains & High Peaks', biome: 'Mountains' },
  { className: 'DinoSpawnEntriesGrassland_C', label: 'Grasslands & Open Plains', biome: 'Plains' },
  { className: 'DinoSpawnEntriesJungle_C', label: 'Jungles & Dense Forests', biome: 'Jungle' },
  { className: 'DinoSpawnEntriesBeach_C', label: 'Beaches & Coastlines', biome: 'Coast' },
  { className: 'DinoSpawnEntriesSnow_C', label: 'Snow & Glacial Biome', biome: 'Snow' },
  { className: 'DinoSpawnEntriesSwamp_C', label: 'Swamps & Marshes', biome: 'Swamp' },
  { className: 'DinoSpawnEntriesRedwoods_C', label: 'Redwood Forests', biome: 'Redwoods' },
  { className: 'DinoSpawnEntriesCave1_C', label: 'Artifact & Cavern Interiors', biome: 'Caves' },
  { className: 'DinoSpawnEntriesWater_C', label: 'Deep Ocean Waters', biome: 'Ocean' },
  { className: 'DinoSpawnEntries_TheCenter_Jungle_C', label: 'The Center: Jungles', biome: 'The Center' },
  { className: 'DinoSpawnEntries_TheCenter_Volcano_C', label: 'The Center: Volcano Island', biome: 'The Center' },
  { className: 'DinoSpawnEntries_TheCenter_FloatingIsland_C', label: 'The Center: Floating Island', biome: 'The Center' },
  { className: 'DinoSpawnEntries_Scorched_Dunes_C', label: 'Scorched Earth: Outer Dunes', biome: 'Scorched Earth' },
  { className: 'DinoSpawnEntries_Scorched_Mountains_C', label: 'Scorched Earth: Mountains', biome: 'Scorched Earth' },
  { className: 'DinoSpawnEntries_Scorched_Canyons_C', label: 'Scorched Earth: Canyons', biome: 'Scorched Earth' },
  { className: 'DinoSpawnEntries_Scorched_Oasis_C', label: 'Scorched Earth: Oasis', biome: 'Scorched Earth' },
  { className: 'DinoSpawnEntries_Aberration_Fertile_C', label: 'Aberration: Green Fertile Zone', biome: 'Aberration' },
  { className: 'DinoSpawnEntries_Aberration_BioLum_C', label: 'Aberration: Blue Bioluminescent', biome: 'Aberration' },
  { className: 'DinoSpawnEntries_Aberration_Element_C', label: 'Aberration: Red Element Zone', biome: 'Aberration' },
];

export const CustomSpawnAndIniSettings: React.FC<CustomSpawnAndIniSettingsProps> = ({
  config,
  onConfigChange,
  disabled,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'spawns' | 'game_ini' | 'game_user_settings'>('spawns');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Spawn Builder State
  const [selectedPresetName, setSelectedPresetName] = useState<string>('Griffin');
  const [entryName, setEntryName] = useState<string>('Griffin');
  const [containerClass, setContainerClass] = useState<string>('DinoSpawnEntries_ChalkHills_C');
  const [npcClass, setNpcClass] = useState<string>('Griffin_Character_BP_C');
  const [entryWeight, setEntryWeight] = useState<number>(1.0);
  const [maxPercentage, setMaxPercentage] = useState<number>(0.2);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const spawnEntries = config.npcSpawnEntries || [];

  const handleSelectPreset = (presetName: string) => {
    if (presetName === '__custom__') {
      setIsCustomMode(true);
      setSelectedPresetName('__custom__');
      return;
    }
    const preset = DINO_PRESETS.find((p) => p.name === presetName);
    if (preset) {
      setSelectedPresetName(preset.name);
      setEntryName(preset.name);
      setNpcClass(preset.blueprint);
      setContainerClass(preset.defaultContainer);
      setEntryWeight(preset.defaultWeight);
      setMaxPercentage(preset.defaultMaxPct);
      setIsCustomMode(false);
    }
  };

  const handleQuickAdd = (presetName: string, containerOverride?: string) => {
    const preset = DINO_PRESETS.find((p) => p.name === presetName);
    if (!preset) return;

    const targetContainer = containerOverride || preset.defaultContainer;
    const newEntry: NpcSpawnEntry = {
      id: `spawn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: preset.name,
      containerClass: targetContainer,
      npcClass: preset.blueprint,
      entryWeight: preset.defaultWeight,
      maxPercentage: preset.defaultMaxPct,
      enabled: true,
    };

    const updated = [...spawnEntries, newEntry];
    onConfigChange({ npcSpawnEntries: updated });
    showFeedback(`Added ${preset.name} spawn rule to ${targetContainer.replace('DinoSpawnEntries', '')}!`);
  };

  const handleAddSpawnRule = () => {
    if (!containerClass.trim() || !npcClass.trim()) {
      showFeedback('Please provide both a valid Container Class and NPC Blueprint Class.', true);
      return;
    }

    const newEntry: NpcSpawnEntry = {
      id: `spawn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: entryName.trim() || 'CustomDino',
      containerClass: containerClass.trim(),
      npcClass: npcClass.trim(),
      entryWeight: parseFloat(String(entryWeight)) || 1.0,
      maxPercentage: parseFloat(String(maxPercentage)) || 0.2,
      enabled: true,
    };

    const updated = [...spawnEntries, newEntry];
    onConfigChange({ npcSpawnEntries: updated });
    showFeedback(`Spawn rule for "${newEntry.name}" added successfully!`);
  };

  const handleToggleSpawnRule = (id: string) => {
    const updated = spawnEntries.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e));
    onConfigChange({ npcSpawnEntries: updated });
  };

  const handleDeleteSpawnRule = (id: string) => {
    const updated = spawnEntries.filter((e) => e.id !== id);
    onConfigChange({ npcSpawnEntries: updated });
  };

  const handleCopySnippet = (entry: NpcSpawnEntry) => {
    const line = entry.rawOverride ||
      `ConfigAddNPCSpawnEntriesContainer=(NPCSpawnEntriesContainerClassString="${entry.containerClass}",NPCSpawnEntries=((AnEntryName="${entry.name}",EntryWeight=${entry.entryWeight.toFixed(2)},NPCsToSpawnStrings=("${entry.npcClass}"))),NPCClassString="${entry.npcClass}",MaxPercentageOfDesiredNumToAllow=${entry.maxPercentage.toFixed(2)})`;
    navigator.clipboard.writeText(line);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const showFeedback = (msg: string, isError = false) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Preview generated string for current builder
  const generatedPreview = `ConfigAddNPCSpawnEntriesContainer=(NPCSpawnEntriesContainerClassString="${containerClass.trim()}",NPCSpawnEntries=((AnEntryName="${entryName.trim() || 'CustomDino'}",EntryWeight=${(parseFloat(String(entryWeight)) || 1.0).toFixed(2)},NPCsToSpawnStrings=("${npcClass.trim()}"))),NPCClassString="${npcClass.trim()}",MaxPercentageOfDesiredNumToAllow=${(parseFloat(String(maxPercentage)) || 0.2).toFixed(2)})`;

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-700 pb-3">
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('spawns')}
            className={`px-4 py-2 rounded-md text-xs font-bold transition flex items-center space-x-2 ${
              activeSubTab === 'spawns'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/20'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
            }`}
          >
            <span>🦕</span>
            <span>Custom Dino Spawns (Game.ini)</span>
            {spawnEntries.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-cyan-950 text-cyan-200 rounded-full border border-cyan-700">
                {spawnEntries.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('game_ini')}
            className={`px-4 py-2 rounded-md text-xs font-bold transition flex items-center space-x-2 ${
              activeSubTab === 'game_ini'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
            }`}
          >
            <span>📝</span>
            <span>Custom Game.ini Lines</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('game_user_settings')}
            className={`px-4 py-2 rounded-md text-xs font-bold transition flex items-center space-x-2 ${
              activeSubTab === 'game_user_settings'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
            }`}
          >
            <span>⚙️</span>
            <span>Custom GameUserSettings.ini Lines</span>
          </button>
        </div>

        <span className="text-xs text-gray-400 font-mono">
          Auto-synchronized on save & start
        </span>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-cyan-900/60 border border-cyan-500/60 text-cyan-200 rounded-md text-xs flex items-center justify-between animate-fade-in">
          <span>{feedbackMsg}</span>
          <button type="button" onClick={() => setFeedbackMsg(null)} className="text-cyan-400 hover:text-white font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* SUBTAB 1: DINO SPAWNS BUILDER & LIST */}
      {activeSubTab === 'spawns' && (
        <div className="space-y-6">
          {/* Quick-Add Presets Banner */}
          <div className="bg-gray-900/60 p-4 rounded-lg border border-gray-700/80">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center space-x-2">
                <span className="text-amber-400 text-base">⚡</span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-200">
                  1-Click Quick Add Presets (Griffins, Wyverns, Extinction & Aberration Dinos)
                </h4>
              </div>
              <span className="text-[11px] text-gray-400">Click to immediately add to your server spawn table</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleQuickAdd('Griffin', 'DinoSpawnEntries_ChalkHills_C')}
                className="p-2.5 bg-gray-800 hover:bg-cyan-900/40 border border-gray-700 hover:border-cyan-500 rounded-md text-left transition group"
              >
                <div className="font-bold text-xs text-cyan-300 group-hover:text-cyan-200 flex items-center justify-between">
                  <span>🦅 Griffin</span>
                  <span className="text-[10px] text-gray-500 group-hover:text-cyan-400">+ Add</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Chalk Hills / Valguero</div>
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => handleQuickAdd('Griffin', 'DinoSpawnEntriesMountain_C')}
                className="p-2.5 bg-gray-800 hover:bg-cyan-900/40 border border-gray-700 hover:border-cyan-500 rounded-md text-left transition group"
              >
                <div className="font-bold text-xs text-cyan-300 group-hover:text-cyan-200 flex items-center justify-between">
                  <span>🦅 Griffin</span>
                  <span className="text-[10px] text-gray-500 group-hover:text-cyan-400">+ Add</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Mountain Peaks</div>
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => handleQuickAdd('Snow Owl', 'DinoSpawnEntriesSnow_C')}
                className="p-2.5 bg-gray-800 hover:bg-cyan-900/40 border border-gray-700 hover:border-cyan-500 rounded-md text-left transition group"
              >
                <div className="font-bold text-xs text-cyan-300 group-hover:text-cyan-200 flex items-center justify-between">
                  <span>🦉 Snow Owl</span>
                  <span className="text-[10px] text-gray-500 group-hover:text-cyan-400">+ Add</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Snow / Glacial Biome</div>
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => handleQuickAdd('Deinonychus', 'DinoSpawnEntriesRedwoods_C')}
                className="p-2.5 bg-gray-800 hover:bg-cyan-900/40 border border-gray-700 hover:border-cyan-500 rounded-md text-left transition group"
              >
                <div className="font-bold text-xs text-cyan-300 group-hover:text-cyan-200 flex items-center justify-between">
                  <span>🦖 Deinonychus</span>
                  <span className="text-[10px] text-gray-500 group-hover:text-cyan-400">+ Add</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Redwood Forest</div>
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => handleQuickAdd('Wyvern (Fire)', 'DinoSpawnEntries_Scorched_Dunes_C')}
                className="p-2.5 bg-gray-800 hover:bg-cyan-900/40 border border-gray-700 hover:border-cyan-500 rounded-md text-left transition group"
              >
                <div className="font-bold text-xs text-cyan-300 group-hover:text-cyan-200 flex items-center justify-between">
                  <span>🐉 Fire Wyvern</span>
                  <span className="text-[10px] text-gray-500 group-hover:text-cyan-400">+ Add</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Scorched Dunes</div>
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => handleQuickAdd('Rock Drake', 'DinoSpawnEntries_Aberration_BioLum_C')}
                className="p-2.5 bg-gray-800 hover:bg-cyan-900/40 border border-gray-700 hover:border-cyan-500 rounded-md text-left transition group"
              >
                <div className="font-bold text-xs text-cyan-300 group-hover:text-cyan-200 flex items-center justify-between">
                  <span>🦎 Rock Drake</span>
                  <span className="text-[10px] text-gray-500 group-hover:text-cyan-400">+ Add</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Aberration Biolum</div>
              </button>
            </div>
          </div>

          {/* Interactive Spawn Entry Builder */}
          <div className="bg-gray-800/70 p-5 rounded-lg border border-gray-700 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-cyan-300 flex items-center space-x-2">
                  <span>✨</span>
                  <span>Interactive Spawn Entry Builder (ConfigAddNPCSpawnEntriesContainer)</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Configure custom creature spawns across maps that don't natively spawn them. Formats syntax automatically for <code className="text-purple-300">Game.ini</code>.
                </p>
              </div>
              <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-purple-900/60 text-purple-300 border border-purple-700/60">
                Game.ini
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Preset Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Creature Preset
                </label>
                <select
                  value={selectedPresetName}
                  onChange={(e) => handleSelectPreset(e.target.value)}
                  disabled={disabled}
                  className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                >
                  <optgroup label="Popular Ark Creatures">
                    {DINO_PRESETS.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name} ({d.category})
                      </option>
                    ))}
                  </optgroup>
                  <option value="__custom__">-- Custom Dino / Mod Creature --</option>
                </select>
              </div>

              {/* Entry Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Spawn Entry Name
                </label>
                <input
                  type="text"
                  value={entryName}
                  onChange={(e) => setEntryName(e.target.value)}
                  disabled={disabled}
                  placeholder="e.g. Griffin"
                  className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-mono"
                />
              </div>

              {/* NPC Blueprint Class */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  NPC Blueprint Class String
                </label>
                <input
                  type="text"
                  value={npcClass}
                  onChange={(e) => {
                    setNpcClass(e.target.value);
                    if (!isCustomMode) setIsCustomMode(true);
                  }}
                  disabled={disabled}
                  placeholder="e.g. Griffin_Character_BP_C"
                  className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-mono"
                />
              </div>

              {/* Spawn Container */}
              <div className="md:col-span-2 lg:col-span-1">
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Target Spawn Biome / Container
                </label>
                <select
                  value={containerClass}
                  onChange={(e) => setContainerClass(e.target.value)}
                  disabled={disabled}
                  className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                >
                  {CONTAINER_PRESETS.map((c) => (
                    <option key={c.className} value={c.className}>
                      {c.label} ({c.className})
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Container Class Input if needed */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Custom Container Class Override (Optional)
                </label>
                <input
                  type="text"
                  value={containerClass}
                  onChange={(e) => setContainerClass(e.target.value)}
                  disabled={disabled}
                  placeholder="DinoSpawnEntries_..."
                  className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-mono text-xs"
                />
              </div>

              {/* Entry Weight Slider */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-300 mb-1">
                  <span>Spawn Weight (Chance):</span>
                  <span className="text-cyan-300 font-mono">{entryWeight.toFixed(2)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="0.05"
                    max="5.0"
                    step="0.05"
                    value={entryWeight}
                    onChange={(e) => setEntryWeight(parseFloat(e.target.value) || 1.0)}
                    disabled={disabled}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                  <input
                    type="number"
                    min="0.05"
                    max="10.0"
                    step="0.05"
                    value={entryWeight}
                    onChange={(e) => setEntryWeight(parseFloat(e.target.value) || 1.0)}
                    disabled={disabled}
                    className="w-16 bg-gray-900 border border-gray-600 rounded-md px-2 py-1 text-xs text-right font-mono text-gray-100"
                  />
                </div>
                <span className="text-[10px] text-gray-400">Relative weight against other dinos in the same biome (default: 1.0).</span>
              </div>

              {/* Max Percentage of Desired Num */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-300 mb-1">
                  <span>Max Biome Percentage Limit:</span>
                  <span className="text-cyan-300 font-mono">{(maxPercentage * 100).toFixed(0)}% ({maxPercentage.toFixed(2)})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="0.01"
                    max="1.0"
                    step="0.01"
                    value={maxPercentage}
                    onChange={(e) => setMaxPercentage(parseFloat(e.target.value) || 0.2)}
                    disabled={disabled}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                  <input
                    type="number"
                    min="0.01"
                    max="1.0"
                    step="0.01"
                    value={maxPercentage}
                    onChange={(e) => setMaxPercentage(parseFloat(e.target.value) || 0.2)}
                    disabled={disabled}
                    className="w-16 bg-gray-900 border border-gray-600 rounded-md px-2 py-1 text-xs text-right font-mono text-gray-100"
                  />
                </div>
                <span className="text-[10px] text-gray-400">Cap max total count in the area (e.g. 0.2 = max 20% of area creatures).</span>
              </div>
            </div>

            {/* Generated Code Preview Block */}
            <div className="mt-4 bg-gray-950 p-3 rounded-md border border-gray-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Live Generated INI String Preview:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPreview);
                    showFeedback('Copied generated INI snippet to clipboard!');
                  }}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 transition"
                >
                  📋 Copy Snippet
                </button>
              </div>
              <code className="block text-xs font-mono text-cyan-300 break-all bg-black/40 p-2 rounded border border-gray-800/80 select-all">
                {generatedPreview}
              </code>
            </div>

            {/* Add Button */}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleAddSpawnRule}
                disabled={disabled || !containerClass.trim() || !npcClass.trim()}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white font-bold rounded-md text-xs transition shadow-md hover:shadow-cyan-500/20 flex items-center space-x-2"
              >
                <span>➕</span>
                <span>Add Spawn Rule to Table</span>
              </button>
            </div>
          </div>

          {/* Configured Spawns Table */}
          <div className="bg-gray-800/70 p-5 rounded-lg border border-gray-700 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-cyan-400 font-bold">📋</span>
                <h3 className="text-sm font-bold text-gray-200">
                  Configured NPC Spawn Rules ({spawnEntries.length})
                </h3>
              </div>
              {spawnEntries.length > 0 && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onConfigChange({ npcSpawnEntries: [] })}
                  className="text-xs text-red-400 hover:text-red-300 transition"
                >
                  Clear All Spawns
                </button>
              )}
            </div>

            {spawnEntries.length === 0 ? (
              <div className="p-8 text-center bg-gray-900/40 rounded-lg border border-dashed border-gray-700">
                <div className="text-3xl mb-2">🦖</div>
                <p className="text-sm font-semibold text-gray-300">No Custom Spawn Entries Configured</p>
                <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                  Use the quick-add buttons above or the interactive builder to add creature spawns (like Griffins, Snow Owls, Wyverns) to your server.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {spawnEntries.map((entry, idx) => (
                  <div
                    key={entry.id || idx}
                    className={`p-3.5 rounded-lg border transition ${
                      entry.enabled
                        ? 'bg-gray-900/70 border-cyan-900/60 hover:border-cyan-700'
                        : 'bg-gray-900/30 border-gray-800 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={entry.enabled}
                          onChange={() => handleToggleSpawnRule(entry.id)}
                          disabled={disabled}
                          title={entry.enabled ? 'Disable this spawn rule' : 'Enable this spawn rule'}
                          className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-gray-100">{entry.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                              {entry.npcClass}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-gray-400">
                            <span className="flex items-center space-x-1">
                              <span className="text-gray-500">Container:</span>
                              <span className="font-mono text-gray-200">{entry.containerClass}</span>
                            </span>
                            <span className="text-gray-600">•</span>
                            <span>
                              <span className="text-gray-500">Weight:</span> <strong className="text-amber-300 font-mono">{entry.entryWeight.toFixed(2)}</strong>
                            </span>
                            <span className="text-gray-600">•</span>
                            <span>
                              <span className="text-gray-500">Max Biome Cap:</span> <strong className="text-amber-300 font-mono">{(entry.maxPercentage * 100).toFixed(0)}%</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleCopySnippet(entry)}
                          className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 text-xs rounded transition flex items-center space-x-1"
                        >
                          <span>{copiedId === entry.id ? '✓' : '📋'}</span>
                          <span>{copiedId === entry.id ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEntryName(entry.name);
                            setNpcClass(entry.npcClass);
                            setContainerClass(entry.containerClass);
                            setEntryWeight(entry.entryWeight);
                            setMaxPercentage(entry.maxPercentage);
                            setIsCustomMode(true);
                            showFeedback(`Loaded "${entry.name}" into builder above.`);
                          }}
                          className="px-2.5 py-1 bg-gray-800 hover:bg-cyan-900/40 border border-gray-600 hover:border-cyan-500 text-cyan-300 text-xs rounded transition"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSpawnRule(entry.id)}
                          disabled={disabled}
                          className="px-2.5 py-1 bg-gray-800 hover:bg-red-900/40 border border-gray-600 hover:border-red-500 text-red-300 text-xs rounded transition"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: CUSTOM GAME.INI LINES */}
      {activeSubTab === 'game_ini' && (
        <div className="bg-gray-800/70 p-5 rounded-lg border border-gray-700 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-purple-300 flex items-center space-x-2">
                <span>📝</span>
                <span>Custom Game.ini Lines ([/script/shootergame.shootergamemode])</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Add any additional custom directives to <code className="text-purple-300">Game.ini</code>. These lines are appended cleanly into the active shooter game mode section.
              </p>
            </div>
            <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-purple-900/60 text-purple-300 border border-purple-700/60">
              Game.ini
            </span>
          </div>

          {/* Quick Insert Templates */}
          <div className="bg-gray-900/70 p-3 rounded-md border border-gray-700/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
              Quick Insert Common Game.ini Templates:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  const sample = `DinoSpawnWeightMultipliers=(DinoNameTag="Giga",SpawnWeightMultiplier=1.0,OverrideSpawnLimitPercentage=True,SpawnLimitPercentage=0.05)`;
                  const current = config.customGameIni || '';
                  onConfigChange({ customGameIni: current ? `${current}\n${sample}` : sample });
                  showFeedback('Inserted DinoSpawnWeightMultipliers template!');
                }}
                className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-xs text-purple-300 transition"
              >
                + Dino Spawn Weight Multipliers
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  const sample = `NPCReplacements=(FromClassName="MegaCarno_Character_BP_C",ToClassName="Carno_Character_BP_C")`;
                  const current = config.customGameIni || '';
                  onConfigChange({ customGameIni: current ? `${current}\n${sample}` : sample });
                  showFeedback('Inserted NPCReplacements template!');
                }}
                className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-xs text-purple-300 transition"
              >
                + NPC Replacements
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  const sample = `OverrideNamedEngramEntries=(EngramClassName="EngramEntry_TekRifle_C",EngramHidden=False,EngramPointsCost=0,EngramLevelRequirement=0,RemoveEngramPreReq=True)`;
                  const current = config.customGameIni || '';
                  onConfigChange({ customGameIni: current ? `${current}\n${sample}` : sample });
                  showFeedback('Inserted OverrideNamedEngramEntries template!');
                }}
                className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-xs text-purple-300 transition"
              >
                + Engram Override (Auto-Unlock / Hide)
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  const sample = `HarvestResourceItemAmountClassMultipliers=(ClassName="PrimalItemResource_Metal_C",Multiplier=2.0)`;
                  const current = config.customGameIni || '';
                  onConfigChange({ customGameIni: current ? `${current}\n${sample}` : sample });
                  showFeedback('Inserted Harvest Resource Item Multipliers template!');
                }}
                className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-xs text-purple-300 transition"
              >
                + Harvest Node Item Multipliers
              </button>
            </div>
          </div>

          <textarea
            rows={10}
            value={config.customGameIni || ''}
            onChange={(e) => onConfigChange({ customGameIni: e.target.value })}
            disabled={disabled}
            placeholder={`; Example custom Game.ini lines\n; DinoSpawnWeightMultipliers=(DinoNameTag="Giga",SpawnWeightMultiplier=0.8,OverrideSpawnLimitPercentage=True,SpawnLimitPercentage=0.05)\n; ConfigAddNPCSpawnEntriesContainer=(NPCSpawnEntriesContainerClassString="...",...)`}
            className="w-full bg-gray-950 border border-gray-700 rounded-md p-3 text-xs font-mono text-purple-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 leading-relaxed"
          />

          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Lines: {(config.customGameIni || '').split(/\r?\n/).filter(Boolean).length}</span>
            <button
              type="button"
              onClick={() => onConfigChange({ customGameIni: '' })}
              disabled={disabled || !config.customGameIni}
              className="text-red-400 hover:text-red-300 disabled:opacity-30 transition"
            >
              Clear Game.ini Custom Lines
            </button>
          </div>
        </div>
      )}

      {/* SUBTAB 3: CUSTOM GAMEUSERSETTINGS.INI LINES */}
      {activeSubTab === 'game_user_settings' && (
        <div className="bg-gray-800/70 p-5 rounded-lg border border-gray-700 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-emerald-300 flex items-center space-x-2">
                <span>⚙️</span>
                <span>Custom GameUserSettings.ini Lines ([ServerSettings])</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Add custom server parameters or mod config sections to <code className="text-emerald-300">GameUserSettings.ini</code>.
              </p>
            </div>
            <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/60">
              GameUserSettings.ini
            </span>
          </div>

          {/* Quick Insert Templates */}
          <div className="bg-gray-900/70 p-3 rounded-md border border-gray-700/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
              Quick Insert Common ServerSettings Templates:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  const sample = `ItemStackSizeMultiplier=2.0`;
                  const current = config.customGameUserSettingsIni || '';
                  onConfigChange({ customGameUserSettingsIni: current ? `${current}\n${sample}` : sample });
                  showFeedback('Inserted ItemStackSizeMultiplier!');
                }}
                className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-xs text-emerald-300 transition"
              >
                + Item Stack Size Multiplier
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  const sample = `StructurePreventResourceRadiusMultiplier=0.5`;
                  const current = config.customGameUserSettingsIni || '';
                  onConfigChange({ customGameUserSettingsIni: current ? `${current}\n${sample}` : sample });
                  showFeedback('Inserted StructurePreventResourceRadiusMultiplier!');
                }}
                className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-xs text-emerald-300 transition"
              >
                + Resource Spawn Distance Multiplier
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  const sample = `PersonalTamedDinosSaddleInventoryMultiplier=2.0`;
                  const current = config.customGameUserSettingsIni || '';
                  onConfigChange({ customGameUserSettingsIni: current ? `${current}\n${sample}` : sample });
                  showFeedback('Inserted Saddle Inventory Multiplier!');
                }}
                className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-xs text-emerald-300 transition"
              >
                + Saddle Weight Multiplier
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  const sample = `\n[CustomModSettings]\nEnableModFeature=True\nModRateMultiplier=1.5`;
                  const current = config.customGameUserSettingsIni || '';
                  onConfigChange({ customGameUserSettingsIni: current ? `${current}\n${sample}` : sample });
                  showFeedback('Inserted Custom Mod Header block!');
                }}
                className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-xs text-emerald-300 transition"
              >
                + [CustomModSettings] Section Header
              </button>
            </div>
          </div>

          <textarea
            rows={10}
            value={config.customGameUserSettingsIni || ''}
            onChange={(e) => onConfigChange({ customGameUserSettingsIni: e.target.value })}
            disabled={disabled}
            placeholder={`; Example custom GameUserSettings.ini lines\n; ItemStackSizeMultiplier=2.0\n; StructurePreventResourceRadiusMultiplier=0.5\n; [CustomModSettings]\n; EnableFeature=True`}
            className="w-full bg-gray-950 border border-gray-700 rounded-md p-3 text-xs font-mono text-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 leading-relaxed"
          />

          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Lines: {(config.customGameUserSettingsIni || '').split(/\r?\n/).filter(Boolean).length}</span>
            <button
              type="button"
              onClick={() => onConfigChange({ customGameUserSettingsIni: '' })}
              disabled={disabled || !config.customGameUserSettingsIni}
              className="text-red-400 hover:text-red-300 disabled:opacity-30 transition"
            >
              Clear GameUserSettings.ini Custom Lines
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
