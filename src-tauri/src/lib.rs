use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeepSeekCommandRequest {
  mode: String,
  payload: Value,
}

#[derive(Debug, Serialize)]
struct AiResponse {
  content: String,
  model: String,
  usage: Option<Value>,
  error: Option<String>,
}

#[tauri::command]
async fn ask_deepseek(request: DeepSeekCommandRequest) -> Result<AiResponse, String> {
  dotenvy::dotenv().ok();
  dotenvy::from_path("../.env").ok();

  let api_key = std::env::var("DEEPSEEK_API_KEY")
    .map_err(|_| "缺少 DEEPSEEK_API_KEY。请在项目根目录创建 .env 并填入密钥。".to_string())?;

  let (model, thinking, system_prompt) = match request.mode.as_str() {
    "roleplay" => (
      "deepseek-v4-flash",
      json!({ "type": "disabled" }),
      "你是《真相圆桌》的AI1角色演绎AI。你只能扮演payload中的当前角色，只能使用payload给你的角色信息、可见事实和私密事实。禁止读取或编造全局真相，禁止主动自爆，禁止替玩家推理。用中文自然回答，控制在120字以内。",
    ),
    "assistant_summary" => (
      "deepseek-v4-pro",
      json!({ "type": "disabled" }),
      "你是《真相圆桌》的AI2真相辅助AI。你拥有完整案件资料，但被强制封印答案。禁止直接说出主谋、包庇者、无辜者、谁在撒谎、正确答案。你必须只输出合法 json，不要 Markdown，不要代码块，不要解释文字。json 格式示例：{\"timeline\":[\"按时间顺序整理事件和发言来源\"],\"contradictions\":[\"列出前后不一致或互相冲突之处\"],\"suspicions\":[\"列出值得继续盘问的人和追问方向，但不要给答案\"],\"clueGaps\":[\"列出目前缺少的信息或证据\"]}。四个键 timeline、contradictions、suspicions、clueGaps 必须全部存在，值必须都是字符串数组。",
    ),
    "evidence_check" => (
      "deepseek-v4-flash",
      json!({ "type": "disabled" }),
      "你是《真相圆桌》的AI2轻量证据触发检测器。你只判断本轮盘问是否自然触发了某些 evidenceSlots。只要玩家提出核实某个方向、时间段、地点、行动轨迹、物品去向，即使角色否认，也可以触发对应 evidenceSlot。禁止角色扮演，禁止解释，禁止输出证据内容，禁止说出答案。你必须只输出合法 json，不要 Markdown，不要代码块。json 格式必须是：{\"triggeredEvidenceIds\":[]}，数组里只能放 payload.evidenceSlots 中存在的 id。",
    ),
    other => return Err(format!("未知 AI 模式：{other}")),
  };

  let mut body = json!({
    "model": model,
    "thinking": thinking,
    "messages": [
      { "role": "system", "content": system_prompt },
      { "role": "user", "content": serde_json::to_string_pretty(&request.payload).unwrap_or_default() }
    ],
    "temperature": if request.mode == "roleplay" { 0.86 } else { 0.2 },
    "max_tokens": match request.mode.as_str() {
      "roleplay" => 360,
      "evidence_check" => 220,
      _ => 1400,
    }
  });

  if request.mode == "assistant_summary" || request.mode == "evidence_check" {
    body["response_format"] = json!({ "type": "json_object" });
  }

  let client = reqwest::Client::new();
  let response = client
    .post("https://api.deepseek.com/chat/completions")
    .bearer_auth(api_key)
    .json(&body)
    .send()
    .await
    .map_err(|error| format!("DeepSeek 请求失败：{error}"))?;

  let status = response.status();
  let response_json: Value = response
    .json()
    .await
    .map_err(|error| format!("DeepSeek 响应解析失败：{error}"))?;

  if !status.is_success() {
    return Err(format!("DeepSeek 返回错误 {status}: {response_json}"));
  }

  let content = response_json["choices"][0]["message"]["content"]
    .as_str()
    .unwrap_or("")
    .trim()
    .to_string();

  if content.is_empty() {
    return Err("DeepSeek 返回了空内容。".to_string());
  }

  Ok(AiResponse {
    content,
    model: model.to_string(),
    usage: response_json.get("usage").cloned(),
    error: None,
  })
}

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
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![ask_deepseek])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
