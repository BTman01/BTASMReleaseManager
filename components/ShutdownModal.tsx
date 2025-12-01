import React, { useState, useEffect } from 'react';
import { ClockIcon, RestartIcon, StopIcon } from './icons';

interface TimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (minutes: number, message: string) => void;
  type: 'shutdown' | 'restart';
}

const TimerModal: React.FC<TimerModalProps> = ({ isOpen, onClose, onConfirm, type }) => {
  const [minutes, setMinutes] = useState(5);
  const [message, setMessage] = useState('');

  // Reset inputs when opening
  useEffect(() => {
    if (isOpen) {
        setMinutes(5);
        setMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(minutes, message);
    onClose();
  };

  const isRestart = type === 'restart';
  const actionLabel = isRestart ? 'Restart' : 'Shutdown';
  const colorClass = isRestart ? 'text-yellow-400' : 'text-red-500';
  const btnBgClass = isRestart ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-red-600 hover:bg-red-500';
  const focusRingClass = isRestart ? 'focus:ring-yellow-500' : 'focus:ring-red-500';
  const Icon = isRestart ? RestartIcon : StopIcon;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className={`w-full max-w-md p-6 bg-gray-800 rounded-lg shadow-2xl border ${isRestart ? 'border-yellow-700/50' : 'border-red-700/50'}`}>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
          <ClockIcon className={`w-6 h-6 mr-2 ${colorClass}`} />
          Timed {actionLabel}
        </h2>
        <p className="text-gray-300 mb-6 text-sm">
          The server will broadcast chat warnings to all players leading up to the {actionLabel.toLowerCase()}. 
          <br /><br />
          <span className="text-yellow-400 text-xs">Note: RCON must be enabled and working for announcements.</span>
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="minutes" className="block text-sm font-medium text-gray-400 mb-2">
              {actionLabel} in (minutes):
            </label>
            <div className="flex items-center space-x-4">
                <input
                    type="number"
                    id="minutes"
                    min="1"
                    max="60"
                    value={minutes}
                    onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                    className={`w-24 bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:ring-2 focus:border-transparent text-center text-lg font-mono ${focusRingClass}`}
                />
                <div className="flex space-x-2">
                    <button type="button" onClick={() => setMinutes(1)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300">1m</button>
                    <button type="button" onClick={() => setMinutes(5)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300">5m</button>
                    <button type="button" onClick={() => setMinutes(15)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300">15m</button>
                    <button type="button" onClick={() => setMinutes(30)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300">30m</button>
                </div>
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="message" className="block text-sm font-medium text-gray-400 mb-2">
              Reason (Optional):
            </label>
            <input
                type="text"
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g., Server Maintenance"
                className={`w-full bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:ring-2 focus:border-transparent ${focusRingClass}`}
            />
          </div>

          <div className="flex justify-end space-x-3">
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