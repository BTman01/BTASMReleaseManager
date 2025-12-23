// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::Local;
use local_ip_address;
use once_cell::sync::Lazy;
use regex::Regex;
use rercon::{Connection, Settings};
use std::collections::HashMap;
use std::fs;
use std::io::{Cursor, Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;
use sysinfo::{Pid, System};
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconEvent};
use tauri::{Emitter, Manager, State, Window};
use tokio::fs::File;
use tokio::io::{AsyncBufReadExt, AsyncSeekExt, BufReader, SeekFrom};
use tokio::process::Command;
use tokio::sync::Mutex;
use tokio_util::sync::CancellationToken;
use walkdir::WalkDir;
use zip::write::{FileOptions, ZipWriter};
use zip::ZipArchive;

// --- STATE MANAGEMENT ---

#[derive(Clone)]
struct ServerProcessInfo {
    pid: u32,
    rcon_ip: String,
    rcon_port: u16,
    rcon_password: Option<String>,
    rcon_enabled: bool,
    cancellation_token: CancellationToken,
}

struct ServerProcesses(Arc<Mutex<HashMap<String, ServerProcessInfo>>>);

#[derive(serde::Serialize, Clone)]
struct BackupInfo {
    filename: String,
    created_at: String,
    size: u64,
}

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ServerStats {
    uptime_seconds: u64,
    memory_bytes: u64,
}

#[derive(serde::Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct PlayerEventPayload {
    profile_id: String,
    player_name: String,
    player_id: String,
}

#[derive(serde::Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum RconDiagnosticStatus {
    Success,
    Failure,
}

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RconDiagnosticStep {
    name: String,
    status: RconDiagnosticStatus,
    details: String,
}

// --- HELPER FUNCTIONS ---

fn log_to_frontend(window: &Window, event: &str, message: &str) {
    window.emit(event, message).unwrap();
    println!("[{}] {}", event, message);
}

fn get_backup_dir(install_path: &str) -> PathBuf {
    PathBuf::from(install_path).join("ManagerBackups")
}

async fn download_file(url: &str, path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let response = reqwest::get(url).await?;
    let mut file = std::fs::File::create(path)?;
    let mut content = Cursor::new(response.bytes().await?);
    std::io::copy(&mut content, &mut file)?;
    Ok(())
}

fn unzip_file(zip_path: &Path, dest_dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let file = std::fs::File::open(zip_path)?;
    let mut archive = ZipArchive::new(file)?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let outpath = match file.enclosed_name() {
            Some(path) => dest_dir.join(path),
            None => continue,
        };

        if (*file.name()).ends_with('/') {
            std::fs::create_dir_all(&outpath)?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    std::fs::create_dir_all(p)?;
                }
            }
            let mut outfile = std::fs::File::create(&outpath)?;
            std::io::copy(&mut file, &mut outfile)?;
        }
    }
    Ok(())
}

async fn ensure_steamcmd(
    window: &Window,
    log_event: &str,
    steamcmd_dir: &Path,
    steamcmd_exe: &Path,
) -> Result<(), String> {
    if !steamcmd_exe.exists() {
        log_to_frontend(
            window,
            log_event,
            "  > steamcmd.exe not found. Setting up...",
        );
        if let Err(e) = std::fs::create_dir_all(steamcmd_dir) {
            return Err(format!(
                "❌ ERROR: Failed to create steamcmd directory: {}",
                e
            ));
        }

        let steamcmd_zip_path = steamcmd_dir.join("steamcmd.zip");
        let url = "https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip";

        if let Err(e) = download_file(url, &steamcmd_zip_path).await {
            return Err(format!("❌ ERROR: Failed to download steamcmd.zip: {}", e));
        }
        log_to_frontend(window, log_event, "  > Download complete. Unzipping...");

        if let Err(e) = unzip_file(&steamcmd_zip_path, steamcmd_dir) {
            return Err(format!("❌ ERROR: Failed to unzip steamcmd.zip: {}", e));
        }
        log_to_frontend(
            window,
            log_event,
            "  > Unzip complete. Deleting zip file...",
        );
        let _ = std::fs::remove_file(&steamcmd_zip_path);
    }
    Ok(())
}

// --- TAURI COMMANDS ---

#[tauri::command]
fn get_local_ips() -> Result<Vec<String>, String> {
    match local_ip_address::list_afinet_netifas() {
        Ok(netifas) => {
            let ips = netifas
                .into_iter()
                .filter(|(_, ip)| ip.is_ipv4() && !ip.is_loopback())
                .map(|(_, ip)| ip.to_string())
                .collect();
            Ok(ips)
        }
        Err(e) => Err(e.to_string()),
    }
}

static STARTUP_MEMORY_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\((\d+\.?\d*)\s*GB\s+Mem\)").unwrap());
static MEMORY_LOGMEMORY_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"LogMemory:.*?Current/Peak\s*([\d.]+)\s*MB").unwrap());
static PLAYER_EVENT_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\d{4}\.\d{2}\.\d{2}_\d{2}\.\d{2}\.\d{2}:\s(?P<name>.*?)\s+\[UniqueNetId:(?P<id>[a-fA-F0-9]+)[^\]]*\]\s+(?P<action>joined|left)\s+this\s+ARK!").unwrap()
});

#[tauri::command]
async fn start_ark_server(
    profile_id: String,
    install_path: String,
    server_path: String,
    args: Vec<String>,
    rcon_ip: String,
    rcon_port: u16,
    rcon_password: Option<String>,
    b_enable_rcon: bool,
    processes: State<'_, ServerProcesses>,
    window: Window,
) -> Result<u32, String> {
    {
        let procs = processes.0.lock().await;
        if procs.contains_key(&profile_id) {
            return Err("Server is already running for this profile".to_string());
        }
    }

    // SPAWN DIRECTLY (No "cmd /C") to get the actual game process ID
    let mut child = Command::new(&server_path)
        .args(&args)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to start server: {}", e))?;

    let pid = child.id().ok_or("Failed to get process ID")?;
    let cancellation_token = CancellationToken::new();

    {
        let mut procs = processes.0.lock().await;
        let process_info = ServerProcessInfo {
            pid,
            rcon_ip,
            rcon_port,
            rcon_password,
            rcon_enabled: b_enable_rcon,
            cancellation_token: cancellation_token.clone(),
        };
        procs.insert(profile_id.clone(), process_info);
    }

    let win_clone = window.clone();
    let profile_id_clone = profile_id.clone();
    let log_file_path_new = PathBuf::from(&install_path)
        .join("steamcmd")
        .join("steamapps")
        .join("common")
        .join("ARK Survival Ascended Dedicated Server")
        .join("ShooterGame")
        .join("Saved")
        .join("Logs")
        .join("ShooterGame.log");

    let log_file_path_old = PathBuf::from(&install_path)
        .join("ShooterGame")
        .join("Saved")
        .join("Logs")
        .join("ShooterGame.log");

    // Determine which structure is in use by checking the server_path that was passed in
    let log_file_path = if server_path.contains("steamapps\\common\\ARK Survival Ascended Dedicated Server") {
        println!("Detected NEW server structure, using new log path");
        log_file_path_new
    } else {
        println!("Detected OLD server structure, using old log path");
        log_file_path_old
    };

    println!("Log file path: {:?}", log_file_path);

    let cancellation_token_clone = cancellation_token.clone();
    tokio::spawn(async move {
        let mut wait_attempts = 0;
        const MAX_WAIT_ATTEMPTS: u32 = 60;
        while !log_file_path.exists() && wait_attempts < MAX_WAIT_ATTEMPTS {
            if cancellation_token_clone.is_cancelled() {
                return;
            }
            tokio::time::sleep(Duration::from_secs(1)).await;
            wait_attempts += 1;
        }

        if !log_file_path.exists() {
            let _ = win_clone.emit("manager-log-line", serde_json::json!({
                "profile_id": profile_id_clone,
                "line": "[Manager] ⚠️ Warning: ShooterGame.log not found after 60 seconds. Log streaming disabled.",
            }));
            return;
        }

        let initial_position = tokio::fs::metadata(&log_file_path)
            .await
            .map_or(0, |m| m.len());
        let _ = win_clone.emit("manager-log-line", serde_json::json!({
            "profile_id": profile_id_clone,
            "line": format!("[Manager] ✅ ShooterGame.log found. Starting log stream from offset: {} bytes...", initial_position),
        }));

        let mut server_is_running = false;
        let mut last_position = initial_position;
        let mut consecutive_errors = 0;
        const MAX_CONSECUTIVE_ERRORS: u32 = 10;

        loop {
            if cancellation_token_clone.is_cancelled() {
                break;
            }

            match File::open(&log_file_path).await {
                Ok(file) => {
                    consecutive_errors = 0;
                    let mut reader = BufReader::new(file);

                    if let Ok(metadata) = tokio::fs::metadata(&log_file_path).await {
                        if metadata.len() < last_position {
                            last_position = 0;
                            server_is_running = false;
                        }
                    }

                    if reader.seek(SeekFrom::Start(last_position)).await.is_err() {
                        last_position = 0;
                        server_is_running = false;
                        let _ = reader.seek(SeekFrom::Start(0)).await;
                    }

                    loop {
                        let mut line = String::new();
                        match reader.read_line(&mut line).await {
                            Ok(0) => {
                                last_position =
                                    reader.stream_position().await.unwrap_or(last_position);
                                break;
                            }
                            Ok(_) => {
                                last_position =
                                    reader.stream_position().await.unwrap_or(last_position);
                                let trimmed_line = line.trim_end().to_string();

                                let _ = win_clone.emit(
                                    "server-log-line",
                                    serde_json::json!({
                                        "profile_id": profile_id_clone,
                                        "line": trimmed_line,
                                    }),
                                );

                                if !server_is_running && trimmed_line.contains("Server has completed startup and is now advertising for join.") {
                                    let _ = win_clone.emit("server-running", serde_json::json!({ "profile_id": profile_id_clone }));
                                    server_is_running = true;

                                    // Parse memory from the startup line
                                    if let Some(caps) = STARTUP_MEMORY_REGEX.captures(&trimmed_line) {
                                        if let Some(mem_str) = caps.get(1) {
                                            if let Ok(mem_gb) = mem_str.as_str().parse::<f64>() {
                                                let mem_mb = mem_gb * 1024.0;
                                                println!("[LOG PARSER] Parsed startup memory: {}GB = {}MB", mem_gb, mem_mb);
                                                let _ = win_clone.emit("log-stats-update", serde_json::json!({ 
                                                    "profile_id": profile_id_clone, 
                                                    "memoryMb": mem_mb 
                                                }));
                                            }
                                        }
                                    }
                                } else if let Some(caps) = MEMORY_LOGMEMORY_REGEX.captures(&trimmed_line) {
                                    // Fallback to LogMemory format if present
                                    if let Some(mem_str) = caps.get(1) {
                                        if let Ok(mem_mb) = mem_str.as_str().parse::<f64>() {
                                            println!("[LOG PARSER] Parsed LogMemory: {}MB", mem_mb);
                                            let _ = win_clone.emit("log-stats-update", serde_json::json!({ 
                                                "profile_id": profile_id_clone, 
                                                "memoryMb": mem_mb 
                                            }));
                                        }
                                    }
                                } else if let Some(caps) = PLAYER_EVENT_REGEX.captures(&trimmed_line) {
                                    if let (Some(name), Some(id), Some(action)) = (caps.name("name"), caps.name("id"), caps.name("action")) {
                                        let event_name = if action.as_str() == "joined" { "player-joined" } else { "player-left" };
                                        let payload = PlayerEventPayload {
                                            profile_id: profile_id_clone.clone(),
                                            player_name: name.as_str().to_string(),
                                            player_id: id.as_str().to_string(),
                                        };
                                        let _ = win_clone.emit(event_name, &payload);
                                    }
                                }
                            }
                            Err(_) => {
                                consecutive_errors += 1;
                                if consecutive_errors >= MAX_CONSECUTIVE_ERRORS {
                                    return;
                                }
                                break;
                            }
                        }
                    }
                }
                Err(_) => {
                    consecutive_errors += 1;
                    if consecutive_errors >= MAX_CONSECUTIVE_ERRORS {
                        return;
                    }
                }
            }

            tokio::select! {
                _ = cancellation_token_clone.cancelled() => break,
                _ = tokio::time::sleep(Duration::from_millis(500)) => {}
            }
        }
    });

    let profile_id_clone_2 = profile_id.clone();
    let win_clone_2 = window.clone();
    let processes_clone = processes.0.clone();
    tokio::spawn(async move {
        let status = child.wait().await;

        let mut procs = processes_clone.lock().await;
        if let Some(info) = procs.remove(&profile_id_clone_2) {
            info.cancellation_token.cancel();
        }

        let _ = win_clone_2.emit(
            "server-stopped",
            serde_json::json!({
                "profile_id": profile_id_clone_2,
                "exit_code": status.ok().and_then(|s| s.code())
            }),
        );
    });

    Ok(pid)
}

#[tauri::command]
async fn stop_ark_server(
    profile_id: String,
    processes: State<'_, ServerProcesses>,
) -> Result<(), String> {
    println!("Stopping ARK server for profile: {}", profile_id);

    let process_info = {
        let procs = processes.0.lock().await;
        procs.get(&profile_id).cloned()
    };

    if let Some(info) = process_info {
        #[cfg(target_os = "windows")]
        {
            use std::process::Command as StdCommand;
            StdCommand::new("taskkill")
                .args(&["/PID", &info.pid.to_string(), "/F", "/T"])
                .output()
                .map_err(|e| format!("Failed to stop server: {}", e))?;
        }

        #[cfg(not(target_os = "windows"))]
        {
            use std::process::Command as StdCommand;
            StdCommand::new("kill")
                .args(&["-9", &info.pid.to_string()])
                .output()
                .map_err(|e| format!("Failed to stop server: {}", e))?;
        }
        println!("Server stop signal sent successfully");
        Ok(())
    } else {
        Err("No running server found for this profile".to_string())
    }
}

#[tauri::command]
async fn send_rcon_command(
    profile_id: String,
    command: String,
    processes: State<'_, ServerProcesses>,
    window: Window,
) -> Result<(), String> {
    println!("=== RCON DEBUG: send_rcon_command called ===");
    println!("Profile ID: {}", profile_id);
    println!("Command: {}", command);

    let server_info = {
        let procs = processes.0.lock().await;
        procs.get(&profile_id).cloned()
    };

    if let Some(info) = server_info {
        println!("Server info found for profile: {}", profile_id);
        println!("RCON Enabled: {}", info.rcon_enabled);

        if !info.rcon_enabled {
            println!("ERROR: RCON is not enabled");
            return Err("RCON is not enabled for this server profile.".into());
        }

        let addr = format!("{}:{}", info.rcon_ip, info.rcon_port);
        let pass = info.rcon_password.as_deref().unwrap_or_default();

        println!(
            "Connecting to: {} with password length: {}",
            addr,
            pass.len()
        );

        // Use rercon's Connection::open with default settings
        match Connection::open(&addr, pass, Settings::default()).await {
            Ok(mut conn) => {
                println!("✓ RCON connection established with rercon!");
                println!("Sending command: {}", command);

                match conn.exec(&command).await {
                    Ok(response) => {
                        println!("✓ Command executed successfully!");
                        println!("Response length: {} bytes", response.len());
                        println!("Response: '{}'", response);

                        let response_text = if response.trim().is_empty() {
                            format!("✓ Command '{}' executed successfully", command)
                        } else {
                            response.trim().to_string()
                        };

                        let _ = window.emit(
                            "manager-log-line",
                            serde_json::json!({
                                "profile_id": profile_id,
                                "line": response_text
                            }),
                        );

                        println!("=== RCON DEBUG: Success ===\n");
                        Ok(())
                    }
                    Err(e) => {
                        println!("✗ Command execution failed: {}", e);

                        let error_msg = format!("❌ Command failed: {}", e);
                        let _ = window.emit(
                            "manager-log-line",
                            serde_json::json!({
                                "profile_id": profile_id,
                                "line": error_msg
                            }),
                        );

                        println!("=== RCON DEBUG: Command Failed ===\n");
                        Err(format!("RCON command failed: {}", e))
                    }
                }
            }
            Err(e) => {
                println!("✗ RCON connection failed: {}", e);

                let error_msg = format!("❌ RCON connection failed: {}", e);
                let _ = window.emit(
                    "manager-log-line",
                    serde_json::json!({
                        "profile_id": profile_id,
                        "line": error_msg
                    }),
                );

                println!("=== RCON DEBUG: Connection Failed ===\n");
                Err(format!("RCON connection failed: {}", e))
            }
        }
    } else {
        println!("ERROR: No server info found for profile: {}", profile_id);
        Err("Server is not running for this profile.".into())
    }
}

#[tauri::command]
async fn update_server_files(window: Window, install_path: String) -> Result<(), String> {
    let root_path = PathBuf::from(install_path);
    let steamcmd_dir = root_path.join("steamcmd");
    let steamcmd_exe = steamcmd_dir.join("steamcmd.exe");

    if let Err(e) = ensure_steamcmd(&window, "update-log", &steamcmd_dir, &steamcmd_exe).await {
        log_to_frontend(&window, "update-log", &e);
        window
            .emit("update-finished", &serde_json::json!({ "success": false }))
            .unwrap();
        return Err(e);
    }

    log_to_frontend(
        &window,
        "update-log",
        "✅ SteamCMD is ready. Starting server file update...",
    );

    let install_dir_arg = root_path.to_string_lossy().replace("\\", "/");
    let script_content = format!(
        "force_install_dir \"{}\"\nlogin anonymous\napp_update 2430930 validate\nquit\n",
        install_dir_arg
    );

    let script_path = steamcmd_dir.join("update_script.txt");
    if let Err(e) = std::fs::write(&script_path, &script_content) {
        let error_msg = format!("❌ ERROR: Failed to write SteamCMD script file: {}", e);
        log_to_frontend(&window, "update-log", &error_msg);
        return Err(error_msg);
    }

    const MAX_RETRIES: u32 = 3;
    let mut last_error = String::new();

    for attempt in 1..=MAX_RETRIES {
        if attempt > 1 {
            log_to_frontend(
                &window,
                "update-log",
                &format!(
                    "\n⚠️ Update attempt {}/{} failed. Retrying in 2 seconds...",
                    attempt - 1,
                    MAX_RETRIES
                ),
            );
            tokio::time::sleep(Duration::from_secs(2)).await;
        }

        let mut cmd = Command::new(&steamcmd_exe);
        cmd.current_dir(&steamcmd_dir)
            .arg("+runscript")
            .arg(&script_path);
        cmd.stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped());

        match cmd.spawn() {
            Ok(mut child) => {
                let stdout = child.stdout.take().expect("Failed to capture stdout");
                let stderr = child.stderr.take().expect("Failed to capture stderr");

                let window_clone_out = window.clone();
                tokio::spawn(async move {
                    let mut reader = BufReader::new(stdout).lines();
                    while let Ok(Some(line)) = reader.next_line().await {
                        log_to_frontend(&window_clone_out, "update-log", &line);
                    }
                });

                let window_clone_err = window.clone();
                tokio::spawn(async move {
                    let mut reader = BufReader::new(stderr).lines();
                    while let Ok(Some(line)) = reader.next_line().await {
                        log_to_frontend(&window_clone_err, "update-log", &line);
                    }
                });

                let status = child.wait().await.map_err(|e| e.to_string());

                match status {
                    Ok(s) => {
                        if s.success() {
                            let _ = std::fs::remove_file(&script_path);
                            log_to_frontend(
                                &window,
                                "update-log",
                                "\n✅ Server file update completed successfully!",
                            );
                            window
                                .emit("update-finished", &serde_json::json!({ "success": true }))
                                .unwrap();
                            return Ok(());
                        } else {
                            last_error = "Process finished with non-zero exit code.".to_string();
                        }
                    }
                    Err(e) => {
                        last_error = e;
                    }
                }
            }
            Err(e) => {
                last_error = format!("Failed to start SteamCMD process: {}", e);
            }
        }
    }

    let _ = std::fs::remove_file(&script_path);
    let err_msg = format!(
        "\n❌ Server file update finished with an error after {} attempts: {}",
        MAX_RETRIES, last_error
    );
    log_to_frontend(&window, "update-log", &err_msg);
    window
        .emit("update-finished", &serde_json::json!({ "success": false }))
        .unwrap();
    Err(err_msg)
}

#[tauri::command]
async fn update_map(window: Window, install_path: String, map_id: String) -> Result<(), String> {
    let root_path = PathBuf::from(install_path);
    let steamcmd_dir = root_path.join("steamcmd");
    let steamcmd_exe = steamcmd_dir.join("steamcmd.exe");

    if let Err(e) = ensure_steamcmd(&window, "map-update-log", &steamcmd_dir, &steamcmd_exe).await {
        log_to_frontend(&window, "map-update-log", &e);
        window
            .emit(
                "map-update-finished",
                &serde_json::json!({ "success": false }),
            )
            .unwrap();
        return Err(e);
    }

    log_to_frontend(
        &window,
        "map-update-log",
        "✅ SteamCMD is ready. Starting map update...",
    );

    let mut map_app_ids = HashMap::new();
    map_app_ids.insert("ScorchedEarth_WP", "2430940");
    map_app_ids.insert("Aberration_WP", "2430950");
    map_app_ids.insert("Extinction_WP", "2430980");
    map_app_ids.insert("Valguero_WP", "2430990");
    map_app_ids.insert("Ragnarok_WP", "2430960");
    map_app_ids.insert("TheCenter_WP", "2430970");

    let dlc_app_id = match map_app_ids.get(map_id.as_str()) {
        Some(id) => id,
        None => {
            let msg = "  > Selected map is not a downloadable DLC. Nothing to do.";
            log_to_frontend(&window, "map-update-log", msg);
            window
                .emit(
                    "map-update-finished",
                    &serde_json::json!({ "success": true }),
                )
                .unwrap();
            return Ok(());
        }
    };

    log_to_frontend(
        &window,
        "map-update-log",
        &format!(
            "  > Downloading map '{}' (App ID: {})...",
            map_id, dlc_app_id
        ),
    );

    let install_dir_arg = root_path.to_string_lossy().replace("\\", "/");
    let script_content = format!(
        "force_install_dir \"{}\"\nlogin anonymous\napp_update {} validate\nquit\n",
        install_dir_arg, dlc_app_id
    );

    let script_path = steamcmd_dir.join("map_update_script.txt");
    if let Err(e) = std::fs::write(&script_path, &script_content) {
        return Err(format!(
            "❌ ERROR: Failed to write map update script: {}",
            e
        ));
    }

    const MAX_RETRIES: u32 = 3;
    let mut last_error = String::new();

    for attempt in 1..=MAX_RETRIES {
        if attempt > 1 {
            log_to_frontend(
                &window,
                "map-update-log",
                &format!(
                    "\n⚠️ Map update attempt {}/{} failed. Retrying in 2 seconds...",
                    attempt - 1,
                    MAX_RETRIES
                ),
            );
            tokio::time::sleep(Duration::from_secs(2)).await;
        }

        let mut cmd = Command::new(&steamcmd_exe);
        cmd.current_dir(&steamcmd_dir)
            .arg("+runscript")
            .arg(&script_path);
        cmd.stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped());

        match cmd.spawn() {
            Ok(mut child) => {
                let stdout = child.stdout.take().expect("Failed to capture stdout");
                let stderr = child.stderr.take().expect("Failed to capture stderr");

                let window_clone_out = window.clone();
                tokio::spawn(async move {
                    let mut reader = BufReader::new(stdout).lines();
                    while let Ok(Some(line)) = reader.next_line().await {
                        log_to_frontend(&window_clone_out, "map-update-log", &line);
                    }
                });

                let window_clone_err = window.clone();
                tokio::spawn(async move {
                    let mut reader = BufReader::new(stderr).lines();
                    while let Ok(Some(line)) = reader.next_line().await {
                        log_to_frontend(&window_clone_err, "map-update-log", &line);
                    }
                });

                let status = child.wait().await.map_err(|e| e.to_string());

                match status {
                    Ok(s) => {
                        if s.success() {
                            let _ = std::fs::remove_file(&script_path);
                            log_to_frontend(
                                &window,
                                "map-update-log",
                                "\n✅ Map update process completed successfully!",
                            );
                            window
                                .emit(
                                    "map-update-finished",
                                    &serde_json::json!({ "success": true }),
                                )
                                .unwrap();
                            return Ok(());
                        } else {
                            last_error = "Process finished with non-zero exit code.".to_string();
                        }
                    }
                    Err(e) => {
                        last_error = e;
                    }
                }
            }
            Err(e) => {
                last_error = format!("Failed to start SteamCMD for map: {}", e);
            }
        }
    }

    let _ = std::fs::remove_file(&script_path);
    let err_msg = format!(
        "\n❌ Map update process finished with an error after {} attempts: {}",
        MAX_RETRIES, last_error
    );
    log_to_frontend(&window, "map-update-log", &err_msg);
    window
        .emit(
            "map-update-finished",
            &serde_json::json!({ "success": false }),
        )
        .unwrap();
    Err(err_msg)
}

#[tauri::command]
async fn update_mods(window: Window, install_path: String, mod_ids: String) -> Result<(), String> {
    let root_path = PathBuf::from(install_path);
    let steamcmd_dir = root_path.join("steamcmd");
    let steamcmd_exe = steamcmd_dir.join("steamcmd.exe");

    if let Err(e) = ensure_steamcmd(&window, "mod-update-log", &steamcmd_dir, &steamcmd_exe).await {
        log_to_frontend(&window, "mod-update-log", &e);
        window
            .emit(
                "mod-update-finished",
                &serde_json::json!({ "success": false }),
            )
            .unwrap();
        return Err(e);
    }

    log_to_frontend(
        &window,
        "mod-update-log",
        "✅ SteamCMD is ready. Starting mod update...",
    );

    let install_dir_arg = root_path.to_string_lossy().replace("\\", "/");
    let mut script_content = format!(
        "force_install_dir \"{}\"\nlogin anonymous\n",
        install_dir_arg
    );

    let parsed_mod_ids: Vec<&str> = mod_ids
        .split(',')
        .filter(|s| !s.trim().is_empty())
        .collect();
    if parsed_mod_ids.is_empty() {
        log_to_frontend(
            &window,
            "mod-update-log",
            "  > No mod IDs provided. Nothing to do.",
        );
        window
            .emit(
                "mod-update-finished",
                &serde_json::json!({ "success": true }),
            )
            .unwrap();
        return Ok(());
    }

    log_to_frontend(
        &window,
        "mod-update-log",
        &format!(
            "  > Found {} mods to download/update...",
            parsed_mod_ids.len()
        ),
    );
    for mod_id in parsed_mod_ids {
        script_content.push_str(&format!(
            "workshop_download_item 2430930 {}\n",
            mod_id.trim()
        ));
    }
    script_content.push_str("quit\n");

    let script_path = steamcmd_dir.join("mod_update_script.txt");
    if let Err(e) = std::fs::write(&script_path, script_content) {
        return Err(format!(
            "❌ ERROR: Failed to write mod update script: {}",
            e
        ));
    }

    const MAX_RETRIES: u32 = 3;
    let mut last_error = String::new();

    for attempt in 1..=MAX_RETRIES {
        if attempt > 1 {
            log_to_frontend(
                &window,
                "mod-update-log",
                &format!(
                    "\n⚠️ Mod update attempt {}/{} failed. Retrying in 2 seconds...",
                    attempt - 1,
                    MAX_RETRIES
                ),
            );
            tokio::time::sleep(Duration::from_secs(2)).await;
        }

        let mut cmd = Command::new(&steamcmd_exe);
        cmd.current_dir(&steamcmd_dir)
            .arg("+runscript")
            .arg(&script_path);
        cmd.stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped());

        match cmd.spawn() {
            Ok(mut child) => {
                let stdout = child.stdout.take().expect("Failed to capture stdout");
                let stderr = child.stderr.take().expect("Failed to capture stderr");

                let window_clone_out = window.clone();
                tokio::spawn(async move {
                    let mut reader = BufReader::new(stdout).lines();
                    while let Ok(Some(line)) = reader.next_line().await {
                        log_to_frontend(&window_clone_out, "mod-update-log", &line);
                    }
                });

                let window_clone_err = window.clone();
                tokio::spawn(async move {
                    let mut reader = BufReader::new(stderr).lines();
                    while let Ok(Some(line)) = reader.next_line().await {
                        log_to_frontend(&window_clone_err, "mod-update-log", &line);
                    }
                });

                let status = child.wait().await.map_err(|e| e.to_string());

                match status {
                    Ok(s) => {
                        if s.success() {
                            let _ = std::fs::remove_file(&script_path);
                            log_to_frontend(
                                &window,
                                "mod-update-log",
                                "\n✅ Mod update process completed successfully!",
                            );
                            window
                                .emit(
                                    "mod-update-finished",
                                    &serde_json::json!({ "success": true }),
                                )
                                .unwrap();
                            return Ok(());
                        } else {
                            last_error = "Process finished with non-zero exit code.".to_string();
                        }
                    }
                    Err(e) => {
                        last_error = e;
                    }
                }
            }
            Err(e) => {
                last_error = format!("Failed to start SteamCMD for mods: {}", e);
            }
        }
    }

    let _ = std::fs::remove_file(&script_path);
    let err_msg = format!(
        "\n❌ Mod update process finished with an error after {} attempts: {}",
        MAX_RETRIES, last_error
    );
    log_to_frontend(&window, "mod-update-log", &err_msg);
    window
        .emit(
            "mod-update-finished",
            &serde_json::json!({ "success": false }),
        )
        .unwrap();
    Err(err_msg.to_string())
}

#[tauri::command]
async fn list_backups(install_path: String) -> Result<Vec<BackupInfo>, String> {
    let backup_dir = get_backup_dir(&install_path);
    if !backup_dir.exists() {
        return Ok(vec![]);
    }

    let mut backups = Vec::new();
    for entry in fs::read_dir(backup_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("zip") {
            let metadata = entry.metadata().map_err(|e| e.to_string())?;
            let created_time: chrono::DateTime<Local> =
                metadata.created().map_err(|e| e.to_string())?.into();

            backups.push(BackupInfo {
                filename: path.file_name().unwrap().to_string_lossy().to_string(),
                created_at: created_time.format("%Y-%m-%d %H:%M:%S").to_string(),
                size: metadata.len(),
            });
        }
    }
    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(backups)
}

#[tauri::command]
async fn create_backup(install_path: String) -> Result<(), String> {
    let backup_dir = get_backup_dir(&install_path);
    fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;

    let saved_dir = PathBuf::from(&install_path)
        .join("ShooterGame")
        .join("Saved");
    if !saved_dir.exists() {
        return Err("Saved directory not found. Cannot create backup.".to_string());
    }

    let timestamp = Local::now().format("%Y%m%d-%H%M%S");
    let backup_filename = format!("backup-{}.zip", timestamp);
    let backup_path = backup_dir.join(backup_filename);

    let file = fs::File::create(&backup_path).map_err(|e| e.to_string())?;
    let mut zip = ZipWriter::new(file);

    let options: FileOptions<()> =
        FileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    let walkdir = WalkDir::new(&saved_dir);
    for entry in walkdir.into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        let name = path.strip_prefix(&saved_dir).unwrap();

        if path.is_file() {
            zip.start_file(name.to_string_lossy(), options)
                .map_err(|e| e.to_string())?;
            let mut f = fs::File::open(path).map_err(|e| e.to_string())?;
            let mut buffer = Vec::new();
            f.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
            zip.write_all(&buffer).map_err(|e| e.to_string())?;
        } else if !name.as_os_str().is_empty() {
            zip.add_directory(name.to_string_lossy(), options)
                .map_err(|e| e.to_string())?;
        }
    }

    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn restore_backup(install_path: String, backup_filename: String) -> Result<(), String> {
    let backup_path = get_backup_dir(&install_path).join(&backup_filename);
    if !backup_path.exists() {
        return Err("Backup file not found.".to_string());
    }

    let saved_dir = PathBuf::from(&install_path)
        .join("ShooterGame")
        .join("Saved");
    if saved_dir.exists() {
        fs::remove_dir_all(&saved_dir)
            .map_err(|e| format!("Failed to remove old Saved directory: {}", e))?;
    }
    fs::create_dir_all(&saved_dir).map_err(|e| e.to_string())?;

    let file = fs::File::open(&backup_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = match file.enclosed_name() {
            Some(path) => saved_dir.join(path),
            None => continue,
        };

        if (*file.name()).ends_with('/') {
            fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    fs::create_dir_all(p).map_err(|e| e.to_string())?;
                }
            }
            let mut outfile = fs::File::create(&outpath).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
async fn delete_backup(install_path: String, backup_filename: String) -> Result<(), String> {
    let backup_path = get_backup_dir(&install_path).join(&backup_filename);
    if !backup_path.exists() {
        return Err("Backup file not found.".to_string());
    }
    fs::remove_file(backup_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_server_build_info(install_path: String) -> Result<String, String> {
    let install_path_buf = PathBuf::from(&install_path);
    
    // Primary location: In the steamcmd/steamapps folder (your SteamCMD setup)
    let manifest_path_steamcmd = install_path_buf
        .join("steamcmd")
        .join("steamapps")
        .join("appmanifest_2430930.acf");
    
    // Fallback location 1: In the install path's steamapps folder (old/direct installs)
    let manifest_path_1 = install_path_buf
        .join("steamapps")
        .join("appmanifest_2430930.acf");
    
    // Fallback location 2: In the parent steamapps folder (Steam library structure)
    let manifest_path_2 = install_path_buf
        .parent()
        .and_then(|p| p.parent())
        .map(|p| p.join("appmanifest_2430930.acf"));
    
    // Try each location in order
    let manifest_paths = vec![
        Some(manifest_path_steamcmd),  // Check steamcmd folder FIRST
        Some(manifest_path_1),
        manifest_path_2,
    ];
    
    for maybe_path in manifest_paths.iter().flatten() {
        if maybe_path.exists() {
            println!("Found manifest at: {:?}", maybe_path);
            let content = fs::read_to_string(maybe_path).map_err(|e| e.to_string())?;
            let re = Regex::new(r#""buildid"\s*"(\d+)""#).unwrap();
            if let Some(caps) = re.captures(&content) {
                if let Some(build_id) = caps.get(1) {
                    return Ok(build_id.as_str().to_string());
                }
            }
            return Err("Could not find build ID in manifest file.".to_string());
        }
    }
    
    // If we get here, we couldn't find the manifest anywhere
    Err(format!(
        "App manifest file not found. Searched in:\n  - {:?}\n  - {:?}\n  - {:?}",
        manifest_paths[0].as_ref().unwrap(),
        manifest_paths[1].as_ref().unwrap(),
        manifest_paths[2].as_ref().unwrap_or(&PathBuf::from("N/A"))
    ))
}

#[tauri::command]
async fn get_latest_server_build(install_path: String) -> Result<String, String> {
    let steamcmd_dir = PathBuf::from(&install_path).join("steamcmd");
    let steamcmd_exe = steamcmd_dir.join("steamcmd.exe");

    if !steamcmd_exe.exists() {
        return Err("steamcmd.exe not found. Cannot check for updates.".to_string());
    }

    let output = Command::new(&steamcmd_exe)
        .arg("+login")
        .arg("anonymous")
        .arg("+app_info_print")
        .arg("2430930")
        .arg("+quit")
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err("SteamCMD command failed.".to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let re = Regex::new(r#""public"\s*\{\s*"buildid"\s*"(\d+)""#).unwrap();
    if let Some(caps) = re.captures(&stdout) {
        if let Some(build_id) = caps.get(1) {
            return Ok(build_id.as_str().to_string());
        }
    }

    Err("Could not parse latest build ID from SteamCMD output.".to_string())
}

#[tauri::command]
async fn get_server_stats(
    profile_id: String,
    processes: State<'_, ServerProcesses>,
) -> Result<ServerStats, String> {
    let server_info = {
        let procs = processes.0.lock().await;
        procs.get(&profile_id).cloned()
    };

    if server_info.is_none() {
        return Err("Server process not found for this profile".to_string());
    }
    let info = server_info.unwrap();
    let pid = Pid::from_u32(info.pid);
    let mut sys = System::new();

    // Use refresh_process(pid) to update just that process.
    // This returns true if the process was found and updated.
    if sys.refresh_process(pid) {
        if let Some(process) = sys.process(pid) {
            Ok(ServerStats {
                uptime_seconds: process.run_time(),
                memory_bytes: process.memory(),
            })
        } else {
            Err(format!("Process with PID {} no longer exists.", pid))
        }
    } else {
        Err(format!("Failed to refresh process with PID {}.", pid))
    }
}

#[tauri::command]
async fn diagnose_rcon(
    window: Window,
    rcon_ip: String,
    rcon_port: u16,
    rcon_password: Option<String>,
) -> Result<(), String> {
    println!("\n=== RCON DIAGNOSTIC DEBUG START (using rercon) ===");
    println!("RCON IP: {}", rcon_ip);
    println!("RCON Port: {}", rcon_port);

    let emit_step = |win: &Window, name: &str, status: RconDiagnosticStatus, details: &str| {
        println!("[DIAG STEP] {}: {:?} - {}", name, status, details);
        let step = RconDiagnosticStep {
            name: name.to_string(),
            status,
            details: details.to_string(),
        };
        win.emit("rcon-diag-step", &step).unwrap();
    };

    let address = format!("{}:{}", rcon_ip, rcon_port);
    let password = rcon_password.as_deref().unwrap_or_default();

    println!("Full address: {}", address);
    println!("Password length: {}", password.len());

    emit_step(
        &window,
        "Host Resolution",
        RconDiagnosticStatus::Success,
        &format!("Target address is {}", &address),
    );

    // Test raw TCP connection first
    println!("Step 1: Testing raw TCP connection...");
    use tokio::net::TcpStream;
    match tokio::time::timeout(Duration::from_secs(10), TcpStream::connect(&address)).await {
        Ok(Ok(stream)) => {
            println!("✓ Raw TCP connection successful!");
            emit_step(
                &window,
                "Raw TCP Test",
                RconDiagnosticStatus::Success,
                "Successfully established raw TCP connection. Server is reachable.",
            );
            drop(stream);
        }
        Ok(Err(e)) => {
            println!("✗ Raw TCP connection failed: {}", e);
            emit_step(
                &window,
                "Raw TCP Test",
                RconDiagnosticStatus::Failure,
                &format!("TCP connection failed: {}", e),
            );
            window.emit("rcon-diag-finished", ()).unwrap();
            return Ok(());
        }
        Err(_) => {
            println!("✗ Raw TCP connection timeout");
            emit_step(
                &window,
                "Raw TCP Test",
                RconDiagnosticStatus::Failure,
                "TCP connection timed out",
            );
            window.emit("rcon-diag-finished", ()).unwrap();
            return Ok(());
        }
    }

    // Try RCON connection with rercon
    println!("Step 2: Attempting RCON connection with rercon...");
    match Connection::open(&address, &password, Settings::default()).await {
        Ok(mut conn) => {
            println!("✓ RCON connection successful!");
            emit_step(
                &window,
                "TCP Connection",
                RconDiagnosticStatus::Success,
                "Successfully established TCP connection",
            );
            emit_step(
                &window,
                "RCON Authentication",
                RconDiagnosticStatus::Success,
                "Authenticated successfully with rercon",
            );

            // Test saveworld command
            println!("Step 3: Testing saveworld command...");
            match conn.exec("saveworld").await {
                Ok(response) => {
                    println!("✓ saveworld successful! Response: '{}'", response);
                    emit_step(
                        &window,
                        "Test Command (saveworld)",
                        RconDiagnosticStatus::Success,
                        &format!("Successfully executed saveworld. Response:\n{}", response),
                    );
                }
                Err(e) => {
                    println!("✗ saveworld failed: {}", e);
                    emit_step(
                        &window,
                        "Test Command (saveworld)",
                        RconDiagnosticStatus::Failure,
                        &format!("Command failed: {}", e),
                    );
                }
            }

            // Test broadcast
            println!("Testing broadcast command...");
            match conn.exec("broadcast RCON Test from Manager").await {
                Ok(response) => {
                    println!("✓ broadcast successful! Response: '{}'", response);
                    emit_step(
                        &window,
                        "Test Command (broadcast)",
                        RconDiagnosticStatus::Success,
                        &format!("Successfully sent broadcast. Response: {}", response),
                    );
                }
                Err(e) => {
                    println!("✗ broadcast failed: {}", e);
                    emit_step(
                        &window,
                        "Test Command (broadcast)",
                        RconDiagnosticStatus::Failure,
                        &format!("Command failed: {}", e),
                    );
                }
            }
        }
        Err(e) => {
            println!("✗ RCON connection failed: {}", e);
            let error_str = e.to_string();

            emit_step(
                &window,
                "RCON Connection",
                RconDiagnosticStatus::Failure,
                &format!("Connection/Authentication failed: {}", error_str),
            );
            window.emit("rcon-diag-finished", ()).unwrap();
            return Ok(());
        }
    }

    println!("=== RCON DIAGNOSTIC DEBUG END ===\n");
    emit_step(
        &window,
        "Diagnostic Complete",
        RconDiagnosticStatus::Success,
        "RCON diagnostic completed successfully!",
    );
    window.emit("rcon-diag-finished", ()).unwrap();
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--flag-as-example"]),
        ))
        .manage(ServerProcesses(Arc::new(Mutex::new(HashMap::new()))))
        .invoke_handler(tauri::generate_handler![
            start_ark_server,
            stop_ark_server,
            send_rcon_command,
            update_server_files,
            update_map,
            update_mods,
            list_backups,
            create_backup,
            restore_backup,
            delete_backup,
            get_server_build_info,
            get_latest_server_build,
            get_server_stats,
            diagnose_rcon,
            get_local_ips
        ])
        .setup(|app| {
            // Get the tray icon created from tauri.conf.json
            let tray = match app.tray_by_id("main") {
                Some(t) => t,
                None => return Ok(()),
            };

            // Create menu items
            let show = MenuItemBuilder::new("Show Window").id("show").build(app)?;

            let quit = MenuItemBuilder::new("Quit").id("quit").build(app)?;

            // Build the menu
            let menu = MenuBuilder::new(app).items(&[&show, &quit]).build()?;

            // Set menu and tooltip on tray
            tray.set_menu(Some(menu))?;
            tray.set_tooltip(Some("BT Ark Ascended Server Manager"))?;

            // Set up menu event handler
            tray.on_menu_event(|app, event| match event.id().as_ref() {
                "show" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.unminimize();
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            });

            // Set up tray icon click handler
            tray.on_tray_icon_event(|tray, event| match event {
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                } => {
                    let app = tray.app_handle();
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.unminimize();
                    }
                }
                TrayIconEvent::DoubleClick {
                    button: MouseButton::Left,
                    ..
                } => {
                    let app = tray.app_handle();
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.unminimize();
                    }
                }
                _ => {}
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}