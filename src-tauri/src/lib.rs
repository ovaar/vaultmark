mod commands;
mod errors;
mod models;
mod services;

use commands::ai_commands;
use commands::backup_commands;
use commands::file_commands;
use commands::remarkable_commands;
use tauri::menu::{MenuBuilder, SubmenuBuilder};
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let file_menu = SubmenuBuilder::new(app, "File")
                .text("new-file", "New File")
                .text("open-vault", "Open Vault...")
                .separator()
                .text("save", "Save")
                .separator()
                .close_window()
                .quit()
                .build()?;

            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;

            let view_menu = SubmenuBuilder::new(app, "View")
                .text("toggle-sidebar", "Toggle Sidebar")
                .text("command-palette", "Command Palette")
                .separator()
                .text("mode-edit", "Edit Mode")
                .text("mode-split", "Split Mode")
                .text("mode-preview", "Preview Mode")
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&file_menu)
                .item(&edit_menu)
                .item(&view_menu)
                .build()?;

            app.set_menu(menu)?;

            app.on_menu_event(|app_handle, event| {
                let _ = app_handle;
                match event.id().as_ref() {
                    "new-file" | "open-vault" | "save" | "toggle-sidebar" | "command-palette"
                    | "mode-edit" | "mode-split" | "mode-preview" => {
                        // These events are handled on the frontend via window menu event listener
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let id: &str = event.id().as_ref();
                            let _ = window.emit("menu-event", id);
                        }
                    }
                    _ => {}
                }
            });

            Ok(())
        })
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
            // reMarkable commands
            remarkable_commands::remarkable_test_connection,
            remarkable_commands::remarkable_list_files,
            remarkable_commands::remarkable_download_file,
            remarkable_commands::remarkable_upload_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
