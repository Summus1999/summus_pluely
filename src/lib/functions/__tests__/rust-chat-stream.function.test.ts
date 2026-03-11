import { describe, expect, it, vi } from "vitest";
import {
  streamProviderChatResponse,
  streamRustChatResponse,
} from "../rust-chat-stream.function";

type Listener<T> = (event: { payload: T }) => void;

describe("streamRustChatResponse", () => {
  const localStorageMock = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };

  it("streams only matching request chunks and cleans up listeners", async () => {
    const listeners = new Map<string, Listener<any>>();
    const unlistenChunk = vi.fn();
    const unlistenComplete = vi.fn();

    const listenEvent = vi.fn(
      async (eventName: string, handler: Listener<any>) => {
        listeners.set(eventName, handler);
        if (eventName === "chat_stream_chunk") {
          return unlistenChunk;
        }
        return unlistenComplete;
      }
    );

    const invokeCommand = vi.fn(async () => {
      listeners.get("chat_stream_chunk")?.({
        payload: { requestId: "other-request", chunk: "ignore-me" },
      });
      listeners.get("chat_stream_chunk")?.({
        payload: { requestId: "req-1", chunk: "hello " },
      });
      listeners.get("chat_stream_chunk")?.({
        payload: { requestId: "req-1", chunk: "world" },
      });
      listeners.get("chat_stream_complete")?.({
        payload: { requestId: "req-1", fullResponse: "hello world" },
      });
      return "hello world";
    });

    const onChunk = vi.fn();

    const result = await streamRustChatResponse({
      requestId: "req-1",
      userMessage: "hi",
      history: [],
      invokeCommand,
      listenEvent,
      onChunk,
    });

    expect(result).toBe("hello world");
    expect(onChunk).toHaveBeenCalledTimes(2);
    expect(onChunk).toHaveBeenNthCalledWith(1, "hello ", "hello ");
    expect(onChunk).toHaveBeenNthCalledWith(2, "world", "hello world");
    expect(unlistenChunk).toHaveBeenCalledTimes(1);
    expect(unlistenComplete).toHaveBeenCalledTimes(1);
  });

  it("cleans up listeners when invoke rejects", async () => {
    const unlistenChunk = vi.fn();
    const unlistenComplete = vi.fn();

    const listenEvent = vi.fn(async (eventName: string) => {
      if (eventName === "chat_stream_chunk") {
        return unlistenChunk;
      }
      return unlistenComplete;
    });

    const invokeCommand = vi.fn(async () => {
      throw new Error("boom");
    });

    await expect(
      streamRustChatResponse({
        requestId: "req-2",
        userMessage: "hello",
        history: [],
        invokeCommand,
        listenEvent,
      })
    ).rejects.toThrow("boom");

    expect(unlistenChunk).toHaveBeenCalledTimes(1);
    expect(unlistenComplete).toHaveBeenCalledTimes(1);
  });

  it("forwards prepared provider request to Rust command", async () => {
    vi.stubGlobal("localStorage", localStorageMock);

    const listeners = new Map<string, Listener<any>>();
    const listenEvent = vi.fn(async (eventName: string, handler: Listener<any>) => {
      listeners.set(eventName, handler);
      return vi.fn();
    });

    const invokeCommand = vi.fn(async () => {
      listeners.get("chat_stream_chunk")?.({
        payload: { requestId: "req-provider", chunk: "done" },
      });
      listeners.get("chat_stream_complete")?.({
        payload: { requestId: "req-provider", fullResponse: "done" },
      });
      return "done";
    });

    const result = await streamProviderChatResponse({
      requestId: "req-provider",
      provider: {
        id: "siliconflow",
        curl: `curl -X POST https://api.siliconflow.cn/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{API_KEY}}" \
  -d '{"model":"{{MODEL}}","messages":[{"role":"system","content":"{{SYSTEM_PROMPT}}"},{"role":"user","content":"{{TEXT}}"}]}'`,
        responseContentPath: "choices[0].message.content",
        streaming: true,
      },
      selectedProvider: {
        provider: "siliconflow",
        variables: {
          api_key: "token",
          model: "deepseek-v3",
        },
      },
      userMessage: "hello",
      history: [],
      invokeCommand,
      listenEvent,
    });

    expect(result).toBe("done");
    expect(invokeCommand).toHaveBeenCalledTimes(1);
    expect(invokeCommand).toHaveBeenCalledWith(
      "stream_provider_response",
      expect.objectContaining({
        request: expect.objectContaining({
          requestId: "req-provider",
          url: "https://api.siliconflow.cn/v1/chat/completions",
          method: "POST",
          responseContentPath: "choices[0].message.content",
          streaming: true,
        }),
      })
    );
  });
});
