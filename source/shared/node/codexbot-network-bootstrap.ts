import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Utility processes have their own Node globals; install the same packaged policy.
if (process.env.CODEXBOT_LOCAL_ONLY === "1" && process.platform === "darwin") {
  createRequire(import.meta.url)(resolve(dirname(fileURLToPath(import.meta.url)), "../../../codexbot-network.cjs"));
}
