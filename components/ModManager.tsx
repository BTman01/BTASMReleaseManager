
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ModAnalysisResult, CurseForgeMod, ModAnalysis } from '../types';
import { analyzeMods } from '../services/geminiService';
import { searchMods, getModsByIds } from '../services/curseforgeService';
import { BotIcon, InfoIcon, CheckCircleIcon, AlertTriangleIcon, DownloadCloudIcon, SearchIcon, TrashIcon, EyeIcon } from './icons';
import ModDetailsModal from './ModDetailsModal';

interface ModManagerProps {
  mods: string;
  onModsChange: (mods: string) => void;
  onAddMod: (mod: CurseForgeMod) => void;
  isActionInProgress: boolean;
  analysisResult: ModAnalysisResult | null;
  setAnalysisResult: (result: ModAnalysisResult | null) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  onUpdateMods: () => void;
  isUpdatingMods: boolean;
}

// Change h-full to min-h-full so the card expands with content instead of clipping
const Card: React.FC<{ title: string; icon?: React.ReactNode, children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="p-6 bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-700 min-h-full flex flex-col">
        <div className="flex items-center space-x-2 text-lg font-bold text-cyan-400 mb-4">
            {icon}
            <h3>{title}</h3>
        </div>
        <div className="flex-grow flex flex-col space-y-4">{children}</div>
    </div>
);


const ModManager: React.FC<ModManagerProps> = ({ 
    mods, onModsChange, onAddMod, isActionInProgress, analysisResult, setAnalysisResult, isAnalyzing, setIsAnalyzing, onUpdateMods, isUpdatingMods 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<CurseForgeMod[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState('Popularity');
  
  const [viewingMod, setViewingMod] = useState<ModAnalysis | null>(null);
  
  // Track which existing mods we've attempted to backfill to prevent infinite loops
  const attemptedBackfillRef = useRef<Set<string>>(new Set());

  // This effect automatically fetches details for any mod IDs that are
  // manually added to the list OR existing mods that are missing rich data (images/authors).
  useEffect(() => {
    const fetchMissingModDetails = async () => {
        const allCurrentIds = new Set(mods.split(',').map(id => id.trim()).filter(Boolean));
        if (allCurrentIds.size === 0) return;

        const currentAnalyses = analysisResult?.modAnalyses || [];
        const analyzedIds = new Set(currentAnalyses.map(a => a.id));
        
        // 1. IDs completely missing from analysis (e.g. manually typed in)
        const missingIds = Array.from(allCurrentIds).filter(id => !analyzedIds.has(id));

        // 2. IDs present but missing rich data (logo/author), and haven't been attempted yet
        const incompleteIds = currentAnalyses
            .filter(a => (allCurrentIds.has(a.id) && (!a.logoUrl || !a.authors) && !attemptedBackfillRef.current.has(a.id)))
            .map(a => a.id);

        const idsToFetch = new Set([...missingIds, ...incompleteIds]);

        if (idsToFetch.size === 0) {
            return; 
        }

        // Mark ALL candidate IDs as attempted immediately to prevent infinite loops for invalid IDs
        idsToFetch.forEach(id => attemptedBackfillRef.current.add(id));

        try {
            const numericIds = Array.from(idsToFetch).map(Number).filter(n => !isNaN(n));
            if (numericIds.length > 0) {
                const fetchedMods = await getModsByIds(numericIds);

                const newAnalysesMap = new Map<string, ModAnalysis>();

                fetchedMods.forEach(mod => {
                    const idStr = String(mod.id);
                    newAnalysesMap.set(idStr, {
                        id: idStr,
                        name: mod.name,
                        summary: mod.summary,
                        logoUrl: mod.logo?.url,
                        authors: mod.authors.map(a => a.name).join(', '),
                    });
                });

                // Start with a copy of existing analyses
                let finalAnalyses = [...currentAnalyses];

                // Update existing entries with new rich data
                finalAnalyses = finalAnalyses.map(existing => {
                    if (newAnalysesMap.has(existing.id)) {
                        const fetched = newAnalysesMap.get(existing.id)!;
                        return {
                            ...existing,
                            logoUrl: existing.logoUrl || fetched.logoUrl,
                            authors: existing.authors || fetched.authors,
                            // If name is generic or just the ID, replace it with the real name
                            name: (existing.name === 'Unknown Name' || existing.name === existing.id) ? fetched.name : existing.name,
                            // Use fetched summary if existing is generic/empty
                            summary: (existing.summary && existing.summary !== 'No summary available.') ? existing.summary : fetched.summary
                        };
                    }
                    return existing;
                });

                // Append completely new entries
                newAnalysesMap.forEach((val, key) => {
                    if (!analyzedIds.has(key)) {
                        finalAnalyses.push(val);
                    }
                });

                setAnalysisResult({
                    modAnalyses: finalAnalyses,
                    overallSummary: analysisResult?.overallSummary || "Mod details automatically fetched from CurseForge.",
                    potentialConflicts: analysisResult?.potentialConflicts || [],
                });
            }
        } catch (error) {
            console.error("Failed to fetch details for mods:", error);
        }
    };

    fetchMissingModDetails();
  }, [mods, analysisResult, setAnalysisResult]);


  const handleAnalyzeClick = async () => {
    if (!mods.trim()) {
        setAnalysisResult({ modAnalyses: [], overallSummary: "No mod IDs provided.", potentialConflicts: [] });
        return;
    }
    setIsAnalyzing(true);
    const resultFromAI = await analyzeMods(mods);
    
    if (resultFromAI && resultFromAI.modAnalyses) {
        const originalIds = mods.split(',').map(id => id.trim()).filter(Boolean);
        const currentAnalyses = new Map(analysisResult?.modAnalyses.map(a => [a.id, a]) || []);

        const correlatedAnalyses = resultFromAI.modAnalyses.map((aiAnalysis, index) => {
            const id = originalIds[index] || 'unknown-id';
            const existing = currentAnalyses.get(id);
            return {
                id: id,
                name: aiAnalysis.name || existing?.name || 'Unknown Name',
                summary: aiAnalysis.summary || existing?.summary || 'No summary available.',
                logoUrl: existing?.logoUrl, // Preserve existing rich data
                authors: existing?.authors, // Preserve existing rich data
            };
        });

        setAnalysisResult({ ...resultFromAI, modAnalyses: correlatedAnalyses });
    } else {
        setAnalysisResult(resultFromAI); // Handle null/error case
    }

    setIsAnalyzing(false);
  };

  const performSearch = async () => {
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const results = await searchMods(searchTerm, sortOption);
      setSearchResults(results);
    } catch (error: any) {
      setSearchError(error.message || "Failed to search for mods.");
    }
    setIsSearching(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };
  
  // Re-run search when sort option changes, but only if there's already a search term
  useEffect(() => {
    if (searchTerm.trim()) {
        performSearch();
    }
  }, [sortOption]);

  const currentModIdsSet = useMemo(() => new Set(mods.split(',').map(id => id.trim()).filter(Boolean)), [mods]);
  const currentModIdsArray = useMemo(() => Array.from(currentModIdsSet), [currentModIdsSet]);
  
  const handleRemoveMod = (modIdToRemove: string) => {
      const newModIds = currentModIdsArray.filter(id => id !== modIdToRemove);
      onModsChange(newModIds.join(','));
  };

  const modAnalysisMap = useMemo(() => {
    if (!analysisResult?.modAnalyses) return new Map<string, ModAnalysis>();
    return new Map(analysisResult.modAnalyses.map(mod => [mod.id, mod]));
  }, [analysisResult]);

  const handleViewDetails = (mod: ModAnalysis | CurseForgeMod) => {
      // Normalize to ModAnalysis shape for the modal
      const normalized: ModAnalysis = {
          id: String(mod.id),
          name: mod.name,
          summary: mod.summary,
          logoUrl: 'logo' in mod ? (mod as CurseForgeMod).logo?.url : (mod as ModAnalysis).logoUrl,
          authors: Array.isArray(mod.authors) ? mod.authors.map(a => a.name).join(', ') : (mod as ModAnalysis).authors
      };
      setViewingMod(normalized);
  };

  return (
    <>
        <ModDetailsModal mod={viewingMod} isOpen={!!viewingMod} onClose={() => setViewingMod(null)} />
        <Card title="Mod Manager" icon={<BotIcon />}>
            {/* Search Section */}
            <div>
                <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search for mods on CurseForge..."
                        className="flex-grow bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition disabled:bg-gray-700 disabled:cursor-not-allowed"
                        disabled={isActionInProgress || isSearching}
                    />
                    <select 
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        className="bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                        disabled={isActionInProgress || isSearching}
                    >
                        <option>Popularity</option>
                        <option>Last Updated</option>
                        <option>Name</option>
                        <option>Total Downloads</option>
                    </select>
                    <button
                        type="submit"
                        disabled={isActionInProgress || isSearching}
                        className="flex items-center justify-center px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-md transition-colors duration-200 shadow-md"
                    >
                        <SearchIcon className="w-5 h-5" />
                    </button>
                </form>
            </div>
            
            {/* Search Results / Loading / Error */}
            <div className="min-h-[100px] max-h-72 overflow-y-auto bg-black/30 rounded-md p-2 border border-gray-700">
                {isSearching && (
                    <div className="flex justify-center items-center h-full">
                        <svg className="animate-spin h-8 w-8 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                )}
                {searchError && <p className="text-red-400 text-center">{searchError}</p>}
                {!isSearching && !searchError && searchResults.length === 0 && (
                    <p className="text-gray-500 text-center pt-8">Search results will appear here.</p>
                )}
                {!isSearching && searchResults.length > 0 && (
                    <ul className="space-y-2">
                        {searchResults.map(mod => (
                            <li key={mod.id} className="flex items-center space-x-3 bg-gray-900/50 p-2 rounded-md border border-gray-700">
                                <img src={mod.logo?.url} alt={mod.name} className="w-16 h-16 rounded-md object-cover flex-shrink-0" />
                                <div className="flex-grow">
                                    <p className="font-semibold text-cyan-400">{mod.name}</p>
                                    <p className="text-xs text-gray-400">by {mod.authors.map(a => a.name).join(', ')}</p>
                                    <p className="text-sm text-gray-300 mt-1 line-clamp-2">{mod.summary}</p>
                                </div>
                                <div className="flex space-x-2">
                                    <button 
                                        onClick={() => handleViewDetails(mod)}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                                        title="See Details"
                                    >
                                        <EyeIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => onAddMod(mod)}
                                        disabled={currentModIdsSet.has(String(mod.id))}
                                        className="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-bold rounded-md transition-colors duration-200 whitespace-nowrap"
                                    >
                                        {currentModIdsSet.has(String(mod.id)) ? 'Added' : 'Add'}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Mod List and Actions */}
            <div>
                <label htmlFor="mods" className="block text-sm font-medium text-gray-300 mb-1">Mod IDs (comma-separated)</label>
                <textarea
                    id="mods"
                    name="mods"
                    rows={2}
                    value={mods}
                    onChange={(e) => onModsChange(e.target.value)}
                    disabled={isActionInProgress || isAnalyzing}
                    className="w-full bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition disabled:bg-gray-700 disabled:cursor-not-allowed"
                    placeholder="e.g., 987654,123456"
                />
            </div>
            
            {/* Currently Added Mods List */}
            <div>
                <h4 className="font-semibold text-gray-200 mb-2">Currently Added Mods</h4>
                <div className="border border-gray-700 rounded-md max-h-48 overflow-y-auto bg-black/30">
                    {currentModIdsArray.length === 0 ? (
                        <p className="text-gray-500 p-4 text-center">No mods added yet.</p>
                    ) : (
                        <ul className="divide-y divide-gray-700">
                            {currentModIdsArray.map((id) => {
                                const analysis = modAnalysisMap.get(id);
                                return (
                                    <li key={id} className="p-2 flex items-center justify-between hover:bg-gray-900/50 transition-colors">
                                        <div className="flex-grow">
                                            <p className="font-semibold text-cyan-400">{analysis?.name || 'Unknown Name'}</p>
                                            <p className="text-sm text-gray-400">ID: {id}</p>
                                        </div>
                                        <div className="flex space-x-2">
                                            {analysis && (
                                                <button 
                                                    onClick={() => handleViewDetails(analysis)}
                                                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                                                    title="See Details"
                                                >
                                                    <EyeIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleRemoveMod(id)}
                                                disabled={isActionInProgress}
                                                className="p-2 text-gray-400 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-colors disabled:text-gray-600 disabled:cursor-not-allowed"
                                                aria-label={`Remove mod ${id}`}
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
                 <p className="text-xs text-gray-500 mt-1">Mod names are added from search results and saved with the profile.</p>
            </div>


            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-auto pt-2">
                <button
                    onClick={handleAnalyzeClick}
                    disabled={isActionInProgress || isAnalyzing}
                    className="w-full flex items-center justify-center px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-md transition-colors duration-200 shadow-md disabled:shadow-none"
                >
                    {isAnalyzing ? (
                        <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Analyzing...</>
                    ) : "Analyze Mods with AI"}
                </button>
                <button
                    onClick={onUpdateMods}
                    disabled={isActionInProgress || isAnalyzing}
                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-md transition-colors duration-200 shadow-md disabled:shadow-none"
                >
                    {isUpdatingMods ? (
                        <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Updating...</>
                    ) : (<><DownloadCloudIcon className="w-5 h-5 mr-2" /> Download/Update Mods</>)}
                </button>
            </div>
            
            {/* Analysis Results - Removed overflow-y-auto so the main page scrolls instead */}
            <div className="border-t border-gray-700 pt-4">
                <h4 className="font-semibold text-gray-200 mb-2">Analysis Results</h4>
                {isAnalyzing && <p className="text-gray-400">AI is analyzing your mod list...</p>}
                {!isAnalyzing && !analysisResult && <p className="text-gray-500">Click "Analyze Mods" to get an AI-powered summary and compatibility check.</p>}
                
                {analysisResult && (
                    <div className="space-y-4 text-sm">
                        <div>
                            <h5 className="font-bold flex items-center text-gray-300"><InfoIcon className="w-4 h-4 mr-2" />Overall Summary</h5>
                            <p className="text-gray-400 pl-6">{analysisResult.overallSummary}</p>
                        </div>

                        <div>
                            <h5 className="font-bold flex items-center text-gray-300">
                                {analysisResult.potentialConflicts?.length > 0 ? 
                                    <><AlertTriangleIcon className="w-4 h-4 mr-2 text-yellow-400" />Potential Conflicts</> : 
                                    <><CheckCircleIcon className="w-4 h-4 mr-2 text-green-400" />No Conflicts Found</>
                                }
                            </h5>
                            <div className="pl-6 text-gray-400">
                                {analysisResult.potentialConflicts?.length > 0 ? (
                                    <ul className="list-disc list-inside space-y-1">
                                        {analysisResult.potentialConflicts.map((c, i) => <li key={i}>{c}</li>)}
                                    </ul>
                                ) : (
                                    <p>The AI did not find any obvious conflicts between the specified mods.</p>
                                )}
                            </div>
                        </div>

                          {analysisResult.modAnalyses?.length > 0 && (
                            <div>
                                <h5 className="font-bold text-gray-300">Mod Details</h5>
                                <ul className="space-y-2 mt-1 pr-2">
                                    {analysisResult.modAnalyses.map(mod => (
                                        <li key={mod.id} className="bg-gray-900/50 p-2 rounded-md border border-gray-700 flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-cyan-400">{mod.name || 'Unknown Name'}</p>
                                                <p className="text-gray-400 line-clamp-2">{mod.summary || 'No summary available.'}</p>
                                            </div>
                                            <button 
                                                onClick={() => handleViewDetails(mod)}
                                                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                                                title="See Details"
                                            >
                                                <EyeIcon className="w-5 h-5" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                    </div>
                )}
            </div>
        </Card>
    </>
  );
};

export default ModManager;
