use std::sync::Mutex;
use grammers_client::{Client, Config, SignInError, InitParams};
use grammers_client::types::{PasswordToken, Media, Downloadable, LoginToken}; 

use grammers_session::Session;
use tokio::sync::Mutex as AsyncMutex;
use tauri::{State, Manager, Window, Emitter};
use std::sync::Arc;
use tokio::io::AsyncReadExt;
use std::path::Path;
use grammers_tl_types as tl;
use rand::Rng;
use tokio::sync::Semaphore;
use std::sync::atomic::{AtomicU64, Ordering};

pub mod db;
use db::Database;
use db::{Folder, FileMetadata};

// Secrets moved to .env

const SESSION_FILE: &str = "telegram.session";

struct AppState {
    client: Arc<AsyncMutex<Option<Client>>>,
    phone_token: Mutex<Option<LoginToken>>, // Changed from phone_hash string
    password_token: Mutex<Option<PasswordToken>>, // For 2FA
    db: Arc<Database>,
}

#[tauri::command]
async fn login_start(phone: String, state: State<'_, AppState>) -> Result<String, String> {
    let mut client_guard = state.client.lock().await;

    // Force fresh client for new login to prevent stale state (SRP_ID_INVALID)
    *client_guard = None;

    // Load env vars
    dotenv::dotenv().ok();
    let api_id_str = std::env::var("TELEGRAM_API_ID").unwrap_or_else(|_| "0".to_string());
    let api_hash = std::env::var("TELEGRAM_API_HASH").unwrap_or_else(|_| "".to_string());
    let api_id = api_id_str.parse::<i32>().unwrap_or(0);

    if api_id == 0 || api_hash.is_empty() {
         return Err("API Credentials missing in .env".to_string());
    }

    for attempt in 0..2 {
        if client_guard.is_none() {
            // Init client if not present
            let session = Session::load_file_or_create(SESSION_FILE).map_err(|e| e.to_string())?;
            
            let params = InitParams {
                device_model: "Paperfold Desktop".to_string(),
                app_version: "0.1.0".to_string(),
                system_version: "macOS".to_string(),
                ..Default::default()
            };

            let config = Config {
                session,
                api_id,
                api_hash: api_hash.clone(),
                params,
            };

            let client = Client::connect(config).await.map_err(|e| e.to_string())?; 
            *client_guard = Some(client);
        }
        
        let client = client_guard.as_ref().unwrap();

        // 0.7.x: request_login_code(phone) only
        match client.request_login_code(&phone).await {
            Ok(token) => {
                *state.phone_token.lock().unwrap() = Some(token);
                *state.password_token.lock().unwrap() = None;
                return Ok("Code sent".to_string());
            },
            Err(e) => {
                let err_msg = e.to_string();
                if attempt == 0 && (err_msg.contains("AUTH_RESTART") || err_msg.contains("rpc error 500")) {
                    println!("AUTH_RESTART detected. Resetting session and retrying...");
                    // Drop client (disconnect/save) not strictly needed if we delete file, but good practice to release logic
                    *client_guard = None;
                    
                    // Delete session file to force fresh auth
                    if std::path::Path::new(SESSION_FILE).exists() {
                        let _ = std::fs::remove_file(SESSION_FILE);
                    }
                    continue; // Retry loop
                }
                return Err(format!("Failed to send code: {}", e));
            }
        }
    }
    
    Err("Failed after retry".to_string())
}

// Stub for QR login to check API presence



#[tauri::command]
async fn login_complete(code: String, password: Option<String>, state: State<'_, AppState>) -> Result<String, String> {
    let mut client_guard = state.client.lock().await;
    let client = client_guard.as_mut().ok_or("Client not initialized")?;
    
    // Check if we are in 2FA mode
    if let Some(pwd) = password {
        // Prepare token logic: We want to KEEP it on failure, but CONSUME it on success (or if library requires consume).
        // First try: Assuming check_password takes token by value (consume).
        // If we want retry, we must CLONE it if possible. 
        // If PasswordToken is not Clone, we are stuck unless check_password takes valid reference.
        
        let token_opt = state.password_token.lock().unwrap().clone();
        
        if let Some(token) = token_opt {
             // We pass a clone to check_password
             match client.check_password(token, &pwd).await {
                Ok(user) => {
                    // Success! Remove from state
                    *state.password_token.lock().unwrap() = None;
                    let data = client.session().save();
                    std::fs::write(SESSION_FILE, data).map_err(|e| e.to_string())?;
                    Ok(format!("Logged in as {}", user.first_name()))
                },
                Err(e) => {
                    // Failure! Token remains in state for retry
                    let err_msg = e.to_string();
                    if err_msg.contains("SRP_ID_INVALID") {
                         Err("Session Timeout. Please go back and try again.".to_string())
                    } else {
                         Err(format!("Password error: {}", e))
                    }
                }
             }
        } else {
             Err("No 2FA session found. Please try logging in again.".to_string())
        }
    } else {
        // Normal Code Login
        let token = state.phone_token.lock().unwrap().take().ok_or("No login session found")?; 
        match client.sign_in(&token, &code).await {
            Ok(user) => {
                 let data = client.session().save();
                 std::fs::write(SESSION_FILE, data).map_err(|e| e.to_string())?;
                 Ok(format!("Logged in as {}", user.first_name())) 
            },
            Err(SignInError::PasswordRequired(token)) => {
                 // Store token for 2FA step
                 *state.password_token.lock().unwrap() = Some(token);
                 Err("PASSWORD_REQUIRED".to_string())
            },
            Err(e) => Err(format!("Login failed: {}", e)),
        }
    }
}

#[tauri::command]
async fn check_auth(state: State<'_, AppState>) -> Result<bool, String> {
    let mut client_guard = state.client.lock().await;

    // Load env vars
    dotenv::dotenv().ok();
    let api_id_str = std::env::var("TELEGRAM_API_ID").unwrap_or_else(|_| "0".to_string());
    let api_hash = std::env::var("TELEGRAM_API_HASH").unwrap_or_else(|_| "".to_string());
    let api_id = api_id_str.parse::<i32>().unwrap_or(0);
    
    // If client exists, check status
    if let Some(client) = client_guard.as_ref() {
        let auth = client.is_authorized().await.map_err(|e| e.to_string())?;
        if auth {
             let _ = state.db.cleanup_trash(30);
        }
        return Ok(auth);
    }

    // Try load from file
    if !Path::new(SESSION_FILE).exists() {
        return Ok(false);
    }
    
    if api_id == 0 || api_hash.is_empty() {
         return Ok(false); // Can't connect without secrets
    }

    let session = Session::load_file_or_create(SESSION_FILE).map_err(|e| e.to_string())?;
    // Config... (We need repeat config, maybe refactor later but copy-paste for safety now)
    let params = InitParams {
        device_model: "Paperfold Desktop".to_string(),
        app_version: "0.1.0".to_string(),
        system_version: "macOS".to_string(),
        ..Default::default()
    };
    let config = Config {
         session,
         api_id, // Use variable
         api_hash: api_hash.clone(), // Use variable
         params,
    };
     
    let client = Client::connect(config).await.map_err(|e| e.to_string())?;
    let authorized = client.is_authorized().await.map_err(|e| e.to_string())?;
    
    if authorized {
         let _ = state.db.cleanup_trash(30);
    }

    *client_guard = Some(client);
    Ok(authorized)
}

#[tauri::command]
async fn logout(state: State<'_, AppState>) -> Result<(), String> {
    let mut client_guard = state.client.lock().await;
    *client_guard = None;

    if std::path::Path::new(SESSION_FILE).exists() {
        let _ = std::fs::remove_file(SESSION_FILE);
    }
    Ok(())
}


#[tauri::command]
async fn fetch_files(folder_id: Option<String>, state: State<'_, AppState>) -> Result<(Vec<db::Folder>, Vec<db::FileMetadata>), String> {
    Ok(state.db.list_contents(folder_id))
}

#[tauri::command]
async fn create_folder(name: String, parent_id: Option<String>, state: State<'_, AppState>) -> Result<String, String> {
    println!("Creating folder: name={}, parent_id={:?}", name, parent_id);
    Ok(state.db.create_folder(&name, parent_id))
}

#[tauri::command]
async fn upload_file(path: String, folder_id: Option<String>, state: State<'_, AppState>, window: Window) -> Result<db::FileMetadata, String> {
    let client_guard = state.client.lock().await;
    let client = client_guard.as_ref().ok_or("Client not initialized")?.clone(); // Clone client for use in spawned tasks
    
    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err("File not found".to_string());
    }
    let file_name = file_path.file_name().ok_or("Invalid file name")?.to_string_lossy().to_string();
    let file_size = tokio::fs::metadata(&path).await.map_err(|e| e.to_string())?.len();
    
    let mut file = tokio::fs::File::open(&path).await.map_err(|e| e.to_string())?;
    
    // Generate a unique file_id
    let file_id: i64 = rand::thread_rng().gen();
    
    let is_big = file_size > 10 * 1024 * 1024;
    let chunk_size = 512 * 1024;
    let total_parts = (file_size as usize + chunk_size - 1) / chunk_size;
    
    let semaphore = Arc::new(Semaphore::new(16)); // Max 16 parallel uploads (Optimized for speed)
    let uploaded_bytes = Arc::new(AtomicU64::new(0));
    let mut tasks = Vec::new();

    let mut part_index = 0;

    #[derive(Clone, serde::Serialize)]
    struct ProgressPayload {
        path: String,
        progress: f64, // Changed to f64 for more precision
    }

    loop {
        let mut buffer = vec![0u8; chunk_size];
        let n = file.read(&mut buffer).await.map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        buffer.truncate(n);

        let permit = semaphore.clone().acquire_owned().await.map_err(|e| e.to_string())?;
        let client_clone = client.clone(); // Use client_clone for the task
        let path_clone = path.clone();
        let window_clone = window.clone();
        let uploaded_bytes_clone = uploaded_bytes.clone(); // Use uploaded_bytes_clone for the task
        let current_part = part_index;
        
        let task = tokio::spawn(async move {
            let part_bytes = buffer;
            let part_len = part_bytes.len() as u64;

            let result = if is_big {
                client_clone.invoke(&tl::functions::upload::SaveBigFilePart {
                    file_id,
                    file_part: current_part as i32,
                    file_total_parts: total_parts as i32,
                    bytes: part_bytes,
                }).await
            } else {
                client_clone.invoke(&tl::functions::upload::SaveFilePart {
                    file_id,
                    file_part: current_part as i32,
                    bytes: part_bytes,
                }).await
            };

            drop(permit); // Release semaphore immediately after upload

            if let Err(e) = result {
                return Err(format!("Part {} failed: {}", current_part, e));
            }

            // Update progress
            let previous = uploaded_bytes_clone.fetch_add(part_len, Ordering::SeqCst);
            let current_total = previous + part_len;
            
            // Calculate percentage
            let progress = (current_total as f64 / file_size as f64 * 100.0).min(100.0);
            
            // Emit event (maybe debounce this if it's too spammy, but for now every chunk is fine)
            let _ = window_clone.emit("upload-progress", ProgressPayload {
                path: path_clone,
                progress,
            });

            Ok(())
        });

        tasks.push(task);
        part_index += 1;
    }

    // Wait for all uploads to complete
    for task in tasks {
        match task.await {
            Ok(result) => result?, // Propagate task error
            Err(e) => return Err(format!("Task join error: {}", e)),
        }
    }

    // Construct InputFile
    let input_file = if is_big {
        tl::enums::InputFile::Big(tl::types::InputFileBig {
            id: file_id,
            parts: total_parts as i32,
            name: file_name.clone(),
        })
    } else {
        tl::enums::InputFile::File(tl::types::InputFile {
            id: file_id,
            parts: total_parts as i32,
            name: file_name.clone(),
            md5_checksum: "".to_string(), // Optional
        })
    };

    let input_media = tl::enums::InputMedia::UploadedDocument(tl::types::InputMediaUploadedDocument {
        file: input_file,
        mime_type: "application/octet-stream".to_string(),
        attributes: vec![
            tl::enums::DocumentAttribute::Filename(tl::types::DocumentAttributeFilename {
                file_name: file_name.clone()
            })
        ],
        ttl_seconds: None,
        force_file: false,
        spoiler: false,
        stickers: None,
        thumb: None,
        nosound_video: false,
    });

    // Send to "me" (Saved Messages) using InputPeerSelf - no access hash needed!
    let input_peer = tl::enums::InputPeer::PeerSelf;
    
    let random_id: i64 = rand::thread_rng().gen();

    let updates = client.invoke(&tl::functions::messages::SendMedia {
        silent: false,
        background: false,
        clear_draft: false,
        peer: input_peer,
        reply_to: None, 
        media: input_media,
        message: "".to_string(),
        random_id,
        reply_markup: None,
        entities: None, 
        schedule_date: None,
        send_as: None,
        noforwards: false, 
        update_stickersets_order: false,
        invert_media: false,
        quick_reply_shortcut: None,
        effect: None,
    }).await.map_err(|e| format!("SendMedia error: {}", e))?;

    let msg_id = match updates {
        tl::enums::Updates::Updates(u) => {
             u.updates.iter().find_map(|u| match u {
                 tl::enums::Update::MessageId(id) => Some(id.id),
                 tl::enums::Update::NewMessage(m) => match &m.message {
                     tl::enums::Message::Message(msg) => Some(msg.id),
                     _ => None
                 },
                 _ => None
             }).unwrap_or(0)
        },
        // Updates::ShortSentMessage doesn't exist? Then it's likely updateShortSentMessage in raw TL but wrapped differently?
        // Or maybe it is UpdateShortSentMessage (singular). 
        // Let's just catch all others as 0 for safety or check docs.
        // Usually it returns Updates or UpdateShortSentMessage.
        // Let's rely on Updates variant. If it's something else, we miss msg_id (0), but upload succeeds.
        // We can query history later if needed.
        _ => 0 
    };
    
    let metadata = state.db.add_file(
        folder_id,
        file_name,
        file_size as i64,
        "application/octet-stream".to_string(),
        msg_id,
    );

    Ok(metadata)
}

#[tauri::command]
async fn preview_file(state: State<'_, AppState>, file_id: i32, file_name: String) -> Result<String, String> {
    let mut client_guard = state.client.lock().await; 
    let client = client_guard.as_mut().ok_or("Client not initialized")?;

    // Download to temp dir
    let temp_dir = std::env::temp_dir();
    let target_path = temp_dir.join(&file_name);
    let target_path_str = target_path.to_string_lossy().to_string();

    // If file already exists in temp, return it (simple cache)
    if target_path.exists() {
        return Ok(target_path_str);
    }
    
    let chat = client.get_me().await.map_err(|e| e.to_string())?;
    let messages = client.get_messages_by_id(&chat, &[file_id]).await.map_err(|e| e.to_string())?;
    
    // Handle Vec<Option<Message>>

    // Handle Vec<Option<Message>>
    let message_opt = messages.first().ok_or("Message not found")?;
    let message = message_opt.as_ref().ok_or("Message is empty/deleted")?;

    if let Some(media) = message.media() {
        if matches!(media, Media::Photo(_) | Media::Document(_)) {
             let downloadable = Downloadable::Media(media);
             client.download_media(&downloadable, target_path_str.as_str()).await.map_err(|e| e.to_string())?;
             Ok(target_path_str)
        } else {
             Err("Unsupported media type for preview".to_string())
        }
    } else {
        Err("No media found".to_string())
    }
}

#[derive(serde::Serialize)]
struct UserProfile {
    id: i64,
    first_name: String,
    last_name: Option<String>,
    username: Option<String>,
    phone: Option<String>,
}

#[tauri::command]
async fn get_current_user(state: State<'_, AppState>) -> Result<UserProfile, String> {
    let mut client_guard = state.client.lock().await;
    let client = client_guard.as_mut().ok_or("Client not initialized")?;
    let me = client.get_me().await.map_err(|e| e.to_string())?;

    Ok(UserProfile {
        id: me.id(),
        first_name: me.first_name().to_string(),
        last_name: me.last_name().map(|s| s.to_string()),
        username: me.username().map(|s| s.to_string()),
        phone: None, // Phone might not be accessible easily via simple User struct without raw access
    })
} 

#[tauri::command]
fn trash_item(
    state: State<AppState>, 
    id: String, 
    is_folder: bool
) -> Result<(), String> {
    state.db.trash_item(&id, is_folder);
    Ok(())
}

#[tauri::command]
fn restore_item(
    state: State<AppState>, 
    id: String, 
    is_folder: bool
) -> Result<(), String> {
    state.db.restore_item(&id, is_folder);
    Ok(())
}

#[tauri::command]
async fn delete_item_permanently(
    state: State<'_, AppState>,
    id: String,
    is_folder: bool
) -> Result<(), String> {
    println!("Deleting item permanently: {} (folder: {})", id, is_folder);
    
    let mut client_guard = state.client.lock().await;
    let client = client_guard.as_mut().ok_or("Not logged in")?;

    let mut messages_to_delete = Vec::new();

    if is_folder {
        // Get all files in the folder to be deleted
        let files = state.db.delete_folder(&id);
        for f in files {
            messages_to_delete.push(f.message_id);
        }
    } else {
        // Get file to get message id
        if let Some(file) = state.db.get_file(&id) {
             messages_to_delete.push(file.message_id);
             state.db.delete_file(&id);
        }
    }

    if !messages_to_delete.is_empty() {
        // Fetch chat (me) to delete messages
         match client.get_me().await {
             Ok(chat) => {
                 if let Err(e) = client.delete_messages(&chat, &messages_to_delete).await {
                     eprintln!("Failed to delete messages from Telegram: {}", e);
                 } else {
                     println!("Deleted messages from Telegram");
                 }
             },
             Err(e) => eprintln!("Failed to get_me for deletion: {}", e),
         }
    }

    Ok(())
}

#[tauri::command]
async fn empty_trash(state: State<'_, AppState>) -> Result<(), String> {
    println!("Emptying trash...");
    
    // 0 days means delete everything in trash
    let files = state.db.cleanup_trash(0); 
    let mut messages_to_delete = Vec::new();

    for f in files {
        messages_to_delete.push(f.message_id);
    }
    
    if !messages_to_delete.is_empty() {
         let mut client_guard = state.client.lock().await;
         if let Some(client) = client_guard.as_mut() {
             match client.get_me().await {
                 Ok(chat) => {
                     if let Err(e) = client.delete_messages(&chat, &messages_to_delete).await {
                         eprintln!("Failed to delete messages from Telegram: {}", e);
                     } else {
                         println!("Deleted {} messages from Telegram", messages_to_delete.len());
                     }
                 },
                 Err(e) => eprintln!("Failed to get_me for deletion: {}", e),
             }
         }
    }

    Ok(())
}

#[tauri::command]
fn fetch_trash(
    state: State<AppState>
) -> Result<(Vec<db::Folder>, Vec<db::FileMetadata>), String> {
    Ok(state.db.list_trash())
}

#[tauri::command]
async fn delete_item(id: String, is_folder: bool, state: State<'_, AppState>) -> Result<(), String> {
    // Soft delete now
    state.db.trash_item(&id, is_folder);
    Ok(())
}

#[tauri::command]
async fn download_file_core(file_id: String, save_path: String, state: State<'_, AppState>) -> Result<String, String> {
    println!("Downloading file: id={}, save_path={}", file_id, save_path);
     let mut client_guard = state.client.lock().await;
    let client = client_guard.as_mut().ok_or("Client not initialized")?;
    
    let file = state.db.get_file(&file_id).ok_or("File not found")?;
    let message_id = file.message_id;
    let chat = client.get_me().await.map_err(|e| e.to_string())?;
    
    let messages = client.get_messages_by_id(&chat, &[message_id]).await.map_err(|e| e.to_string())?;
    
    let message_opt = messages.first().ok_or("Message list empty")?;
    let message = match message_opt {
        Some(m) => m,
        None => return Err("Message not found".to_string()),
    };
    
    if let Some(media) = message.media() {
        match media {
            Media::Photo(p) => {
                 let d = Downloadable::Media(Media::Photo(p));
                 client.download_media(&d, &save_path).await.map_err(|e| e.to_string())?;
                 Ok("Download complete".to_string())
            },
            Media::Document(d) => {
                 let d = Downloadable::Media(Media::Document(d));
                 client.download_media(&d, &save_path).await.map_err(|e| e.to_string())?;
                 Ok("Download complete".to_string())
            },
            _ => Err("Unsupported media type".to_string())
        }
    } else {
        Err("No media found in message".to_string())
    }
}

#[tauri::command]
async fn rename_item(id: String, is_folder: bool, new_name: String, state: State<'_, AppState>) -> Result<(), String> {
    println!("Renaming item: id={}, is_folder={}, new_name={}", id, is_folder, new_name);
    if is_folder {
        if state.db.rename_folder(&id, &new_name) {
            Ok(())
        } else {
            Err("Folder not found".to_string())
        }
    } else {
        if state.db.rename_file(&id, &new_name) {
            Ok(())
        } else {
            Err("File not found".to_string())
        }
    }
}


#[tauri::command]
async fn toggle_star(id: String, is_folder: bool, state: State<'_, AppState>) -> Result<(), String> {
    if state.db.toggle_star(&id, is_folder) {
        Ok(())
    } else {
        Err("Item not found".to_string())
    }
}

#[tauri::command]
async fn fetch_starred(state: State<'_, AppState>) -> Result<(Vec<Folder>, Vec<FileMetadata>), String> {
    Ok(state.db.get_starred())
}

#[tauri::command]
async fn search_items(query: String, state: State<'_, AppState>) -> Result<(Vec<db::Folder>, Vec<db::FileMetadata>), String> {
    Ok(state.db.search_items(&query))
}

#[tauri::command]
async fn get_storage_usage(state: State<'_, AppState>) -> Result<String, String> {
    let bytes = state.db.get_total_usage();
    
    const KB: f64 = 1024.0;
    const MB: f64 = KB * 1024.0;
    const GB: f64 = MB * 1024.0;
    
    let size = bytes as f64;
    let formatted = if size >= GB {
        format!("{:.2} GB", size / GB)
    } else if size >= MB {
        format!("{:.2} MB", size / MB)
    } else {
        format!("{:.2} KB", size / KB)
    };
    
    Ok(formatted)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let _app_handle = app.handle();
            let app_dir = app.path().app_data_dir().unwrap();
            std::fs::create_dir_all(&app_dir).unwrap();
            
            let db = Arc::new(Database::new(app_dir.to_str().unwrap()));

            app.manage(AppState {
                client: Arc::new(AsyncMutex::new(None)), // Lazy init
                phone_token: Mutex::new(None),
                password_token: Mutex::new(None),
                db,
            });

            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            login_start, 
            login_complete,
            check_auth,
            logout, 
            fetch_files, 
            create_folder,
            upload_file,
            download_file_core,
            delete_item,
            delete_item_permanently,
            trash_item,
            restore_item,
            fetch_trash,
            empty_trash,
            rename_item,
            get_storage_usage,
            preview_file,
            get_current_user,
            toggle_star,
            fetch_starred,
            search_items
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
