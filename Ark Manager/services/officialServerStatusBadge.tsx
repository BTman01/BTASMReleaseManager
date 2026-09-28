import { OfficialServerStatus } from '../types';

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
    // Local proxy didn't respond
  }

  // Priority 2: Direct fetch
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
    // Direct fetch blocked
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
      // Continue
    }
  }

  // Priority 4: Stored cache fallback
  const cached = getStoredCache();
  if (cached) {
    return {
      ...cached,
      error: 'Using cached status (network temporarily unavailable)',
    };
  }

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

