import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CurseForgeMod, ModAnalysis, ModAnalysisResult } from '../types';
import { searchMods, getModsByIds } from '../services/curseforgeService';
import { SearchIcon, TrashIcon, EyeIcon, CheckCircleIcon, CopyIcon, CancelIcon } from './icons';
import ModDetailsModal from './ModDetailsModal';

interface ModManagerProps {
  mods: string;
  onModsChange: (mods: string) => void;
  onAddMod: (mod: CurseForgeMod) => void;
  isActionInProgress: boolean;
  analysisResult: ModAnalysisResult | null;
  setAnalysisResult: (result: ModAnalysisResult | null) => void;
  isAnalyzing?: boolean;
  setIsAnalyzing?: (isAnalyzing: boolean) => void;
  onUpdateMods?: () => void;
  isUpdatingMods?: boolean;
}

const ModManager: React.FC<ModManagerProps> = ({ 
    mods, 
    onModsChange, 
    onAddMod, 
    isActionInProgress, 
    analysisResult, 
    setAnalysisResult 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<CurseForgeMod[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState('Popularity');
  const [hasSearched, setHasSearched] = useState(false);
  const [copiedIds, setCopiedIds] = useState(false);
  
  const [viewingMod, setViewingMod] = useState<ModAnalysis | null>(null);
  
  // Track which existing mods we've attempted to backfill to prevent infinite loops
  const attemptedBackfillRef = useRef<Set<string>>(new Set());

  // Automatically fetches rich details for any mod IDs that are
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
                        authors: Array.isArray(mod.authors) ? mod.authors.map(a => a.name).join(', ') : '',
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
                            name: (existing.name === 'Unknown Name' || existing.name === existing.id) ? fetched.name : existing.name,
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

  const performSearch = async (termToSearch?: string) => {
    const query = (termToSearch !== undefined ? termToSearch : searchTerm).trim();
    if (!query) return;

    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);
    try {
      const results = await searchMods(query, sortOption);
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
    if (searchTerm.trim() && hasSearched) {
        performSearch();
    }
  }, [sortOption]);

  const currentModIdsSet = useMemo(() => new Set(mods.split(',').map(id => id.trim()).filter(Boolean)), [mods]);
  const currentModIdsArray = useMemo(() => Array.from(currentModIdsSet), [currentModIdsSet]);
  
  const handleRemoveMod = (modIdToRemove: string) => {
      const newModIds = currentModIdsArray.filter(id => id !== modIdToRemove);
      onModsChange(newModIds.join(','));
      if (analysisResult?.modAnalyses) {
          setAnalysisResult({
              ...analysisResult,
              modAnalyses: analysisResult.modAnalyses.filter(m => m.id !== modIdToRemove)
          });
      }
  };

  const handleAddModClick = (mod: CurseForgeMod) => {
      onAddMod(mod);
      const idStr = String(mod.id);
      const existingAnalyses = analysisResult?.modAnalyses || [];
      if (!existingAnalyses.some(a => a.id === idStr)) {
          const newEntry: ModAnalysis = {
              id: idStr,
              name: mod.name,
              summary: mod.summary,
              logoUrl: mod.logo?.url,
              authors: Array.isArray(mod.authors) ? mod.authors.map(a => a.name).join(', ') : '',
          };
          setAnalysisResult({
              modAnalyses: [...existingAnalyses, newEntry],
              overallSummary: analysisResult?.overallSummary || "Active server mods.",
              potentialConflicts: analysisResult?.potentialConflicts || []
          });
      }
  };

  const modAnalysisMap = useMemo(() => {
    if (!analysisResult?.modAnalyses) return new Map<string, ModAnalysis>();
    return new Map(analysisResult.modAnalyses.map(mod => [mod.id, mod]));
  }, [analysisResult]);

  const handleViewDetails = (mod: ModAnalysis | CurseForgeMod) => {
      const normalized: ModAnalysis = {
          id: String(mod.id),
          name: mod.name,
          summary: mod.summary,
          logoUrl: 'logo' in mod ? (mod as CurseForgeMod).logo?.url : (mod as ModAnalysis).logoUrl,
          authors: Array.isArray(mod.authors) ? mod.authors.map(a => a.name).join(', ') : (mod as ModAnalysis).authors
      };
      setViewingMod(normalized);
  };

  const handleCopyAllIds = () => {
      if (!mods.trim()) return;
      navigator.clipboard.writeText(mods.trim());
      setCopiedIds(true);
      setTimeout(() => setCopiedIds(false), 2000);
  };

  const quickSearchPresets = ['Structures', 'Cryopods', 'QoL', 'Dino Storage', 'Utilities', 'Cosmetics'];

  return (
    <>
        <ModDetailsModal mod={viewingMod} isOpen={!!viewingMod} onClose={() => setViewingMod(null)} />
        
        <div className="space-y-6">
            {/* Search Section - Expanded & Prominent */}
            <div className="p-6 bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-700 flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-cyan-400">CurseForge Mod Search</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Search and browse ARK: Survival Ascended mods directly to add them to your server profile.
                        </p>
                    </div>
                    {searchResults.length > 0 && !isSearching && (
                        <span className="text-xs text-cyan-300 bg-cyan-950/60 border border-cyan-700/50 px-2.5 py-1 rounded-md">
                            {searchResults.length} mods found
                        </span>
                    )}
                </div>

                {/* Search Bar Controls */}
                <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by mod name, author, or keyword (e.g., S+, Cryopods, Dino Storage)..."
                            className="w-full bg-gray-900/60 border border-gray-600 rounded-md pl-10 pr-9 py-2.5 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition disabled:bg-gray-700 disabled:cursor-not-allowed text-sm"
                            disabled={isActionInProgress || isSearching}
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <SearchIcon className="w-4 h-4" />
                        </div>
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchTerm('');
                                    setSearchResults([]);
                                    setHasSearched(false);
                                }}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                                title="Clear search"
                            >
                                <CancelIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <select 
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            className="bg-gray-900/60 border border-gray-600 rounded-md px-3 py-2.5 text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition text-sm"
                            disabled={isActionInProgress || isSearching}
                        >
                            <option value="Popularity">Sort: Popularity</option>
                            <option value="Last Updated">Sort: Last Updated</option>
                            <option value="Name">Sort: Name</option>
                            <option value="Total Downloads">Sort: Downloads</option>
                        </select>

                        <button
                            type="submit"
                            disabled={isActionInProgress || isSearching || !searchTerm.trim()}
                            className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-colors duration-200 shadow-md text-sm whitespace-nowrap"
                        >
                            <SearchIcon className="w-4 h-4" />
                            <span>Search</span>
                        </button>
                    </div>
                </form>

                {/* Quick Search Preset Tags */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs mb-4">
                    <span className="text-gray-400 font-medium mr-1">Popular searches:</span>
                    {quickSearchPresets.map(tag => (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => {
                                setSearchTerm(tag);
                                performSearch(tag);
                            }}
                            disabled={isSearching || isActionInProgress}
                            className="px-2.5 py-1 bg-gray-900/60 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-cyan-300 rounded transition-colors"
                        >
                            {tag}
                        </button>
                    ))}
                </div>
                
                {/* Search Results Window - Significantly Enlarged */}
                <div className="min-h-[280px] max-h-[520px] overflow-y-auto bg-black/40 rounded-lg p-3 sm:p-4 border border-gray-700/80 custom-scrollbar">
                    {isSearching && (
                        <div className="flex flex-col justify-center items-center h-56 space-y-3">
                            <svg className="animate-spin h-9 w-9 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-sm text-gray-400">Searching CurseForge for "{searchTerm}"...</span>
                        </div>
                    )}

                    {searchError && (
                        <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                            <p className="text-red-400 font-medium mb-2">{searchError}</p>
                            <button 
                                onClick={() => performSearch()}
                                className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {!isSearching && !searchError && !hasSearched && (
                        <div className="flex flex-col items-center justify-center h-56 text-center text-gray-400">
                            <SearchIcon className="w-12 h-12 text-gray-600 mb-3" />
                            <p className="text-base font-semibold text-gray-300">Discover & Add ARK: Survival Ascended Mods</p>
                            <p className="text-xs text-gray-500 mt-1 max-w-md">
                                Enter keywords or a mod name above to search CurseForge. Browse descriptions, view images, and add mods directly to this server profile.
                            </p>
                        </div>
                    )}

                    {!isSearching && !searchError && hasSearched && searchResults.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400">
                            <p className="text-gray-300 font-semibold">No mods found matching "{searchTerm}"</p>
                            <p className="text-xs text-gray-500 mt-1">Try another keyword or search by specific mod author name.</p>
                        </div>
                    )}

                    {!isSearching && searchResults.length > 0 && (
                        <div className="space-y-3">
                            {searchResults.map(mod => {
                                const isAdded = currentModIdsSet.has(String(mod.id));
                                const authorsString = Array.isArray(mod.authors) ? mod.authors.map(a => a.name).join(', ') : '';

                                return (
                                    <div 
                                        key={mod.id} 
                                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-900/60 hover:bg-gray-900/90 p-3.5 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors shadow-sm"
                                    >
                                        <div className="flex items-start space-x-3.5 flex-grow min-w-0">
                                            {mod.logo?.url ? (
                                                <img 
                                                    src={mod.logo.url} 
                                                    alt={mod.name} 
                                                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover flex-shrink-0 bg-gray-950 border border-gray-700/80 shadow" 
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0 text-cyan-400">
                                                    <span className="font-bold text-xs uppercase">ARK</span>
                                                </div>
                                            )}
                                            
                                            <div className="flex-grow min-w-0 pr-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleViewDetails(mod)}
                                                    className="text-left font-bold text-cyan-400 hover:text-cyan-300 text-base leading-snug hover:underline block truncate"
                                                    title={mod.name}
                                                >
                                                    {mod.name}
                                                </button>
                                                
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400 mt-1">
                                                    {authorsString && (
                                                        <span>by <span className="text-gray-300 font-medium">{authorsString}</span></span>
                                                    )}
                                                    {authorsString && <span aria-hidden="true" className="text-gray-600">·</span>}
                                                    <span>Mod ID: <span className="font-mono text-cyan-300 font-semibold select-all">{mod.id}</span></span>
                                                </div>

                                                <p className="text-sm text-gray-300 mt-1.5 line-clamp-2 leading-relaxed">
                                                    {mod.summary || 'No description summary available.'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-center">
                                            <button 
                                                type="button"
                                                onClick={() => handleViewDetails(mod)}
                                                className="px-3 py-1.5 text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-md transition-colors text-sm font-medium flex items-center gap-1.5"
                                                title="View Mod Description and Details"
                                            >
                                                <EyeIcon className="w-4 h-4" />
                                                <span>Details</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleAddModClick(mod)}
                                                disabled={isAdded || isActionInProgress}
                                                className={`px-3.5 py-1.5 rounded-md text-sm font-semibold transition-colors duration-200 whitespace-nowrap flex items-center gap-1.5 shadow ${
                                                    isAdded 
                                                        ? 'bg-emerald-950/70 border border-emerald-600/60 text-emerald-300 cursor-default' 
                                                        : 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/30'
                                                }`}
                                            >
                                                {isAdded ? (
                                                    <>
                                                        <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                                                        <span>Added</span>
                                                    </>
                                                ) : (
                                                    <span>+ Add Mod</span>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Currently Added Mods Section - Replaces old plain list & takes the place of Mod Details */}
            <div className="p-6 bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-700 flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-cyan-400">Currently Added Mods</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Active mods installed for this profile. Displays full mod details with one-click removal.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-gray-900/70 text-gray-300 border border-gray-700">
                            {currentModIdsArray.length} {currentModIdsArray.length === 1 ? 'Mod' : 'Mods'} Active
                        </span>
                        {currentModIdsArray.length > 0 && (
                            <button
                                type="button"
                                onClick={handleCopyAllIds}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-cyan-300 hover:text-cyan-200 bg-gray-900/70 hover:bg-gray-700 border border-gray-700 rounded transition-colors"
                                title="Copy all Mod IDs as comma-separated list"
                            >
                                <CopyIcon className="w-3.5 h-3.5" />
                                <span>{copiedIds ? 'Copied!' : 'Copy IDs'}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Comma-Separated Mod IDs Input */}
                <div className="mb-4">
                    <label htmlFor="mods" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                        Active Mod IDs (Comma-Separated)
                    </label>
                    <textarea
                        id="mods"
                        name="mods"
                        rows={2}
                        value={mods}
                        onChange={(e) => onModsChange(e.target.value)}
                        disabled={isActionInProgress}
                        className="w-full bg-gray-900/60 border border-gray-600 rounded-md px-3 py-2 text-gray-100 font-mono text-xs focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition disabled:bg-gray-700 disabled:cursor-not-allowed"
                        placeholder="e.g., 928793,929110,935408"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        You can paste comma-separated mod IDs directly here. Mod names, authors, and logos will automatically be fetched from CurseForge.
                    </p>
                </div>

                {/* Currently Added Mods List - Rendered in rich Mod Details Card Format */}
                <div className="border-t border-gray-700/80 pt-4">
                    <h4 className="text-sm font-bold text-gray-200 uppercase tracking-wider mb-3">
                        Active Mod Details ({currentModIdsArray.length})
                    </h4>

                    {currentModIdsArray.length === 0 ? (
                        <div className="p-8 border border-dashed border-gray-700 rounded-lg text-center bg-black/20">
                            <p className="text-gray-400 font-medium">No mods currently added to this server profile.</p>
                            <p className="text-xs text-gray-500 mt-1">
                                Search for mods using the CurseForge Search above to add them, or paste Mod IDs into the field above.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {currentModIdsArray.map((id) => {
                                const analysis = modAnalysisMap.get(id);
                                const displayName = analysis?.name && analysis.name !== id ? analysis.name : `Mod ${id}`;
                                const displaySummary = analysis?.summary && analysis.summary !== 'No summary available.' 
                                    ? analysis.summary 
                                    : 'Details fetching from CurseForge...';

                                return (
                                    <div 
                                        key={id} 
                                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-900/60 hover:bg-gray-900/90 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors shadow-sm"
                                    >
                                        <div className="flex items-start space-x-3.5 flex-grow min-w-0">
                                            {analysis?.logoUrl ? (
                                                <img 
                                                    src={analysis.logoUrl} 
                                                    alt={displayName} 
                                                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover flex-shrink-0 bg-gray-950 border border-gray-700 shadow" 
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0 text-cyan-400 font-bold text-xs uppercase">
                                                    ARK
                                                </div>
                                            )}

                                            <div className="flex-grow min-w-0 pr-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (analysis) {
                                                            handleViewDetails(analysis);
                                                        } else {
                                                            handleViewDetails({
                                                                id,
                                                                name: displayName,
                                                                summary: displaySummary
                                                            });
                                                        }
                                                    }}
                                                    className="text-left font-bold text-cyan-400 hover:text-cyan-300 text-base leading-snug hover:underline block truncate"
                                                    title={displayName}
                                                >
                                                    {displayName}
                                                </button>

                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400 mt-1">
                                                    {analysis?.authors && (
                                                        <span>by <span className="text-gray-300 font-medium">{analysis.authors}</span></span>
                                                    )}
                                                    {analysis?.authors && <span aria-hidden="true" className="text-gray-600">·</span>}
                                                    <span>Mod ID: <span className="font-mono text-cyan-300 font-semibold select-all">{id}</span></span>
                                                </div>

                                                <p className="text-sm text-gray-300 mt-1.5 line-clamp-2 leading-relaxed">
                                                    {displaySummary}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-center">
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    if (analysis) {
                                                        handleViewDetails(analysis);
                                                    } else {
                                                        handleViewDetails({
                                                            id,
                                                            name: displayName,
                                                            summary: displaySummary
                                                        });
                                                    }
                                                }}
                                                className="px-3 py-1.5 text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-md transition-colors text-sm font-medium flex items-center gap-1.5"
                                                title="View Mod Description and Details"
                                            >
                                                <EyeIcon className="w-4 h-4" />
                                                <span>Details</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleRemoveMod(id)}
                                                disabled={isActionInProgress}
                                                className="px-3 py-1.5 text-red-300 hover:text-red-100 bg-red-950/40 hover:bg-red-900/60 border border-red-700/50 rounded-md transition-colors text-sm font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                title={`Remove mod ${id} from server`}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                                <span>Remove</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </>
  );
};

export default ModManager;
