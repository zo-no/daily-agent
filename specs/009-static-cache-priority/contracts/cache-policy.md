# Cache Policy Contract

## Eligibility

| Request class | Online behavior | Offline behavior | Cache write |
| --- | --- | --- | --- |
| Same-origin, versioned application build resource | Cache first; miss falls through to network | Return cached response; miss fails as a resource | Successful first fetch only |
| Document navigation and non-versioned static asset | Existing network first | Existing cached fallback | Existing behavior |
| API, authentication callback, RSC, cross-origin | Bypass application cache | Browser/network failure semantics | Never |

## Safety assertions

- The response returned for a cached script remains a script response and is never replaced with an HTML document.
- A cache key is scoped to the active application-shell version.
- A version activation removes every preceding `log-note-*` shell except the active shell.
- No user identifier, record content, plan, token, attachment Blob or cloud document becomes cacheable through this policy.
