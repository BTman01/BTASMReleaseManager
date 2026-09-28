
import { ServerProfile, AnalyticsDataPoint } from '../types';
import * as fs from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';

const DB_NAME = 'ArkServerManagerDB';
const STORE_NAME = 'ServerProfilesStore';
const ANALYTICS_STORE_NAME = 'AnalyticsStore';
const KEY = 'serverProfiles';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 3);
            request.onerror = () => reject("Error opening IndexedDB.");
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
                if (!db.objectStoreNames.contains(ANALYTICS_STORE_NAME)) {
                    const analyticsStore = db.createObjectStore(ANALYTICS_STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    analyticsStore.createIndex('profileId', 'profileId', { unique: false });
                    analyticsStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }
    return dbPromise;
}

const BACKUP_STORAGE_KEY = 'ArkServerProfiles_backup';

export async function saveProfiles(profiles: ServerProfile[]): Promise<void> {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(profiles));
        }
    } catch (e) {
        console.warn('Could not mirror profiles to localStorage:', e);
    }

    try {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(profiles, KEY);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    } catch (dbErr) {
        console.error('Failed to write profiles to IndexedDB:', dbErr);
    }
}

export async function getProfiles(): Promise<ServerProfile[]> {
    let profiles: ServerProfile[] = [];
    try {
        const db = await getDb();
        profiles = await new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(KEY);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    } catch (dbErr) {
        console.warn("Could not read profiles from IndexedDB, trying localStorage fallback:", dbErr);
    }

    if (!profiles || profiles.length === 0) {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const raw = window.localStorage.getItem(BACKUP_STORAGE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        profiles = parsed;
                        // Restore back to IndexedDB asynchronously
                        saveProfiles(profiles).catch(err => console.warn('Background restore to IndexedDB failed:', err));
                    }
                }
            }
        } catch (storageErr) {
            console.warn("Could not read profiles from localStorage backup:", storageErr);
        }
    } else {
        // Keep localStorage in sync
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(profiles));
            }
        } catch {
            // Ignore
        }
    }

    return profiles;
}

export function getRootInstallPath(path: string | null | undefined): string {
    if (!path) return '';
    const trimmed = path.trim().replace(/[/\\]+$/, '');
    // If the path ends with /server or \server (case insensitive), strip it
    // because the Tauri backend internally appends .join("server")
    if (/[/\\]server$/i.test(trimmed)) {
        return trimmed.replace(/[/\\]server$/i, '');
    }
    return trimmed;
}

export async function verifyInstallation(installPath: string | null): Promise<boolean> {
    if (!installPath) return false;
    try {
        const root = getRootInstallPath(installPath);
        const candidateExes = [
            await join(root, 'server', 'ShooterGame', 'Binaries', 'Win64', 'ArkAscendedServer.exe'),
            await join(installPath, 'ShooterGame', 'Binaries', 'Win64', 'ArkAscendedServer.exe'),
            await join(installPath, 'server', 'ShooterGame', 'Binaries', 'Win64', 'ArkAscendedServer.exe'),
        ];
        for (const exe of candidateExes) {
            try {
                if (await fs.exists(exe)) return true;
            } catch {
                // continue
            }
        }
        return false;
    } catch (error) {
        console.error("Verification failed:", error);
        return false;
    }
}

export async function saveAnalyticsData(data: AnalyticsDataPoint): Promise<void> {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(ANALYTICS_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(ANALYTICS_STORE_NAME);
        store.add(data);
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const index = store.index('timestamp');
        const range = IDBKeyRange.upperBound(oneWeekAgo);
        const request = index.openCursor(range);
        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

export async function getAnalyticsData(profileId: string, sinceTimestamp: number): Promise<AnalyticsDataPoint[]> {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(ANALYTICS_STORE_NAME, 'readonly');
        const store = transaction.objectStore(ANALYTICS_STORE_NAME);
        const index = store.index('profileId');
        const request = index.getAll(profileId);
        request.onsuccess = () => {
            const allData = request.result as AnalyticsDataPoint[];
            const filtered = allData
                .filter(d => d.timestamp >= sinceTimestamp)
                .sort((a, b) => a.timestamp - b.timestamp);
            resolve(filtered);
        };
        request.onerror = () => reject(request.error);
    });
}

export async function clearAnalyticsData(profileId: string): Promise<void> {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(ANALYTICS_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(ANALYTICS_STORE_NAME);
        const index = store.index('profileId');
        const request = index.openKeyCursor(IDBKeyRange.only(profileId));
        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result as IDBCursor;
            if (cursor) {
                store.delete(cursor.primaryKey);
                cursor.continue();
            }
        };
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}
