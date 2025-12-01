
import React, { useState, useEffect, useRef } from 'react';
import { ServerProfile, ServerStatus } from '../types';
import { TerminalIcon, AlertTriangleIcon } from './icons';
import { confirm } from '@tauri-apps/plugin-dialog';

interface ConsoleProps {
  profile: ServerProfile;
  managerLog: string[];
  serverLog: string[];
  onSendCommand: (command: string) => void;
  isActionInProgress: boolean;
}

const Card: React.FC<{ title: string; icon?: React.ReactNode, children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="p-6 bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-700 h-full flex flex-col">
        <div className="flex items-center space-x-2 text-lg font-bold text-cyan-400 mb-4">
            {icon}
            <h3>{title}</h3>
        </div>
        <div className="flex-grow flex flex-col space-y-4 min-h-0">{children}</div>
    </div>
);

const DESTRUCTIVE_COMMANDS = [
  'saveworld',
  'shutdown',
  'destroywilddinos',
  'killplayer',
  'banplayer',
  'kickplayer',
  'kill',
];

const Console: React.FC<ConsoleProps> = ({ profile, managerLog, serverLog, onSendCommand, isActionInProgress }) => {
  const [command, setCommand] = useState('');
  const [activeConsoleTab, setActiveConsoleTab] = useState<'manager' | 'server'>('manager');
  const [autoScroll, setAutoScroll] = useState(true);
  const [lastServerLogTime, setLastServerLogTime] = useState<Date | null>(null);
  const [lastManagerLogTime, setLastManagerLogTime] = useState<Date | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);
  const isUserScrollingRef = useRef(false);

  const logToDisplay = activeConsoleTab === 'manager' ? managerLog : serverLog;
  
  // Update last log times when logs change
  useEffect(() => {
    if (serverLog.length > 0) {
      setLastServerLogTime(new Date());
    }
  }, [serverLog.length]);

  useEffect(() => {
    if (managerLog.length > 0) {
      setLastManagerLogTime(new Date());
    }
  }, [managerLog.length]);

  // Handle auto-scrolling
  useEffect(() => {
    if (logContainerRef.current && autoScroll && !isUserScrollingRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logToDisplay, autoScroll]);

  // Detect user scrolling
  const handleScroll = () => {
    if (!logContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
    
    // If user scrolled up, disable auto-scroll
    if (scrollTop < lastScrollTop.current) {
      isUserScrollingRef.current = true;
      setAutoScroll(false);
    }
    
    // If user scrolled to bottom, re-enable auto-scroll
    if (isAtBottom) {
      isUserScrollingRef.current = false;
      setAutoScroll(true);
    }
    
    lastScrollTop.current = scrollTop;
  };

  const scrollToBottom = () => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      setAutoScroll(true);
      isUserScrollingRef.current = false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCommand = command.trim();
    if (!trimmedCommand) return;

    const baseCommand = trimmedCommand.split(' ')[0].toLowerCase();
    
    if (DESTRUCTIVE_COMMANDS.includes(baseCommand)) {
      const confirmed = await confirm(
        `Are you sure you want to execute the command "${trimmedCommand}"?\n\nThis action may be disruptive to players or the server state.`,
        { title: 'Confirm Destructive Command' }
      );
      if (!confirmed) {
        return;
      }
    }

    onSendCommand(trimmedCommand);
    setCommand('');
  };

  const isServerRunning = profile.status === ServerStatus.Running;
  const isRconEnabled = profile.config.bEnableRcon;
  const canSendCommand = isServerRunning && isRconEnabled && !isActionInProgress;

  const getStreamStatus = () => {
    const lastTime = activeConsoleTab === 'manager' ? lastManagerLogTime : lastServerLogTime;
    
    if (!lastTime) {
      return { text: 'Waiting', color: 'text-gray-400', dot: 'bg-gray-400' };
    }
    
    const secondsSinceLastLog = (Date.now() - lastTime.getTime()) / 1000;
    
    if (secondsSinceLastLog < 5) {
      return { text: 'Live', color: 'text-green-400', dot: 'bg-green-400 animate-pulse' };
    } else if (secondsSinceLastLog < 30) {
      return { text: 'Active', color: 'text-yellow-400', dot: 'bg-yellow-400' };
    } else {
      return { text: 'Idle', color: 'text-gray-400', dot: 'bg-gray-400' };
    }
  };

  const streamStatus = getStreamStatus();

  const formatTimestamp = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleTimeString();
  };

  return (
    <div className="h-full flex flex-col max-w-6xl mx-auto">
      <Card title="Live Server Console" icon={<TerminalIcon />}>
        <div className="flex items-center justify-between border-b border-gray-700 -mt-2 pb-2">
          <nav className="flex space-x-4" aria-label="Console Tabs">
            <button
              onClick={() => setActiveConsoleTab('manager')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeConsoleTab === 'manager'
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
              }`}
            >
              Manager Log
              {managerLog.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-cyan-600/30 rounded-full text-xs">
                  {managerLog.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveConsoleTab('server')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeConsoleTab === 'server'
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
              }`}
            >
              Server Log (ShooterGame.log)
              {serverLog.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-cyan-600/30 rounded-full text-xs">
                  {serverLog.length}
                </span>
              )}
            </button>
          </nav>

          <div className="flex items-center space-x-4 text-sm">
            {/* Stream Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${streamStatus.dot}`} />
              <span className={`${streamStatus.color} font-medium`}>
                {streamStatus.text}
              </span>
              {(activeConsoleTab === 'manager' ? lastManagerLogTime : lastServerLogTime) && (
                <span className="text-gray-500 text-xs">
                  {formatTimestamp(activeConsoleTab === 'manager' ? lastManagerLogTime : lastServerLogTime)}
                </span>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-2">
              {!autoScroll && (
                <button
                  onClick={scrollToBottom}
                  className="px-3 py-1 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-400 text-xs rounded transition-colors"
                  title="Scroll to bottom and re-enable auto-scroll"
                >
                  ↓ Jump to Bottom
                </button>
              )}
              <label className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => {
                    setAutoScroll(e.target.checked);
                    if (e.target.checked) {
                      scrollToBottom();
                    }
                  }}
                  className="w-3 h-3 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
                />
                <span className="text-gray-400 text-xs">Auto-scroll</span>
              </label>
            </div>
          </div>
        </div>

        <div 
          ref={logContainerRef}
          onScroll={handleScroll}
          className="w-full flex-grow bg-black/50 p-4 rounded-md border border-gray-700 font-mono text-sm text-gray-300 overflow-y-auto min-h-0"
          style={{ scrollBehavior: autoScroll ? 'smooth' : 'auto' }}
          aria-live="polite"
        >
          {logToDisplay.length > 0 ? (
            logToDisplay.map((entry, index) => {
              const isString = typeof entry === 'string';
              const isUserCommand = isString && entry.startsWith('$ ');
              const isManagerMessage = isString && entry.startsWith('[Manager]');
              const isRconDiag = isString && entry.startsWith('[RCON Diag]');
              const isRconSuccess = isRconDiag && entry.includes('✅');
              const isRconFailure = isRconDiag && entry.includes('❌');
              const isError = isString && (entry.includes('ERROR') || entry.includes('Error:') || entry.includes('❌'));
              const isWarning = isString && (entry.includes('Warning') || entry.includes('⚠️'));
              const isSuccess = isString && (entry.includes('✅') || entry.includes('Success'));

              let entryClass = '';
              if (activeConsoleTab === 'manager') {
                if (isUserCommand) entryClass = 'text-yellow-300';
                else if (isManagerMessage) entryClass = 'text-purple-400';
                else if (isRconSuccess) entryClass = 'text-green-400';
                else if (isRconFailure) entryClass = 'text-red-400';
              } else {
                // Server log styling
                if (isError) entryClass = 'text-red-400';
                else if (isWarning) entryClass = 'text-yellow-400';
                else if (isSuccess) entryClass = 'text-green-400';
              }

              return (
                <div key={index} className="whitespace-pre-wrap hover:bg-gray-800/30 px-1 -mx-1 rounded">
                  {(activeConsoleTab === 'manager' && (isUserCommand || isManagerMessage || isRconDiag)) ? null : (
                    <span className="text-cyan-400/50 mr-2 select-none text-xs">{index + 1}</span>
                  )}
                  <span className={entryClass}>{entry || ''}</span>
                </div>
              );
            })
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-gray-500 mb-2">
                  {activeConsoleTab === 'server' 
                    ? '📄 Waiting for server logs...' 
                    : '💬 Manager logs and RCON responses will appear here.'
                  }
                </div>
                {activeConsoleTab === 'server' && !isServerRunning && (
                  <div className="text-gray-600 text-sm">
                    Start the server to see live logs from ShooterGame.log
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {!isRconEnabled && (
            <div className="p-3 bg-yellow-900/50 border border-yellow-700 rounded-md text-yellow-300 text-sm flex items-center space-x-2">
                <AlertTriangleIcon className="w-5 h-5 flex-shrink-0" />
                <p>
                    RCON is not enabled for this profile. To send commands, please enable it in the 
                    <strong className="font-semibold"> Server Configuration </strong> 
                    tab, save your settings, and restart the server.
                </p>
            </div>
        )}

        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder={canSendCommand ? 'Enter RCON command...' : (isServerRunning ? 'RCON is not enabled' : 'Server is not running')}
            disabled={!canSendCommand}
            className="flex-grow bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition disabled:bg-gray-700 disabled:cursor-not-allowed disabled:placeholder:text-gray-500"
            aria-label="RCON Command Input"
          />
          <button
            type="submit"
            disabled={!canSendCommand}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-md transition-colors duration-200 shadow-md"
          >
            Send
          </button>
        </form>
      </Card>
    </div>
  );
};

export default Console;
