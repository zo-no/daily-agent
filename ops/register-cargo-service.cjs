"use strict";

const { spawn } = require("node:child_process");

const SERVICE = Object.freeze({
  appkey: "com.sankuai.hackathon.ai2026.clockwork",
  port: 3100
});
const DEFAULT_TIMEOUT_MS = 10_000;
const WORKER_ARGUMENT = "--register-worker";

function waitForWorker(child, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer;

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.removeListener("error", onError);
      child.removeListener("exit", onExit);
      callback(value);
    };
    const onError = () => finish(reject, new Error("OCTO HTTP registration worker failed"));
    const onExit = (code) => {
      if (code === 0) {
        finish(resolve);
      } else {
        finish(reject, new Error("OCTO HTTP registration worker failed"));
      }
    };

    child.once("error", onError);
    child.once("exit", onExit);
    timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(reject, new Error("OCTO HTTP registration timed out"));
    }, timeoutMs);
  });
}

async function registerCargoService(registerService) {
  if (typeof registerService !== "function") {
    throw new TypeError("registerService must be a function");
  }

  await registerService(SERVICE);
}

function startRegistrationWorker(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const child = spawn(process.execPath, [__filename, WORKER_ARGUMENT], {
    stdio: "ignore"
  });
  return waitForWorker(child, timeoutMs);
}

module.exports = {
  DEFAULT_TIMEOUT_MS,
  SERVICE,
  registerCargoService,
  startRegistrationWorker,
  waitForWorker
};

if (require.main === module) {
  if (process.argv[2] === WORKER_ARGUMENT) {
    const { registerService } = require("@mtfe/hlb");
    registerCargoService(registerService).then(() => process.exit(0), () => process.exit(1));
  } else {
    startRegistrationWorker().then(
      () => {
        process.stdout.write("[log-note] OCTO HTTP registration ready\n", () => process.exit(0));
      },
      () => {
        process.stderr.write("[log-note] OCTO HTTP registration failed\n", () => process.exit(1));
      }
    );
  }
}
