import {
  buildDynamicMessages,
  deepVariableReplacer,
  extractVariables,
  getByPath,
  getStreamingContent,
} from "./common.function";
import { Message, ProviderConfig } from "@/types";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import curl2Json from "@bany/curl-to-json";
import { getResponseSettings, RESPONSE_LENGTHS, LANGUAGES } from "@/lib";
import { MARKDOWN_FORMATTING_INSTRUCTIONS } from "@/config/constants";

// Timeout constants
const FETCH_TIMEOUT_MS = 30_000; // 30s for initial connection
const STREAM_READ_TIMEOUT_MS = 15_000; // 15s between stream chunks

/** Race a promise against a timeout; rejects with a descriptive error. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} 超时 (${ms / 1000}s)`)),
      ms
    );
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

function buildEnhancedSystemPrompt(baseSystemPrompt?: string): string {
  const responseSettings = getResponseSettings();
  const prompts: string[] = [];

  if (baseSystemPrompt) {
    prompts.push(baseSystemPrompt);
  }

  const lengthOption = RESPONSE_LENGTHS.find(
    (l) => l.id === responseSettings.responseLength
  );
  if (lengthOption?.prompt?.trim()) {
    prompts.push(lengthOption.prompt);
  }

  const languageOption = LANGUAGES.find(
    (l) => l.id === responseSettings.language
  );
  if (languageOption?.prompt?.trim()) {
    prompts.push(languageOption.prompt);
  }

  // Add markdown formatting instructions
  prompts.push(MARKDOWN_FORMATTING_INSTRUCTIONS);

  return prompts.join(" ");
}

export async function* fetchAIResponse(params: {
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
}): AsyncIterable<string> {
  try {
    const {
      provider,
      selectedProvider,
      systemPrompt,
      history = [],
      userMessage,
      imagesBase64 = [],
      signal,
    } = params;

    // Check if already aborted
    if (signal?.aborted) {
      return;
    }

    const enhancedSystemPrompt = buildEnhancedSystemPrompt(systemPrompt);

    if (!provider) {
      throw new Error(`未提供服务商配置`);
    }
    if (!selectedProvider) {
      throw new Error(`未选择服务商`);
    }

    let curlJson;
    try {
      curlJson = curl2Json(provider.curl);
    } catch (error) {
      throw new Error(
        `Curl 解析失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    }

    const extractedVariables = extractVariables(provider.curl);
    const requiredVars = extractedVariables.filter(
      ({ key }) => key !== "SYSTEM_PROMPT" && key !== "TEXT" && key !== "IMAGE"
    );
    for (const { key } of requiredVars) {
      if (
        !selectedProvider.variables?.[key] ||
        selectedProvider.variables[key].trim() === ""
      ) {
        throw new Error(
          `缺少必要变量: ${key}，请在设置中配置。`
        );
      }
    }

    if (!userMessage) {
      throw new Error("用户消息不能为空");
    }
    if (imagesBase64.length > 0 && !provider.curl.includes("{{IMAGE}}")) {
      throw new Error(
        `服务商 ${provider?.id ?? "未知"} 不支持图片输入`
      );
    }

    let bodyObj: any = curlJson.data
      ? JSON.parse(JSON.stringify(curlJson.data))
      : {};
    const messagesKey = Object.keys(bodyObj).find((key) =>
      ["messages", "contents", "conversation", "history"].includes(key)
    );

    if (messagesKey && Array.isArray(bodyObj[messagesKey])) {
      const finalMessages = buildDynamicMessages(
        bodyObj[messagesKey],
        history,
        userMessage,
        imagesBase64
      );
      bodyObj[messagesKey] = finalMessages;
    }

    const allVariables = {
      ...Object.fromEntries(
        Object.entries(selectedProvider.variables).map(([key, value]) => [
          key.toUpperCase(),
          value,
        ])
      ),
      SYSTEM_PROMPT: enhancedSystemPrompt || "",
    };

    bodyObj = deepVariableReplacer(bodyObj, allVariables);
    let url = deepVariableReplacer(curlJson.url || "", allVariables);

    const headers = deepVariableReplacer(curlJson.header || {}, allVariables);
    headers["Content-Type"] = "application/json";

    if (provider?.streaming) {
      if (typeof bodyObj === "object" && bodyObj !== null) {
        const streamKey = Object.keys(bodyObj).find(
          (k) => k.toLowerCase() === "stream"
        );
        if (streamKey) {
          bodyObj[streamKey] = true;
        } else {
          bodyObj.stream = true;
        }
      }
    }

    const useTauri = url?.includes("http");
    const fetchFunction = useTauri ? tauriFetch : fetch;

    console.debug("[ai-response] Sending request", {
      url,
      method: curlJson.method || "POST",
      streaming: provider?.streaming,
      providerId: provider?.id,
      useTauri,
    });

    let response;
    try {
      // NOTE: Do NOT pass `signal` to tauriFetch — Tauri HTTP plugin on Windows
      // may hang indefinitely when AbortSignal is provided. We handle abort
      // manually via signal checks after the fetch resolves.
      const fetchOptions: RequestInit = {
        method: curlJson.method || "POST",
        headers,
        body: curlJson.method === "GET" ? undefined : JSON.stringify(bodyObj),
      };
      // Only pass signal to native browser fetch (not tauriFetch)
      if (!useTauri) {
        fetchOptions.signal = signal;
      }
      const fetchPromise = fetchFunction(url, fetchOptions);
      response = await withTimeout(fetchPromise, FETCH_TIMEOUT_MS, "API 连接");

      // Check abort after fetch resolves (for tauriFetch path)
      if (signal?.aborted) return;

      console.debug("[ai-response] Response received", {
        status: response.status,
        ok: response.ok,
        hasBody: !!response.body,
      });
    } catch (fetchError) {
      // Check if aborted
      if (
        signal?.aborted ||
        (fetchError instanceof Error && fetchError.name === "AbortError")
      ) {
        return; // Silently return on abort
      }
      throw new Error(
        `API 请求网络错误: ${
          fetchError instanceof Error ? fetchError.message : "未知错误"
        }`
      );
    }

    if (!response.ok) {
      let errorText = "";
      try {
        errorText = await response.text();
      } catch {}
      throw new Error(
        `API 请求失败: ${response.status} ${response.statusText}${
          errorText ? ` - ${errorText}` : ""
        }`
      );
    }

    if (!provider?.streaming) {
      let json;
      try {
        json = await response.json();
      } catch (parseError) {
        throw new Error(
          `解析非流式响应失败: ${
            parseError instanceof Error ? parseError.message : "未知错误"
          }`
        );
      }
      const content =
        getByPath(json, provider?.responseContentPath || "") || "";
      yield content;
      return;
    }

    if (!response.body) {
      // Fallback: read full body when ReadableStream is unavailable
      console.warn("[ai-response] response.body is null, falling back to full read");
      let json;
      try {
        json = await response.json();
      } catch (parseError) {
        throw new Error(
          `解析响应失败 (无流): ${
            parseError instanceof Error ? parseError.message : "未知错误"
          }`
        );
      }
      const content =
        getByPath(json, provider?.responseContentPath || "") || "";
      if (content) yield content;
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let chunkIndex = 0;

    try {
      while (true) {
        // Check if aborted
        if (signal?.aborted) {
          reader.cancel();
          return;
        }

        let readResult;
        try {
          readResult = await withTimeout(
            reader.read(),
            STREAM_READ_TIMEOUT_MS,
            "流式读取"
          );
        } catch (readError) {
          // Check if aborted
          if (
            signal?.aborted ||
            (readError instanceof Error && readError.name === "AbortError")
          ) {
            return; // Silently return on abort
          }
          // If we already got some data but stream timed out, treat as done
          if (
            chunkIndex > 0 &&
            readError instanceof Error &&
            readError.message.includes("超时")
          ) {
            console.warn("[ai-response] Stream read timed out after receiving data, treating as done");
            break;
          }
          throw new Error(
            `读取流错误: ${
              readError instanceof Error ? readError.message : "未知错误"
            }`
          );
        }
        const { done, value } = readResult;
        if (done) break;

        chunkIndex++;

        // Check if aborted before processing
        if (signal?.aborted) {
          reader.cancel();
          return;
        }

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith("data:")) {
            const trimmed = trimmedLine.substring(5).trim();
            if (!trimmed || trimmed === "[DONE]") continue;
            try {
              const parsed = JSON.parse(trimmed);
              const delta = getStreamingContent(
                parsed,
                provider?.responseContentPath || ""
              );
              if (delta) {
                yield delta;
              }
            } catch (e) {
              // Ignore parsing errors for partial JSON chunks
            }
          }
        }
      }
    } finally {
      try { reader.cancel(); } catch { /* ignore */ }
    }
  } catch (error) {
    throw new Error(
      `fetchAIResponse 错误: ${
        error instanceof Error ? error.message : "未知错误"
      }`
    );
  }
}
