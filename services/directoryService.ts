
import { ServerProfile } from '../types';
// FIX: Revert to namespace import to fix runtime error.
import * as fs from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';

const DB_NAME = 'ArkServerManagerDB';
const STORE_NAME = 'ServerProfilesStore';
const KEY = 'serverProfiles';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 2); 
            request.onerror = () => reject("Error opening IndexedDB.");
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
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
        const steamCmdExists = await fs.exists(await join(installPath, 'steamcmd'));
        const arkServerExists = await fs.exists(await join(installPath, 'ShooterGame'));
        
        return steamCmdExists && arkServerExists;
    } catch (error) {
        console.error("Verification failed:", error);
        return false;
    }
}