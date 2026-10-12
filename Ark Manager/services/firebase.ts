import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  User as FirebaseUser,
  updateProfile as fbUpdateProfile,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocFromServer,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
} from 'firebase/firestore';
const DEFAULT_FIREBASE_CONFIG = {
  projectId: "protean-unity-447015-a9",
  appId: "1:455022453436:web:29a942ae271fd64e8e26b9",
  apiKey: "AIzaSyDJmgKEHbx3014CGU-v22rtF_GzfJEVvjA",
  authDomain: "protean-unity-447015-a9.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-btsasaservermana-1f7d2b4d-27ed-420e-86cd-a70cdd74f382",
  storageBucket: "protean-unity-447015-a9.firebasestorage.app",
  messagingSenderId: "455022453436",
  measurementId: "",
  oAuthClientId: "455022453436-nmachn6qt1rj97u3kfb2l0isi5tkdg3o.apps.googleusercontent.com",
  recaptchaSiteKey: "",
};

// Initialize Firebase App
const app = !getApps().length ? initializeApp(DEFAULT_FIREBASE_CONFIG) : getApp();

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Cloud Firestore with custom database ID
export const db = getFirestore(app, DEFAULT_FIREBASE_CONFIG.firestoreDatabaseId);

// Test connection on boot per Firebase skill guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Connection verified successfully.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Client is offline. Please check your network/Firebase setup.');
    }
  }
}
testConnection();

export { onAuthStateChanged };
export type { FirebaseUser };

// User Profile Interface
export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  createdAt: string;
  role: 'admin' | 'moderator' | 'viewer';
}

// Storage key for remember-me toggle preference
const REMEMBER_ME_STORAGE_KEY = 'bt_asm_remember_me';

export function getStoredRememberMe(): boolean {
  try {
    return localStorage.getItem(REMEMBER_ME_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setStoredRememberMe(remember: boolean): void {
  try {
    localStorage.setItem(REMEMBER_ME_STORAGE_KEY, remember ? 'true' : 'false');
  } catch (e) {
    console.error('Failed to store remember me preference:', e);
  }
}

/**
 * Configure Firebase persistence based on "Remember Me"
 */
export async function configurePersistence(rememberMe: boolean): Promise<void> {
  setStoredRememberMe(rememberMe);
  try {
    await setPersistence(
      auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );
  } catch (err) {
    console.warn('[Firebase] Could not set persistence mode:', err);
  }
}

/**
 * Ensure user document exists in Firestore
 */
export async function syncUserProfile(user: FirebaseUser): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }

    const newProfile: UserProfile = {
      id: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Server Admin',
      createdAt: new Date().toISOString(),
      role: 'admin',
    };

    await setDoc(userRef, newProfile);
    return newProfile;
  } catch (error) {
    console.error('[Firebase] Failed to sync user profile:', error);
    return {
      id: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Admin',
      createdAt: new Date().toISOString(),
      role: 'admin',
    };
  }
}

/**
 * Sign In with Email and Password
 */
export async function loginWithEmail(
  email: string,
  pass: string,
  rememberMe: boolean = true
): Promise<FirebaseUser> {
  await configurePersistence(rememberMe);
  const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
  await syncUserProfile(credential.user);
  return credential.user;
}

/**
 * Create Account with Email and Password
 */
export async function registerWithEmail(
  email: string,
  pass: string,
  displayName?: string,
  rememberMe: boolean = true
): Promise<FirebaseUser> {
  await configurePersistence(rememberMe);
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (displayName && displayName.trim()) {
    try {
      await fbUpdateProfile(credential.user, { displayName: displayName.trim() });
    } catch (e) {
      console.warn('Failed to set displayName on Auth user:', e);
    }
  }
  await syncUserProfile(credential.user);
  return credential.user;
}

/**
 * Sign in with Google OAuth popup
 */
export async function loginWithGoogle(rememberMe: boolean = true): Promise<FirebaseUser> {
  await configurePersistence(rememberMe);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const credential = await signInWithPopup(auth, provider);
  await syncUserProfile(credential.user);
  return credential.user;
}

/**
 * Send password reset email
 */
export async function requestPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Sign Out
 */
export async function logoutUser(): Promise<void> {
  await fbSignOut(auth);
}

/**
 * Friendly Firebase Error Parser
 */
export function parseFirebaseError(error: any): string {
  const code = error?.code || '';
  const message = error?.message || '';

  if (code === 'resource-exhausted' || message.includes('quota')) {
    return 'Firestore quota exceeded for today. Remote/Mobile sync is paused until reset (Midnight PT).';
  }

  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Please try again later.';
    default:
      return message || 'An unexpected database error occurred.';
  }
}

// Simple in-memory cache to prevent redundant writes within the same session
const telemetryFingerprints: Record<string, string> = {};

/**
 * Telemetry Sync for Remote / Mobile Bridge
 * Syncs the current desktop host server status to Firestore under /users/{userId}/serverInstances/{profileId}
 */
export async function syncServerTelemetry(
  userId: string,
  instanceId: string,
  telemetry: {
    serverName: string;
    status: 'Running' | 'Stopped' | 'Starting' | 'Stopping' | 'Restarting' | 'Updating' | 'Error';
    playerCount?: number;
    maxPlayers?: number;
    map?: string;
    ip?: string;
    nextScheduledRestart?: string | null;
    scheduledRestartEnabled?: boolean;
    scheduledRestartTime?: string;
    lastBackupTime?: string;
    currentBuildId?: string;
    latestBuildId?: string;
    updateAvailable?: boolean;
    onlinePlayers?: Array<{ name: string; steamId: string }>;
    recentChat?: string[];
  }
): Promise<void> {
  try {
    // 1. Generate a fingerprint of the data to avoid redundant writes
    // We exclude 'lastSeen' and 'updatedAt' from the fingerprint comparison
    const fingerprintPayload = JSON.stringify({
      serverName: telemetry.serverName,
      status: telemetry.status,
      playerCount: telemetry.playerCount,
      maxPlayers: telemetry.maxPlayers,
      map: telemetry.map,
      ip: telemetry.ip,
      nextScheduledRestart: telemetry.nextScheduledRestart,
      scheduledRestartEnabled: telemetry.scheduledRestartEnabled,
      scheduledRestartTime: telemetry.scheduledRestartTime,
      lastBackupTime: telemetry.lastBackupTime,
      currentBuildId: telemetry.currentBuildId,
      latestBuildId: telemetry.latestBuildId,
      updateAvailable: telemetry.updateAvailable,
      players: (telemetry.onlinePlayers || []).map(p => p.steamId).sort(),
      chatCount: (telemetry.recentChat || []).length,
    });

    const cacheKey = `${userId}_${instanceId}`;
    if (telemetryFingerprints[cacheKey] === fingerprintPayload) {
      // Data is identical to last sync, skip write to save Firestore quota
      return;
    }

    const instanceRef = doc(db, 'users', userId, 'serverInstances', instanceId);
    const payload: Record<string, any> = {
      id: instanceId,
      userId,
      serverName: telemetry.serverName,
      status: telemetry.status,
      playerCount: telemetry.playerCount ?? 0,
      maxPlayers: telemetry.maxPlayers ?? 70,
      map: telemetry.map || 'TheIsland_WP',
      ip: telemetry.ip || '',
      lastSeen: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (telemetry.nextScheduledRestart !== undefined) {
      payload.nextScheduledRestart = telemetry.nextScheduledRestart || '';
    }
    if (telemetry.scheduledRestartEnabled !== undefined) {
      payload.scheduledRestartEnabled = telemetry.scheduledRestartEnabled;
    }
    if (telemetry.scheduledRestartTime !== undefined) {
      payload.scheduledRestartTime = telemetry.scheduledRestartTime || '';
    }
    if (telemetry.lastBackupTime !== undefined) {
      payload.lastBackupTime = telemetry.lastBackupTime || '';
    }
    if (telemetry.currentBuildId !== undefined) {
      payload.currentBuildId = telemetry.currentBuildId || '';
    }
    if (telemetry.latestBuildId !== undefined) {
      payload.latestBuildId = telemetry.latestBuildId || '';
    }
    if (telemetry.updateAvailable !== undefined) {
      payload.updateAvailable = telemetry.updateAvailable;
    }
    if (telemetry.onlinePlayers !== undefined) {
      payload.onlinePlayers = telemetry.onlinePlayers;
    }
    if (telemetry.recentChat !== undefined) {
      payload.recentChat = telemetry.recentChat;
    }

    await setDoc(instanceRef, payload, { merge: true });
    
    // Update cache after successful write
    telemetryFingerprints[cacheKey] = fingerprintPayload;
  } catch (error) {
    // Non-blocking telemetry sync warning
    console.debug('[Telemetry] Sync to Firestore:', error);
  }
}

/**
 * Calculate the next scheduled restart time based on configuration and active countdown
 */
export function calculateNextScheduledRestart(
  enabled?: boolean,
  timeStr?: string,
  activeRestartEndTime?: number | null
): string | null {
  // If an active countdown restart is currently ticking down
  if (activeRestartEndTime && activeRestartEndTime > Date.now()) {
    return new Date(activeRestartEndTime).toISOString();
  }

  if (!enabled || !timeStr || !timeStr.includes(':')) return null;

  const [hoursStr, minutesStr] = timeStr.split(':');
  const targetHour = parseInt(hoursStr, 10);
  const targetMinute = parseInt(minutesStr, 10);

  if (isNaN(targetHour) || isNaN(targetMinute)) return null;

  const now = new Date();
  const next = new Date();
  next.setHours(targetHour, targetMinute, 0, 0);

  // If time has already passed today, advance to tomorrow
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  return next.toISOString();
}

// Phase 2: Remote Command Types
export type RemoteCommandAction =
  | 'START_SERVER'
  | 'STOP_SERVER'
  | 'RESTART_SERVER'
  | 'SAVE_WORLD'
  | 'BROADCAST_MESSAGE'
  | 'KICK_PLAYER'
  | 'CREATE_BACKUP'
  | 'UPDATE_SERVER'
  | 'SEND_RCON_COMMAND'
  | 'GET_CHAT';

export type RemoteCommandStatus = 'pending' | 'executing' | 'completed' | 'failed';

export interface RemoteCommand {
  id: string;
  userId: string;
  targetProfileId: string;
  action: RemoteCommandAction;
  payload?: string;
  status: RemoteCommandStatus;
  resultMessage?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Subscribe to Pending Commands (Desktop Host listener)
 * Listens for new commands submitted from mobile or remote web clients
 */
export function subscribeToPendingCommands(
  userId: string,
  onCommandReceived: (command: RemoteCommand) => void
): () => void {
  try {
    const commandsRef = collection(db, 'users', userId, 'commands');
    const q = query(commandsRef, where('status', '==', 'pending'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data() as RemoteCommand;
            // Prevent executing stale commands older than 5 minutes
            const createdTime = new Date(data.createdAt).getTime();
            const now = Date.now();
            if (!isNaN(createdTime) && now - createdTime > 5 * 60 * 1000) {
              console.warn('[Command Dispatch] Skipping stale command:', data.id);
              updateCommandStatus(userId, data.id, 'failed', 'Command expired (older than 5 minutes)');
              return;
            }
            onCommandReceived(data);
          }
        });
      },
      (error) => {
        console.warn('[Command Dispatch] onSnapshot error:', error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.warn('[Command Dispatch] Failed to setup command listener:', error);
    return () => {};
  }
}

/**
 * Update Command Status
 * Updates command execution progress and result message
 */
export async function updateCommandStatus(
  userId: string,
  commandId: string,
  status: RemoteCommandStatus,
  resultMessage?: string
): Promise<void> {
  try {
    const cmdRef = doc(db, 'users', userId, 'commands', commandId);
    const updates: Record<string, any> = {
      status,
      updatedAt: new Date().toISOString(),
    };
    if (resultMessage !== undefined) {
      updates.resultMessage = resultMessage;
    }
    await setDoc(cmdRef, updates, { merge: true });
  } catch (error) {
    console.warn(`[Command Dispatch] Failed to update command ${commandId}:`, error);
  }
}

/**
 * Dispatch Remote Command (Client / Simulator / Mobile action)
 * Creates a new remote command document in the user's queue
 */
export async function dispatchRemoteCommand(
  userId: string,
  targetProfileId: string,
  action: RemoteCommandAction,
  payload?: string
): Promise<string> {
  const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cmdRef = doc(db, 'users', userId, 'commands', commandId);
  const now = new Date().toISOString();

  const commandData: RemoteCommand = {
    id: commandId,
    userId,
    targetProfileId,
    action,
    payload: payload || '',
    status: 'pending',
    resultMessage: 'Command received by queue',
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(cmdRef, commandData);
  return commandId;
}

/**
 * Subscribe to Recent Commands (for viewing command log/history in UI)
 */
export function subscribeToRecentCommands(
  userId: string,
  callback: (commands: RemoteCommand[]) => void
): () => void {
  try {
    const commandsRef = collection(db, 'users', userId, 'commands');
    const q = query(commandsRef, orderBy('createdAt', 'desc'), limit(15));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const commands: RemoteCommand[] = [];
        snapshot.forEach((docSnap) => {
          commands.push(docSnap.data() as RemoteCommand);
        });
        callback(commands);
      },
      (error) => {
        console.warn('[Command History] onSnapshot error:', error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.warn('[Command History] Subscription error:', error);
    return () => {};
  }
}

