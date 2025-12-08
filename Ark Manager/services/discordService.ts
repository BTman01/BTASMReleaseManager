
import { ServerProfile } from '../types';

export const DiscordColors = {
    GREEN: 5763719,
    RED: 15548997,
    YELLOW: 16776960,
    BLUE: 5814783,
};

export async function sendDiscordNotification(
    profile: ServerProfile, 
    title: string, 
    description: string, 
    color: number = DiscordColors.BLUE
): Promise<void> {
    const { discordWebhookUrl, discordNotificationsEnabled } = profile.config;

    if (!discordNotificationsEnabled || !discordWebhookUrl) {
        return;
    }

    const payload = {
        embeds: [
            {
                title: title,
                description: description,
                color: color,
                footer: {
                    text: `Server: ${profile.profileName} | Map: ${profile.config.map}`
                },
                timestamp: new Date().toISOString()
            }
        ]
    };

    try {
        await fetch(discordWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error('Failed to send Discord notification:', error);
    }
}
