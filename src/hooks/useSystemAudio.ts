import { useEffect, useState, useCallback, useRef } from "react";
import { useWindowResize, useGlobalShortcuts } from ".";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useApp } from "@/contexts";
import { fetchSTT, fetchAIResponse } from "@/lib/functions";
import {
  DEFAULT_QUICK_ACTIONS,
  DEFAULT_SYSTEM_PROMPT,
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

// Chat message interface (reusing from useCompletion)
interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

// Conversation interface (reusing from useCompletion)
export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export type useSystemAudioType = ReturnType<typeof useSystemAudio>;

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

    const setupEventListener = async () => {
      try {
        speechUnlisten = await listen("speech-detected", async (event) => {
          const sessionId = captureSessionIdRef.current;

          try {
            if (!capturingRef.current) return;

            const base64Audio = event.payload as string;
            // Convert to blob
            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const audioBlob = new Blob([bytes], { type: "audio/wav" });

            if (!selectedSttProvider.provider) {
              if (sessionId === captureSessionIdRef.current && capturingRef.current) {
                setError("未选择语音服务商。");
              }
              return;
            }

            const providerConfig = allSttProviders.find(
              (p) => p.id === selectedSttProvider.provider
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
              selectedProvider: selectedSttProvider,
              audio: audioBlob,
            });

            const timeoutPromise = new Promise<string>((_, reject) => {
              setTimeout(
                () => reject(new Error("Speech transcription timed out (30s)")),
                30000
              );
            });

            try {
              const transcription = await Promise.race([
                sttPromise,
                timeoutPromise,
              ]);

              if (
                sessionId !== captureSessionIdRef.current ||
                !capturingRef.current
              ) {
                return;
              }

              if (transcription.trim()) {
                setLastTranscription(transcription);
                setError("");

                const effectiveSystemPrompt = useSystemPrompt
                  ? systemPrompt || DEFAULT_SYSTEM_PROMPT
                  : contextContent || DEFAULT_SYSTEM_PROMPT;

                const previousMessages = conversation.messages.map((msg) => {
                  return { role: msg.role, content: msg.content };
                });

                await processWithAI(
                  transcription,
                  effectiveSystemPrompt,
                  previousMessages
                );
              } else {
                setError("收到空的转录结果");
              }
            } catch (sttError: any) {
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
            if (sessionId === captureSessionIdRef.current && capturingRef.current) {
              setError("语音处理失败");
            }
          } finally {
            setIsProcessing(false);
            setIsFlushingCapture(false);
            transitionRef.current = false;
          }
        });
      } catch (err) {
        setError("语音监听设置失败");
      }
    };

    setupEventListener();

    return () => {
      if (speechUnlisten) speechUnlisten();
    };
  }, [
    capturing,
    selectedSttProvider,
    allSttProviders,
    conversation.messages.length,
  ]);

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
          for await (const chunk of fetchAIResponse({
            provider,
            selectedProvider: selectedAIProvider,
            systemPrompt: prompt,
            history: previousMessages,
            userMessage: transcription,
            imagesBase64: [],
            signal,
          })) {
            if (
              signal.aborted ||
              aiSessionId !== captureSessionIdRef.current
            ) {
              aiFailed = true;
              break;
            }
            fullResponse += chunk;
            setLastAIResponse((prev) => prev + chunk);
          }
        } catch (aiError: any) {
          if (!signal.aborted) {
            aiFailed = true;
            setError(aiError.message || "Failed to get AI response");
          }
        }

        if (
          fullResponse &&
          !aiFailed &&
          !signal.aborted &&
          aiSessionId === captureSessionIdRef.current
        ) {
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

  const startCapture = useCallback(async () => {
    await startCaptureSession(vadConfig);
  }, [startCaptureSession, vadConfig]);

  const stopCapture = useCallback(async () => {
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

    if (
      (!canFlushVad && !canFlushContinuous) ||
      isStartingCapture ||
      isStoppingCapture ||
      isFlushingCapture ||
      isAIProcessing
    ) {
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
    captureSessionIdRef.current += 1;
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
      setVadConfig(config);
      safeLocalStorage.setItem("vad_config", JSON.stringify(config));
      await invoke("update_vad_config", { config });

      if (capturing && modeChanged) {
        await restartCaptureSession(config);
      }
    } catch (error) {
      console.error("Failed to update VAD config:", error);
    }
  }, [capturing, restartCaptureSession, vadConfig.enabled]);

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
