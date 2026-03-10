# System Audio Logging Implementation Checklist

> 定点日志位设计 - 可编码清单。按此清单逐条实现，每条包含：文件、函数、行号上下文、条件、日志模板、字段、级别。

---

## 约定

- 前端：`console.info` / `console.warn` / `console.error`，统一前缀 `[system-audio]`
- 后端：`tracing::info!` / `tracing::warn!` / `tracing::error!`，统一前缀 `[speaker]`
- 字段名：`sessionId`、`requestId`、`mode`、`action`、`result`、`reason`、`elapsedMs`
- 前端 sessionId 来源：`captureSessionIdRef.current`

---

## 一、前端日志

### 1.1 capture session 生命周期

| 序号 | 文件 | 函数 | 插入位置 | 条件 | 日志模板 | 字段 | 级别 |
|------|------|------|----------|------|----------|------|------|
| F1 | `src/hooks/useSystemAudio.ts` | `startCaptureSession` | 函数入口，`transitionRef.current = true` 之后 | 总是 | `[system-audio] capture_start_requested` | `sessionId`（调用后 +1 的值）、`mode`（config.enabled ? "vad" : "manual"） | info |
| F2 | `src/hooks/useSystemAudio.ts` | `startCaptureSession` | 成功分支，`return true` 之前 | 总是 | `[system-audio] capture_start_succeeded` | `sessionId`、`mode`、`capturing` | info |
| F3 | `src/hooks/useSystemAudio.ts` | `startCaptureSession` | catch 分支，`setError` 之后 | 总是 | `[system-audio] capture_start_failed` | `sessionId`、`reason`（errorMessage） | warn |
| F4 | `src/hooks/useSystemAudio.ts` | `stopCaptureSession` | 函数入口，`captureSessionIdRef.current += 1` 之后 | 总是 | `[system-audio] capture_stop_requested` | `sessionId`（递增后的值）、`closePopover`、`clearOutputs` | info |
| F5 | `src/hooks/useSystemAudio.ts` | `stopCaptureSession` | finally 内，`return stopError === ""` 之前 | 总是 | `[system-audio] capture_stop_succeeded` 或 `capture_stop_failed` | `sessionId`、`result`（ok/failed）、`reason`（stopError 或空） | info / warn |
| F6 | `src/hooks/useSystemAudio.ts` | `restartCaptureSession` | 函数入口 | 总是 | `[system-audio] capture_restart_requested` | `sessionId`、`config.enabled` | info |

### 1.2 模式切换

| 序号 | 文件 | 函数 | 插入位置 | 条件 | 日志模板 | 字段 | 级别 |
|------|------|------|----------|------|----------|------|------|
| F7 | `src/hooks/useSystemAudio.ts` | `updateVadConfiguration` | 函数入口 | 总是 | `[system-audio] mode_change_requested` | `fromMode`（vadConfig.enabled ? "vad" : "manual"）、`toMode`（config.enabled ? "vad" : "manual"）、`capturing` | info |
| F8 | `src/hooks/useSystemAudio.ts` | `updateVadConfiguration` | 调用 `restartCaptureSession` 之前 | `capturing === true` | `[system-audio] mode_change_restart_begin` | `sessionId`、`toMode` | info |
| F9 | `src/hooks/useSystemAudio.ts` | `updateVadConfiguration` | `restartCaptureSession` resolve 之后 | 同上 | `[system-audio] mode_change_restart_done` | `sessionId`、`result`（ok/failed） | info |

### 1.3 flush 与 hard stop 分离

| 序号 | 文件 | 函数 | 插入位置 | 条件 | 日志模板 | 字段 | 级别 |
|------|------|------|----------|------|----------|------|------|
| F10 | `src/hooks/useSystemAudio.ts` | `flushCurrentCapture` | 函数入口，`transitionRef.current = true` 之前 | 总是 | `[system-audio] flush_requested` | `sessionId`、`mode`（isVadMode ? "vad" : "manual"）、`recording`（isRecordingInContinuousMode） | info |
| F11 | `src/hooks/useSystemAudio.ts` | `flushCurrentCapture` | 函数入口，`return` 之前 | 被 guard 拦截时 | `[system-audio] flush_rejected_busy` | `sessionId`、`reason`（isStartingCapture / isStoppingCapture / isFlushingCapture / isAIProcessing 等） | info |
| F12 | `src/hooks/useSystemAudio.ts` | `stopCapture` | 调用 `stopCaptureSession` 之前 | 总是 | `[system-audio] hard_stop_requested` | `sessionId` | info |
| F13 | `src/hooks/useSystemAudio.ts` | `ignoreContinuousRecording` | `invoke("stop_system_audio_capture")` 之前 | 总是 | `[system-audio] manual_recording_discard_requested` | `sessionId` | info |

### 1.4 STT 请求归属

| 序号 | 文件 | 函数 | 插入位置 | 条件 | 日志模板 | 字段 | 级别 |
|------|------|------|----------|------|----------|------|------|
| F14 | `src/hooks/useSystemAudio.ts` | `speech-detected` listener | 收到 event 后，`capturingRef.current` 检查之后 | 总是 | `[system-audio] speech_detected_received` | `sessionId`、`payloadSize`（base64Audio.length） | info |
| F15 | `src/hooks/useSystemAudio.ts` | `speech-detected` listener | `Promise.race` 之前 | 总是 | `[system-audio] stt_request_started` | `sessionId`、`providerId` | info |
| F16 | `src/hooks/useSystemAudio.ts` | `speech-detected` listener | 收到 transcription 后，`sessionId !== captureSessionIdRef.current` 分支内 | 会话已切换 | `[system-audio] stt_request_dropped_stale` | `sessionId`（事件时的）、`currentSessionId`（当前 ref） | warn |
| F17 | `src/hooks/useSystemAudio.ts` | `speech-detected` listener | STT 成功且 sessionId 未变，进入 `processWithAI` 之前 | 总是 | `[system-audio] stt_request_succeeded` | `sessionId`、`transcriptionLength` | info |
| F18 | `src/hooks/useSystemAudio.ts` | `speech-detected` listener | catch 内，`setError` 之前 | 总是 | `[system-audio] stt_request_failed` | `sessionId`、`reason`（sttError.message） | warn |

### 1.5 AI 流式结果归属

| 序号 | 文件 | 函数 | 插入位置 | 条件 | 日志模板 | 字段 | 级别 |
|------|------|------|----------|------|----------|------|------|
| F19 | `src/hooks/useSystemAudio.ts` | `processWithAI` | 进入 try，`setIsAIProcessing(true)` 之后 | 总是 | `[system-audio] ai_request_started` | `sessionId`（aiSessionId）、`providerId` | info |
| F20 | `src/hooks/useSystemAudio.ts` | `processWithAI` | for-await 循环内，`aiFailed = true; break` 分支 | `signal.aborted` 或 `aiSessionId !== captureSessionIdRef.current` | `[system-audio] ai_stream_aborted_or_stale` | `sessionId`（aiSessionId）、`currentSessionId`、`chunkCount`、`responseChars` | warn |
| F21 | `src/hooks/useSystemAudio.ts` | `processWithAI` | catch 内，`aiFailed = true` 之后 | 总是 | `[system-audio] ai_stream_failed` | `sessionId`、`reason` | warn |
| F22 | `src/hooks/useSystemAudio.ts` | `processWithAI` | 落库判断分支，`if (fullResponse && !aiFailed && ...)` 为 false 时 | 有 fullResponse 但未落库 | `[system-audio] ai_response_skip_commit_partial` | `sessionId`、`reason`（aiFailed / aborted / sessionChanged）、`responseChars` | warn |
| F23 | `src/hooks/useSystemAudio.ts` | `processWithAI` | 成功 `setConversation` 之前 | 落库成功 | `[system-audio] ai_response_commit` | `sessionId`、`responseChars` | info |

### 1.6 新建会话

| 序号 | 文件 | 函数 | 插入位置 | 条件 | 日志模板 | 字段 | 级别 |
|------|------|------|----------|------|----------|------|------|
| F24 | `src/hooks/useSystemAudio.ts` | `startNewConversation` | 函数入口，`captureSessionIdRef.current += 1` 之后 | 总是 | `[system-audio] conversation_reset` | `oldSessionId`（递增前）、`newSessionId`（递增后） | info |

---

## 二、后端日志

### 2.1 命令入口

| 序号 | 文件 | 函数 | 插入位置 | 条件 | 日志模板 | 字段 | 级别 |
|------|------|------|----------|------|----------|------|------|
| R1 | `src-tauri/src/speaker/commands.rs` | `start_system_audio_capture` | 函数入口，`let state = ...` 之后 | 总是 | `[speaker] capture_command_start` | `mode`（vad_config.as_ref().map(|c| c.enabled).unwrap_or(false)）、`device_id` | info |
| R2 | `src-tauri/src/speaker/commands.rs` | `start_system_audio_capture` | 检测到 `guard.is_some()` 时，return Err 之前 | 已存在任务 | `[speaker] capture_command_start_rejected` | `reason`（"capture already running"） | warn |
| R3 | `src-tauri/src/speaker/commands.rs` | `stop_system_audio_capture` | 函数入口，`state.stop_requested.store(true)` 之后 | 总是 | `[speaker] capture_command_stop` | `task_exists`（guard.is_some()） | info |
| R4 | `src-tauri/src/speaker/commands.rs` | `flush_system_audio_capture` | 函数入口，`state.flush_requested.store(true)` 之后 | 总是 | `[speaker] capture_command_flush` | （无额外字段） | info |

### 2.2 任务创建与退出

| 序号 | 文件 | 函数 | 插入位置 | 条件 | 日志模板 | 字段 | 级别 |
|------|------|------|----------|------|----------|------|------|
| R5 | `src-tauri/src/speaker/commands.rs` | `start_system_audio_capture` | `tokio::spawn` 之后，`*state_clone.stream_task...lock() = Some(task)` 之前 | 总是 | `[speaker] capture_task_spawned` | `mode`（vad_config.enabled）、`sample_rate` | info |
| R6 | `src-tauri/src/speaker/commands.rs` | `run_vad_capture` / `run_continuous_capture` | 顶层 loop 结束处（break 之前） | 总是 | 在 spawn 的闭包内，loop 退出前记录 | `[speaker] capture_task_exiting` | `mode`、`exit_reason`（stop_requested / flush_requested / stream_ended / max_duration） | info |
| R7 | `src-tauri/src/speaker/commands.rs` | `start_system_audio_capture` 的 spawn 闭包 | finally 块，`*capturing_guard = false` 之后 | 总是 | `[speaker] capture_task_exited` | `mode` | info |

### 2.3 VAD 片段决策

| 序号 | 文件 | 函数 | 插入位置 | 条件 | 日志模板 | 字段 | 级别 |
|------|------|------|----------|------|----------|------|------|
| R8 | `src-tauri/src/speaker/commands.rs` | `run_vad_capture` | `flush_requested.swap(false)` 为 true 时，`emit_vad_segment` 之前 | 总是 | `[speaker] vad_segment_emit_requested` | `forced_flush`（true）、`speech_chunks`、`buffer_samples` | info |
| R9 | `src-tauri/src/speaker/commands.rs` | `emit_vad_segment` | `prepare_vad_segment` 返回 Some 且 emit 成功 | 总是 | `[speaker] vad_segment_emitted` | `forced_flush`、`speech_chunks`、`segment_samples` | info |
| R10 | `src-tauri/src/speaker/commands.rs` | `emit_vad_segment` | `prepare_vad_segment` 返回 None 或 emit 失败 | 总是 | `[speaker] vad_segment_discarded` | `reason`（"too_short" / "encode_failed"） | info |

### 2.4 Continuous 模式结束

| 序号 | 文件 | 函数 | 插入位置 | 条件 | 日志模板 | 字段 | 级别 |
|------|------|------|----------|------|----------|------|------|
| R11 | `src-tauri/src/speaker/commands.rs` | `run_continuous_capture` | loop break 之后，`let was_hard_stop = ...` 之后 | 总是 | `[speaker] continuous_capture_break` | `was_hard_stop`、`buffer_samples`、`elapsed_ms` | info |
| R12 | `src-tauri/src/speaker/commands.rs` | `run_continuous_capture` | `speech-detected` emit 成功 | 总是 | `[speaker] continuous_audio_emitted` | `buffer_samples` | info |
| R13 | `src-tauri/src/speaker/commands.rs` | `run_continuous_capture` | `was_hard_stop` 为 true | 总是 | `[speaker] continuous_audio_skipped_hard_stop` | （无） | info |

### 2.5 Windows 采集线程（可选）

| 序号 | 文件 | 函数 | 插入位置 | 条件 | 日志模板 | 字段 | 级别 |
|------|------|------|----------|------|----------|------|------|
| R14 | `src-tauri/src/speaker/windows.rs` | `capture_audio_loop` | `state.shutdown` 为 true 时 break 之前 | 总是 | `[speaker] windows_capture_loop_break_shutdown` | （无） | info |

---

## 三、最小可落地子集（10 条）

若只实现最小集，优先以下 10 条：

| 序号 | 前端/后端 | 日志 ID | 位置 |
|------|-----------|---------|------|
| 1 | 前端 | F1 | `startCaptureSession` 入口 |
| 2 | 前端 | F4 | `stopCaptureSession` 入口 |
| 3 | 前端 | F10 | `flushCurrentCapture` 入口 |
| 4 | 前端 | F7 | `updateVadConfiguration` 入口 |
| 5 | 前端 | F16 | `speech-detected` sessionId 不匹配分支 |
| 6 | 前端 | F22 | `processWithAI` 未落库分支 |
| 7 | 后端 | R1 | `start_system_audio_capture` 入口 |
| 8 | 后端 | R3 | `stop_system_audio_capture` 入口 |
| 9 | 后端 | R4 | `flush_system_audio_capture` 入口 |
| 10 | 后端 | R7 | spawn 闭包 finally |

---

## 四、实现示例

### 前端（F4）

```typescript
// stopCaptureSession 入口，captureSessionIdRef.current += 1 之后
console.info("[system-audio] capture_stop_requested", {
  sessionId: captureSessionIdRef.current,
  closePopover,
  clearOutputs,
});
```

### 前端（F16）

```typescript
// speech-detected 内，sessionId 不匹配时
if (sessionId !== captureSessionIdRef.current || !capturingRef.current) {
  console.warn("[system-audio] stt_request_dropped_stale", {
    sessionId,
    currentSessionId: captureSessionIdRef.current,
  });
  return;
}
```

### 后端（R1）

```rust
// start_system_audio_capture 入口
let mode = vad_config
    .as_ref()
    .map(|c| c.enabled)
    .unwrap_or(false);
info!("[speaker] capture_command_start mode={} device_id={:?}", mode, device_id);
```

### 后端（R4）

```rust
// flush_system_audio_capture 入口
info!("[speaker] capture_command_flush");
```

---

## 五、验收

- 每条日志在对应场景触发时能在控制台/终端中看到
- 前端：`npm run dev` 后打开 DevTools Console，过滤 `[system-audio]`
- 后端：`cargo tauri dev` 或 `RUST_LOG=info cargo tauri dev`，过滤 `[speaker]`
- 最小集 10 条实现后，场景 1–4 手测时均可复现预期日志序列
