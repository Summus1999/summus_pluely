import { useEffect, useState, useCallback, useRef } from "react";
import { useWindowResize, useGlobalShortcuts } from ".";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useApp } from "@/contexts";
import { fetchSTT, fetchAIResponse } from "@/lib/functions";
import {
  DEFAULT_QUICK_ACTIONS,
  DEFAULT_SYSTEM_PROMPT,
  SPEECH_TO_TEXT_PROVIDERS,
  STORAGE_KEYS,
} from "@/config";
import {
  safeLocalStorage,
  generateConversationTitle,
  saveConversation,
  CONVERSATION_SAVE_DEBOUNCE_MS,
  generateConversationId,
  generateMessageId,
} from "@/lib";
import { Message } from "@/types/completion";
import type { ChatConversation } from "@/types";

// VAD Configuration interface matching Rust
export interface VadConfig {
  enabled: boolean;
  hop_size: number;
  sensitivity_rms: number;
  peak_threshold: number;
  silence_chunks: number;
  min_speech_chunks: number;
  pre_speech_chunks: number;
  noise_gate_threshold: number;
  max_recording_duration_secs: number;
}

// OPTIMIZED VAD defaults - matches backend exactly for perfect performance
const DEFAULT_VAD_CONFIG: VadConfig = {
  enabled: true,
  hop_size: 1024,
  sensitivity_rms: 0.012, // Much less sensitive - only real speech
  peak_threshold: 0.035, // Higher threshold - filters clicks/noise
  silence_chunks: 45, // ~1.0s of required silence
  min_speech_chunks: 7, // ~0.16s - captures short answers
  pre_speech_chunks: 12, // ~0.27s - enough to catch word start
  noise_gate_threshold: 0.003, // Stronger noise filtering
  max_recording_duration_secs: 180, // 3 minutes default
};

export type UseSystemAudioReturnType = ReturnType<typeof useSystemAudio>;

export function useSystemAudio() {
  const { resizeWindow } = useWindowResize();
  const globalShortcuts = useGlobalShortcuts();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [lastTranscription, setLastTranscription] = useState<string>("");
  const [lastAIResponse, setLastAIResponse] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [setupRequired, setSetupRequired] = useState<boolean>(false);
  const [quickActions, setQuickActions] = useState<string[]>([]);
  const [isManagingQuickActions, setIsManagingQuickActions] =
    useState<boolean>(false);
  const [showQuickActions, setShowQuickActions] = useState<boolean>(true);
  const [vadConfig, setVadConfig] = useState<VadConfig>(DEFAULT_VAD_CONFIG);
  const [recordingProgress, setRecordingProgress] = useState<number>(0); // For continuous mode
  const [isContinuousMode, setIsContinuousMode] = useState<boolean>(false);
  const [isRecordingInContinuousMode, setIsRecordingInContinuousMode] =
    useState<boolean>(false);
  const [isStartingCapture, setIsStartingCapture] = useState<boolean>(false);
  const [isStoppingCapture, setIsStoppingCapture] = useState<boolean>(false);
  const [isFlushingCapture, setIsFlushingCapture] = useState<boolean>(false);

  const [conversation, setConversation] = useState<ChatConversation>({
    id: "",
    title: "",
    messages: [],
    createdAt: 0,
    updatedAt: 0,
  });

  // Context management states
  const [useSystemPrompt, setUseSystemPrompt] = useState<boolean>(true);
  const [contextContent, setContextContent] = useState<string>("");

  const {
    selectedSttProvider,
    allSttProviders,
    selectedAIProvider,
    allAiProviders,
    systemPrompt,
    selectedAudioDevices,
  } = useApp();
  const abortControllerRef = useRef<AbortController | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef<boolean>(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const capturingRef = useRef<boolean>(false);
  const transitionRef = useRef<boolean>(false);
  const captureSessionIdRef = useRef<number>(0);

  // Refs to avoid stale closures in the async speech-detected listener
  const selectedSttProviderRef = useRef(selectedSttProvider);
  const allSttProvidersRef = useRef(allSttProviders);
  const processWithAIRef = useRef<typeof processWithAI>(null as any);
  const useSystemPromptRef = useRef(useSystemPrompt);
  const systemPromptRef = useRef(systemPrompt);
  const contextContentRef = useRef(contextContent);
  const conversationRef = useRef(conversation);

  const createEmptyConversation = useCallback(
    (): ChatConversation => ({
      id: generateConversationId("sysaudio"),
      title: "",
      messages: [],
      createdAt: 0,
      updatedAt: 0,
    }),
    []
  );

  const abortActiveAIRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    capturingRef.current = capturing;
  }, [capturing]);

  useEffect(() => {
    transitionRef.current =
      isStartingCapture || isStoppingCapture || isFlushingCapture;
  }, [isStartingCapture, isStoppingCapture, isFlushingCapture]);

  // Keep refs in sync for the speech-detected handler
  useEffect(() => { selectedSttProviderRef.current = selectedSttProvider; }, [selectedSttProvider]);
  useEffect(() => { allSttProvidersRef.current = allSttProviders; }, [allSttProviders]);
  useEffect(() => { useSystemPromptRef.current = useSystemPrompt; }, [useSystemPrompt]);
  useEffect(() => { systemPromptRef.current = systemPrompt; }, [systemPrompt]);
  useEffect(() => { contextContentRef.current = contextContent; }, [contextContent]);
  useEffect(() => { conversationRef.current = conversation; }, [conversation]);

  // Load context settings and VAD config from localStorage on mount
  useEffect(() => {
    const savedContext = safeLocalStorage.getItem(
      STORAGE_KEYS.SYSTEM_AUDIO_CONTEXT
    );
    if (savedContext) {
      try {
        const parsed = JSON.parse(savedContext);
        setUseSystemPrompt(parsed.useSystemPrompt ?? true);
        setContextContent(parsed.contextContent ?? "");
      } catch (error) {
        console.error("Failed to load system audio context:", error);
      }
    }

    // Load VAD config
    const savedVadConfig = safeLocalStorage.getItem("vad_config");
    if (savedVadConfig) {
      try {
        const parsed = JSON.parse(savedVadConfig);
        setVadConfig(parsed);
      } catch (error) {
        console.error("Failed to load VAD config:", error);
      }
    }
  }, []);

  // Load quick actions from localStorage on mount
  useEffect(() => {
    const savedActions = safeLocalStorage.getItem(
      STORAGE_KEYS.SYSTEM_AUDIO_QUICK_ACTIONS
    );
    if (savedActions) {
      try {
        const parsed = JSON.parse(savedActions);
        setQuickActions(parsed);
      } catch (error) {
        console.error("Failed to load quick actions:", error);
        setQuickActions(DEFAULT_QUICK_ACTIONS);
      }
    } else {
      setQuickActions(DEFAULT_QUICK_ACTIONS);
    }
  }, []);

  // Handle continuous recording progress events AND error events
  useEffect(() => {
    let progressUnlisten: (() => void) | undefined;
    let startUnlisten: (() => void) | undefined;
    let stopUnlisten: (() => void) | undefined;
    let errorUnlisten: (() => void) | undefined;
    let discardedUnlisten: (() => void) | undefined;

    const setupContinuousListeners = async () => {
      try {
        // Progress updates (every second)
        progressUnlisten = await listen("recording-progress", (event) => {
          const seconds = event.payload as number;
          setRecordingProgress(seconds);
        });

        // Recording started
        startUnlisten = await listen("continuous-recording-start", () => {
          setRecordingProgress(0);
          setIsRecordingInContinuousMode(true);
          setIsStartingCapture(false);
        });

        // Recording stopped
        stopUnlisten = await listen("continuous-recording-stopped", () => {
          setRecordingProgress(0);
          setIsRecordingInContinuousMode(false);
          setIsStartingCapture(false);
        });

        // Audio encoding errors
        errorUnlisten = await listen("audio-encoding-error", (event) => {
          const errorMsg = event.payload as string;
          console.error("Audio encoding error:", errorMsg);
          setError(`Failed to process audio: ${errorMsg}`);
          setIsProcessing(false);
          setIsAIProcessing(false);
          setIsRecordingInContinuousMode(false);
          setIsFlushingCapture(false);
          setIsStartingCapture(false);
          transitionRef.current = false;
        });

        // Speech discarded (too short)
        discardedUnlisten = await listen("speech-discarded", () => {
          setIsProcessing(false);
          setIsFlushingCapture(false);
          transitionRef.current = false;
        });
      } catch (err) {
        console.error("Failed to setup continuous recording listeners:", err);
      }
    };

    setupContinuousListeners();

    return () => {
      if (progressUnlisten) progressUnlisten();
      if (startUnlisten) startUnlisten();
      if (stopUnlisten) stopUnlisten();
      if (errorUnlisten) errorUnlisten();
      if (discardedUnlisten) discardedUnlisten();
    };
  }, []);

  // Handle single speech detection event (both VAD and continuous modes)
  useEffect(() => {
    let speechUnlisten: (() => void) | undefined;
    let cancelled = false;

    const setupEventListener = async () => {
      try {
        const unlisten = await listen("speech-detected", async (event) => {
          if (cancelled) return;

          const sessionId = captureSessionIdRef.current;

          try {
            if (!capturingRef.current) return;

            const base64Audio = event.payload as string;

            // F14: speech_detected_received
            console.info("[system-audio] speech_detected_received", {
              sessionId,
              payloadSize: base64Audio.length,
            });
            // Convert to blob
            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const audioBlob = new Blob([bytes], { type: "audio/wav" });

            // Read from refs to avoid stale closures
            let currentSttProvider = selectedSttProviderRef.current;
            let currentAllSttProviders = allSttProvidersRef.current;

            // Fallback: if ref is empty, try reading directly from localStorage
            if (!currentSttProvider.provider) {
              try {
                const stored = safeLocalStorage.getItem(STORAGE_KEYS.SELECTED_STT_PROVIDER);
                if (stored) {
                  const parsed = JSON.parse(stored);
                  if (parsed?.provider) {
                    currentSttProvider = parsed;
                    selectedSttProviderRef.current = parsed;
                    console.info("[system-audio] stt_provider_recovered_from_storage", {
                      provider: parsed.provider,
                    });
                  }
                }
              } catch {
                // ignore parse errors
              }
            }

            if (!currentSttProvider.provider) {
              if (sessionId === captureSessionIdRef.current && capturingRef.current) {
                setError("未选择语音服务商。");
              }
              return;
            }

            // Also recover allSttProviders if needed
            if (!currentAllSttProviders.length) {
              currentAllSttProviders = [...SPEECH_TO_TEXT_PROVIDERS];
              allSttProvidersRef.current = currentAllSttProviders;
            }

            const providerConfig = currentAllSttProviders.find(
              (p) => p.id === currentSttProvider.provider
            );

            if (!providerConfig) {
              if (sessionId === captureSessionIdRef.current && capturingRef.current) {
                setError("未找到语音服务商配置。");
              }
              return;
            }

            setIsProcessing(true);
            setError("");

            // Add timeout wrapper for STT request (30 seconds)
            const sttPromise = fetchSTT({
              provider: providerConfig,
              selectedProvider: currentSttProvider,
              audio: audioBlob,
            });

            const timeoutPromise = new Promise<string>((_, reject) => {
              setTimeout(
                () => reject(new Error("Speech transcription timed out (30s)")),
                30000
              );
            });

            // F15: stt_request_started
            console.info("[system-audio] stt_request_started", {
              sessionId,
              providerId: currentSttProvider.provider,
            });

            try {
              const transcription = await Promise.race([
                sttPromise,
                timeoutPromise,
              ]);

              if (cancelled) return;

              if (
                sessionId !== captureSessionIdRef.current ||
                !capturingRef.current
              ) {
                // F16: stt_request_dropped_stale
                console.warn("[system-audio] stt_request_dropped_stale", {
                  sessionId,
                  currentSessionId: captureSessionIdRef.current,
                });
                return;
              }

              if (transcription.trim()) {
                setLastTranscription(transcription);
                setError("");

                // F17: stt_request_succeeded
                console.info("[system-audio] stt_request_succeeded", {
                  sessionId,
                  transcriptionLength: transcription.length,
                });

                const effectiveSystemPrompt = useSystemPromptRef.current
                  ? systemPromptRef.current || DEFAULT_SYSTEM_PROMPT
                  : contextContentRef.current || DEFAULT_SYSTEM_PROMPT;

                const previousMessages = conversationRef.current.messages.map((msg) => {
                  return { role: msg.role, content: msg.content };
                });

                await processWithAIRef.current(
                  transcription,
                  effectiveSystemPrompt,
                  previousMessages
                );
              } else {
                setError("收到空的转录结果");
              }
            } catch (sttError: any) {
              if (cancelled) return;
              // F18: stt_request_failed
              console.warn("[system-audio] stt_request_failed", {
                sessionId,
                reason: sttError.message,
              });
              if (
                sessionId === captureSessionIdRef.current &&
                capturingRef.current
              ) {
                console.error("STT Error:", sttError);
                setError(sttError.message || "Failed to transcribe audio");
                setIsPopoverOpen(true);
              }
            }
          } catch (err) {
            if (!cancelled && sessionId === captureSessionIdRef.current && capturingRef.current) {
              setError("语音处理失败");
            }
          } finally {
            setIsProcessing(false);
            setIsFlushingCapture(false);
            transitionRef.current = false;
          }
        });

        // If effect was cleaned up while awaiting listen(), unlisten immediately
        if (cancelled) {
          unlisten();
          return;
        }

        speechUnlisten = unlisten;
      } catch (err) {
        if (!cancelled) {
          setError("语音监听设置失败");
        }
      }
    };

    setupEventListener();

    return () => {
      cancelled = true;
      if (speechUnlisten) speechUnlisten();
    };
  }, [capturing]);

  // Context management functions
  const saveContextSettings = useCallback(
    (usePrompt: boolean, content: string) => {
      try {
        const contextSettings = {
          useSystemPrompt: usePrompt,
          contextContent: content,
        };
        safeLocalStorage.setItem(
          STORAGE_KEYS.SYSTEM_AUDIO_CONTEXT,
          JSON.stringify(contextSettings)
        );
      } catch (error) {
        console.error("Failed to save context settings:", error);
      }
    },
    []
  );

  const updateUseSystemPrompt = useCallback(
    (value: boolean) => {
      setUseSystemPrompt(value);
      saveContextSettings(value, contextContent);
    },
    [contextContent, saveContextSettings]
  );

  const updateContextContent = useCallback(
    (content: string) => {
      setContextContent(content);
      saveContextSettings(useSystemPrompt, content);
    },
    [useSystemPrompt, saveContextSettings]
  );

  // Quick actions management
  const saveQuickActions = useCallback((actions: string[]) => {
    try {
      safeLocalStorage.setItem(
        STORAGE_KEYS.SYSTEM_AUDIO_QUICK_ACTIONS,
        JSON.stringify(actions)
      );
    } catch (error) {
      console.error("Failed to save quick actions:", error);
    }
  }, []);

  const addQuickAction = useCallback(
    (action: string) => {
      if (action && !quickActions.includes(action)) {
        const newActions = [...quickActions, action];
        setQuickActions(newActions);
        saveQuickActions(newActions);
      }
    },
    [quickActions, saveQuickActions]
  );

  const removeQuickAction = useCallback(
    (action: string) => {
      const newActions = quickActions.filter((a) => a !== action);
      setQuickActions(newActions);
      saveQuickActions(newActions);
    },
    [quickActions, saveQuickActions]
  );

  const handleQuickActionClick = async (action: string) => {
    setError("");

    const effectiveSystemPrompt = useSystemPrompt
      ? systemPrompt || DEFAULT_SYSTEM_PROMPT
      : contextContent || DEFAULT_SYSTEM_PROMPT;

    // Include the most recent transcription in conversation history if it exists
    let updatedMessages = [...conversation.messages];

    if (lastTranscription && lastTranscription.trim()) {
      const lastMessage = updatedMessages[updatedMessages.length - 1];
      // Only add if it's not already the last message
      if (!lastMessage || lastMessage.content !== lastTranscription) {
        const timestamp = Date.now();
        const userMessage = {
          id: generateMessageId("user", timestamp),
          role: "user" as const,
          content: lastTranscription,
          timestamp,
        };
        updatedMessages.push(userMessage);

        // Update conversation state with the latest transcription
        setConversation((prev) => ({
          ...prev,
          messages: [userMessage, ...prev.messages],
          updatedAt: timestamp,
          title: prev.title || generateConversationTitle(lastTranscription),
        }));
      }
    }

    const previousMessages = updatedMessages.map((msg) => {
      return { role: msg.role, content: msg.content };
    });

    await processWithAI(action, effectiveSystemPrompt, previousMessages);
  };

  const stopCaptureSession = useCallback(
    async ({
      closePopover = false,
      clearOutputs = false,
      clearConversation = false,
      clearError = true,
    }: {
      closePopover?: boolean;
      clearOutputs?: boolean;
      clearConversation?: boolean;
      clearError?: boolean;
    } = {}): Promise<boolean> => {
      transitionRef.current = true;
      setIsStoppingCapture(true);
      abortActiveAIRequest();
      captureSessionIdRef.current += 1;

      // F4: capture_stop_requested
      const sessionId = captureSessionIdRef.current;
      console.info("[system-audio] capture_stop_requested", {
        sessionId,
        closePopover,
        clearOutputs,
      });

      let stopError = "";
      try {
        await invoke<string>("stop_system_audio_capture");
      } catch (err) {
        stopError = err instanceof Error ? err.message : String(err);
      } finally {
        capturingRef.current = false;
        setCapturing(false);
        setIsProcessing(false);
        setIsAIProcessing(false);
        setIsFlushingCapture(false);
        setIsContinuousMode(false);
        setIsRecordingInContinuousMode(false);
        setRecordingProgress(0);
        setSetupRequired(false);

        if (clearOutputs) {
          setLastTranscription("");
          setLastAIResponse("");
        }

        if (clearConversation) {
          setConversation(createEmptyConversation());
        }

        if (closePopover) {
          setIsPopoverOpen(false);
        }

        if (stopError) {
          setError(`停止系统音频失败: ${stopError}`);
        } else if (clearError) {
          setError("");
        }

        setIsStoppingCapture(false);
        transitionRef.current = false;
      }

      // F5: capture_stop_succeeded or capture_stop_failed
      if (stopError === "") {
        console.info("[system-audio] capture_stop_succeeded", {
          sessionId,
          result: "ok",
        });
      } else {
        console.warn("[system-audio] capture_stop_failed", {
          sessionId,
          result: "failed",
          reason: stopError,
        });
      }

      return stopError === "";
    },
    [abortActiveAIRequest, createEmptyConversation]
  );

  const startCaptureSession = useCallback(
    async (
      config: VadConfig,
      { preserveConversation = false }: { preserveConversation?: boolean } = {}
    ): Promise<boolean> => {
      transitionRef.current = true;
      setIsStartingCapture(true);
      setError("");

      // F1: capture_start_requested
      const sessionId = captureSessionIdRef.current + 1;
      const mode = config.enabled ? "vad" : "manual";
      console.info("[system-audio] capture_start_requested", {
        sessionId,
        mode,
      });

      try {
        const hasAccess = await invoke<boolean>("check_system_audio_access");
        if (!hasAccess) {
          setSetupRequired(true);
          setIsPopoverOpen(true);
          return false;
        }

        const deviceId =
          selectedAudioDevices.output.id !== "default"
            ? selectedAudioDevices.output.id
            : null;

        if (config.enabled) {
          await invoke<string>("start_system_audio_capture", {
            vadConfig: config,
            deviceId,
          });
        }

        captureSessionIdRef.current += 1;

        // F2: capture_start_succeeded
        console.info("[system-audio] capture_start_succeeded", {
          sessionId: captureSessionIdRef.current,
          mode,
          capturing: true,
        });

        if (!preserveConversation || !conversation.id) {
          setConversation(createEmptyConversation());
        }

        setSetupRequired(false);
        capturingRef.current = true;
        setCapturing(true);
        setIsPopoverOpen(true);
        setIsContinuousMode(!config.enabled);
        setIsRecordingInContinuousMode(false);
        setRecordingProgress(0);
        setIsProcessing(false);
        setIsFlushingCapture(false);
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        // F3: capture_start_failed
        console.warn("[system-audio] capture_start_failed", {
          sessionId,
          reason: errorMessage,
        });
        capturingRef.current = false;
        setCapturing(false);
        setIsContinuousMode(false);
        setIsRecordingInContinuousMode(false);
        setRecordingProgress(0);
        setIsProcessing(false);
        setIsFlushingCapture(false);
        setError(errorMessage);
        setIsPopoverOpen(true);
        return false;
      } finally {
        setIsStartingCapture(false);
        transitionRef.current = false;
      }
    },
    [
      conversation.id,
      createEmptyConversation,
      selectedAudioDevices.output.id,
    ]
  );

  const restartCaptureSession = useCallback(
    async (config: VadConfig): Promise<boolean> => {
      // F6: capture_restart_requested
      const sessionId = captureSessionIdRef.current;
      console.info("[system-audio] capture_restart_requested", {
        sessionId,
        configEnabled: config.enabled,
      });

      const stopped = await stopCaptureSession({
        closePopover: false,
        clearOutputs: false,
        clearConversation: false,
        clearError: true,
      });
      if (!stopped) {
        return false;
      }
      return startCaptureSession(config, { preserveConversation: true });
    },
    [startCaptureSession, stopCaptureSession]
  );

  // Start continuous recording manually
  const startContinuousRecording = useCallback(async () => {
    if (
      !capturing ||
      !isContinuousMode ||
      isProcessing ||
      isAIProcessing ||
      isFlushingCapture ||
      isStartingCapture ||
      isStoppingCapture ||
      isRecordingInContinuousMode
    ) {
      return;
    }

    transitionRef.current = true;
    setIsStartingCapture(true);
    setRecordingProgress(0);
    setError("");
    setIsRecordingInContinuousMode(true);

    try {
      const deviceId =
        selectedAudioDevices.output.id !== "default"
          ? selectedAudioDevices.output.id
          : null;

      await invoke<string>("start_system_audio_capture", {
        vadConfig,
        deviceId,
      });
    } catch (err) {
      transitionRef.current = false;
      setIsRecordingInContinuousMode(false);
      setIsStartingCapture(false);
      setError(`开始录音失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [
    capturing,
    isContinuousMode,
    isProcessing,
    isAIProcessing,
    isFlushingCapture,
    isStartingCapture,
    isStoppingCapture,
    isRecordingInContinuousMode,
    vadConfig,
    selectedAudioDevices.output.id,
  ]);

  // Ignore current recording (stop without transcription)
  const ignoreContinuousRecording = useCallback(async () => {
    try {
      if (!isContinuousMode || !isRecordingInContinuousMode || isStoppingCapture)
        return;

      // F13: manual_recording_discard_requested
      console.info("[system-audio] manual_recording_discard_requested", {
        sessionId: captureSessionIdRef.current,
      });

      transitionRef.current = true;
      setError("");
      await invoke<string>("stop_system_audio_capture");

      setRecordingProgress(0);
      setIsProcessing(false);
      setIsFlushingCapture(false);
      setIsRecordingInContinuousMode(false);
      transitionRef.current = false;
    } catch (err) {
      transitionRef.current = false;
      console.error("Failed to ignore recording:", err);
      setError(
        `丢弃当前录音失败: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }, [isContinuousMode, isRecordingInContinuousMode, isStoppingCapture]);

  // AI Processing function
  const processWithAI = useCallback(
    async (
      transcription: string,
      prompt: string,
      previousMessages: Message[]
    ) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      let aiFailed = false;
      const aiSessionId = captureSessionIdRef.current;

      try {
        setIsAIProcessing(true);
        setLastAIResponse("");
        setError("");

        // F19: ai_request_started
        console.info("[system-audio] ai_request_started", {
          sessionId: aiSessionId,
          providerId: selectedAIProvider.provider,
        });

        let fullResponse = "";

        if (!selectedAIProvider.provider) {
          setError("未选择 AI 服务商。");
          return;
        }

        const provider = allAiProviders.find(
          (p) => p.id === selectedAIProvider.provider
        );
        if (!provider) {
          setError("未找到 AI 服务商配置。");
          return;
        }

        try {
          let chunkCount = 0;
          for await (const chunk of fetchAIResponse({
            provider,
            selectedProvider: selectedAIProvider,
            systemPrompt: prompt,
            history: previousMessages,
            userMessage: transcription,
            imagesBase64: [],
            signal,
          })) {
            chunkCount++;
            if (
              signal.aborted ||
              aiSessionId !== captureSessionIdRef.current
            ) {
              aiFailed = true;
              // F20: ai_stream_aborted_or_stale
              console.warn("[system-audio] ai_stream_aborted_or_stale", {
                sessionId: aiSessionId,
                currentSessionId: captureSessionIdRef.current,
                chunkCount,
                responseChars: fullResponse.length,
              });
              break;
            }
            fullResponse += chunk;
            setLastAIResponse((prev) => prev + chunk);
          }
        } catch (aiError: any) {
          if (!signal.aborted) {
            aiFailed = true;
            // F21: ai_stream_failed
            console.warn("[system-audio] ai_stream_failed", {
              sessionId: aiSessionId,
              reason: aiError.message,
            });
            setError(aiError.message || "Failed to get AI response");
          }
        }

        if (
          fullResponse &&
          !aiFailed &&
          !signal.aborted &&
          aiSessionId === captureSessionIdRef.current
        ) {
          // F23: ai_response_commit
          console.info("[system-audio] ai_response_commit", {
            sessionId: aiSessionId,
            responseChars: fullResponse.length,
          });
          const timestamp = Date.now();
          setConversation((prev) => ({
            ...prev,
            messages: [
              {
                id: generateMessageId("user", timestamp),
                role: "user" as const,
                content: transcription,
                timestamp,
              },
              {
                id: generateMessageId("assistant", timestamp + 1),
                role: "assistant" as const,
                content: fullResponse,
                timestamp: timestamp + 1,
              },
              ...prev.messages,
            ],
            updatedAt: timestamp,
            title: prev.title || generateConversationTitle(transcription),
          }));
        }
      } catch (err) {
        if (!signal.aborted) {
          setError("获取 AI 响应失败");
        }
      } finally {
        if (abortControllerRef.current?.signal === signal) {
          abortControllerRef.current = null;
        }
        setIsAIProcessing(false);
        // No auto-restart - user manually controls when to start next recording
      }
    },
    [selectedAIProvider, allAiProviders, conversation.messages]
  );

  // Keep processWithAI ref in sync
  useEffect(() => { processWithAIRef.current = processWithAI; }, [processWithAI]);

  const startCapture = useCallback(async () => {
    await startCaptureSession(vadConfig);
  }, [startCaptureSession, vadConfig]);

  const stopCapture = useCallback(async () => {
    // F12: hard_stop_requested
    console.info("[system-audio] hard_stop_requested", {
      sessionId: captureSessionIdRef.current,
    });
    await stopCaptureSession({
      closePopover: true,
      clearOutputs: true,
      clearConversation: false,
      clearError: true,
    });
  }, [stopCaptureSession]);

  const flushCurrentCapture = useCallback(async () => {
    const canFlushVad = capturing && !isContinuousMode;
    const canFlushContinuous =
      capturing && isContinuousMode && isRecordingInContinuousMode;

    // F10: flush_requested (at entry, before guard check)
    const sessionId = captureSessionIdRef.current;
    const mode = !isContinuousMode ? "vad" : "manual";
    const recording = isRecordingInContinuousMode;
    console.info("[system-audio] flush_requested", {
      sessionId,
      mode,
      recording,
    });

    if (
      (!canFlushVad && !canFlushContinuous) ||
      isStartingCapture ||
      isStoppingCapture ||
      isFlushingCapture ||
      isAIProcessing
    ) {
      // F11: flush_rejected_busy
      let reason = "";
      if (!canFlushVad && !canFlushContinuous) reason = "not_flushable";
      else if (isStartingCapture) reason = "isStartingCapture";
      else if (isStoppingCapture) reason = "isStoppingCapture";
      else if (isFlushingCapture) reason = "isFlushingCapture";
      else if (isAIProcessing) reason = "isAIProcessing";
      console.info("[system-audio] flush_rejected_busy", {
        sessionId,
        reason,
      });
      return;
    }

    transitionRef.current = true;
    setError("");
    setIsFlushingCapture(true);
    setIsProcessing(true);

    if (isContinuousMode) {
      setIsRecordingInContinuousMode(false);
    }

    try {
      await invoke("flush_system_audio_capture");
    } catch (err) {
      transitionRef.current = false;
      setIsFlushingCapture(false);
      setIsProcessing(false);
      if (isContinuousMode) {
        setIsRecordingInContinuousMode(true);
      }
      setError(
        `结束当前片段失败: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }, [
    capturing,
    isContinuousMode,
    isRecordingInContinuousMode,
    isStartingCapture,
    isStoppingCapture,
    isFlushingCapture,
    isAIProcessing,
  ]);

  // Manual stop for continuous recording
  const manualStopAndSend = useCallback(async () => {
    if (!isContinuousMode) {
      return;
    }

    await flushCurrentCapture();
  }, [flushCurrentCapture, isContinuousMode]);

  const handleSetup = useCallback(async () => {
    try {
      const platform = navigator.platform.toLowerCase();

      if (platform.includes("mac") || platform.includes("win")) {
        await invoke("request_system_audio_access");
      }

      // Delay to give the user time to grant permissions in the system dialog.
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const hasAccess = await invoke<boolean>("check_system_audio_access");
      if (hasAccess) {
        setSetupRequired(false);
        await startCaptureSession(vadConfig);
      } else {
        setSetupRequired(true);
        setError("权限未授予，请尝试手动操作步骤。");
      }
    } catch (err) {
      setError("请求权限失败，请尝试以下手动操作步骤。");
      setSetupRequired(true);
    }
  }, [startCaptureSession, vadConfig]);

  useEffect(() => {
    const shouldOpenPopover =
      capturing ||
      setupRequired ||
      isStartingCapture ||
      isStoppingCapture ||
      isAIProcessing ||
      !!lastAIResponse ||
      !!error;
    setIsPopoverOpen(shouldOpenPopover);
    resizeWindow(shouldOpenPopover);
  }, [
    capturing,
    setupRequired,
    isStartingCapture,
    isStoppingCapture,
    isAIProcessing,
    lastAIResponse,
    error,
    resizeWindow,
  ]);

  useEffect(() => {
    globalShortcuts.registerSystemAudioCallback(async () => {
      if (transitionRef.current) {
        return;
      }

      if (capturingRef.current) {
        await stopCapture();
      } else {
        await startCapture();
      }
    });
  }, [startCapture, stopCapture]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      invoke("stop_system_audio_capture").catch(() => {});
    };
  }, []);

  // Debounced save to prevent race conditions and improve performance
  useEffect(() => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Only debounce if there are messages to save
    if (
      !conversation.id ||
      conversation.updatedAt === 0 ||
      conversation.messages.length === 0
    ) {
      return;
    }

    // Debounce saves (only save 500ms after last change)
    saveTimeoutRef.current = setTimeout(async () => {
      // Don't save if already saving (prevent concurrent saves)
      if (isSavingRef.current) {
        return;
      }

      try {
        isSavingRef.current = true;
        await saveConversation(conversation);
      } catch (error) {
        console.error("Failed to save system audio conversation:", error);
      } finally {
        isSavingRef.current = false;
      }
    }, CONVERSATION_SAVE_DEBOUNCE_MS);

    // Cleanup on unmount or dependency change
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    conversation.messages.length,
    conversation.title,
    conversation.id,
    conversation.updatedAt,
  ]);

  const startNewConversation = useCallback(() => {
    abortActiveAIRequest();
    const oldSessionId = captureSessionIdRef.current;
    captureSessionIdRef.current += 1;

    // F24: conversation_reset
    console.info("[system-audio] conversation_reset", {
      oldSessionId,
      newSessionId: captureSessionIdRef.current,
    });

    setConversation(createEmptyConversation());
    setLastTranscription("");
    setLastAIResponse("");
    setError("");
    setSetupRequired(false);
    setIsProcessing(false);
    setIsAIProcessing(false);
    setIsFlushingCapture(false);
    setIsPopoverOpen(false);
    setUseSystemPrompt(true);
  }, [abortActiveAIRequest, createEmptyConversation]);

  // Update VAD configuration
  const updateVadConfiguration = useCallback(async (config: VadConfig) => {
    try {
      const modeChanged = config.enabled !== vadConfig.enabled;
      const fromMode = vadConfig.enabled ? "vad" : "manual";
      const toMode = config.enabled ? "vad" : "manual";

      // F7: mode_change_requested
      console.info("[system-audio] mode_change_requested", {
        fromMode,
        toMode,
        capturing,
      });

      // When switching modes while capturing, immediately invalidate any in-flight
      // VAD speech events to prevent stale audio from being processed after the switch.
      if (capturing && modeChanged) {
        abortActiveAIRequest();
        captureSessionIdRef.current += 1;
        transitionRef.current = true;
        setIsProcessing(false);
        setIsAIProcessing(false);
      }

      setVadConfig(config);
      safeLocalStorage.setItem("vad_config", JSON.stringify(config));
      await invoke("update_vad_config", { config });

      if (capturing && modeChanged) {
        // F8: mode_change_restart_begin
        console.info("[system-audio] mode_change_restart_begin", {
          sessionId: captureSessionIdRef.current,
          toMode,
        });
        const result = await restartCaptureSession(config);
        // F9: mode_change_restart_done
        console.info("[system-audio] mode_change_restart_done", {
          sessionId: captureSessionIdRef.current,
          result: result ? "ok" : "failed",
        });
      }
    } catch (error) {
      transitionRef.current = false;
      console.error("Failed to update VAD config:", error);
    }
  }, [capturing, restartCaptureSession, vadConfig.enabled, abortActiveAIRequest]);

  // Keyboard arrow key support for scrolling (local shortcut)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPopoverOpen) return;

      const scrollElement = scrollAreaRef.current?.querySelector(
        "[data-radix-scroll-area-viewport]"
      ) as HTMLElement;

      if (!scrollElement) return;

      const scrollAmount = 100; // pixels to scroll

      if (e.key === "ArrowDown") {
        e.preventDefault();
        scrollElement.scrollBy({ top: scrollAmount, behavior: "smooth" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        scrollElement.scrollBy({ top: -scrollAmount, behavior: "smooth" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPopoverOpen]);

  // Keyboard shortcuts for continuous mode recording (local shortcuts)
  useEffect(() => {
    const handleRecordingShortcuts = (e: KeyboardEvent) => {
      if (!isPopoverOpen || !isContinuousMode) return;
      if (
        isProcessing ||
        isAIProcessing ||
        isStartingCapture ||
        isStoppingCapture ||
        isFlushingCapture
      )
        return;

      // Enter: Start recording (when not recording) or Stop & Send (when recording)
      if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (!isRecordingInContinuousMode) {
          startContinuousRecording();
        } else {
          manualStopAndSend();
        }
      }

      // Escape: Ignore recording (when recording)
      if (e.key === "Escape" && isRecordingInContinuousMode) {
        e.preventDefault();
        ignoreContinuousRecording();
      }

      // Space: Start recording (when not recording) - only if not typing in input
      if (
        e.key === " " &&
        !isRecordingInContinuousMode &&
        !e.metaKey &&
        !e.ctrlKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        startContinuousRecording();
      }
    };

    window.addEventListener("keydown", handleRecordingShortcuts);
    return () =>
      window.removeEventListener("keydown", handleRecordingShortcuts);
  }, [
    isPopoverOpen,
    isContinuousMode,
    isRecordingInContinuousMode,
    isProcessing,
    isAIProcessing,
    isStartingCapture,
    isStoppingCapture,
    isFlushingCapture,
    startContinuousRecording,
    manualStopAndSend,
    ignoreContinuousRecording,
  ]);

  return {
    capturing,
    isProcessing,
    isAIProcessing,
    lastTranscription,
    lastAIResponse,
    error,
    setupRequired,
    startCapture,
    stopCapture,
    handleSetup,
    isPopoverOpen,
    setIsPopoverOpen,
    // Conversation management
    conversation,
    setConversation,
    // AI processing
    processWithAI,
    // Context management
    useSystemPrompt,
    setUseSystemPrompt: updateUseSystemPrompt,
    contextContent,
    setContextContent: updateContextContent,
    startNewConversation,
    // Window resize
    resizeWindow,
    quickActions,
    addQuickAction,
    removeQuickAction,
    isManagingQuickActions,
    setIsManagingQuickActions,
    showQuickActions,
    setShowQuickActions,
    handleQuickActionClick,
    // VAD configuration
    vadConfig,
    updateVadConfiguration,
    isStartingCapture,
    isStoppingCapture,
    isFlushingCapture,
    // Continuous recording
    isContinuousMode,
    isRecordingInContinuousMode,
    recordingProgress,
    manualStopAndSend,
    startContinuousRecording,
    ignoreContinuousRecording,
    flushCurrentCapture,
    // Scroll area ref for keyboard navigation
    scrollAreaRef,
  };
}
