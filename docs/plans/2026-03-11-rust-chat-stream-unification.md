# Rust Chat Stream Unification Implementation Plan

> For Claude: REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

Goal: Replace frontend-owned AI streaming with the existing Rust streaming command so Windows no longer hangs on `tauriFetch` during chat generation.

Architecture: Introduce a small frontend bridge that calls `chat_stream_response`, subscribes to Rust-emitted stream events, and filters them by `requestId`. Migrate all frontend AI streaming entry points to this bridge so chat, manual audio send, and system-audio AI processing share one transport path.

Tech Stack: React, TypeScript, Tauri invoke/event APIs, Rust reqwest SSE stream, Vitest

---

### Task 1: Add a regression-testable frontend stream bridge

Files:
- Create: `src/lib/functions/rust-chat-stream.function.ts`
- Create: `src/lib/functions/__tests__/rust-chat-stream.function.test.ts`
- Modify: `package.json`

Step 1: Write the failing test

- Verify chunk events are ignored when `requestId` does not match.
- Verify matching chunk events append in order.
- Verify completion resolves with the Rust command result.
- Verify cleanup runs on complete and reject paths.

Step 2: Run test to verify it fails

Run: `npm test -- rust-chat-stream.function.test.ts`
Expected: FAIL because the bridge module does not exist yet.

Step 3: Write minimal implementation

- Add a pure bridge around `invoke` and `listen`.
- Accept `requestId`, message payload, and callbacks.
- Filter all events by `requestId`.
- Always cleanup listeners in `finally`.

Step 4: Run test to verify it passes

Run: `npm test -- rust-chat-stream.function.test.ts`
Expected: PASS

### Task 2: Add request-scoped Rust stream payloads

Files:
- Modify: `src-tauri/src/api.rs`

Step 1: Write the failing test

- Covered indirectly by the frontend bridge contract and build validation because Rust payload shape must match the tested bridge shape.

Step 2: Implement minimal Rust changes

- Add `request_id` argument to `chat_stream_response`.
- Emit `chat_stream_chunk` as `{ requestId, chunk }`.
- Emit `chat_stream_complete` as `{ requestId, fullResponse }`.

Step 3: Verify integration shape

Run: `npm run build`
Expected: PASS on TypeScript side after frontend migration.

### Task 3: Migrate frontend chat flows to the Rust bridge

Files:
- Modify: `src/hooks/useCompletion.ts`
- Modify: `src/hooks/useChatCompletion.ts`
- Modify: `src/hooks/useSystemAudio.ts`
- Modify: `src/lib/functions/index.ts`

Step 1: Write the failing test

- Reuse Task 1 test for transport semantics.

Step 2: Write minimal implementation

- Replace direct `fetchAIResponse(...)` streaming in all three hooks.
- Preserve existing loading, stale-request, and error handling semantics.
- Keep cancellation as "ignore stale request" until Rust cancellation support exists.

Step 3: Run targeted verification

Run: `npm test -- rust-chat-stream.function.test.ts`
Expected: PASS

### Task 4: Validate the full change

Files:
- Modify if required by lint/build feedback only.

Step 1: Run targeted tests

Run: `npm test -- rust-chat-stream.function.test.ts`
Expected: PASS

Step 2: Run TypeScript build

Run: `npm run build`
Expected: PASS

Step 3: Run lints for changed files

Use Cursor `ReadLints` on changed files and fix any newly introduced diagnostics.
