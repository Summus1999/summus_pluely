import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Message, ProviderConfig } from "@/types";
import { prepareAIRequest } from "./ai-request-config.function";

export interface ChatStreamChunkPayload {
  requestId: string;
  chunk: string;
}

export interface ChatStreamCompletePayload {
  requestId: string;
  fullResponse: string;
}

type StreamEvent<T> = {
  payload: T;
};

type Unlisten = () => void;

type ListenEvent = <T>(
  eventName: string,
  handler: (event: StreamEvent<T>) => void
) => Promise<Unlisten>;

type InvokeCommand = (
  command: string,
  args?: Record<string, unknown>
) => Promise<unknown>;

export interface StreamRustChatResponseParams {
  requestId: string;
  commandName?: string;
  commandArgs?: Record<string, unknown>;
  userMessage: string;
  systemPrompt?: string;
  history?: Message[];
  imagesBase64?: string[];
  signal?: AbortSignal;
  onChunk?: (chunk: string, fullResponse: string) => void;
  invokeCommand?: InvokeCommand;
  listenEvent?: ListenEvent;
}

export async function streamRustChatResponse(
  params: StreamRustChatResponseParams
): Promise<string> {
  const {
    requestId,
    commandName = "chat_stream_response",
    commandArgs,
    userMessage,
    systemPrompt,
    history = [],
    imagesBase64 = [],
    signal,
    onChunk,
    invokeCommand = invoke as InvokeCommand,
    listenEvent = listen as ListenEvent,
  } = params;

  let fullResponse = "";
  let completedResponse = "";
  const unlisteners: Unlisten[] = [];

  const cleanup = () => {
    while (unlisteners.length > 0) {
      const unlisten = unlisteners.pop();
      if (!unlisten) {
        continue;
      }

      try {
        unlisten();
      } catch {
        // Ignore cleanup failures from detached listeners.
      }
    }
  };

  const isCurrentRequest = (value: unknown): value is string =>
    typeof value === "string" && value === requestId;

  const chunkUnlisten = await listenEvent<ChatStreamChunkPayload>(
    "chat_stream_chunk",
    (event) => {
      if (signal?.aborted || !isCurrentRequest(event.payload?.requestId)) {
        return;
      }

      const chunk = event.payload.chunk;
      if (!chunk) {
        return;
      }

      fullResponse += chunk;
      onChunk?.(chunk, fullResponse);
    }
  );
  unlisteners.push(chunkUnlisten);

  const completeUnlisten = await listenEvent<ChatStreamCompletePayload>(
    "chat_stream_complete",
    (event) => {
      if (!isCurrentRequest(event.payload?.requestId)) {
        return;
      }

      completedResponse = event.payload.fullResponse || completedResponse;
    }
  );
  unlisteners.push(completeUnlisten);

  try {
    const response = (await invokeCommand(
      commandName,
      commandArgs ?? {
        requestId,
        userMessage,
        systemPrompt,
        imageBase64: imagesBase64.length > 0 ? imagesBase64 : null,
        history: history.length > 0 ? JSON.stringify(history) : null,
      }
    )) as string;

    if (signal?.aborted) {
      return "";
    }

    return completedResponse || fullResponse || response || "";
  } finally {
    cleanup();
  }
}

export interface StreamProviderChatResponseParams {
  requestId: string;
  provider: ProviderConfig | undefined;
  selectedProvider: {
    provider: string;
    variables: Record<string, string>;
  };
  systemPrompt?: string;
  history?: Message[];
  userMessage: string;
  imagesBase64?: string[];
  signal?: AbortSignal;
  onChunk?: (chunk: string, fullResponse: string) => void;
  invokeCommand?: InvokeCommand;
  listenEvent?: ListenEvent;
}

export async function streamProviderChatResponse(
  params: StreamProviderChatResponseParams
): Promise<string> {
  const preparedRequest = prepareAIRequest({
    provider: params.provider,
    selectedProvider: params.selectedProvider,
    systemPrompt: params.systemPrompt,
    history: params.history,
    userMessage: params.userMessage,
    imagesBase64: params.imagesBase64,
  });

  return streamRustChatResponse({
    requestId: params.requestId,
    userMessage: params.userMessage,
    signal: params.signal,
    onChunk: params.onChunk,
    invokeCommand: params.invokeCommand,
    listenEvent: params.listenEvent,
    commandName: "stream_provider_response",
    commandArgs: {
      request: {
        requestId: params.requestId,
        url: preparedRequest.url,
        method: preparedRequest.method,
        headers: preparedRequest.headers,
        body: preparedRequest.body ?? null,
        responseContentPath: preparedRequest.responseContentPath,
        streaming: preparedRequest.streaming,
      },
    },
  });
}
