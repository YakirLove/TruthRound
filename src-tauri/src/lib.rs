use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{collections::HashMap, sync::Mutex, time::Duration};
use tokio::sync::oneshot;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AiRequest {
    mode: String,
    payload: Value,
    session_id: String,
    request_id: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AiResponse {
    content: String,
    model: String,
    session_id: String,
    request_id: String,
}
#[derive(Default)]
struct Requests(Mutex<HashMap<String, oneshot::Sender<()>>>);
const SERVICE: &str = "com.truthround.game.deepseek";
fn api_key() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    if let Ok(bytes) = security_framework::passwords::get_generic_password(SERVICE, "api-key") {
        if let Ok(key) = String::from_utf8(bytes) {
            if !key.trim().is_empty() {
                return Ok(key);
            }
        }
    }
    if cfg!(debug_assertions) {
        dotenvy::from_path(concat!(env!("CARGO_MANIFEST_DIR"), "/../.env")).ok();
        if let Ok(key) = std::env::var("DEEPSEEK_API_KEY") {
            if !key.trim().is_empty() {
                return Ok(key);
            }
        }
    }
    Err("尚未配置 AI 连接，请在设置中填写 DeepSeek API Key。".into())
}
#[tauri::command]
fn ai_status() -> Value {
    json!({"configured": api_key().is_ok(), "provider": "DeepSeek"})
}
#[tauri::command]
fn save_ai_key(api_key: String) -> Result<(), String> {
    if api_key.trim().is_empty() || api_key.len() > 512 {
        return Err("请输入有效的 API Key。".into());
    }
    #[cfg(target_os = "macos")]
    return security_framework::passwords::set_generic_password(
        SERVICE,
        "api-key",
        api_key.trim().as_bytes(),
    )
    .map_err(|_| "无法写入系统钥匙串。".into());
    #[cfg(not(target_os = "macos"))]
    Err("此开发包仅支持 macOS 钥匙串。".into())
}
#[tauri::command]
fn cancel_ai(request_id: String, requests: tauri::State<'_, Requests>) {
    if let Ok(mut map) = requests.0.lock() {
        if let Some(cancel) = map.remove(&request_id) {
            let _ = cancel.send(());
        }
    }
}
async fn perform(request: &AiRequest) -> Result<AiResponse, String> {
    let key = api_key()?;
    let presets: Value = serde_json::from_str(include_str!("../../shared/ai-presets.json"))
        .map_err(|_| "AI 配置错误")?;
    let preset = presets.get(&request.mode).ok_or("未知 AI 请求类型")?;
    if request.session_id.is_empty()
        || request.request_id.is_empty()
        || !request.payload.is_object()
    {
        return Err("请求参数错误".into());
    }
    let mut body = json!({"model": preset["model"], "temperature": preset["temperature"], "max_tokens": preset["max_tokens"], "thinking": {"type": "disabled"}, "messages": [
    {"role": "system", "content": preset["system"]}, {"role": "user", "content": request.payload.to_string()}]});
    if request.mode != "roleplay" {
        body["response_format"] = json!({"type": "json_object"});
    }
    let client = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(15))
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|_| "无法初始化 AI 连接")?;
    let response = client
        .post("https://api.deepseek.com/chat/completions")
        .bearer_auth(key)
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "AI 请求超时，可以重试。"
            } else {
                "无法连接 AI，请检查网络后重试。"
            }
        })?;
    if !response.status().is_success() {
        return Err(if response.status().as_u16() == 401 {
            "AI 密钥无效，请检查连接设置。".into()
        } else {
            format!(
                "AI 服务暂时不可用（{}），请稍后重试。",
                response.status().as_u16()
            )
        });
    }
    let value: Value = response
        .json()
        .await
        .map_err(|_| "AI 响应格式错误，可以重试。")?;
    let content = value["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .trim();
    if content.is_empty() {
        return Err("AI 未返回有效内容，可以重试。".into());
    }
    Ok(AiResponse {
        content: content.into(),
        model: preset["model"].as_str().unwrap_or("deepseek").into(),
        session_id: request.session_id.clone(),
        request_id: request.request_id.clone(),
    })
}
#[tauri::command]
async fn ask_deepseek(
    request: AiRequest,
    requests: tauri::State<'_, Requests>,
) -> Result<AiResponse, String> {
    let (sender, receiver) = oneshot::channel();
    requests
        .0
        .lock()
        .map_err(|_| "请求状态不可用")?
        .insert(request.request_id.clone(), sender);
    let result = tokio::select! {value = perform(&request) => value, _ = receiver => Err("请求已取消，可以重试。".into())};
    if let Ok(mut map) = requests.0.lock() {
        map.remove(&request.request_id);
    }
    result
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Requests::default())
        .invoke_handler(tauri::generate_handler![
            ask_deepseek,
            cancel_ai,
            ai_status,
            save_ai_key
        ])
        .run(tauri::generate_context!())
        .expect("error while running TruthRound");
}
