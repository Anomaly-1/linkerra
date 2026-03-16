use std::path::Path;
use std::path::PathBuf;
use std::str::FromStr;

use iroh::endpoint::Endpoint;
use iroh::protocol::Router;

use iroh_blobs::{
    net_protocol::Blobs, rpc::client::blobs::WrapOption, store::ExportFormat, store::ExportMode,
    ticket::BlobTicket, util::SetTagOption,
};

use qrcode::render::svg;
use qrcode::QrCode;
use serde::Deserialize;
use serde::Serialize;
use std::env;
use std::{sync::Arc, time::Duration};
use tokio::sync::Mutex;
use tokio::task;

use crate::task::spawn_blocking;
use ::tauri::Emitter;
use regex::Regex;
use std::collections::HashMap;
use std::ffi::OsStr;
use std::fs;
use std::io::{BufRead, BufReader};
use std::process::Command;
use tauri::AppHandle;
use tauri::Manager;
use walkdir::WalkDir;

// Future reminder when shipping to android and ios
// IOS: Add camera permission in src-tauri/Info.ios.plist:
// ANDROID: Android: Plugin handles runtime camera permissions; ensure allow permissions are configured in mobile.json.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
                //app.handle().plugin(tauri_plugin_barcode_scanner::init())?;
            }
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            send,
            receive,
            scan_directory,
            detect_junk,
            categorize_files,
            dry_run_rename,
            apply_renaming,
            sync,
            convert_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn send(path: String) -> Result<(String, String), String> {
    let abs = match std::fs::canonicalize(&path) {
        Ok(p) => p,
        Err(e) => return Err(format!("Invalid path: {}", e)),
    };

    let abs_clone = abs.clone();

    // arc+mutex to share and mutate the router inside the background task
    let router_handle = Arc::new(Mutex::new(None));
    let router_handle_clone = Arc::clone(&router_handle);

    // Start endpoint and build router + ticket
    let endpoint = Endpoint::builder()
        .discovery_n0()
        .discovery_local_network()
        .discovery_dht()
        .bind()
        .await
        .map_err(|e| e.to_string())?;

    let blobs = Blobs::memory().build(&endpoint);

    let router = Router::builder(endpoint.clone())
        .accept(iroh_blobs::ALPN, blobs.clone())
        .spawn();

    // Save router to shared state
    {
        let mut guard = router_handle_clone.lock().await;
        *guard = Some(router.clone());
    }

    // Spawn a task that will shut down the router in the background after 90 seconds
    task::spawn(async move {
        tokio::time::sleep(Duration::from_secs(90)).await;
        if let Some(router) = router_handle.lock().await.take() {
            let _ = router.shutdown().await;
        }
    });

    let blob = blobs
        .client()
        .add_from_path(abs_clone, true, SetTagOption::Auto, WrapOption::NoWrap)
        .await
        .map_err(|e| e.to_string())?
        .finish()
        .await
        .map_err(|e| e.to_string())?;

    let ticket = BlobTicket::new(endpoint.node_id().into(), blob.hash, blob.format)
        .map_err(|e| e.to_string())?;
    let ticket_string = ticket.to_string();

    let svg = QrCode::new(&ticket_string)
        .map_err(|e| e.to_string())?
        .render::<svg::Color>()
        .min_dimensions(200, 200)
        .build();

    Ok((ticket_string, svg))
}

#[tauri::command]
async fn receive(ticket_string: String, destination_path: String) -> Result<String, String> {
    let result: Result<String, Box<dyn std::error::Error>> = async {
        let ticket = BlobTicket::from_str(&ticket_string)?;

        let endpoint = Endpoint::builder()
            .discovery_n0()
            .discovery_local_network()
            .discovery_dht()
            .bind()
            .await?;
        let blobs = Blobs::memory().build(&endpoint);

        let router = Router::builder(endpoint.clone())
            .accept(iroh_blobs::ALPN, blobs.clone())
            .spawn();

        println!("Starting download...");

        blobs
            .client()
            .download(ticket.hash(), ticket.node_addr().clone())
            .await?
            .finish()
            .await?;

        println!("Finished download. Copying to destination...");

        let mut destination = PathBuf::from(destination_path);

        println!("Current directory: {:?}", std::env::current_dir()?);

        if !destination.is_absolute() {
            destination = std::env::current_dir()?.join(destination);
        }

        blobs
            .client()
            .export(
                ticket.hash(),
                destination.clone(),
                ExportFormat::Blob,
                ExportMode::Copy,
            )
            .await?
            .finish()
            .await?;

        println!("Finished copying to {:?}", destination);

        router.shutdown().await?;

        Ok(destination.to_string_lossy().to_string())
    }
    .await;

    result.map_err(|e| e.to_string())
}

#[derive(Clone, serde::Serialize)]
struct FileNode {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub is_dir: bool,
    pub children: Option<Vec<FileNode>>,
    pub category: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct IncomingFileNode {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub is_dir: bool,
    pub children: Option<Vec<IncomingFileNode>>,
}

#[derive(Clone, serde::Serialize)]
pub struct CategorizedFileNode {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub is_dir: bool,
    pub category: Option<String>,
    pub children: Option<Vec<CategorizedFileNode>>,
}

#[derive(serde::Serialize)]
struct CategorizationResult {
    categorized: Vec<CategorizedFileNode>,
    data: HashMap<String, usize>,
}

#[tauri::command]
async fn scan_directory(app: tauri::AppHandle, path: String) -> Result<Vec<FileNode>, String> {
    spawn_blocking(move || {
        // Inner blocking closure
        let root = PathBuf::from(&path);
        if !root.is_dir() {
            return Err("Not a directory".into());
        }
        let total = WalkDir::new(&root)
            .into_iter()
            .filter_map(Result::ok)
            .filter(|e| e.path().is_file())
            .count();

        let mut scanned = 0usize;

        fn recurse(
            p: &Path,
            total: usize,
            scanned: &mut usize,
            app: &tauri::AppHandle,
        ) -> Option<FileNode> {
            let md = fs::metadata(p).ok()?;
            let name = p.file_name()?.to_string_lossy().into_owned();
            let path = p.to_string_lossy().into_owned();
            let is_dir = md.is_dir();

            if is_dir {
                let mut kids = vec![];
                for e in fs::read_dir(p).ok()?.filter_map(Result::ok) {
                    if let Some(c) = recurse(&e.path(), total, scanned, app) {
                        kids.push(c);
                    }
                }
                let size = kids.iter().map(|c| c.size).sum();
                Some(FileNode {
                    name,
                    path,
                    size,
                    is_dir: true,
                    children: Some(kids),
                    category: None,
                })
            } else {
                *scanned += 1;
                let pct = (*scanned as f64 / total as f64) * 100.0;
                let _ = app.emit("scan_progress", pct);
                Some(FileNode {
                    name,
                    path,
                    size: md.len(),
                    is_dir: false,
                    children: None,
                    category: None,
                })
            }
        }

        let mut result = vec![];
        for e in fs::read_dir(&root).map_err(|e| e.to_string())? {
            let entry = e.map_err(|e| e.to_string())?;
            if let Some(n) = recurse(&entry.path(), total, &mut scanned, &app) {
                result.push(n);
            }
        }

        Ok(result)
    })
    .await
    .map_err(|e| e.to_string()) // join error
    .and_then(|res| res)
}

#[derive(Clone, serde::Serialize)]
pub struct JunkFile {
    pub name: String,
    pub path: String,
    pub size: u64,
}

#[tauri::command]
fn detect_junk(nodes: Vec<IncomingFileNode>) -> Result<Vec<JunkFile>, String> {
    fn is_junk_file(file: &IncomingFileNode) -> bool {
        let junk_keywords = ["tmp", "cache", "log", "~", "temp"];
        let junk_extensions = ["bak", "tmp", "old", "log"];
        let name = file.name.to_lowercase();

        // Keyword match
        if junk_keywords.iter().any(|kw| name.contains(kw)) {
            return true;
        }

        // Extension match
        if let Some(ext) = Path::new(&file.name).extension().and_then(|e| e.to_str()) {
            if junk_extensions.contains(&ext.to_lowercase().as_str()) {
                return true;
            }
        }

        // Empty file
        if file.size == 0 {
            return true;
        }

        false
    }

    fn recurse(node: &IncomingFileNode, junk_files: &mut Vec<JunkFile>) {
        if node.is_dir {
            if let Some(children) = &node.children {
                for child in children {
                    recurse(child, junk_files);
                }
            }
        } else if is_junk_file(node) {
            junk_files.push(JunkFile {
                name: node.name.clone(),
                path: node.path.clone(),
                size: node.size,
            });
        }
    }

    let mut junk_files = vec![];
    for node in &nodes {
        recurse(node, &mut junk_files);
    }

    Ok(junk_files)
}

#[tauri::command]
fn categorize_files(nodes: Vec<IncomingFileNode>) -> Result<CategorizationResult, String> {
    let native_tree: Vec<FileNode> = nodes.into_iter().map(to_filenode).collect();
    let (categorized, hashmap) = do_categorization(native_tree);
    Ok(CategorizationResult {
        categorized,
        data: hashmap,
    })
}

fn do_categorization(nodes: Vec<FileNode>) -> (Vec<CategorizedFileNode>, HashMap<String, usize>) {
    let mut category_counts: HashMap<String, usize> = HashMap::new();

    fn recurse(node: &FileNode, counts: &mut HashMap<String, usize>) -> CategorizedFileNode {
        let category = if node.is_dir {
            None
        } else {
            let cat = categorize_by_extension(&node.name);
            *counts.entry(cat.clone()).or_insert(0) += 1;
            Some(cat)
        };

        let children = node.children.as_ref().map(|child_nodes| {
            child_nodes
                .iter()
                .map(|child| recurse(child, counts))
                .collect::<Vec<_>>()
        });

        CategorizedFileNode {
            name: node.name.clone(),
            path: node.path.clone(),
            size: node.size,
            is_dir: node.is_dir,
            category,
            children,
        }
    }

    let updated_tree = nodes
        .iter()
        .map(|node| recurse(node, &mut category_counts))
        .collect();

    (updated_tree, category_counts)
}

fn categorize_by_extension(name: &str) -> String {
    let ext = PathBuf::from(name)
        .extension()
        .and_then(std::ffi::OsStr::to_str)
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "jpg" | "png" | "jpeg" | "gif" | "heic" | "heif" | "webp" => "images",
        "mp4" | "mov" | "mkv" => "videos",
        "mp3" | "wav" | "ogg" | "flac" => "audio",
        "pdf" | "docx" | "txt" | "py" | "rs" | "md" | "html" | "css" | "ts" | "tsx" | "jsx"
        | "js" | "json" | "swift" | "xml" | "csv" | "ppt" | "pptx" | "pages" | "numbers"
        | "rtf" => "documents",
        "zip" | "rar" | "tar" | "gz" => "archives",
        _ => "others",
    }
    .to_string()
}

fn to_filenode(input: IncomingFileNode) -> FileNode {
    FileNode {
        name: input.name,
        path: input.path,
        size: input.size,
        is_dir: input.is_dir,
        children: input
            .children
            .map(|children| children.into_iter().map(to_filenode).collect()),
        category: None,
    }
}

#[tauri::command]
fn sync(app: tauri::AppHandle, drive_path: String, local_path: String) -> Result<(), String> {
    use std::collections::HashSet;
    use std::fs;
    use std::path::{Path, PathBuf};
    use walkdir::WalkDir;

    // Run the sync logic in a background thread
    tauri::async_runtime::spawn_blocking(move || {
        let drive_root = PathBuf::from(&drive_path);
        let local_root = PathBuf::from(&local_path);

        if !drive_root.is_dir() || !local_root.is_dir() {
            return Err("One or both paths are not valid directories.".into());
        }

        // Total file count for progress tracking
        let total_files: usize = WalkDir::new(&drive_root)
            .into_iter()
            .filter_map(Result::ok)
            .filter(|e| e.path().is_file())
            .count();

        let mut synced_files = 0usize;
        let mut conflicts = vec![];

        for entry in WalkDir::new(&drive_root).into_iter().filter_map(Result::ok) {
            let drive_file_path = entry.path();

            if drive_file_path.is_file() {
                // Derive relative path from drive root
                let relative_path = match drive_file_path.strip_prefix(&drive_root) {
                    Ok(p) => p,
                    Err(_) => continue,
                };

                let local_file_path = local_root.join(relative_path);

                // If the local file exists, check size or modification time for difference
                if local_file_path.exists() {
                    let local_meta = fs::metadata(&local_file_path).ok();
                    let drive_meta = fs::metadata(&drive_file_path).ok();

                    let differs = match (local_meta, drive_meta) {
                        (Some(l), Some(d)) => l.len() != d.len(), // Could also compare mod times
                        _ => true,
                    };

                    if differs {
                        // Conflict: file exists with different content
                        conflicts.push(local_file_path.display().to_string());
                        continue;
                    }
                } else {
                    // Create parent directory if it doesn't exist
                    if let Some(parent) = local_file_path.parent() {
                        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                    }

                    // Copy file from drive to local
                    fs::copy(&drive_file_path, &local_file_path).map_err(|e| e.to_string())?;
                }

                // Progress update
                synced_files += 1;
                let progress = (synced_files as f64 / total_files as f64) * 100.0;
                let _ = app.emit("sync_progress", progress);
            }
        }

        if !conflicts.is_empty() {
            return Err(format!(
                "Sync completed with conflicts on the following files:\n{}",
                conflicts.join("\n")
            ));
        }

        Ok(())
    });

    Ok(())
}

#[tauri::command]
fn convert_file(
    input_path: String,
    output_format: String,
    output_dir: String,
) -> Result<(), String> {
    let input = PathBuf::from(&input_path);
    if !input.exists() {
        return Err("Input file does not exist".into());
    }

    // Validate output directory
    let out_dir = PathBuf::from(&output_dir);
    if !out_dir.exists() || !out_dir.is_dir() {
        return Err("Output directory is invalid".into());
    }

    // Extract base name
    let input_filename = input
        .file_stem()
        .ok_or_else(|| "Failed to extract input file name".to_string())?
        .to_string_lossy();

    // Build final output path
    let output_file_path = out_dir.join(format!("{}.{}", input_filename, output_format));

    println!(
        "{}",
        output_file_path.to_str().ok_or("Invalid output path")?
    );

    // Run FFmpeg
    let status = Command::new("ffmpeg")
        .args([
            "-y", // Overwrite without prompt
            "-i",
            &input_path,                                             // Input file
            output_file_path.to_str().ok_or("Invalid output path")?, // Output file
        ])
        .status()
        .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;

    // Check if ffmpeg succeeded
    if !status.success() {
        return Err(format!("ffmpeg failed with exit code: {}", status));
    }

    Ok(())
}

#[tauri::command]
fn dry_run_rename(files: Vec<String>) -> Result<HashMap<String, String>, String> {
    let mut result = HashMap::new();
    for (i, file) in files.iter().enumerate() {
        let original = PathBuf::from(file);
        if let Some(parent) = original.parent() {
            if let Some(ext) = original.extension() {
                let new_name = format!("organized_file_{}.{}", i + 1, ext.to_string_lossy());
                let new_path = parent.join(new_name);
                result.insert(file.clone(), new_path.to_string_lossy().to_string());
            }
        }
    }
    Ok(result)
}

#[tauri::command]
fn apply_renaming(rename_map: HashMap<String, String>) -> Result<(), String> {
    for (old_path, new_path) in rename_map {
        fs::rename(old_path, new_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}
