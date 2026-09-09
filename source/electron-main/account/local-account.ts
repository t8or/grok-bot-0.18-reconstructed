import type { AuthServicePort } from "./cursor-auth-wiring.js";
import type { SandAuthStatus } from "./cursor-auth.js";

/** Local shell identity only; never represents a Cursor account or entitlement. */
export function createLocalAccountService(): AuthServicePort {
  let status: Extract<SandAuthStatus, { kind: "logged-in" }> = { kind: "logged-in", authId: "local:codexbot", displayName: "Local", isAnysphereUser: false };
  const listeners = new Set<(status: SandAuthStatus) => void>();
  const current = async () => status;
  return {
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getStatus: current,
    async getValidAccessToken() { throw new Error("Cursor services are disabled in CodexBot. Codex uses your separate ChatGPT authentication."); },
    peekAccessToken: async () => null,
    login: current, cancelLogin: current, logout: current,
    revokeForAccountRefusal: async () => ({ kind: "completed", status }),
    async updateDisplayName(displayName) { status = { ...status, displayName }; for (const listener of listeners) listener(status); return status; },
  };
}
