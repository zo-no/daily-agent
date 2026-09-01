# Contract: Embedded AI Capability Runtime

## Public HTTP compatibility

This change does not add or version an HTTP endpoint. The following existing paths retain their
current browser-facing request, response, authentication, cache, and error contracts:

- `POST /api/organize/agent`
- `POST /api/organize/review`
- `POST /api/organize/analyze`
- `POST /api/organize/domain-review`

Existing browser provider tests remain the executable HTTP contract.

## Internal execution contract

Each route calls the shared runtime with a server-created capability definition and sanitized input.

Preconditions:

1. Authentication, origin, content type, body size, account rate limit, and JSON parsing succeeded.
2. Capability-specific sanitization succeeded.
3. Provider secret, base URL, model ID, and fetch implementation passed server validation.
4. Strict input/output schemas and a project normalizer are present.

Runtime guarantees:

1. One capability-named Agent and Workflow exist for the request.
2. No tool, memory, storage, logger, retry, or persistent snapshot is registered.
3. Generation uses `maxSteps: 1`, `toolChoice: none`, and exactly one model call.
4. Structured output must pass the strict capability schema.
5. The project normalizer receives `(modelOutput, sanitizedInput)` exactly once.
6. Only a successful normalized result is returned; partial generation is never returned.
7. Abort, rate limit, invalid structure, oversized response, and unavailable provider produce safe
   internal errors that the route maps to its existing public code.

Postconditions:

- The runtime has no reference to or ability to call `commitData`, Supabase writes, browser storage,
  backups, Google mutation, or user-visible actions.
- The route may apply additional response validation, such as domain-review financial safety.
- The browser retains its existing responsibility for transient state, staleness, explicit
  confirmation, atomic write, read-back, and undo.

## Legacy-removal contract

After migration, project source outside third-party packages contains:

- zero imports from the top-level `ai` package;
- zero direct `generateText`, `Output.object`, or raw `/chat/completions` invocation;
- one narrow `@ai-sdk/openai-compatible` provider-construction module;
- one embedded Mastra generation/normalization implementation shared by all five capabilities.
