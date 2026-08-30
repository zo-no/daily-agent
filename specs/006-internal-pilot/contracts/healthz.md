# Contract: Process Readiness

## Request

~~~http
GET /api/healthz
~~~

No authentication, query, body, cookie, or external dependency is required. Query parameters, if
present, do not change the response.

## Success response

~~~http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: private, no-store, max-age=0
X-Content-Type-Options: nosniff

{"status":"ok","service":"log-note"}
~~~

## Security and meaning

- The response is fixed and contains no commit hash, environment value, hostname, user identifier,
  credential, dependency state, or application record.
- It proves only that the deployed Web process serves a request.
- AIBase reachability, company sign-in, RLS, revision conflict handling, backup, and offline behavior
  require the separate synthetic real-session acceptance.
- The route performs no logging of headers, cookies, query values, or request bodies.
