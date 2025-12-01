// This file provides type declarations for Tauri plugins that are loaded via an import map,
// which makes them available at runtime but unknown to TypeScript during development.

declare module '@tauri-apps/plugin-autostart' {
  /**
   * Enables autostart for the application.
   */
  export function enable(): Promise<void>;

  /**
   * Disables autostart for the application.
   */
  export function disable(): Promise<void>;

  /**
   * Checks if autostart is enabled for the application.
   * @returns A promise that resolves to `true` if autostart is enabled, `false` otherwise.
   */
  export function isEnabled(): Promise<boolean>;
}

declare module '@tauri-apps/plugin-notification' {
  /**
   * Checks if the permission to send notifications is granted.
   */
  export function isPermissionGranted(): Promise<boolean>;

  /**
   * Requests permission to send notifications.
   * @returns A promise that resolves to 'granted', 'denied', or 'default'.
   */
  export function requestPermission(): Promise<'granted' | 'denied' | 'default'>;

  /**
   * Sends a notification.
   * @param options The notification options.
   */
  export function sendNotification(options: { title: string; body?: string; icon?: string }): void;
}
