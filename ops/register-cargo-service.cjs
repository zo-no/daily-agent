"use strict";

const registration = require("./catpaw/register-cargo-service.cjs");

module.exports = registration;

if (require.main === module) {
  registration.startRegistrationWorker().then(
    () => {
      process.stdout.write("[log-note] OCTO HTTP registration ready\n", () => process.exit(0));
    },
    () => {
      process.stderr.write("[log-note] OCTO HTTP registration failed\n", () => process.exit(1));
    }
  );
}
