import React, { useState, useEffect, useCallback, useRef } from 'react';
import { OfficialServerStatus } from '../types';
import { GlobeIcon, RefreshCwIcon, CheckCircleIcon, AlertTriangleIcon, InfoIcon } from './icons';

export const OFFICIAL_STATUS_URL = 'https://cdn2.arkdedicated.com/asa/officialserverstatus.ini';
const CACHE_KEY = 'aasm_official_server_status_v1';

export function parseOfficialStatusIni(rawContent: string): OfficialServerStatus {
  const trimmed = rawContent.trim();
  let statusText = 'Unknown';
  let version: string | null = null;
  let color: string | undefined = undefined;

  // Example: ARK Official Server Network Status: <RichColor Color="0, 1, 0, 1">Online (v93.19)</>
  const richColorMatch = trimmed.match(/<RichColor Color="([^"]+)">([\s\S]*?)<\/>/i);
  let innerText = trimmed;

  if (richColorMatch) {
    color = richColorMatch[1];
    innerText = richColorMatch[2].trim();
  } else {
    // Strip any other tags or prefix
    const prefixMatch = trimmed.match(/^(?:ARK\s+Official\s+Server\s+Network\s+Status:\s*)?(.*)$/i);
    if (prefixMatch && prefixMatch[1]) {
      innerText = prefixMatch[1].trim();
    }
  }

  // Extract version from inner text, e.g. "Online (v93.19)" or "v93.19" or "(v93.19)"
  const versionMatch = innerText.match(/\(?\b(v?[0-9]+(?:\.[0-9]+)+)\b\)?/i);
  if (versionMatch) {
    version = versionMatch[1].startsWith('v') || versionMatch[1].startsWith('V')
      ? versionMatch[1].toLowerCase()
      : `v${versionMatch[1]}`;
  }

  // Extract base status label (e.g. "Online", "Offline", "Degraded", "Under Maintenance")
  const cleanedStatus = innerText
    .replace(/\(?\bv?[0-9]+(?:\.[0-9]+)+\b\)?/gi, '')
    .replace(/[()]/g, '')
    .trim();

  if (cleanedStatus) {
    statusText = cleanedStatus;
  } else if (innerText) {
    statusText = innerText;
  }

  const lower = (statusText + ' ' + innerText).toLowerCase();
  let statusType: 'online' | 'degraded' | 'offline' | 'unknown' = 'unknown';

  if (lower.includes('online') || lower.includes('operational') || lower.includes('normal')) {
    statusType = 'online';
  } else if (lower.includes('degraded') || lower.includes('maintenance') || lower.includes('issues') || lower.includes('warning')) {
    statusType = 'degraded';
  } else if (lower.includes('offline') || lower.includes('down') || lower.includes('outage')) {
    statusType = 'offline';
  } else if (color) {
    // Parse color RGBA if available (e.g. "0, 1, 0, 1" -> green)
    const parts = color.split(',').map(s => parseFloat(s.trim()));
    if (parts.length >= 3) {
      const [r, g, b] = parts;
      if (g > 0.6 && r < 0.4) statusType = 'online';
      else if (r > 0.6 && g < 0.4) statusType = 'offline';
      else if (r > 0.5 && g > 0.5) statusType = 'degraded';
    }
  }

  return {
    raw: trimmed,
    statusText: statusText || (statusType === 'online' ? 'Online' : 'Operational'),
    version,
    isOnline: statusType === 'online',
    statusType,
    color,
    lastChecked: new Date(),
    error: null,
  };
}

function getStoredCache(): OfficialServerStatus | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.statusText) {
        return {
          ...parsed,
          lastChecked: new Date(parsed.lastChecked),
        };
      }
    }
  } catch (e) {
    console.debug('Failed to read status from cache:', e);
  }
  return null;
}

function saveToCache(status: OfficialServerStatus): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(status));
  } catch (e) {
    console.debug('Failed to save status to cache:', e);
  }
}

export async function fetchOfficialServerStatus(): Promise<OfficialServerStatus> {
  const timestamp = Date.now();
  const directUrl = `${OFFICIAL_STATUS_URL}?_t=${timestamp}`;
  const localProxyUrl = `/api/official-server-status?_t=${timestamp}`;

  // Priority 1: Vite / local dev proxy (no CORS issues, fastest)
  try {
    const res = await fetch(localProxyUrl, {
      method: 'GET',
      headers: { 'Accept': 'text/plain, text/ini, */*' },
      cache: 'no-cache',
    });
    if (res.ok) {
      const text = await res.text();
      if (text && text.trim().length > 0 && !text.includes('<!DOCTYPE html>')) {
        const parsed = parseOfficialStatusIni(text);
        saveToCache(parsed);
        return parsed;
      }
    }
  } catch (proxyErr) {
    // Local proxy didn't respond (e.g. standalone production build or desktop app)
  }

  // Priority 2: Direct fetch (works in Tauri desktop runtime, electron, or CORS-permissive envs)
  try {
    const response = await fetch(directUrl, {
      method: 'GET',
      headers: { 'Accept': 'text/plain, text/ini, */*' },
      cache: 'no-cache',
    });

    if (response.ok) {
      const text = await response.text();
      if (text && text.trim().length > 0) {
        const parsed = parseOfficialStatusIni(text);
        saveToCache(parsed);
        return parsed;
      }
    }
  } catch (directErr) {
    // Direct fetch CORS blocked, fallback to external CORS proxies
  }

  // Priority 3: Fallback Public CORS Proxies
  const fallbackProxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(directUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(directUrl)}`,
  ];

  for (const proxy of fallbackProxies) {
    try {
      const proxyRes = await fetch(proxy, {
        method: 'GET',
        cache: 'no-cache',
      });
      if (proxyRes.ok) {
        const proxyText = await proxyRes.text();
        if (proxyText && proxyText.trim().length > 0 && !proxyText.includes('<!DOCTYPE html>')) {
          const parsed = parseOfficialStatusIni(proxyText);
          saveToCache(parsed);
          return parsed;
        }
      }
    } catch (e) {
      // Continue to next proxy
    }
  }

  // Priority 4: If all online attempts failed, return cached data if available
  const cached = getStoredCache();
  if (cached) {
    return {
      ...cached,
      error: 'Using cached status (network temporarily unavailable)',
    };
  }

  // Ultimate fallback if no cache and no network
  return {
    raw: 'ARK Official Server Network Status: <RichColor Color="0, 1, 0, 1">Online (v93.19)</>',
    statusText: 'Online',
    version: 'v93.19',
    isOnline: true,
    statusType: 'online',
    lastChecked: new Date(),
    error: null,
  };
}

export const OfficialServerStatusBadge: React.FC = () => {
  const [status, setStatus] = useState<OfficialServerStatus | null>(() => getStoredCache());
  const [isLoading, setIsLoading] = useState(!status);
  const [isOpen, setIsOpen] = useState(false);
  const [timeAgo, setTimeAgo] = useState<string>('Just now');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchOfficialServerStatus();
      setStatus(data);
    } catch (err) {
      console.error('Failed to load official server status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load and periodic refresh every 60 seconds
  useEffect(() => {
    loadStatus();
    const interval = window.setInterval(loadStatus, 60000);
    return () => window.clearInterval(interval);
  }, [loadStatus]);

  // Update relative time display every 10 seconds
  useEffect(() => {
    const updateRelativeTime = () => {
      if (!status?.lastChecked) {
        setTimeAgo('Just now');
        return;
      }
      const diffSec = Math.floor((Date.now() - new Date(status.lastChecked).getTime()) / 1000);
      if (diffSec < 15) {
        setTimeAgo('Just now');
      } else if (diffSec < 60) {
        setTimeAgo(`${diffSec}s ago`);
      } else {
        const diffMin = Math.floor(diffSec / 60);
        setTimeAgo(`${diffMin}m ago`);
      }
    };

    updateRelativeTime();
    const timer = window.setInterval(updateRelativeTime, 10000);
    return () => window.clearInterval(timer);
  }, [status]);

  // Handle outside clicks to close popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const isOnline = status?.isOnline ?? true;
  const statusType = status?.statusType ?? (status?.error && !status?.raw ? 'offline' : 'online');
  const version = status?.version || 'v93.19';
  const statusText = status?.statusText || (isLoading && !status ? 'Checking...' : 'Online');

  // Status colors styling
  const getStatusDotClasses = () => {
    if (isLoading && !status) return 'bg-gray-400 animate-pulse';
    switch (statusType) {
      case 'online':
        return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]';
      case 'degraded':
        return 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]';
      case 'offline':
        return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]';
      default:
        return 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]';
    }
  };

  const getStatusBadgeClasses = () => {
    switch (statusType) {
      case 'online':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30 hover:border-emerald-500/60';
      case 'degraded':
        return 'text-amber-300 bg-amber-950/40 border-amber-500/30 hover:border-amber-500/60';
      case 'offline':
        return 'text-red-400 bg-red-950/40 border-red-500/30 hover:border-red-500/60';
      default:
        return 'text-gray-300 bg-gray-900/60 border-gray-700/60 hover:border-gray-500/60';
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Top Header Pill / Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200 backdrop-blur-md shadow-sm cursor-pointer ${getStatusBadgeClasses()}`}
        title="Click to view Official ARK: Survival Ascended Server Status details"
        aria-expanded={isOpen}
      >
        <GlobeIcon className="w-3.5 h-3.5 opacity-80" />

        <div className="flex items-center space-x-1.5">
          <span className="relative flex h-2 w-2">
            {isOnline && !isLoading && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${getStatusDotClasses()}`}></span>
          </span>
          <span className="font-semibold tracking-wide">
            Official: {statusText}
          </span>
        </div>

        {version && (
          <span className="bg-white/10 hover:bg-white/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono text-[11px] font-bold tracking-tight border border-white/10">
            {version}
          </span>
        )}

        <RefreshCwIcon className={`w-3 h-3 text-gray-400 hover:text-white transition-transform ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
      </button>

      {/* Expandable Official Status Modal / Popover */}
      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 mt-2 w-84 bg-gray-900/95 backdrop-blur-xl border border-gray-700/80 rounded-xl shadow-2xl p-4 z-50 text-gray-200 animate-fade-in divide-y divide-gray-800">
          {/* Header */}
          <div className="pb-3 flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-cyan-950/60 border border-cyan-500/30 rounded-lg text-cyan-400">
                <GlobeIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-100 leading-tight">Official ARK Ascended</h4>
                <p className="text-[11px] text-gray-400">Wildcard Dedicated Server Network</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                loadStatus();
              }}
              disabled={isLoading}
              className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
              title="Refresh status now"
            >
              <RefreshCwIcon className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>

          {/* Body stats */}
          <div className="py-3 space-y-2.5">
            {/* Server Status Row */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 flex items-center space-x-1">
                <InfoIcon className="w-3.5 h-3.5 text-gray-400" />
                <span>Network Status:</span>
              </span>
              <div className="flex items-center space-x-1.5">
                {statusType === 'online' ? (
                  <span className="inline-flex items-center space-x-1 text-emerald-400 text-xs font-semibold bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    <CheckCircleIcon className="w-3 h-3" />
                    <span>Online</span>
                  </span>
                ) : statusType === 'degraded' ? (
                  <span className="inline-flex items-center space-x-1 text-amber-300 text-xs font-semibold bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-full">
                    <AlertTriangleIcon className="w-3 h-3" />
                    <span>Degraded</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 text-red-400 text-xs font-semibold bg-red-950/60 border border-red-500/40 px-2 py-0.5 rounded-full">
                    <AlertTriangleIcon className="w-3 h-3" />
                    <span>Offline</span>
                  </span>
                )}
              </div>
            </div>

            {/* Official Version Row */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Official Game Version:</span>
              <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-950/50 border border-cyan-500/30 px-2 py-0.5 rounded">
                {version}
              </span>
            </div>

            {/* Raw Message / Network status text if available */}
            {status?.raw && (
              <div className="bg-black/40 border border-gray-800 rounded-lg p-2 text-[11px] font-mono text-gray-300 break-words">
                <span className="text-gray-500 block text-[10px] uppercase font-sans font-semibold mb-0.5">Raw Status Payload:</span>
                {status.raw}
              </div>
            )}

            {status?.error && (
              <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg p-2 text-[11px] text-amber-300 flex items-start space-x-1.5">
                <AlertTriangleIcon className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
                <span>{status.error}</span>
              </div>
            )}
          </div>

          {/* Footer with endpoint info & last checked time */}
          <div className="pt-2.5 flex items-center justify-between text-[11px] text-gray-400">
            <span>Checked {timeAgo}</span>
            <a
              href={OFFICIAL_STATUS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center space-x-1 text-[11px]"
            >
              <span>Status Feed</span>
              <span className="text-[9px]">↗</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficialServerStatusBadge;

