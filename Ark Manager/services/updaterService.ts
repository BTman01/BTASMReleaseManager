
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { confirm, message } from '@tauri-apps/plugin-dialog';

export async function checkForAppUpdates(silent = false) {
    try {
        const update = await check();
        if (update?.available) {
            const yes = await confirm(
                `Version ${update.version} is available.\n\nRelease Notes:\n${update.body}`,
                { title: 'App Update Available', kind: 'info' }
            );
            if (yes) {
                await update.downloadAndInstall();
                await relaunch();
            }
        } else if (!silent) {
            await message('You are on the latest version.', { title: 'No Updates' });
        }
    } catch (error) {
        console.error('Failed to check for updates:', error);
        if (!silent) {
            await message(`Failed to check for updates: ${String(error)}`, { title: 'Update Check Failed', kind: 'error' });
        }
    }
}
