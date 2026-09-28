use serenity::all::{
    async_trait, Client, Context, CreateCommand, CreateEmbed, CreateEmbedFooter,
    CreateInteractionResponse, CreateInteractionResponseMessage, EditInteractionResponse,
    EventHandler, GatewayIntents, Interaction, Ready,
};
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Mutex;

#[derive(Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct ServerLiveStatus {
    pub server_name: String,
    pub status: String,
    pub map: String,
    pub player_count: u32,
    pub max_players: u32,
    pub player_names: String,
    pub uptime: String,
    pub ram_usage: String,
    pub build_id: String,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct ProfileChannelBinding {
    pub channel_id: u64,
    pub profile_id: String,
    pub profile_name: String,
}

#[derive(Clone, serde::Serialize)]
pub struct DiscordCommandPayload {
    pub command: String,
    pub channel_id: String,
    pub profile_id: String,
    pub profile_name: String,
}

pub struct BotState {
    pub channel_to_profile: Mutex<HashMap<u64, ProfileChannelBinding>>,
    pub profile_statuses: Mutex<HashMap<String, ServerLiveStatus>>,
    pub active_tokens: Mutex<HashSet<String>>,
}

impl BotState {
    pub fn new() -> Self {
        Self {
            channel_to_profile: Mutex::new(HashMap::new()),
            profile_statuses: Mutex::new(HashMap::new()),
            active_tokens: Mutex::new(HashSet::new()),
        }
    }
}

fn get_or_init_state(app: &AppHandle) -> Arc<BotState> {
    match app.try_state::<Arc<BotState>>() {
        Some(s) => s.inner().clone(),
        None => {
            let new_state = Arc::new(BotState::new());
            app.manage(new_state.clone());
            new_state
        }
    }
}

struct Handler {
    app_handle: AppHandle,
    state: Arc<BotState>,
}

#[async_trait]
impl EventHandler for Handler {
    async fn ready(&self, ctx: Context, ready: Ready) {
        println!("Discord Bot is connected as {}", ready.user.name);

        let commands = vec![
            CreateCommand::new("start").description("Starts the active ARK Server"),
            CreateCommand::new("stop").description("Stops the active ARK Server safely"),
            CreateCommand::new("restart").description("Restarts the active ARK Server"),
            CreateCommand::new("update").description("Checks and updates the server files"),
            CreateCommand::new("status").description("Displays live server status, players, and RAM usage"),
        ];

        let _ = serenity::all::Command::set_global_commands(&ctx.http, commands).await;
    }

    async fn interaction_create(&self, ctx: Context, interaction: Interaction) {
        if let Interaction::Command(command) = interaction {
            let channel_id_num = command.channel_id.get();
            let channel_id_str = channel_id_num.to_string();

            // Look up channel binding in the multi-server registry
            let binding_opt = {
                let channels = self.state.channel_to_profile.lock().await;
                channels.get(&channel_id_num).cloned()
            };

            let binding = match binding_opt {
                Some(b) => b,
                None => {
                    let response = CreateInteractionResponse::Message(
                        CreateInteractionResponseMessage::new()
                            .content("❌ Commands can only be used in a designated ARK server admin channel.")
                    );
                    let _ = command.create_response(&ctx.http, response).await;
                    return;
                }
            };

            let profile_id = binding.profile_id.clone();
            let profile_name = if !binding.profile_name.is_empty() {
                binding.profile_name.clone()
            } else {
                "ARK Server".to_string()
            };

            let cmd_name = command.data.name.as_str();

            match cmd_name {
                "start" => {
                    let _ = self.app_handle.emit(
                        "discord-server-command",
                        DiscordCommandPayload {
                            command: "start".to_string(),
                            channel_id: channel_id_str,
                            profile_id: profile_id.clone(),
                            profile_name: profile_name.clone(),
                        },
                    );
                    let response = CreateInteractionResponse::Message(
                        CreateInteractionResponseMessage::new()
                            .content(format!("🚀 **Command Received:** Starting ARK Server \"**{}**\"...", profile_name))
                    );
                    let _ = command.create_response(&ctx.http, response).await;
                }
                "stop" => {
                    let _ = self.app_handle.emit(
                        "discord-server-command",
                        DiscordCommandPayload {
                            command: "stop".to_string(),
                            channel_id: channel_id_str,
                            profile_id: profile_id.clone(),
                            profile_name: profile_name.clone(),
                        },
                    );
                    let response = CreateInteractionResponse::Message(
                        CreateInteractionResponseMessage::new()
                            .content(format!("🛑 **Command Received:** Safely stopping ARK Server \"**{}**\"...", profile_name))
                    );
                    let _ = command.create_response(&ctx.http, response).await;
                }
                "restart" => {
                    let _ = self.app_handle.emit(
                        "discord-server-command",
                        DiscordCommandPayload {
                            command: "restart".to_string(),
                            channel_id: channel_id_str,
                            profile_id: profile_id.clone(),
                            profile_name: profile_name.clone(),
                        },
                    );
                    let response = CreateInteractionResponse::Message(
                        CreateInteractionResponseMessage::new()
                            .content(format!("🔄 **Command Received:** Restarting ARK Server \"**{}**\"...", profile_name))
                    );
                    let _ = command.create_response(&ctx.http, response).await;
                }
                "update" => {
                    let _ = self.app_handle.emit(
                        "discord-server-command",
                        DiscordCommandPayload {
                            command: "update".to_string(),
                            channel_id: channel_id_str,
                            profile_id: profile_id.clone(),
                            profile_name: profile_name.clone(),
                        },
                    );
                    let response = CreateInteractionResponse::Message(
                        CreateInteractionResponseMessage::new()
                            .content(format!("📦 **Command Received:** Initiating server update for \"**{}**\"...", profile_name))
                    );
                    let _ = command.create_response(&ctx.http, response).await;
                }
                "status" => {
                    // Acknowledge interaction immediately to prevent Discord timeouts
                    let _ = command.defer(&ctx.http).await;

                    // Trigger frontend to refresh and send back latest status for this profile and channel
                    let _ = self.app_handle.emit(
                        "discord-server-command",
                        DiscordCommandPayload {
                            command: "get-status".to_string(),
                            channel_id: channel_id_str.clone(),
                            profile_id: profile_id.clone(),
                            profile_name: profile_name.clone(),
                        },
                    );

                    // Wait briefly for frontend to push latest response into bot state
                    tokio::time::sleep(Duration::from_millis(500)).await;

                    let status_data = {
                        let statuses = self.state.profile_statuses.lock().await;
                        statuses
                            .get(&profile_id)
                            .or_else(|| statuses.get(&channel_id_str))
                            .or_else(|| statuses.get("default"))
                            .cloned()
                            .unwrap_or_default()
                    };

                    let status_emoji = match status_data.status.to_lowercase().as_str() {
                        "running" => "🟢 Online",
                        "starting" => "🟡 Starting",
                        "stopping" => "🟠 Stopping",
                        "restarting" => "🔄 Restarting",
                        "updating" => "📦 Updating",
                        "error" => "🔴 Error",
                        _ => "⚪ Stopped",
                    };

                    let embed_color = match status_data.status.to_lowercase().as_str() {
                        "running" => 0x22c55e,
                        "starting" | "restarting" => 0xeab308,
                        "updating" => 0x3b82f6,
                        "error" => 0xef4444,
                        _ => 0x6b7280,
                    };

                    let player_list_display = if status_data.player_names.trim().is_empty() {
                        "No players online".to_string()
                    } else {
                        status_data.player_names
                    };

                    let map_display = if status_data.map.is_empty() {
                        "Custom Map".to_string()
                    } else {
                        status_data.map
                    };

                    let server_title = if !status_data.server_name.is_empty() {
                        status_data.server_name
                    } else {
                        profile_name
                    };

                    let embed = CreateEmbed::new()
                        .title(format!("📊 Server Status: {}", server_title))
                        .color(embed_color)
                        .field("Status", status_emoji, true)
                        .field("Map", map_display, true)
                        .field("Uptime", if status_data.uptime.is_empty() { "0h 0m 0s" } else { &status_data.uptime }, true)
                        .field("Players", format!("{}/{}", status_data.player_count, status_data.max_players), true)
                        .field("RAM Usage", if status_data.ram_usage.is_empty() { "0 MB" } else { &status_data.ram_usage }, true)
                        .field("Build Version", if status_data.build_id.is_empty() { "Unknown" } else { &status_data.build_id }, true)
                        .field("Online Players", player_list_display, false)
                        .footer(CreateEmbedFooter::new("ARK Ascended Server Manager"));

                    let edit_response = EditInteractionResponse::new().add_embed(embed);

                    if let Err(why) = command.edit_response(&ctx.http, edit_response).await {
                        println!("Cannot edit /status response: {}", why);
                    }
                }
                _ => {
                    let response = CreateInteractionResponse::Message(
                        CreateInteractionResponseMessage::new().content("Unknown command")
                    );
                    let _ = command.create_response(&ctx.http, response).await;
                }
            }
        }
    }
}

// A Tauri command called from Dashboard.tsx to update live status data for a profile/channel
#[tauri::command]
pub async fn discord_bot_status_response(
    app: AppHandle,
    profile_id: Option<String>,
    channel_id: Option<String>,
    server_name: String,
    status: String,
    map: String,
    player_count: u32,
    max_players: u32,
    player_names: String,
    uptime: String,
    ram_usage: String,
    build_id: String,
) -> Result<(), String> {
    let state = get_or_init_state(&app);
    let mut statuses = state.profile_statuses.lock().await;
    let entry = ServerLiveStatus {
        server_name,
        status,
        map,
        player_count,
        max_players,
        player_names,
        uptime,
        ram_usage,
        build_id,
    };

    if let Some(ref pid) = profile_id {
        if !pid.trim().is_empty() {
            statuses.insert(pid.trim().to_string(), entry.clone());
        }
    }
    if let Some(ref cid) = channel_id {
        if !cid.trim().is_empty() {
            statuses.insert(cid.trim().to_string(), entry.clone());
        }
    }
    statuses.insert("default".to_string(), entry);
    Ok(())
}

// A Tauri command to launch or register the bot for a specific server profile and channel
#[tauri::command]
pub async fn start_discord_bot(
    app: AppHandle,
    token: String,
    channel_id: String,
    profile_id: Option<String>,
    profile_name: Option<String>,
) -> Result<(), String> {
    let clean_token = token.trim().to_string();
    if clean_token.is_empty() {
        return Err("Bot token cannot be empty".to_string());
    }

    let parsed_channel = channel_id
        .trim()
        .parse::<u64>()
        .map_err(|_| format!("Invalid Channel ID '{}'. Must be a numeric ID.", channel_id.trim()))?;

    let state = get_or_init_state(&app);

    // Register channel binding for this profile
    let pid = profile_id.unwrap_or_default();
    let pname = profile_name.unwrap_or_default();

    {
        let mut channels = state.channel_to_profile.lock().await;
        channels.insert(
            parsed_channel,
            ProfileChannelBinding {
                channel_id: parsed_channel,
                profile_id: pid.clone(),
                profile_name: pname.clone(),
            },
        );
        println!(
            "Registered Discord Channel {} for Profile '{}' ({})",
            parsed_channel, pname, pid
        );
    }

    // Check if client for this token is already running
    {
        let mut active = state.active_tokens.lock().await;
        if active.contains(&clean_token) {
            println!(
                "Discord client already running for this bot token. Associated Channel {} with profile '{}'.",
                parsed_channel, pname
            );
            return Ok(());
        }
        active.insert(clean_token.clone());
    }

    println!("Booting Discord Bot client session (/start, /stop, /restart, /update, /status)...");
    let intents = GatewayIntents::non_privileged();

    let handler = Handler {
        app_handle: app,
        state: state.clone(),
    };

    let mut client = Client::builder(clean_token, intents)
        .event_handler(handler)
        .await
        .map_err(|e| e.to_string())?;

    tokio::spawn(async move {
        if let Err(why) = client.start().await {
            println!("Discord Bot client error: {:?}", why);
        }
    });

    Ok(())
}
