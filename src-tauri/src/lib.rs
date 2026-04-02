mod commands;
mod errors;
mod models;
mod services;

use commands::ai_commands;
use commands::backup_commands;
use commands::file_commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // File commands
            file_commands::list_files,
            file_commands::get_file_tree,
            file_commands::read_file,
            file_commands::write_file,
            file_commands::delete_file,
            file_commands::rename_file,
            file_commands::create_directory,
            file_commands::import_file,
            file_commands::move_entry,
            // Backup commands
            backup_commands::create_backup,
            backup_commands::list_backups,
            backup_commands::restore_backup,
            backup_commands::delete_backup,
            // AI commands
            ai_commands::ai_summarize,
            ai_commands::ai_search,
            ai_commands::ai_suggest_tags,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
