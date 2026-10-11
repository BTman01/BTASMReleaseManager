import React, { useState, useEffect } from 'react';
import {
  RemoteCommand,
  RemoteCommandAction,
  subscribeToRecentCommands,
  dispatchRemoteCommand,
  calculateNextScheduledRestart,
} from '../services/firebase';
import { ServerProfile } from '../types';
import { ArkSpecimenImplantLogo } from './icons';

interface MobileBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { uid?: string; email?: string | null; displayName?: string | null } | null;
  activeProfile: ServerProfile | null;
  profiles: ServerProfile[];
  onShowToast: (message: string, type: 'success' | 'error') => void;
  playerListsByProfile?: Record<string, Array<{ name: string; steamId: string; playTime?: number }>>;
  recentChatLogs?: Record<string, string[]>;
}

type ModalTab = 'simulator' | 'guide';

export const MobileBridgeModal: React.FC<MobileBridgeModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeProfile,
  profiles,
  onShowToast,
  playerListsByProfile = {},
  recentChatLogs = {},
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('simulator');
  const [recentCommands, setRecentCommands] = useState<RemoteCommand[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    activeProfile?.id || (profiles[0]?.id ?? '')
  );
  const [selectedAction, setSelectedAction] = useState<RemoteCommandAction>('SEND_RCON_COMMAND');
  const [customPayload, setCustomPayload] = useState<string>('GetChat');
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  useEffect(() => {
    if (activeProfile?.id) {
      setSelectedProfileId(activeProfile.id);
    }
  }, [activeProfile?.id]);

  useEffect(() => {
    if (!isOpen || !currentUser?.uid) return;
    const unsubscribe = subscribeToRecentCommands(currentUser.uid, (cmds) => {
      setRecentCommands(cmds);
    });
    return () => unsubscribe();
  }, [isOpen, currentUser?.uid]);

  if (!isOpen) return null;

  const targetProfile = profiles.find((p) => p.id === selectedProfileId) || activeProfile || profiles[0];
  const onlinePlayers = playerListsByProfile[targetProfile?.id || ''] || [];
  const inGameChat = recentChatLogs[targetProfile?.id || ''] || [];

  const handleDispatchAction = async (action: RemoteCommandAction, payload?: string) => {
    if (!currentUser?.uid) {
      onShowToast('You must be signed in to dispatch remote commands.', 'error');
      return;
    }
    if (!selectedProfileId) {
      onShowToast('Please select a target server profile.', 'error');
      return;
    }

    setIsDispatching(true);
    try {
      await dispatchRemoteCommand(currentUser.uid, selectedProfileId, action, payload);
      onShowToast(`Dispatched command (${action}) to Cloud Bridge!`, 'success');
      if (action === 'BROADCAST_MESSAGE') {
        setCustomPayload('');
      }
    } catch (err: any) {
      onShowToast(`Failed to dispatch command: ${err?.message || err}`, 'error');
    } finally {
      setIsDispatching(false);
    }
  };

  const handleFormDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleDispatchAction(
      selectedAction,
      selectedAction === 'BROADCAST_MESSAGE' || selectedAction === 'KICK_PLAYER' || selectedAction === 'SEND_RCON_COMMAND'
        ? customPayload
        : undefined
    );
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2500);
    onShowToast('Snippet copied to clipboard!', 'success');
  };

  const getStatusBadge = (status: RemoteCommand['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/70 text-amber-300 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span>PENDING</span>
          </span>
        );
      case 'executing':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/70 text-cyan-300 border border-cyan-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
            <span>EXECUTING</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>COMPLETED</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950/70 text-red-300 border border-red-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
            <span>FAILED</span>
          </span>
        );
      default:
        return null;
    }
  };

  const nextRestartIso = targetProfile
    ? calculateNextScheduledRestart(
        targetProfile.config?.scheduledRestartEnabled,
        targetProfile.config?.scheduledRestartTime
      )
    : null;

  const restartCountdownText = (() => {
    if (!targetProfile?.config?.scheduledRestartEnabled || !nextRestartIso) {
      return 'Disabled';
    }
    const msUntil = new Date(nextRestartIso).getTime() - Date.now();
    if (msUntil <= 0) return 'Restarting soon';
    const totalMinutes = Math.floor(msUntil / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `in ${hours}h ${minutes}m (${new Date(nextRestartIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
  })();

  const lastBackupFormatted = (() => {
    if (!targetProfile?.lastBackupTime) return 'None recorded yet';
    const date = new Date(targetProfile.lastBackupTime);
    if (isNaN(date.getTime())) return targetProfile.lastBackupTime;
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  })();

  const isUpdateAvailable = !!(
    targetProfile?.currentBuildId &&
    targetProfile?.latestBuildId &&
    targetProfile.currentBuildId !== targetProfile.latestBuildId
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-4xl bg-gray-950/95 border border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Glow Bar */}
        <div className="h-1 bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500"></div>

        {/* Modal Header */}
        <div className="p-5 flex items-start justify-between border-b border-gray-800/80 bg-gray-900/40">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-950/90 to-slate-900 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <ArkSpecimenImplantLogo className="w-7 h-7 drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-gray-100 via-cyan-200 to-teal-300">
                  Mobile Bridge & Cloud Dispatch
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-700/60 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>PHASE 2 ACTIVE</span>
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Real-time online player roster, in-game chat stream, remote RCON executor & scheduled restart sync
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/60 rounded-lg transition-colors cursor-pointer"
            title="Close dialog"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-800/80 bg-gray-900/50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`pb-2.5 px-4 text-xs font-bold uppercase tracking-wider transition-colors relative cursor-pointer ${
              activeTab === 'simulator' ? 'text-cyan-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Live Bridge & Simulator
            {activeTab === 'simulator' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 px-4 text-xs font-bold uppercase tracking-wider transition-colors relative cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'guide' ? 'text-cyan-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>Mobile App Integration Guide</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-700/60">
              API
            </span>
            {activeTab === 'guide' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Section 1: Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Card 1: Connection & UID */}
            <div className="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase text-gray-400">Connection State</span>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-sm font-bold text-emerald-400">Host Active & Listening</span>
                </div>
              </div>
              <span className="text-[10px] text-gray-500 font-mono mt-2 truncate">
                UID: {currentUser?.uid ? `${currentUser.uid.substring(0, 14)}...` : 'Not Signed In'}
              </span>
            </div>

            {/* Card 2: Next Scheduled Restart */}
            <div className="p-3.5 rounded-xl bg-gray-900/60 border border-amber-500/20 bg-gradient-to-br from-amber-950/10 to-transparent flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase text-amber-300/80 flex items-center space-x-1">
                  <span>Next Scheduled Restart</span>
                </span>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-sm font-bold text-amber-300">{restartCountdownText}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono mt-2">
                <span>
                  {targetProfile?.config?.scheduledRestartEnabled
                    ? `Time: ${targetProfile.config.scheduledRestartTime || '04:00'}`
                    : 'Disabled'}
                </span>
                <span className="text-cyan-400">Synced to Cloud</span>
              </div>
            </div>

            {/* Card 3: Online Players */}
            <div className="p-3.5 rounded-xl bg-gray-900/60 border border-indigo-500/20 bg-gradient-to-br from-indigo-950/10 to-transparent flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase text-indigo-300/80">Online Players</span>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-sm font-bold text-indigo-300">
                    {onlinePlayers.length} / {targetProfile?.config?.maxPlayers || 70}
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-gray-400 font-mono mt-2 truncate">
                {onlinePlayers.length > 0
                  ? onlinePlayers.map((p) => p.name).join(', ')
                  : 'No players online'}
              </span>
            </div>

            {/* Card 4: Last Backup & Build */}
            <div className="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase text-gray-400">Last Backup</span>
                <div className="flex items-center space-x-1.5 mt-1">
                  <span className="text-xs font-mono font-bold text-teal-300 truncate">
                    {lastBackupFormatted}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400 font-mono">
                <span>Build: {targetProfile?.currentBuildId || 'N/A'}</span>
                {isUpdateAvailable && (
                  <span className="text-amber-400 font-bold">Update Available</span>
                )}
              </div>
            </div>
          </div>

          {activeTab === 'simulator' ? (
            <>
              {/* Online Player Roster & Live In-Game Chat Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Panel A: Live Online Players */}
                <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 flex flex-col">
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>Connected Players ({onlinePlayers.length})</span>
                    </h4>
                    <span className="text-[10px] text-cyan-400 font-mono">Synced to Firestore</span>
                  </div>

                  <div className="flex-1 min-h-[90px] max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
                    {onlinePlayers.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-500 italic">
                        No players currently connected to &quot;{targetProfile?.profileName}&quot;.
                      </div>
                    ) : (
                      onlinePlayers.map((player) => (
                        <div
                          key={player.steamId}
                          className="flex items-center justify-between p-2 rounded-lg bg-gray-950/70 border border-gray-800 text-xs"
                        >
                          <span className="font-bold text-gray-200">{player.name}</span>
                          <span className="font-mono text-[10px] text-gray-500">{player.steamId}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Panel B: In-Game Chat & Server Stream */}
                <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 flex flex-col">
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      <span>Recent In-Game Chat & Server Stream</span>
                    </h4>
                    <button
                      onClick={() => handleDispatchAction('GET_CHAT')}
                      disabled={isDispatching}
                      className="text-[10px] font-mono text-cyan-400 hover:text-cyan-200 cursor-pointer disabled:opacity-50"
                    >
                      💬 Fetch RCON Chat
                    </button>
                  </div>

                  <div className="flex-1 min-h-[90px] max-h-[140px] overflow-y-auto p-2 bg-black/60 rounded-lg border border-gray-800 font-mono text-[10px] text-gray-300 space-y-1">
                    {inGameChat.length === 0 ? (
                      <div className="text-gray-500 italic p-2 text-center">
                        No in-game chat lines captured yet. Use &quot;Fetch RCON Chat&quot; or send a command!
                      </div>
                    ) : (
                      inGameChat.slice(-15).map((line, idx) => (
                        <div key={idx} className="truncate text-cyan-300/90">
                          {line}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="p-3.5 rounded-xl bg-gray-900/50 border border-gray-800 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mr-2">
                  1-Click Test Actions:
                </span>
                <button
                  onClick={() => handleDispatchAction('SEND_RCON_COMMAND', 'SaveWorld')}
                  disabled={isDispatching}
                  className="px-3 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <span>💾</span>
                  <span>RCON SaveWorld</span>
                </button>
                <button
                  onClick={() => handleDispatchAction('SEND_RCON_COMMAND', 'destroywilddinos')}
                  disabled={isDispatching}
                  className="px-3 py-1.5 rounded-lg bg-purple-950/70 hover:bg-purple-900 border border-purple-500/40 text-purple-200 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <span>🦖</span>
                  <span>RCON DestroyWildDinos</span>
                </button>
                <button
                  onClick={() => handleDispatchAction('GET_CHAT')}
                  disabled={isDispatching}
                  className="px-3 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <span>💬</span>
                  <span>Fetch In-Game Chat</span>
                </button>
                <button
                  onClick={() => handleDispatchAction('CREATE_BACKUP')}
                  disabled={isDispatching}
                  className="px-3 py-1.5 rounded-lg bg-teal-950/70 hover:bg-teal-900 border border-teal-500/40 text-teal-200 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <span>📦</span>
                  <span>Trigger Backup</span>
                </button>
                <button
                  onClick={() => handleDispatchAction('UPDATE_SERVER')}
                  disabled={isDispatching}
                  className="px-3 py-1.5 rounded-lg bg-blue-950/70 hover:bg-blue-900 border border-blue-500/40 text-blue-200 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <span>⬇️</span>
                  <span>Trigger Update</span>
                </button>
                <button
                  onClick={() => handleDispatchAction('RESTART_SERVER')}
                  disabled={isDispatching}
                  className="px-3 py-1.5 rounded-lg bg-amber-950/70 hover:bg-amber-900 border border-amber-500/40 text-amber-200 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <span>🔄</span>
                  <span>Restart Server</span>
                </button>
              </div>

              {/* Section 2: Mobile Command Dispatch Simulator */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/20 to-slate-900/40 border border-cyan-500/30">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-cyan-300 flex items-center space-x-2">
                      <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span>Remote Mobile Command Simulator</span>
                    </h4>
                    <p className="text-xs text-gray-400">
                      Submit typed RCON commands, chat requests, or server actions to Firestore
                    </p>
                  </div>
                </div>

                <form onSubmit={handleFormDispatch} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Target Server Profile
                      </label>
                      <select
                        value={selectedProfileId}
                        onChange={(e) => setSelectedProfileId(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      >
                        {profiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.profileName} ({p.status})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Remote Action
                      </label>
                      <select
                        value={selectedAction}
                        onChange={(e) => {
                          const val = e.target.value as RemoteCommandAction;
                          setSelectedAction(val);
                          if (val === 'SEND_RCON_COMMAND') setCustomPayload('GetChat');
                          else if (val === 'BROADCAST_MESSAGE') setCustomPayload('Server restart in 10 minutes!');
                          else setCustomPayload('');
                        }}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      >
                        <option value="SEND_RCON_COMMAND">⌨️ Custom Typed RCON Command</option>
                        <option value="GET_CHAT">💬 Fetch In-Game Chat Log</option>
                        <option value="CREATE_BACKUP">📦 Create Server Backup</option>
                        <option value="UPDATE_SERVER">⬇️ Update Server & Restart</option>
                        <option value="SAVE_WORLD">💾 Save World (RCON)</option>
                        <option value="BROADCAST_MESSAGE">📢 Broadcast Message to Server</option>
                        <option value="RESTART_SERVER">🔄 Restart Server</option>
                        <option value="STOP_SERVER">🛑 Stop Server</option>
                        <option value="START_SERVER">▶️ Start Server</option>
                        <option value="KICK_PLAYER">👢 Kick Player</option>
                      </select>
                    </div>
                  </div>

                  {selectedAction === 'SEND_RCON_COMMAND' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-gray-300">
                          RCON Command Line (Type any ARK server command)
                        </label>
                        <span className="text-[10px] text-gray-500 font-mono">Executes on server via RCON</span>
                      </div>
                      <input
                        type="text"
                        value={customPayload}
                        onChange={(e) => setCustomPayload(e.target.value)}
                        placeholder="e.g. destroywilddinos, SaveWorld, GetChat, ServerChat Hello!"
                        required
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:border-cyan-500 font-mono"
                      />
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-gray-400">Presets:</span>
                        {[
                          'destroywilddinos',
                          'SaveWorld',
                          'GetChat',
                          'ListPlayers',
                          'ServerChat Hello Survivors!',
                          'SetTimeOfDay 12:00',
                        ].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setCustomPayload(preset)}
                            className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-cyan-300 text-[10px] font-mono border border-gray-700 transition-colors cursor-pointer"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedAction === 'BROADCAST_MESSAGE' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Broadcast Announcement Message
                      </label>
                      <input
                        type="text"
                        value={customPayload}
                        onChange={(e) => setCustomPayload(e.target.value)}
                        placeholder="e.g. Server maintenance beginning in 5 minutes!"
                        required
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:border-cyan-500"
                      />
                    </div>
                  )}

                  {selectedAction === 'KICK_PLAYER' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Player SteamID or Character Name
                      </label>
                      <input
                        type="text"
                        value={customPayload}
                        onChange={(e) => setCustomPayload(e.target.value)}
                        placeholder="e.g. 76561198000000000 or Survivor"
                        required
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:border-cyan-500 font-mono"
                      />
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isDispatching}
                      className="py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white font-bold text-xs shadow-md hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer flex items-center space-x-2 disabled:opacity-50"
                    >
                      {isDispatching ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Executing via Host PC...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span>Dispatch Remote Command</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Section 3: Live Command Queue History Feed */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
                    <span>Live Command Queue & Execution Log</span>
                    <span className="text-[10px] font-mono text-cyan-400">({recentCommands.length} events)</span>
                  </h4>
                  <span className="text-[10px] text-gray-500 font-mono">Auto-refreshes in real time</span>
                </div>

                <div className="rounded-xl border border-gray-800 bg-gray-900/40 overflow-hidden divide-y divide-gray-800/80">
                  {recentCommands.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-500">
                      No remote commands queued yet. Dispatch a command above to see this PC execute it in real time!
                    </div>
                  ) : (
                    recentCommands.map((cmd) => (
                      <div key={cmd.id} className="p-3 flex items-start justify-between hover:bg-gray-800/30 transition-colors">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-gray-200 font-mono">
                              {cmd.action}
                            </span>
                            {getStatusBadge(cmd.status)}
                          </div>
                          {cmd.payload && (
                            <p className="text-[11px] text-cyan-400/90 font-mono truncate max-w-md">
                              Command: &quot;{cmd.payload}&quot;
                            </p>
                          )}
                          <p className="text-[10px] text-gray-400 whitespace-pre-line max-h-24 overflow-y-auto">
                            Result: {cmd.resultMessage || 'Processing on host...'}
                          </p>
                        </div>

                        <div className="text-right text-[10px] text-gray-500 font-mono">
                          {new Date(cmd.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Tab: Mobile Integration Guide & Code Snippets */
            <div className="space-y-5 text-gray-300 text-xs">
              <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
                <h4 className="text-sm font-bold text-cyan-300 mb-1 flex items-center space-x-2">
                  <span>📱 Mobile App Architecture Overview</span>
                </h4>
                <p className="text-gray-400 text-xs">
                  Your Android mobile app connects to Firestore using database ID:
                  <code className="text-cyan-300 ml-1">ai-studio-btsasaservermana-1f7d2b4d-27ed-420e-86cd-a70cdd74f382</code>.
                  It reads telemetry from <code className="text-cyan-300">/users/{'{userId}'}/serverInstances/{'{profileId}'}</code> and sends commands to <code className="text-cyan-300">/users/{'{userId}'}/commands</code>.
                </p>
              </div>

              {/* Snippet A: Reading Online Players */}
              <div className="p-4 rounded-xl bg-gray-900/40 border border-gray-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-gray-200 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                    <span>1. Seeing Who Is Online (Android Kotlin / Jetpack Compose)</span>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `// Listen to online players from Firestore in Android\ndb.collection("users").document(userId)\n  .collection("serverInstances").document(profileId)\n  .addSnapshotListener { snapshot, error ->\n    if (snapshot == null || !snapshot.exists()) return@addSnapshotListener\n    val server = snapshot.toObject(ServerInstance::class.java)\n    val players = server?.onlinePlayers ?: emptyList()\n    println("Online count: \${players.size}")\n    players.forEach { p -> println("Player: \${p.name} (\${p.steamId})") }\n  }`,
                        'players'
                      )
                    }
                    className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-cyan-400 text-[11px] font-mono cursor-pointer"
                  >
                    {copiedSnippet === 'players' ? 'Copied!' : 'Copy Snippet'}
                  </button>
                </div>
                <pre className="p-3 bg-black/60 rounded-lg text-[11px] font-mono text-gray-300 overflow-x-auto border border-gray-800">
{`// Android Kotlin: Read online player list in real-time
db.collection("users").document(userId)
  .collection("serverInstances").document(profileId)
  .addSnapshotListener { snapshot, _ ->
    val players = snapshot?.get("onlinePlayers") as? List<Map<String, String>> ?: emptyList()
    // players is an array of objects: [{ name: "Alice", steamId: "..." }, ...]
    players.forEach { player ->
      val name = player["name"] ?: "Survivor"
      val id = player["steamId"] ?: ""
      Log.d("ARK", "Online: $name ($id)")
    }
  }`}
                </pre>
              </div>

              {/* Snippet B: Retrieving In-Game Chat */}
              <div className="p-4 rounded-xl bg-gray-900/40 border border-gray-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-gray-200 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    <span>2. Retrieving In-Game Messages & Chat Stream</span>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `// Method 1: Listen to live recentChat stream from ServerInstance doc\ndb.collection("users").document(userId)\n  .collection("serverInstances").document(profileId)\n  .addSnapshotListener { snapshot, _ ->\n    val chatLines = snapshot?.get("recentChat") as? List<String> ?: emptyList()\n    chatLines.forEach { line -> println(line) }\n  }\n\n// Method 2: Request fresh RCON chat on demand\nfun fetchChat(userId: String, profileId: String) {\n  val cmdId = "cmd_\${System.currentTimeMillis()}"\n  db.collection("users").document(userId).collection("commands").document(cmdId)\n    .set(mapOf("id" to cmdId, "userId" to userId, "targetProfileId" to profileId, "action" to "GET_CHAT", "status" to "pending", "createdAt" to Instant.now().toString(), "updatedAt" to Instant.now().toString()))\n}`,
                        'chat'
                      )
                    }
                    className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-cyan-400 text-[11px] font-mono cursor-pointer"
                  >
                    {copiedSnippet === 'chat' ? 'Copied!' : 'Copy Snippet'}
                  </button>
                </div>
                <pre className="p-3 bg-black/60 rounded-lg text-[11px] font-mono text-gray-300 overflow-x-auto border border-gray-800">
{`// Option 1: Live chat stream from server telemetry
db.collection("users").document(userId)
  .collection("serverInstances").document(profileId)
  .addSnapshotListener { snapshot, _ ->
    val chat = snapshot?.get("recentChat") as? List<String> ?: emptyList()
    // Displays up to 50 recent in-game chat and log messages
  }

// Option 2: Dispatch GET_CHAT command to fetch fresh chat buffer
sendRemoteCommand(userId, profileId, "GET_CHAT")`}
                </pre>
              </div>

              {/* Snippet C: Sending Typed RCON Commands */}
              <div className="p-4 rounded-xl bg-gray-900/40 border border-gray-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-gray-200 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>3. Sending Custom Typed RCON Commands (Android Studio)</span>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `// Dispatch typed RCON command from Android app\nfun sendRconCommand(userId: String, profileId: String, commandText: String, onResult: (String) -> Unit) {\n  val cmdId = "cmd_\${System.currentTimeMillis()}_\${(1000..9999).random()}"\n  val now = java.time.Instant.now().toString()\n\n  val commandDoc = hashMapOf(\n    "id" to cmdId,\n    "userId" to userId,\n    "targetProfileId" to profileId,\n    "action" to "SEND_RCON_COMMAND",\n    "payload" to commandText,\n    "status" to "pending",\n    "createdAt" to now,\n    "updatedAt" to now\n  )\n\n  val docRef = db.collection("users").document(userId).collection("commands").document(cmdId)\n  docRef.set(commandDoc).addOnSuccessListener {\n    // Listen for command completion and output response\n    val listenerRegistration = docRef.addSnapshotListener { snapshot, _ ->\n      if (snapshot != null && snapshot.getString("status") == "completed") {\n        val output = snapshot.getString("resultMessage") ?: "Success"\n        onResult(output)\n      }\n    }\n  }\n}\n\n// Example: sendRconCommand(userUid, profileId, "destroywilddinos") { result -> Toast.makeText(context, result, Toast.LENGTH_SHORT).show() }`,
                        'rcon'
                      )
                    }
                    className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-cyan-400 text-[11px] font-mono cursor-pointer"
                  >
                    {copiedSnippet === 'rcon' ? 'Copied!' : 'Copy Snippet'}
                  </button>
                </div>
                <pre className="p-3 bg-black/60 rounded-lg text-[11px] font-mono text-gray-300 overflow-x-auto border border-gray-800">
{`// Android Kotlin: Send any custom RCON command (e.g. "destroywilddinos", "SaveWorld", "SetTimeOfDay 12:00")
fun sendRconCommand(userId: String, profileId: String, commandText: String, onResult: (String) -> Unit) {
  val cmdId = "cmd_\${System.currentTimeMillis()}_\${(1000..9999).random()}"
  val now = java.time.Instant.now().toString()

  val doc = hashMapOf(
    "id" to cmdId,
    "userId" to userId,
    "targetProfileId" to profileId,
    "action" to "SEND_RCON_COMMAND",
    "payload" to commandText,        // e.g. "destroywilddinos"
    "status" to "pending",
    "createdAt" to now,
    "updatedAt" to now
  )

  val docRef = db.collection("users").document(userId).collection("commands").document(cmdId)
  docRef.set(doc).addOnSuccessListener {
    // Listen for completion: desktop host executes RCON command and writes output to resultMessage
    val listenerRegistration = docRef.addSnapshotListener { snapshot, _ ->
      if (snapshot != null && snapshot.getString("status") == "completed") {
        val output = snapshot.getString("resultMessage") ?: "Success"
        onResult(output)
      }
    }
  }
}

// Example usage in an Android button or ViewModel:
// sendRconCommand(userUid, profileId, "destroywilddinos") { result ->
//   Toast.makeText(context, result, Toast.LENGTH_SHORT).show()
// }`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-800/80 bg-gray-900/60 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>Mobile Ready: Online players, in-game chat, and arbitrary RCON execution are live.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileBridgeModal;
