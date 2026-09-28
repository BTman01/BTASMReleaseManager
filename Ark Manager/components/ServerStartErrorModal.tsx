import React, { useState } from 'react';
import { ServerProfile } from '../types';
import { AlertTriangleIcon, CheckCircleIcon, CopyIcon, TerminalIcon, FolderIcon } from './icons';

interface ServerStartErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ServerProfile | null;
  errorMessage: string;
  expectedPaths: string[];
  launchArgs?: string[];
  onOpenConsole: () => void;
}

export const ServerStartErrorModal: React.FC<ServerStartErrorModalProps> = ({
  isOpen,
  onClose,
  profile,
  errorMessage,
  expectedPaths,
  launchArgs = [],
  onOpenConsole,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !profile) return null;

  const handleCopyDiagnostics = () => {
    const report = [
      `=== BT ASM SERVER START FAILURE DIAGNOSTIC REPORT ===`,
      `Timestamp: ${new Date().toISOString()}`,
      `Profile: ${profile.profileName} (ID: ${profile.id})`,
      `Configured Server Path: ${profile.path || 'Not Set'}`,
      `Server Executable Candidates Checked:`,
      ...expectedPaths.map(p => `  - ${p}`),
      ``,
      `Error Message:`,
      errorMessage,
      ``,
      `Launch Arguments:`,
      launchArgs.join(' '),
      ``,
      `RCON Enabled: ${profile.config.bEnableRcon}`,
      `Game Port: ${profile.config.gamePort} | Query Port: ${profile.config.queryPort} | RCON Port: ${profile.config.rconPort}`,
      `======================================================`
    ].join('\n');

    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const isExeMissing = errorMessage.toLowerCase().includes('not found') || 
                       errorMessage.toLowerCase().includes('cannot find') ||
                       errorMessage.toLowerCase().includes('no such file');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-gray-900 border border-red-700/60 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-red-950/40 border-b border-red-800/40 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-900/50 border border-red-700/60 rounded-lg text-red-400">
              <AlertTriangleIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Server Failed to Start
              </h3>
              <p className="text-xs text-red-300/80">
                Profile: <span className="font-semibold text-white">{profile.profileName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl font-bold p-1 rounded-md"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-grow text-sm">
          {/* Main Error Box */}
          <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-1">
              Error Details Returned by System
            </p>
            <p className="font-mono text-xs text-red-200 break-all whitespace-pre-wrap leading-relaxed">
              {errorMessage || 'Unknown startup error occurred.'}
            </p>
          </div>

          {/* Likely Cause Analysis */}
          <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
              <span>Troubleshooting & Root Causes</span>
            </h4>

            {isExeMissing ? (
              <div className="space-y-2 text-xs text-gray-300">
                <p className="text-amber-300 font-medium">
                  ⚠️ <code className="font-mono">ArkAscendedServer.exe</code> was not found in the configured server directory.
                </p>
                <div className="bg-gray-900/80 rounded p-2.5 space-y-1 font-mono text-[11px] text-gray-400">
                  <div className="text-gray-300 font-bold mb-1">Checked paths:</div>
                  {expectedPaths.map((path, idx) => (
                    <div key={idx} className="truncate" title={path}>
                      • {path}
                    </div>
                  ))}
                </div>
                <ul className="list-disc list-inside space-y-1 text-gray-300 pl-1">
                  <li>
                    <strong>Have you installed the server files?</strong> If this is a new profile, click the <span className="text-cyan-400 font-semibold">Update / Install</span> button to download ARK dedicated server files via SteamCMD.
                  </li>
                  <li>
                    <strong>Check the Profile Path:</strong> Verify that the path set in Server Configuration points directly to your ARK server folder.
                  </li>
                </ul>
              </div>
            ) : (
              <ul className="list-disc list-inside space-y-1.5 text-xs text-gray-300 pl-1">
                <li>
                  <strong>Missing Visual C++ Redistributable:</strong> ARK Ascended requires the <span className="text-cyan-400 font-semibold">Visual C++ 2015-2022 Redistributable (x64)</span>. If missing, Windows will fail to launch the server process.
                </li>
                <li>
                  <strong>Antivirus or Windows Defender:</strong> Security software may be quarantining <code className="text-cyan-300 font-mono">ArkAscendedServer.exe</code> or blocking process spawning.
                </li>
                <li>
                  <strong>Port Conflict:</strong> Port {profile.config.gamePort} or {profile.config.queryPort} may already be in use by another running server or zombie process. Check Task Manager for existing <code className="text-cyan-300 font-mono">ArkAscendedServer.exe</code> processes.
                </li>
                <li>
                  <strong>Invalid Launch Parameters:</strong> A custom argument or invalid mod ID might be preventing the engine from starting.
                </li>
              </ul>
            )}
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-900/60 border border-gray-700/60 rounded p-2.5">
              <span className="text-gray-400 block mb-0.5">Configured Server Directory</span>
              <span className="text-gray-200 font-mono break-all text-[11px]">
                {profile.path || 'Not specified'}
              </span>
            </div>
            <div className="bg-gray-900/60 border border-gray-700/60 rounded p-2.5">
              <span className="text-gray-400 block mb-0.5">RCON Port & Game Port</span>
              <span className="text-gray-200 font-mono text-[11px]">
                Game: {profile.config.gamePort} | RCON: {profile.config.bEnableRcon ? profile.config.rconPort : 'Disabled'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-gray-950/70 border-t border-gray-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCopyDiagnostics}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded text-xs font-medium border border-gray-600 transition-colors"
          >
            {copied ? (
              <>
                <CheckCircleIcon className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400">Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <CopyIcon className="w-3.5 h-3.5" />
                <span>Copy Diagnostic Report</span>
              </>
            )}
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenConsole();
              }}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-xs font-semibold shadow transition-colors"
            >
              <TerminalIcon className="w-3.5 h-3.5" />
              <span>View Console Tab</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
