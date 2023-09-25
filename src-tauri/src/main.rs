#![windows_subsystem = "windows"]

use tauri::{CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayEvent, WindowEvent, Manager};
use reqwest;

static BASE_URL: &str = "http://wxc50.local/YamahaExtendedControl/v1/";

fn main() {
  let quit = CustomMenuItem::new("quit", "Quit");
  let tray_menu = SystemTrayMenu::new().add_item(quit);

  tauri::Builder::default()
    .system_tray(SystemTray::new().with_menu(tray_menu))
    .on_system_tray_event(|app, event| match event {
      SystemTrayEvent::LeftClick {..} => {
        let window = app.get_window("main").unwrap();
        window.show().unwrap();
        window.set_focus().unwrap();
        app.emit_all("window-visible", {}).unwrap();
      }
      SystemTrayEvent::MenuItemClick { id, .. } => {
        match id.as_str() {
          "quit" => {
            std::process::exit(0);
          }
          _ => {}
        }
      }
      _ => {}
    })
    .on_window_event(|e| {
      match e.event() {
        WindowEvent::Focused(false) => {
          e.window().hide().unwrap();
        }
        _ => {}
      }
    })
    .invoke_handler(tauri::generate_handler![send_request])
    .run(tauri::generate_context!())
    .expect("wut");
}

#[tauri::command]
async fn send_request(url: String) -> Result<String, String> {
  let result: Option<String> = request_helper(BASE_URL.to_owned() + &url).await;

  if let Some(message) = result {
    Ok(message.into())
  } else {
    Err("Error".into())
  }
}

async fn request_helper(url: String) -> Option<String> {
  let resp = request_handler(url).await.unwrap();
  Some(resp.into())
}

async fn request_handler(url: String) -> Result<String, Box<dyn std::error::Error>> {
  let resp = reqwest::get(&url).await?.text().await?;
  Ok(resp)
}

