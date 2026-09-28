
import React, { useState, useEffect } from 'react';
import { ClockIcon, RestartIcon, StopIcon } from './icons';

interface TimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (minutes: number, reason?: string, saveWorld?: boolean) => void;
  type: 'shutdown' | 'restart';
  defaultSaveWorld?: boolean;
}

const TimerModal: React.FC<TimerModalProps> = ({ isOpen, onClose, onConfirm, type, defaultSaveWorld = true }) => {
  const [minutes, setMinutes] = useState(5);
  const [reason, setReason] = useState('');
  const [saveWorld, setSaveWorld] = useState(defaultSaveWorld);

  // Reset inputs when opening
  useEffect(() => {
    if (isOpen) {
      setMinutes(5);
      setReason('');
      setSaveWorld(defaultSaveWorld);
    }
  }, [isOpen, defaultSaveWorld]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(minutes, reason.trim() || undefined, saveWorld);
    onClose();
  };

  const isRestart = type === 'restart';
  const actionLabel = isRestart ? 'Restart' : 'Shutdown';
  const colorClass = isRestart ? 'text-yellow-400' : 'text-red-500';
  const btnBgClass = isRestart ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-red-600 hover:bg-red-500';
  const Icon = isRestart ? RestartIcon : StopIcon;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className={`w-full max-w-md p-6 bg-gray-800 rounded-lg shadow-2xl border ${isRestart ? 'border-yellow-700/50' : 'border-red-700/50'}`}>
        <h2 className="text-xl font-bold text-white mb-2 flex items-center">
          <ClockIcon className={`w-6 h-6 mr-2 ${colorClass}`} />
          Timed {actionLabel}
        </h2>
        <p className="text-gray-300 mb-5 text-sm">
          The server will broadcast chat warnings to all players leading up to the {actionLabel.toLowerCase()}. 
          <br />
          <span className="text-yellow-400 text-xs">Note: RCON must be enabled and working for announcements.</span>
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="minutes" className="block text-sm font-medium text-gray-300 mb-1.5">
              {actionLabel} in (minutes):
            </label>
            <div className="flex items-center space-x-3">
                <input
                    type="number"
                    id="minutes"
                    min="1"
                    max="60"
                    value={minutes}
                    onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                    className={`w-24 bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:ring-2 focus:border-transparent text-center text-lg font-mono ${isRestart ? 'focus:ring-yellow-500' : 'focus:ring-red-500'}`}
                />
                <div className="flex space-x-1.5">
                    <button type="button" onClick={() => setMinutes(1)} className="px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors">1m</button>
                    <button type="button" onClick={() => setMinutes(5)} className="px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors">5m</button>
                    <button type="button" onClick={() => setMinutes(15)} className="px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors">15m</button>
                    <button type="button" onClick={() => setMinutes(30)} className="px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors">30m</button>
                </div>
            </div>
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center justify-between">
              <span>Reason / Broadcast Message</span>
              <span className="text-gray-500 font-normal text-xs">Optional</span>
            </label>
            <input
              type="text"
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Maintenance, Mod Updates, Server Lag Fix"
              maxLength={120}
              className={`w-full bg-gray-900/60 border border-gray-600 rounded-md px-3 py-2 text-gray-100 placeholder-gray-500 focus:ring-2 focus:border-transparent text-sm ${isRestart ? 'focus:ring-yellow-500' : 'focus:ring-red-500'}`}
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['Maintenance', 'Applying Updates', 'Daily Reboot', 'Fixing Lag'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                    reason === preset
                      ? (isRestart ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50 font-medium' : 'bg-red-500/20 text-red-300 border-red-500/50 font-medium')
                      : 'bg-gray-900/60 text-gray-400 border-gray-700 hover:text-gray-200 hover:border-gray-600'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            {reason.trim() && (
              <div className="mt-2.5 p-2 bg-gray-900/50 rounded border border-gray-700/60 text-xs">
                <span className="text-gray-400 block mb-0.5">Broadcast preview:</span>
                <span className="font-mono text-cyan-300">
                  ServerChat Server {actionLabel.toLowerCase()}ing in {minutes} minute{minutes === 1 ? '' : 's'}. Reason: {reason.trim()}
                </span>
              </div>
            )}
          </div>

          <div className="pt-1 pb-1">
            <label className="flex items-center space-x-2.5 text-sm text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveWorld}
                onChange={(e) => setSaveWorld(e.target.checked)}
                className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
              />
              <span className="font-medium">Save world before {actionLabel.toLowerCase()} (SaveWorld)</span>
            </label>
            <p className="text-xs text-gray-400 ml-6 mt-0.5">
              Flushes world progress, player inventories, and tamed dinos to disk right before stopping.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-white text-sm font-bold rounded-md shadow-lg transition-colors ${btnBgClass}`}
            >
              Start {actionLabel} Timer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TimerModal;
