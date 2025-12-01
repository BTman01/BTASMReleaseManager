
import React, { useEffect, useState } from 'react';
import { ModAnalysis } from '../types';
import { CancelIcon } from './icons';
import { getModDescription } from '../services/curseforgeService';

interface ModDetailsModalProps {
  mod: ModAnalysis | null;
  isOpen: boolean;
  onClose: () => void;
}

const ModDetailsModal: React.FC<ModDetailsModalProps> = ({ mod, isOpen, onClose }) => {
  const [description, setDescription] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && mod) {
        setDescription(null); // Clear previous description
        setIsLoading(true);
        
        // Use the numeric ID if possible, otherwise string
        const fetchDesc = async () => {
            try {
                const desc = await getModDescription(mod.id);
                setDescription(desc);
            } catch (error) {
                console.error("Failed to load description", error);
                setDescription("<p>Could not load full description from CurseForge.</p>");
            } finally {
                setIsLoading(false);
            }
        };
        fetchDesc();
    }
  }, [isOpen, mod]);

  if (!isOpen || !mod) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-4xl bg-gray-800 rounded-lg shadow-2xl border border-gray-700 overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="relative h-48 bg-gray-900 flex items-center justify-center overflow-hidden flex-shrink-0">
            {mod.logoUrl ? (
                <img src={mod.logoUrl} alt={mod.name} className="w-full h-full object-cover opacity-50" />
            ) : (
                <div className="text-gray-600">No Image Available</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-800 to-transparent"></div>
            {mod.logoUrl && (
                 <img src={mod.logoUrl} alt={mod.name} className="absolute bottom-4 left-6 w-24 h-24 rounded-lg shadow-lg border-2 border-gray-700 object-cover z-10" />
            )}
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/50 text-gray-300 hover:text-white rounded-full hover:bg-black/70 transition-colors z-20">
                <CancelIcon className="w-6 h-6" />
            </button>
        </div>
        
        <div className="p-6 pt-8 flex-grow overflow-y-auto custom-scrollbar">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-cyan-400">{mod.name}</h2>
                    <p className="text-sm text-gray-400 mt-1">Mod ID: <span className="font-mono text-gray-300 select-all">{mod.id}</span></p>
                    {mod.authors && <p className="text-sm text-gray-400">By: <span className="text-gray-300">{mod.authors}</span></p>}
                </div>
            </div>
            
            <div className="space-y-6">
                <div className="bg-gray-900/50 p-4 rounded-md border border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Short Summary</h3>
                    <p className="text-gray-200 leading-relaxed text-lg">{mod.summary || "No summary available."}</p>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-700 pb-2">Full Description</h3>
                    
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <svg className="animate-spin h-8 w-8 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-gray-400 text-sm">Fetching description from CurseForge...</span>
                        </div>
                    ) : (
                        <div className="mod-description-content bg-black/20 p-4 rounded-md">
                            {/* 
                                Styles to ensure externally fetched HTML looks good in both dark and light modes.
                            */}
                            <style>{`
                                .mod-description-content { color: #d1d5db; line-height: 1.6; }
                                .mod-description-content h1 { font-size: 1.5em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; color: #fff; }
                                .mod-description-content h2 { font-size: 1.25em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; color: #fff; border-bottom: 1px solid #374151; padding-bottom: 0.25em; }
                                .mod-description-content h3 { font-size: 1.1em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; color: #e5e7eb; }
                                .mod-description-content p { margin-bottom: 1em; }
                                .mod-description-content a { color: #22d3ee; text-decoration: underline; }
                                .mod-description-content a:hover { color: #67e8f9; }
                                .mod-description-content ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1em; }
                                .mod-description-content ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1em; }
                                .mod-description-content img { max-width: 100%; height: auto; border-radius: 0.375rem; margin: 1em 0; }
                                .mod-description-content strong { color: #fff; font-weight: bold; }
                                .mod-description-content code { background-color: #1f2937; padding: 0.2em 0.4em; border-radius: 0.25em; font-family: monospace; }
                                .mod-description-content blockquote { border-left: 4px solid #374151; padding-left: 1em; color: #9ca3af; font-style: italic; margin-bottom: 1em; }

                                /* Light Mode Overrides */
                                .light .mod-description-content { color: #374151; }
                                .light .mod-description-content h1 { color: #111827; }
                                .light .mod-description-content h2 { color: #111827; border-bottom-color: #d1d5db; }
                                .light .mod-description-content h3 { color: #1f2937; }
                                .light .mod-description-content strong { color: #111827; }
                                .light .mod-description-content a { color: #0891b2; }
                                .light .mod-description-content a:hover { color: #06b6d4; }
                                .light .mod-description-content code { background-color: #e5e7eb; color: #111827; }
                                .light .mod-description-content blockquote { border-left-color: #d1d5db; color: #6b7280; }
                            `}</style>
                            <div dangerouslySetInnerHTML={{ __html: description || "<p>No detailed description available.</p>" }} />
                        </div>
                    )}
                </div>
            </div>
        </div>
        
        <div className="p-4 bg-gray-900/50 border-t border-gray-700 flex justify-end">
            <button onClick={onClose} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-md transition-colors">
                Close
            </button>
        </div>
      </div>
    </div>
  );
};

export default ModDetailsModal;