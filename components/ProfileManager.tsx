import React, { useState, useEffect, useRef } from 'react';
import { ServerProfile, ServerStatus } from '../types';
import { EditIcon, TrashIcon, SaveIcon, CancelIcon } from './icons';

interface ProfileManagerProps {
  profiles: ServerProfile[];
  activeProfileId: string | null;
  onSelectProfile: (id: string) => void;
  onCreateProfile: () => void;
  onUpdateProfileName: (id: string, newName: string) => void;
  onDeleteProfile: (id: string) => void;
  isActionInProgress: boolean;
}

const ProfileManager: React.FC<ProfileManagerProps> = ({ profiles, activeProfileId, onSelectProfile, onCreateProfile, onUpdateProfileName, onDeleteProfile, isActionInProgress }) => {
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  
  const [hoveredProfileId, setHoveredProfileId] = useState<string | null>(null);
  const hoverTimerRef = useRef<number | null>(null);

  // When the active profile changes, cancel any ongoing edits.
  useEffect(() => {
    handleCancel();
  }, [activeProfileId]);
  
  const handleMouseEnter = (profileId: string) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    if (editingProfileId) return; // Don't show hover icons if any profile is being edited

    hoverTimerRef.current = window.setTimeout(() => {
        setHoveredProfileId(profileId);
    }, 1000); // 1-second delay
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredProfileId(null);
  };

  const handleEdit = (profile: ServerProfile) => {
    handleMouseLeave(); // Clear hover state
    setEditingProfileId(profile.id);
    setEditingName(profile.profileName);
  };

  const handleCancel = () => {
    setEditingProfileId(null);
    setEditingName('');
  };

  const handleSave = () => {
    if (editingProfileId && editingName.trim()) {
        onUpdateProfileName(editingProfileId, editingName.trim());
    }
    handleCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave();
    else if (e.key === 'Escape') handleCancel();
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-md rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between space-x-2">
        <div className="flex-grow flex items-center space-x-1 flex-wrap">
          {profiles.map(profile => (
            <div
                key={profile.id}
                onMouseEnter={() => handleMouseEnter(profile.id)}
                onMouseLeave={handleMouseLeave}
                className="relative"
            >
                {editingProfileId === profile.id ? (
                    <div className="flex items-center space-x-2 px-2 h-[40px] bg-cyan-700 rounded-md animate-fade-in min-w-[200px]">
                        <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="px-2 py-1 h-full bg-gray-900 border border-cyan-500 rounded-md text-sm font-semibold w-full"
                            autoFocus
                            onFocus={(e) => e.target.select()}
                        />
                        <button onClick={handleSave} className="p-2 text-green-400 hover:bg-green-500/20 rounded-md transition-colors" aria-label="Save new name">
                            <SaveIcon className="w-5 h-5" />
                        </button>
                        <button onClick={handleCancel} className="p-2 text-gray-400 hover:bg-gray-500/20 rounded-md transition-colors" aria-label="Cancel rename">
                            <CancelIcon className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <div
                        onClick={() => !(isActionInProgress || !!editingProfileId) && onSelectProfile(profile.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectProfile(profile.id)}}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 min-w-[150px] h-[40px] flex items-center justify-center ${
                            activeProfileId === profile.id
                                ? 'bg-cyan-600 text-white shadow-md'
                                : 'bg-gray-700/50 hover:bg-gray-700 text-gray-300'
                        } ${(isActionInProgress || !!editingProfileId) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${profile.status === ServerStatus.Running ? 'animate-pulse-glow' : ''}`}
                    >
                        {hoveredProfileId === profile.id ? (
                            <div className="flex items-center justify-center space-x-4 animate-fade-in">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleEdit(profile); }}
                                    className="p-1 text-white hover:text-cyan-300 transition-colors" aria-label="Edit Profile"
                                >
                                    <EditIcon className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteProfile(profile.id); }}
                                    disabled={[ServerStatus.Running, ServerStatus.Starting, ServerStatus.Stopping, ServerStatus.Updating].includes(profile.status)}
                                    className="p-1 text-white hover:text-red-400 transition-colors disabled:text-gray-500 disabled:cursor-not-allowed" aria-label="Delete Profile"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <span className="truncate">{profile.profileName}</span>
                        )}
                    </div>
                )}
            </div>
          ))}
        </div>
        <button
          onClick={onCreateProfile}
          disabled={isActionInProgress || !!editingProfileId}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-md transition-colors duration-200 shadow-md text-sm disabled:bg-gray-600 disabled:cursor-not-allowed whitespace-nowrap"
        >
          + New Profile
        </button>
      </div>
    </div>
  );
};

export default ProfileManager;