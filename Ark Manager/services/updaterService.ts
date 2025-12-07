import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { confirm, message } from '@tauri-apps/plugin-dialog';

/**
 * Checks for updates and returns the Update object if available, null otherwise.
 * Does not show any UI.
 */
export async function checkUpdateAvailable(): Promise<Update | null> {
    try {
        const update = await check();
        if (update?.available) {
            return update;
        }
    } catch (error) {
        console.error('Failed to check for updates:', error);
    }
    return null;
}

/**
 * Installs the update and relaunches the app.
 * This function does NOT show a confirmation dialog; it assumes the user has already confirmed via custom UI.
 */
export async function installUpdate(update: Update) {
    try {
        await update.downloadAndInstall();
        await relaunch();
    } catch (err) {
        // Re-throw to let the UI handle the error display
        throw new Error(`Failed to install update: ${String(err)}`);
    }
}

/**
 * Legacy prompt function (kept for reference or fallback)
 */
export async function promptAndInstallUpdate(update: Update) {
    try {
        const yes = await confirm(
            `Version ${update.version} is available.\n\nRelease Notes:\n${update.body}`,
            { title: 'App Update Available', kind: 'info' }
        );
        if (yes) {
            await installUpdate(update);
        }
    } catch (error) {
        console.error('Error during update installation flow:', error);
        await message(`Update Error: ${String(error)}`, { title: 'Error', kind: 'error' });
    }
}
