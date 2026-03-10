// Pluely AI Speech Detection, and capture system audio (speaker output) as a stream of f32 samples.
use crate::speaker::{AudioDevice, SpeakerInput};
use anyhow::Result;
use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use futures_util::StreamExt;
use hound::{WavSpec, WavWriter};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::io::Cursor;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use tracing::{error, info, warn};

// VAD Configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VadConfig {
    pub enabled: bool,
    pub hop_size: usize,
    pub sensitivity_rms: f32,
    pub peak_threshold: f32,
    pub silence_chunks: usize,
    pub min_speech_chunks: usize,
    pub pre_speech_chunks: usize,
    pub noise_gate_threshold: f32,
    pub max_recording_duration_secs: u64,
}

impl Default for VadConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            hop_size: 1024,
            sensitivity_rms: 0.012, // Much less sensitive - only real speech
            peak_threshold: 0.035,  // Higher threshold - filters clicks/noise
            silence_chunks: 45,     // ~1.0s of silence before stopping
            min_speech_chunks: 7,   // ~0.16s - captures short answers
            pre_speech_chunks: 12,  // ~0.27s - enough to catch word start
            noise_gate_threshold: 0.003, // Stronger noise filtering
            max_recording_duration_secs: 180, // 3 minutes default
        }
    }
}

#[tauri::command]
pub async fn start_system_audio_capture(
    app: AppHandle,
    vad_config: Option<VadConfig>,
    device_id: Option<String>,
) -> Result<(), String> {
    let state = app.state::<crate::AudioState>();

    // R1: capture_command_start
    let mode = vad_config
        .as_ref()
        .map(|c| c.enabled)
        .unwrap_or(false);
    info!("[speaker] capture_command_start mode={} device_id={:?}", mode, device_id);

    // Check if already capturing (atomic check)
    {
        let guard = state
            .stream_task
            .lock()
            .map_err(|e| format!("Failed to acquire lock: {}", e))?;

        if guard.is_some() {
            // R2: capture_command_start_rejected
            warn!("[speaker] capture_command_start_rejected reason=\"capture already running\"");
            return Err("Capture already running".to_string());
        }
    }

    // Update VAD config if provided
    if let Some(config) = vad_config {
        let mut vad_cfg = state
            .vad_config
            .lock()
            .map_err(|e| format!("Failed to acquire VAD config lock: {}", e))?;
        *vad_cfg = config;
    }

    let input = SpeakerInput::new_with_device(device_id).map_err(|e| {
        error!("Failed to create speaker input: {}", e);
        format!("Failed to access system audio: {}", e)
    })?;

    let stream = input.stream();
    let sr = stream.sample_rate();

    // Validate sample rate
    if !(8000..=96000).contains(&sr) {
        error!("Invalid sample rate: {}", sr);
        return Err(format!(
            "Invalid sample rate: {}. Expected 8000-96000 Hz",
            sr
        ));
    }

    let app_clone = app.clone();
    state.stop_requested.store(false, Ordering::Release);
    state.flush_requested.store(false, Ordering::Release);
    let vad_config = state
        .vad_config
        .lock()
        .map_err(|e| format!("Failed to read VAD config: {}", e))?
        .clone();
    let stop_requested = state.stop_requested.clone();
    let flush_requested = state.flush_requested.clone();

    // Mark as capturing BEFORE spawning task
    *state
        .is_capturing
        .lock()
        .map_err(|e| format!("Failed to set capturing state: {}", e))? = true;

    // Emit capture started event
    let _ = app_clone.emit("capture-started", sr);

    let state_clone = app.state::<crate::AudioState>();

    // R5: capture_task_spawned
    let sample_rate = sr;
    info!("[speaker] capture_task_spawned mode={} sample_rate={}", mode, sample_rate);

    let task = tokio::spawn(async move {
        let task_mode = if vad_config.enabled { "vad" } else { "continuous" };

        if vad_config.enabled {
            run_vad_capture(
                app_clone.clone(),
                stream,
                sr,
                vad_config,
                stop_requested.clone(),
                flush_requested.clone(),
            )
            .await;
        } else {
            run_continuous_capture(
                app_clone.clone(),
                stream,
                sr,
                vad_config,
                stop_requested.clone(),
                flush_requested.clone(),
            )
            .await;
        }

        // R6: capture_task_exiting (determine exit reason based on state)
        let exit_reason = if stop_requested.load(Ordering::Acquire) {
            "stop_requested"
        } else if flush_requested.load(Ordering::Acquire) {
            "flush_requested"
        } else {
            "stream_ended"
        };
        info!("[speaker] capture_task_exiting mode={} exit_reason={}", task_mode, exit_reason);

        let state = app_clone.state::<crate::AudioState>();
        let is_capturing = state.is_capturing.clone();
        {
            if let Ok(mut guard) = state.stream_task.lock() {
                *guard = None;
            }
        }
        {
            if let Ok(mut capturing_guard) = is_capturing.lock() {
                *capturing_guard = false;
            };
        }

        // R7: capture_task_exited
        info!("[speaker] capture_task_exited mode={}", task_mode);
    });

    *state_clone
        .stream_task
        .lock()
        .map_err(|e| format!("Failed to store task: {}", e))? = Some(task);

    Ok(())
}

fn prepare_vad_segment(
    speech_buffer: &[f32],
    speech_chunks: usize,
    silence_chunks: usize,
    config: &VadConfig,
    sr: u32,
    forced_flush: bool,
) -> Option<Vec<f32>> {
    if speech_chunks < config.min_speech_chunks || speech_buffer.is_empty() {
        return None;
    }

    let mut finalized = speech_buffer.to_vec();
    if !forced_flush {
        let silence_duration_samples = silence_chunks * config.hop_size;
        let keep_silence_samples = (sr as usize) * 15 / 100;
        let trim_amount = silence_duration_samples.saturating_sub(keep_silence_samples);

        if finalized.len() > trim_amount {
            finalized.truncate(finalized.len() - trim_amount);
        }
    }

    Some(normalize_audio_level(&finalized, 0.1))
}

fn emit_vad_segment(
    app: &AppHandle,
    speech_buffer: &[f32],
    speech_chunks: usize,
    silence_chunks: usize,
    config: &VadConfig,
    sr: u32,
    forced_flush: bool,
) {
    if let Some(segment) = prepare_vad_segment(
        speech_buffer,
        speech_chunks,
        silence_chunks,
        config,
        sr,
        forced_flush,
    ) {
        if let Ok(b64) = samples_to_wav_b64(sr, &segment) {
            // R9: vad_segment_emitted
            info!("[speaker] vad_segment_emitted forced_flush={} speech_chunks={} segment_samples={}", forced_flush, speech_chunks, segment.len());
            let _ = app.emit("speech-detected", b64);
        } else {
            // R10: vad_segment_discarded (encode failed)
            info!("[speaker] vad_segment_discarded reason=\"encode_failed\"");
            error!("Failed to encode speech to WAV");
            let _ = app.emit("audio-encoding-error", "Failed to encode speech");
        }
    } else {
        // R10: vad_segment_discarded (too short)
        info!("[speaker] vad_segment_discarded reason=\"too_short\"");
        let _ = app.emit(
            "speech-discarded",
            "Audio too short (likely background noise)",
        );
    }
}

// VAD-enabled capture - OPTIMIZED for real-time speech detection
async fn run_vad_capture(
    app: AppHandle,
    stream: impl StreamExt<Item = f32> + Unpin,
    sr: u32,
    config: VadConfig,
    stop_requested: Arc<AtomicBool>,
    flush_requested: Arc<AtomicBool>,
) {
    let mut stream = stream;
    let mut buffer: VecDeque<f32> = VecDeque::new();
    let mut pre_speech: VecDeque<f32> =
        VecDeque::with_capacity(config.pre_speech_chunks * config.hop_size);
    let mut speech_buffer = Vec::new();
    let mut in_speech = false;
    let mut silence_chunks = 0;
    let mut speech_chunks = 0;
    let max_samples = sr as usize * 30; // 30s safety cap per utterance

    loop {
        if stop_requested.load(Ordering::Acquire) {
            break;
        }

        tokio::select! {
            sample_opt = stream.next() => {
                match sample_opt {
                    Some(sample) => buffer.push_back(sample),
                    None => break,
                }
            }
            _ = tokio::time::sleep(tokio::time::Duration::from_millis(10)) => {}
        }

        if stop_requested.load(Ordering::Acquire) {
            break;
        }

        if flush_requested.swap(false, Ordering::AcqRel) {
            // R8: vad_segment_emit_requested
            info!("[speaker] vad_segment_emit_requested forced_flush=true speech_chunks={} buffer_samples={}", speech_chunks, speech_buffer.len());

            emit_vad_segment(
                &app,
                &speech_buffer,
                speech_chunks,
                silence_chunks,
                &config,
                sr,
                true,
            );
            speech_buffer.clear();
            pre_speech.clear();
            in_speech = false;
            silence_chunks = 0;
            speech_chunks = 0;
            continue;
        }

        // Process in fixed chunks for VAD analysis
        while buffer.len() >= config.hop_size {
            if stop_requested.load(Ordering::Acquire) {
                break;
            }

            let mut mono = Vec::with_capacity(config.hop_size);
            for _ in 0..config.hop_size {
                if let Some(v) = buffer.pop_front() {
                    mono.push(v);
                }
            }

            // Apply noise gate BEFORE VAD (critical for accuracy)
            let mono = apply_noise_gate(&mono, config.noise_gate_threshold);

            let (rms, peak) = calculate_audio_metrics(&mono);
            let is_speech = rms > config.sensitivity_rms || peak > config.peak_threshold;

            if is_speech {
                if !in_speech {
                    // Speech START detected
                    in_speech = true;
                    speech_chunks = 0;

                    // Include pre-speech buffer for natural sound
                    speech_buffer.extend(pre_speech.drain(..));

                    let _ = app.emit("speech-start", ());
                }

                speech_chunks += 1;
                speech_buffer.extend_from_slice(&mono);
                silence_chunks = 0; // Reset silence counter on any speech

                // Safety cap: force emit if exceeds 30s
                if speech_buffer.len() > max_samples {
                    emit_vad_segment(&app, &speech_buffer, speech_chunks, 0, &config, sr, true);
                    speech_buffer.clear();
                    pre_speech.clear();
                    in_speech = false;
                    silence_chunks = 0;
                    speech_chunks = 0;
                }
            } else {
                // Silence detected
                if in_speech {
                    silence_chunks += 1;

                    // Continue collecting during silence (important for natural speech)
                    speech_buffer.extend_from_slice(&mono);

                    // Check if silence duration exceeds threshold
                    if silence_chunks >= config.silence_chunks {
                        emit_vad_segment(
                            &app,
                            &speech_buffer,
                            speech_chunks,
                            silence_chunks,
                            &config,
                            sr,
                            false,
                        );

                        // Reset for next speech detection
                        speech_buffer.clear();
                        pre_speech.clear();
                        in_speech = false;
                        silence_chunks = 0;
                        speech_chunks = 0;
                    }
                } else {
                    // Not in speech yet - maintain rolling pre-speech buffer
                    pre_speech.extend(mono.into_iter());

                    // Trim excess (maintain fixed size)
                    while pre_speech.len() > config.pre_speech_chunks * config.hop_size {
                        pre_speech.pop_front();
                    }

                    // Periodically shrink capacity to prevent memory bloat
                    if pre_speech.len() == config.pre_speech_chunks * config.hop_size {
                        pre_speech.shrink_to_fit();
                    }
                }
            }
        }
    }
}

// Continuous capture (VAD disabled)
async fn run_continuous_capture(
    app: AppHandle,
    stream: impl StreamExt<Item = f32> + Unpin,
    sr: u32,
    config: VadConfig,
    stop_requested: Arc<AtomicBool>,
    flush_requested: Arc<AtomicBool>,
) {
    let mut stream = stream;
    let max_samples = (sr as u64 * config.max_recording_duration_secs) as usize;

    // Pre-allocate buffer to prevent reallocations
    let mut audio_buffer = Vec::with_capacity(max_samples);
    let start_time = Instant::now();
    let max_duration = Duration::from_secs(config.max_recording_duration_secs);

    // Emit recording started
    let _ = app.emit(
        "continuous-recording-start",
        config.max_recording_duration_secs,
    );

    // Accumulate audio - check stop flag on EVERY sample for immediate response
    loop {
        // Check stop flag FIRST on every iteration for immediate stopping
        if stop_requested.load(Ordering::Acquire) || flush_requested.load(Ordering::Acquire) {
            break;
        }

        tokio::select! {
            sample_opt = stream.next() => {
                match sample_opt {
                    Some(sample) => {
                        if stop_requested.load(Ordering::Acquire) || flush_requested.load(Ordering::Acquire) {
                            break;
                        }

                        audio_buffer.push(sample);

                        let elapsed = start_time.elapsed();

                        // Emit progress every second
                        if audio_buffer.len() % (sr as usize) == 0 {
                            let _ = app.emit("recording-progress", elapsed.as_secs());
                        }

                        // Check size limit (safety)
                        if audio_buffer.len() >= max_samples {
                            break;
                        }

                        // Check time limit
                        if elapsed >= max_duration {
                            break;
                        }
                    },
                    None => {
                        warn!("Audio stream ended unexpectedly");
                        break;
                    }
                }
            }
            _ = tokio::time::sleep(tokio::time::Duration::from_millis(10)) => {
            }
        }
    }

    // Process and emit audio
    let was_hard_stop = stop_requested.load(Ordering::Acquire);
    flush_requested.store(false, Ordering::Release);

    // R11: continuous_capture_break
    let elapsed_ms = start_time.elapsed().as_millis();
    info!("[speaker] continuous_capture_break was_hard_stop={} buffer_samples={} elapsed_ms={}", was_hard_stop, audio_buffer.len(), elapsed_ms);

    if !audio_buffer.is_empty() && !was_hard_stop {
        // Apply noise gate
        let cleaned_audio = apply_noise_gate(&audio_buffer, config.noise_gate_threshold);
        let cleaned_audio = normalize_audio_level(&cleaned_audio, 0.1);

        match samples_to_wav_b64(sr, &cleaned_audio) {
            Ok(b64) => {
                // R12: continuous_audio_emitted
                info!("[speaker] continuous_audio_emitted buffer_samples={}", audio_buffer.len());
                let _ = app.emit("speech-detected", b64);
            }
            Err(e) => {
                error!("Failed to encode continuous audio: {}", e);
                let _ = app.emit("audio-encoding-error", e);
            }
        }
    } else if was_hard_stop {
        // R13: continuous_audio_skipped_hard_stop
        info!("[speaker] continuous_audio_skipped_hard_stop");
    } else {
        warn!("No audio captured in continuous mode");
        let _ = app.emit("audio-encoding-error", "No audio recorded");
    }

    let _ = app.emit("continuous-recording-stopped", ());
}

// Apply noise gate
fn apply_noise_gate(samples: &[f32], threshold: f32) -> Vec<f32> {
    const KNEE_RATIO: f32 = 3.0; // Compression ratio for soft knee

    samples
        .iter()
        .map(|&s| {
            let abs = s.abs();
            if abs < threshold {
                s * (abs / threshold).powf(1.0 / KNEE_RATIO)
            } else {
                s
            }
        })
        .collect()
}

// Calculate RMS and peak (optimized)
fn calculate_audio_metrics(chunk: &[f32]) -> (f32, f32) {
    let mut sumsq = 0.0f32;
    let mut peak = 0.0f32;

    for &v in chunk {
        let a = v.abs();
        peak = peak.max(a);
        sumsq += v * v;
    }

    let rms = (sumsq / chunk.len() as f32).sqrt();
    (rms, peak)
}

fn normalize_audio_level(samples: &[f32], target_rms: f32) -> Vec<f32> {
    if samples.is_empty() {
        return Vec::new();
    }

    let sum_squares: f32 = samples.iter().map(|&s| s * s).sum();
    let current_rms = (sum_squares / samples.len() as f32).sqrt();

    if current_rms < 0.001 {
        return samples.to_vec();
    }

    let gain = (target_rms / current_rms).min(10.0);

    samples
        .iter()
        .map(|&s| {
            let amplified = s * gain;
            if amplified.abs() > 1.0 {
                amplified.signum() * (1.0 - (-amplified.abs()).exp())
            } else {
                amplified
            }
        })
        .collect()
}

// Convert samples to WAV base64 (with proper error handling)
fn samples_to_wav_b64(sample_rate: u32, mono_f32: &[f32]) -> Result<String, String> {
    // Validate sample rate
    if !(8000..=96000).contains(&sample_rate) {
        error!("Invalid sample rate: {}", sample_rate);
        return Err(format!(
            "Invalid sample rate: {}. Expected 8000-96000 Hz",
            sample_rate
        ));
    }

    // Validate buffer
    if mono_f32.is_empty() {
        return Err("Empty audio buffer".to_string());
    }

    let mut cursor = Cursor::new(Vec::new());
    let spec = WavSpec {
        channels: 1,
        sample_rate,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };

    let mut writer = WavWriter::new(&mut cursor, spec).map_err(|e| {
        error!("Failed to create WAV writer: {}", e);
        e.to_string()
    })?;

    for &s in mono_f32 {
        let clamped = s.clamp(-1.0, 1.0);
        let sample_i16 = (clamped * i16::MAX as f32) as i16;
        writer.write_sample(sample_i16).map_err(|e| e.to_string())?;
    }

    writer.finalize().map_err(|e| e.to_string())?;

    Ok(B64.encode(cursor.into_inner()))
}

#[tauri::command]
pub async fn stop_system_audio_capture(app: AppHandle) -> Result<(), String> {
    let state = app.state::<crate::AudioState>();
    state.flush_requested.store(false, Ordering::Release);
    state.stop_requested.store(true, Ordering::Release);

    // R3: capture_command_stop
    let task_exists = state.stream_task.lock().map(|g| g.is_some()).unwrap_or(false);
    info!("[speaker] capture_command_stop task_exists={}", task_exists);

    let maybe_task = {
        let mut guard = state
            .stream_task
            .lock()
            .map_err(|e| format!("Failed to acquire task lock: {}", e))?;
        guard.take()
    };

    if let Some(task) = maybe_task {
        task.await
            .map_err(|e| format!("Failed to stop capture task: {}", e))?;
    }

    // Mark as not capturing
    *state
        .is_capturing
        .lock()
        .map_err(|e| format!("Failed to update capturing state: {}", e))? = false;
    state.stop_requested.store(false, Ordering::Release);
    state.flush_requested.store(false, Ordering::Release);

    // Emit stopped event
    let _ = app.emit("capture-stopped", ());
    Ok(())
}

#[tauri::command]
pub async fn flush_system_audio_capture(app: AppHandle) -> Result<(), String> {
    let state = app.state::<crate::AudioState>();
    state.flush_requested.store(true, Ordering::Release);

    // R4: capture_command_flush
    info!("[speaker] capture_command_flush");

    Ok(())
}

/// Manual stop for continuous recording
#[tauri::command]
pub async fn manual_stop_continuous(app: AppHandle) -> Result<(), String> {
    flush_system_audio_capture(app).await
}

#[tauri::command]
pub fn check_system_audio_access(_app: AppHandle) -> Result<bool, String> {
    match SpeakerInput::new() {
        Ok(_) => Ok(true),
        Err(e) => {
            error!("System audio access check failed: {}", e);
            Ok(false)
        }
    }
}

#[tauri::command]
pub async fn request_system_audio_access(app: AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        app.shell()
            .command("open")
            .args(["x-apple.systempreferences:com.apple.preference.security?Privacy_AudioCapture"])
            .spawn()
            .map_err(|e| {
                error!("Failed to open system preferences: {}", e);
                e.to_string()
            })?;
    }
    #[cfg(target_os = "windows")]
    {
        app.shell()
            .command("ms-settings:sound")
            .spawn()
            .map_err(|e| {
                error!("Failed to open sound settings: {}", e);
                e.to_string()
            })?;
    }
    #[cfg(target_os = "linux")]
    {
        let commands = ["pavucontrol", "gnome-control-center sound"];
        let mut opened = false;

        for cmd in &commands {
            if app.shell().command(cmd).spawn().is_ok() {
                opened = true;
                break;
            }
        }

        if !opened {
            warn!("Failed to open audio settings on Linux");
        }
    }

    Ok(())
}

// VAD Configuration Management
#[tauri::command]
pub async fn get_vad_config(app: AppHandle) -> Result<VadConfig, String> {
    let state = app.state::<crate::AudioState>();
    let config = state
        .vad_config
        .lock()
        .map_err(|e| format!("Failed to get VAD config: {}", e))?
        .clone();
    Ok(config)
}

#[tauri::command]
pub async fn update_vad_config(app: AppHandle, config: VadConfig) -> Result<(), String> {
    // Validate config
    if config.sensitivity_rms < 0.0 || config.sensitivity_rms > 1.0 {
        return Err("Invalid sensitivity_rms: must be 0.0-1.0".to_string());
    }
    if config.max_recording_duration_secs > 3600 {
        return Err("Invalid max_recording_duration_secs: must be <= 3600 (1 hour)".to_string());
    }

    let state = app.state::<crate::AudioState>();
    *state
        .vad_config
        .lock()
        .map_err(|e| format!("Failed to update VAD config: {}", e))? = config;

    Ok(())
}

#[tauri::command]
pub async fn get_capture_status(app: AppHandle) -> Result<bool, String> {
    let state = app.state::<crate::AudioState>();
    let is_capturing = *state
        .is_capturing
        .lock()
        .map_err(|e| format!("Failed to get capture status: {}", e))?;
    Ok(is_capturing)
}

#[tauri::command]
pub fn get_audio_sample_rate(_app: AppHandle) -> Result<u32, String> {
    let input = SpeakerInput::new().map_err(|e| {
        error!("Failed to create speaker input: {}", e);
        format!("Failed to access system audio: {}", e)
    })?;

    let stream = input.stream();
    let sr = stream.sample_rate();

    Ok(sr)
}

#[tauri::command]
pub fn get_input_devices() -> Result<Vec<AudioDevice>, String> {
    crate::speaker::list_input_devices().map_err(|e| {
        error!("Failed to get input devices: {}", e);
        format!("Failed to get input devices: {}", e)
    })
}

#[tauri::command]
pub fn get_output_devices() -> Result<Vec<AudioDevice>, String> {
    crate::speaker::list_output_devices().map_err(|e| {
        error!("Failed to get output devices: {}", e);
        format!("Failed to get output devices: {}", e)
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_vad_config() -> VadConfig {
        VadConfig {
            enabled: true,
            hop_size: 4,
            sensitivity_rms: 0.012,
            peak_threshold: 0.035,
            silence_chunks: 3,
            min_speech_chunks: 2,
            pre_speech_chunks: 1,
            noise_gate_threshold: 0.003,
            max_recording_duration_secs: 30,
        }
    }

    #[test]
    fn forced_flush_keeps_buffer_without_trimming_trailing_silence() {
        let config = test_vad_config();
        let buffer = vec![0.2; 4_000];

        let natural = prepare_vad_segment(&buffer, 3, 700, &config, 16_000, false)
            .expect("natural stop should emit a segment");
        let forced = prepare_vad_segment(&buffer, 3, 700, &config, 16_000, true)
            .expect("forced flush should emit a segment");

        assert!(natural.len() < forced.len());
        assert_eq!(forced.len(), buffer.len());
    }

    #[test]
    fn short_forced_flush_is_discarded() {
        let config = test_vad_config();
        let buffer = vec![0.2; 32];

        let segment = prepare_vad_segment(&buffer, 1, 0, &config, 16_000, true);

        assert!(segment.is_none());
    }
}
