import React, { useEffect, useRef, useState, useMemo } from 'react';
import { CopyIcon, CheckCircleIcon, AlertTriangleIcon, InfoIcon } from './icons';

interface UpdateProgressModalProps {
  log: string[];
  isFinished: boolean;
  onClose: () => void;
  profileName?: string;
  onCancelUpdate?: () => void;
}

type UpdateStep = 1 | 2 | 3 | 4;

interface ParsedProgressState {
  step: UpdateStep;
  stageName: string;
  stageDescription: string;
  percent: number;
  hasDeterminateProgress: boolean;
  bytesText?: string;
  hasError: boolean;
  isCancelled: boolean;
  errorText?: string;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 2 : 0)} ${units[i]}`;
}

const UpdateProgressModal: React.FC<UpdateProgressModalProps> = ({ 
  log, 
  isFinished, 
  onClose,
  profileName,
  onCancelUpdate
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [commandInput, setCommandInput] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);

  // Elapsed time counter
  useEffect(() => {
    if (isFinished) return;
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isFinished]);

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Reset cancelling state once update completes
  useEffect(() => {
    if (isFinished) {
      setIsCancelling(false);
    }
  }, [isFinished]);

  // Parse log entries in real-time to determine current step and progress
  const progressState: ParsedProgressState = useMemo(() => {
    const finalLine = log[log.length - 1] || '';
    const hasErrorInLog = log.some(line => line.includes('❌') || line.includes('ERROR') || line.includes('Update failed'));
    const isCancelledInLog = log.some(line => line.includes('cancelled by user') || line.includes('[Quit]'));

    if (isFinished) {
      if (isCancelledInLog) {
        return {
          step: 4,
          stageName: 'Update Cancelled',
          stageDescription: 'The update process was stopped by user request. You can re-run the update whenever you are ready.',
          percent: 100,
          hasDeterminateProgress: true,
          hasError: false,
          isCancelled: true,
        };
      }
      if (hasErrorInLog) {
        return {
          step: 4,
          stageName: 'Update Failed',
          stageDescription: 'The update process finished with errors. Review the terminal output below for details.',
          percent: 100,
          hasDeterminateProgress: true,
          hasError: true,
          isCancelled: false,
          errorText: finalLine,
        };
      }
      return {
        step: 4,
        stageName: 'Update Complete',
        stageDescription: 'All ARK: Survival Ascended dedicated server files are up-to-date and validated.',
        percent: 100,
        hasDeterminateProgress: true,
        hasError: false,
        isCancelled: false,
      };
    }

    if (isCancelledInLog) {
      return {
        step: 4,
        stageName: 'Cancelling Update...',
        stageDescription: 'Stopping SteamCMD process and terminating pending download tasks...',
        percent: 0,
        hasDeterminateProgress: false,
        hasError: false,
        isCancelled: true,
      };
    }

    if (hasErrorInLog && finalLine.includes('❌')) {
      return {
        step: 4,
        stageName: 'Error Encountered',
        stageDescription: finalLine,
        percent: 0,
        hasDeterminateProgress: false,
        hasError: true,
        isCancelled: false,
        errorText: finalLine,
      };
    }

    // Scan backwards from latest logs for SteamCMD progress and state markers
    for (let i = log.length - 1; i >= 0; i--) {
      const line = log[i];

      // Downloading state (0x61)
      if (line.includes('downloading') || line.includes('0x61')) {
        const progressMatch = line.match(/progress:\s*([0-9.]+)/i);
        const bytesMatch = line.match(/\(([0-9]+)\s*\/\s*([0-9]+)\)/);
        
        let percent = progressMatch ? parseFloat(progressMatch[1]) : 0;
        let bytesText: string | undefined = undefined;

        if (bytesMatch) {
          const currentBytes = parseInt(bytesMatch[1], 10);
          const totalBytes = parseInt(bytesMatch[2], 10);
          if (!isNaN(currentBytes) && !isNaN(totalBytes) && totalBytes > 0) {
            bytesText = `${formatBytes(currentBytes)} / ${formatBytes(totalBytes)}`;
          }
        }

        return {
          step: 3,
          stageName: 'Downloading Server Update',
          stageDescription: bytesText 
            ? `Receiving update packages from Steam CDN: ${bytesText} (${percent.toFixed(1)}%)`
            : `Downloading updated server files: ${percent.toFixed(1)}%`,
          percent: Math.min(100, Math.max(0, percent)),
          hasDeterminateProgress: true,
          bytesText,
          hasError: false,
          isCancelled: false,
        };
      }

      // Verifying state (0x5)
      if (line.includes('verifying') || line.includes('0x5')) {
        const progressMatch = line.match(/progress:\s*([0-9.]+)/i);
        const bytesMatch = line.match(/\(([0-9]+)\s*\/\s*([0-9]+)\)/);

        let percent = progressMatch ? parseFloat(progressMatch[1]) : 0;
        let bytesText: string | undefined = undefined;

        if (bytesMatch) {
          const currentBytes = parseInt(bytesMatch[1], 10);
          const totalBytes = parseInt(bytesMatch[2], 10);
          if (!isNaN(currentBytes) && !isNaN(totalBytes) && totalBytes > 0) {
            bytesText = `${formatBytes(currentBytes)} / ${formatBytes(totalBytes)}`;
          }
        }

        return {
          step: 3,
          stageName: 'Verifying Existing Files',
          stageDescription: bytesText 
            ? `Scanning file integrity against Steam depot: ${bytesText} (${percent.toFixed(1)}%)`
            : `Checking existing server files on disk: ${percent.toFixed(1)}%`,
          percent: Math.min(100, Math.max(0, percent)),
          hasDeterminateProgress: true,
          bytesText,
          hasError: false,
          isCancelled: false,
        };
      }

      // Preallocating disk space (0x11)
      if (line.includes('preallocating') || line.includes('0x11')) {
        const progressMatch = line.match(/progress:\s*([0-9.]+)/i);
        const percent = progressMatch ? parseFloat(progressMatch[1]) : 0;
        return {
          step: 3,
          stageName: 'Allocating Disk Space',
          stageDescription: `Preallocating disk storage for server files (${percent.toFixed(1)}%)...`,
          percent: Math.min(100, Math.max(0, percent)),
          hasDeterminateProgress: true,
          hasError: false,
          isCancelled: false,
        };
      }

      // Committing files to disk (0x81)
      if (line.includes('committing') || line.includes('0x81')) {
        const progressMatch = line.match(/progress:\s*([0-9.]+)/i);
        const percent = progressMatch ? parseFloat(progressMatch[1]) : 0;
        return {
          step: 4,
          stageName: 'Committing & Finalizing Files',
          stageDescription: `Writing and committing updated files into the server directory (${percent.toFixed(1)}%)...`,
          percent: Math.min(100, Math.max(0, percent)),
          hasDeterminateProgress: true,
          hasError: false,
          isCancelled: false,
        };
      }

      // Checking for updates (0x3)
      if (line.includes('checking for updates') || line.includes('0x3')) {
        return {
          step: 2,
          stageName: 'Checking Depot Manifests',
          stageDescription: 'Querying Steam servers for latest App 2430930 manifests...',
          percent: 15,
          hasDeterminateProgress: false,
          hasError: false,
          isCancelled: false,
        };
      }

      // Steam authentication / login
      if (line.includes('Logging in user') || line.includes('Waiting for user info') || line.includes('Connecting')) {
        return {
          step: 2,
          stageName: 'Connecting to Steam',
          stageDescription: 'Authenticating anonymously with Steam Public network...',
          percent: 10,
          hasDeterminateProgress: false,
          hasError: false,
          isCancelled: false,
        };
      }
    }

    // Default: Step 1 Setup
    return {
      step: 1,
      stageName: 'Initializing SteamCMD',
      stageDescription: 'Verifying SteamCMD installation and preparing update script...',
      percent: 5,
      hasDeterminateProgress: false,
      hasError: false,
      isCancelled: false,
    };
  }, [log, isFinished]);

  // Auto-scroll terminal log
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [log, autoScroll]);

  const handleCopyLogs = () => {
    if (log.length === 0) return;
    navigator.clipboard.writeText(log.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuit = () => {
    if (isFinished || isCancelling) return;
    setIsCancelling(true);
    setCommandFeedback('🛑 Executing "quit" command. Stopping SteamCMD...');
    if (onCancelUpdate) {
      onCancelUpdate();
    }
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim().toLowerCase();
    if (!cmd) return;

    if (cmd === 'quit' || cmd === 'exit' || cmd === 'stop' || cmd === 'q') {
      handleQuit();
      setCommandInput('');
    } else {
      setCommandFeedback(`Command "${cmd}" not recognized. Type "quit" or "exit" to abort update.`);
      setTimeout(() => setCommandFeedback(null), 3500);
      setCommandInput('');
    }
  };

  const stepsList = [
    { num: 1, name: 'Setup', desc: 'SteamCMD & Directories' },
    { num: 2, name: 'Connection', desc: 'Steam Auth & Manifest' },
    { num: 3, name: 'Verify & Download', desc: 'File Check & Transfer' },
    { num: 4, name: 'Finalize', desc: 'Commit & Validation' },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-4xl max-h-[92vh] p-6 sm:p-8 bg-gray-800 rounded-xl shadow-2xl shadow-cyan-500/20 border border-gray-700 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-gray-700/80">
          <div>
            <div className="flex items-center space-x-2.5">
              {!isFinished ? (
                <svg className="animate-spin h-6 w-6 text-cyan-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : progressState.isCancelled ? (
                <span className="text-xl">🛑</span>
              ) : progressState.hasError ? (
                <AlertTriangleIcon className="w-6 h-6 text-red-400 flex-shrink-0" />
              ) : (
                <CheckCircleIcon className="w-6 h-6 text-green-400 flex-shrink-0" />
              )}
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100">
                {isFinished 
                  ? (progressState.isCancelled 
                      ? 'Server Update Cancelled' 
                      : progressState.hasError 
                      ? 'Server Update Finished with Errors' 
                      : 'Server Update Complete') 
                  : 'Updating Server Files'}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              {profileName ? `Target Profile: ${profileName} · ` : ''}
              ARK: Survival Ascended Dedicated Server (App ID 2430930)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-gray-900 border border-gray-700 text-gray-300">
              ⏱️ {formatElapsed(elapsedSeconds)}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded border ${
              isFinished 
                ? (progressState.isCancelled
                    ? 'bg-amber-950/60 border-amber-700 text-amber-300'
                    : progressState.hasError 
                    ? 'bg-red-950/60 border-red-700 text-red-300' 
                    : 'bg-green-950/60 border-green-700 text-green-300')
                : 'bg-cyan-950/60 border-cyan-700 text-cyan-300 animate-pulse'
            }`}>
              {isFinished 
                ? (progressState.isCancelled ? 'Cancelled' : progressState.hasError ? 'Failed' : 'Finished') 
                : 'In Progress'}
            </span>

            {/* Quick Quit button in header when running */}
            {!isFinished && onCancelUpdate && (
              <button
                type="button"
                onClick={handleQuit}
                disabled={isCancelling}
                className="px-3 py-1 bg-red-950/80 hover:bg-red-900 text-red-300 hover:text-white border border-red-700/80 rounded text-xs font-semibold transition flex items-center space-x-1 shadow-sm disabled:opacity-50"
                title="Send 'quit' command to exit update immediately"
              >
                <span>🛑</span>
                <span>{isCancelling ? 'Quitting...' : 'Quit'}</span>
              </button>
            )}
          </div>
        </div>

        {/* 4-Step Progress Stepper */}
        <div className="py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {stepsList.map((stepItem) => {
              const isDone = isFinished ? (!progressState.hasError && !progressState.isCancelled) : progressState.step > stepItem.num;
              const isCurrent = !isFinished && progressState.step === stepItem.num;
              const isFailed = progressState.hasError && (progressState.step === stepItem.num || isFinished);
              const isCancelled = progressState.isCancelled && (progressState.step === stepItem.num || isFinished);

              return (
                <div 
                  key={stepItem.num}
                  className={`p-2.5 sm:p-3 rounded-lg border transition-all ${
                    isCancelled
                      ? 'bg-amber-950/30 border-amber-700/60 text-amber-300'
                      : isFailed 
                      ? 'bg-red-950/30 border-red-700/60 text-red-300'
                      : isDone 
                      ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-300'
                      : isCurrent
                      ? 'bg-cyan-950/40 border-cyan-500 text-cyan-200 shadow-sm shadow-cyan-500/20'
                      : 'bg-gray-900/40 border-gray-700/50 text-gray-500'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCancelled
                        ? 'bg-amber-600 text-white'
                        : isFailed 
                        ? 'bg-red-600 text-white'
                        : isDone 
                        ? 'bg-emerald-500 text-white' 
                        : isCurrent 
                        ? 'bg-cyan-500 text-white animate-pulse' 
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {isDone ? '✓' : isCancelled ? '–' : isFailed ? '✕' : stepItem.num}
                    </div>
                    <span className="font-semibold text-xs truncate">{stepItem.name}</span>
                  </div>
                  <p className="text-[11px] opacity-75 mt-1 truncate pl-7 hidden sm:block">
                    {stepItem.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Stage & Real-time Progress Bar Card */}
        <div className="bg-gray-900/80 p-4 rounded-lg border border-gray-700 shadow-inner mb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Current Action:</span>
              <span className="text-sm font-semibold text-gray-100">{progressState.stageName}</span>
            </div>
            {progressState.hasDeterminateProgress && !progressState.isCancelled && (
              <span className="text-xs font-mono font-bold text-cyan-300">
                {progressState.percent.toFixed(1)}% {progressState.bytesText ? `(${progressState.bytesText})` : ''}
              </span>
            )}
          </div>

          <p className="text-xs text-gray-300 mb-3 leading-relaxed">
            {progressState.stageDescription}
          </p>

          {/* Progress Bar */}
          <div className="w-full bg-gray-950 rounded-full h-3 overflow-hidden border border-gray-700 p-0.5">
            {progressState.hasDeterminateProgress && !progressState.isCancelled ? (
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-300 ease-out shadow-sm shadow-cyan-400/50"
                style={{ width: `${Math.max(3, progressState.percent)}%` }}
              />
            ) : !isFinished ? (
              <div className="h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent w-full animate-pulse rounded-full" />
            ) : (
              <div className={`h-full rounded-full ${
                progressState.isCancelled 
                  ? 'bg-amber-500' 
                  : progressState.hasError 
                  ? 'bg-red-500' 
                  : 'bg-emerald-500'
              }`} style={{ width: '100%' }} />
            )}
          </div>
        </div>

        {/* Console / Terminal Output */}
        <div className="flex-grow flex flex-col min-h-0 bg-black/60 rounded-lg border border-gray-700 overflow-hidden mb-3">
          <div className="flex items-center justify-between px-3 py-2 bg-gray-900/90 border-b border-gray-700 text-xs text-gray-400">
            <div className="flex items-center space-x-2 font-mono">
              <span className={`w-2 h-2 rounded-full ${isFinished ? 'bg-gray-500' : 'bg-green-400 animate-pulse'}`} />
              <span className="font-semibold text-gray-300">SteamCMD Console Stream</span>
              <span>({log.length} lines)</span>
            </div>

            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-1 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500 h-3.5 w-3.5"
                />
                <span className="text-[11px] text-gray-400">Auto-scroll</span>
              </label>

              <button
                type="button"
                onClick={handleCopyLogs}
                className="flex items-center space-x-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded border border-gray-600 transition text-[11px]"
                title="Copy entire log to clipboard"
              >
                <CopyIcon className="w-3 h-3" />
                <span>{copied ? 'Copied!' : 'Copy Logs'}</span>
              </button>
            </div>
          </div>

          <div 
            ref={logContainerRef}
            className="flex-grow p-3 font-mono text-xs text-gray-300 overflow-y-auto space-y-1 custom-scrollbar min-h-[140px] max-h-[220px]"
          >
            {log.length === 0 ? (
              <p className="text-gray-500 italic">Waiting for SteamCMD process to start...</p>
            ) : (
              log.map((entry, index) => {
                let colorClass = 'text-gray-300';
                if (entry.includes('✅') || entry.includes('Success')) colorClass = 'text-emerald-400 font-semibold';
                else if (entry.includes('❌') || entry.includes('ERROR') || entry.includes('failed')) colorClass = 'text-red-400 font-semibold';
                else if (entry.includes('🛑') || entry.includes('Quit') || entry.includes('cancelled')) colorClass = 'text-amber-400 font-semibold';
                else if (entry.includes('⚠️') || entry.includes('Warning') || entry.includes('Retry')) colorClass = 'text-amber-300';
                else if (entry.includes('downloading') || entry.includes('0x61')) colorClass = 'text-cyan-300';
                else if (entry.includes('verifying') || entry.includes('0x5')) colorClass = 'text-purple-300';
                else if (entry.includes('Step ') || entry.includes('Target') || entry.includes('Clean')) colorClass = 'text-cyan-400 font-semibold';

                return (
                  <div key={index} className="flex items-start space-x-1.5 leading-relaxed break-all">
                    <span className="text-cyan-600 select-none">&gt;</span>
                    <span className={colorClass}>{entry}</span>
                  </div>
                );
              })
            )}
          </div>

          {/* Interactive Console Prompt (Quit / Exit Option) */}
          {!isFinished && (
            <form onSubmit={handleCommandSubmit} className="flex items-center space-x-2 px-3 py-2 bg-gray-900 border-t border-gray-700">
              <span className="font-mono text-cyan-400 font-bold select-none text-xs">&gt;</span>
              <input 
                ref={commandInputRef}
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder='Type "quit" or "exit" and press Enter to cancel the update...'
                disabled={isCancelling}
                className="flex-grow bg-black/70 border border-gray-700 rounded px-2.5 py-1 text-xs font-mono text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={isCancelling || !commandInput.trim()}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 text-xs font-mono rounded border border-gray-600 transition"
              >
                Send
              </button>
              <button
                type="button"
                onClick={handleQuit}
                disabled={isCancelling}
                className="px-3 py-1 bg-red-950/80 hover:bg-red-900 disabled:opacity-40 text-red-300 text-xs font-semibold rounded border border-red-700 transition"
                title="Send quit command to cancel update"
              >
                Quit
              </button>
            </form>
          )}

          {commandFeedback && (
            <div className="px-3 py-1 bg-amber-950/60 border-t border-amber-800 text-[11px] text-amber-300 font-mono">
              {commandFeedback}
            </div>
          )}
        </div>

        {/* Info: Automatic Manifest Cleaning */}
        <div className="flex items-start space-x-2 p-2.5 rounded-lg bg-gray-900/60 border border-gray-700/60 text-xs text-gray-400 mb-3">
          <span className="text-cyan-400 text-sm select-none">✨</span>
          <div className="leading-relaxed">
            <span className="font-semibold text-gray-200">Auto-Clean Protection Active: </span>
            <span>
              The manager automatically cleans <code className="text-purple-300 font-mono text-[11px]">appmanifest_2430930.acf</code> prior to each update and auto-update. This prevents SteamCMD from relying on stale cached manifests and guarantees that the newest server build is always pulled.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-gray-700/80">
          <div className="text-xs text-gray-400">
            {isFinished 
              ? 'Update has finished. Server files are ready.' 
              : 'Please keep the manager open while updating files.'}
          </div>

          <div className="flex items-center justify-end space-x-3">
            {!isFinished && onCancelUpdate && (
              <button
                type="button"
                onClick={handleQuit}
                disabled={isCancelling}
                className="px-4 py-2 bg-red-900/80 hover:bg-red-800 text-red-100 font-bold rounded-lg transition-colors duration-200 shadow-md text-xs flex items-center space-x-1.5 disabled:opacity-50"
              >
                <span>🛑</span>
                <span>{isCancelling ? 'Quitting Update...' : 'Cancel / Quit Update'}</span>
              </button>
            )}

            {isFinished ? (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors duration-200 shadow-md shadow-cyan-600/20 text-sm"
              >
                Close
              </button>
            ) : (
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span>Update in progress...</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default UpdateProgressModal;
