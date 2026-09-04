import assert from "node:assert/strict";
import test from "node:test";

import { verifySupabaseAccessToken } from "../src/infrastructure/auth/supabase-access-token.mjs";

test("server Supabase verifier uses an ephemeral auth client and returns the verified user", async () => {
  const calls = [];
  const user = { id: "user-1" };
  const createClientImpl = (url, key, options) => {
    calls.push({ url, key, options });
    return {
      auth: {
        getUser: async (token) => {
          calls.push({ token });
          return { data: { user }, error: null };
        }
      }
    };
  };

  assert.equal(await verifySupabaseAccessToken("access-token", {
    createClientImpl,
    supabaseUrl: "https://example.supabase.co",
    publishableKey: "sb_publishable_public-test"
  }), user);
  assert.deepEqual(calls, [
    {
      url: "https://example.supabase.co",
      key: "sb_publishable_public-test",
      options: {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    },
    { token: "access-token" }
  ]);
});

test("server Supabase verifier rejects unsafe configuration and auth failures", async () => {
  let createCount = 0;
  const createClientImpl = () => {
    createCount += 1;
    return { auth: { getUser: async () => ({ data: null, error: new Error("invalid") }) } };
  };

  assert.equal(await verifySupabaseAccessToken("token", {
    createClientImpl,
    supabaseUrl: "https://example.supabase.co",
    publishableKey: "sb_secret_private-test"
  }), null);
  assert.equal(createCount, 0);

  assert.equal(await verifySupabaseAccessToken("token", {
    createClientImpl,
    supabaseUrl: "https://example.supabase.co",
    publishableKey: "sb_publishable_public-test"
  }), null);
  assert.equal(createCount, 1);
});
