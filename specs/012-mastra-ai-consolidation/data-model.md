# Data Model: Unified Runtime AI Execution

No persistent entity or storage version is added. The model below describes request-lifetime values
only; none enters localStorage, IndexedDB, Supabase, Service Worker cache, export, or backup.

## Capability Definition

- `id`: server-selected enum: `diary-review`, `plan-review`, `daily-review`,
  `category-classifier`, or `domain-review`
- `name` and `description`: fixed non-user-controlled runtime metadata
- `inputSchema`: minimal sanitized execution-envelope validator
- `outputSchema`: strict capability-specific structured model schema
- `instructions`: capability/mode/locale-specific server prompt
- `modelSettings`: existing temperature and output-token ceiling
- `normalize(output, input)`: project-owned allowlist and safety normalizer
- `publicInvalidCode`: existing route-specific invalid-output error code

Validation rules:

- Capability definitions are created only by server modules; request JSON cannot select one.
- No definition may register tools, memory, storage, retry, persistent snapshot, or write callback.
- Schema and normalizer are required before execution.

## Runtime Execution

- `input`: already-sanitized capability payload
- `generatedOutput`: strict structured output from exactly one model request
- `normalizedResult`: result returned by the injected project normalizer
- `abortSignal`: request-scoped server timeout/cancellation signal
- `status`: transient workflow status; only `success` may return a normalized result

State transition:

```text
created → generating → normalizing → success
                  ↘ failed/aborted ↗
```

Rules:

- `failed` and `aborted` never expose partial output.
- Abort is checked before generation, before normalization, and by the provider transport.
- The runtime object is discarded after the request and stores no snapshot.

## Provider Model Adapter

- `apiKey`: server environment value, bounded and never logged
- `baseUrl`: HTTPS or local-test HTTP URL after normalization
- `modelId`: bounded configured model ID
- `fetch`: request-aware bounded transport
- `responseLimitBytes`: fixed 512 KiB

Rules:

- Provider construction has no prompt, business schema, account, category, record, or plan knowledge.
- A response exceeding the byte limit fails before structured output is accepted.
- Provider errors are converted to safe internal classes; private bodies and causes never reach HTTP.
