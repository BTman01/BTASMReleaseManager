import { ServerProfile, AnalyticsDataPoint } from '../types';
// FIX: Revert to namespace import to fix runtime error.
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
            const request = indexedDB.open(DB_NAME, 3); // Upgrade version to 3
            request.onerror = () => reject("Error opening IndexedDB.");
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
                
                // Add Analytics Store
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

export async function saveProfiles(profiles: ServerProfile[]): Promise<void> {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(profiles, KEY);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

export async function getProfiles(): Promise<ServerProfile[]> {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(KEY);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

export async function verifyInstallation(installPath: string | null): Promise<boolean> {
    if (!installPath) {
        return false;
    }
    try {
        // Try new Steam structure first
        let serverExePath = await join(installPath, 'steamcmd', 'steamapps', 'common', 'ARK Survival Ascended Dedicated Server', 'ShooterGame', 'Binaries', 'Win64', 'ArkAscendedServer.exe');
        let exists = await fs.exists(serverExePath);
        
        if (!exists) {
            // Fall back to old structure
            serverExePath = await join(installPath, 'ShooterGame', 'Binaries', 'Win64', 'ArkAscendedServer.exe');
            exists = await fs.exists(serverExePath);
        }
        
        return exists;
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

        // Pruning logic: Delete entries older than 7 days for this profile
        // This is a simple cleanup to prevent infinite DB growth
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const index = store.index('timestamp');
        const range = IDBKeyRange.upperBound(oneWeekAgo);
        // Note: deleting via range on index isn't directly supported in standard IDB without opening a cursor.
        // A simpler approach for low volume is checking count or just skipping aggressive pruning for now.
        // Let's iterate with a cursor for cleanup (lazy approach)
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
        
        // Get all for profile, filter by time in memory (simpler than composite index)
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
        
        // We have to iterate and delete because index.delete() is not standard for deleting multiple rows based on index key
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