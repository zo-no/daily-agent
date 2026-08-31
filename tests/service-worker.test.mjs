import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const workerSource = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
const workerOrigin = "https://log-note.test";

function requestFor(path, { destination = "script", headers = {} } = {}) {
  return {
    method: "GET",
    url: new URL(path, workerOrigin).href,
    destination,
    mode: "cors",
    headers: new Headers(headers)
  };
}

function createWorkerHarness({ cached = [], online = true } = {}) {
  const listeners = new Map();
  const entries = new Map(cached.map(([path, response]) => [new URL(path, workerOrigin).href, response]));
  const fetches = [];
  const cache = {
    addAll: async () => undefined,
    match: async (request) => entries.get(request.url),
    put: async (request, response) => {
      entries.set(request.url, response);
    }
  };
  const context = vm.createContext({
    URL,
    Headers,
    Response,
    Promise,
    RegExp,
    Set,
    caches: {
      open: async () => cache,
      keys: async () => ["log-note-test"],
      delete: async () => true
    },
    fetch: async (request) => {
      fetches.push(request.url);
      if (!online) throw new TypeError("offline");
      return new Response(`network:${request.url}`, {
        status: 200,
        headers: { "content-type": "application/javascript" }
      });
    },
    self: {
      location: { href: `${workerOrigin}/sw.js?v=test`, origin: workerOrigin },
      addEventListener(type, listener) {
        listeners.set(type, listener);
      },
      skipWaiting: async () => undefined,
      clients: { claim: async () => undefined }
    }
  });
  vm.runInContext(workerSource, context, { filename: "public/sw.js" });

  return {
    entries,
    fetches,
    async fetch(request) {
      let responsePromise;
      const background = [];
      listeners.get("fetch")({
        request,
        respondWith(response) {
          responsePromise = Promise.resolve(response);
        },
        waitUntil(work) {
          background.push(Promise.resolve(work));
        }
      });
      if (!responsePromise) return null;
      const response = await responsePromise;
      await Promise.all(background);
      return response;
    }
  };
}

test("cached versioned build resource is served without an online network request", async () => {
  const cachedResponse = new Response("cached-build", {
    status: 200,
    headers: { "content-type": "application/javascript" }
  });
  const worker = createWorkerHarness({
    cached: [["/_next/static/chunks/app.js", cachedResponse]]
  });

  const response = await worker.fetch(requestFor("/_next/static/chunks/app.js"));

  assert.equal(await response.text(), "cached-build");
  assert.deepEqual(worker.fetches, []);
});

test("uncached versioned build resource fetches once and becomes available offline", async () => {
  const onlineWorker = createWorkerHarness();
  const request = requestFor("/_next/static/chunks/app.js");

  const response = await onlineWorker.fetch(request);

  assert.equal(await response.text(), `network:${request.url}`);
  assert.deepEqual(onlineWorker.fetches, [request.url]);
  const cachedResponse = onlineWorker.entries.get(request.url);
  assert.equal(await cachedResponse.clone().text(), `network:${request.url}`);

  const offlineWorker = createWorkerHarness({
    online: false,
    cached: [["/_next/static/chunks/app.js", cachedResponse]]
  });
  const offlineResponse = await offlineWorker.fetch(request);
  assert.equal(await offlineResponse.text(), `network:${request.url}`);
  assert.deepEqual(offlineWorker.fetches, []);
});

test("API, auth callback, and RSC requests bypass the application cache", async () => {
  const worker = createWorkerHarness();

  assert.equal(await worker.fetch(requestFor("/api/reports/download")), null);
  assert.equal(await worker.fetch(requestFor("/auth/callback?code=test")), null);
  assert.equal(await worker.fetch(requestFor("/?_rsc=test", {
    headers: { RSC: "1", Accept: "text/x-component" }
  })), null);
  assert.deepEqual(worker.fetches, []);
});

test("an uncached versioned build resource fails offline instead of receiving a document", async () => {
  const worker = createWorkerHarness({ online: false });

  const response = await worker.fetch(requestFor("/_next/static/chunks/missing.js"));
  assert.equal(response.type, "error");
  assert.equal(worker.fetches.length, 1);
});
