# CodexBot local setup

The inverted app icon is installed from `assets/codexbot/codexbot.icns`.
Its transparent PNG source is `assets/codexbot/codexbot-icon.png`;
the original generated preview is retained separately. Packaging installs
the custom icon before signing the app.

Open `/Applications/CodexBot.app` directly, or use `./Launch CodexBot.command`. Keep OrbStack running.
The launcher supports both the project build and the installed reconstructed
app at `/Applications/CodexBot.app`.

The packaged app selects its own profile before the single-instance lock, even without launcher environment variables, at
`~/Library/Application Support/Grok Bot 0.18 Reconstructed`.
Its `data/settings.json` selects `inferenceProvider: codex` and
`boxRuntime: local-docker`. Both are enforced in local-only mode. The desktop shell uses a local identity and requires no Cursor sign-in. Model inference uses the existing local Codex ChatGPT login.

CodexBot does not register the `sand` or `grokbot` URL schemes. It does not read Cursor account tokens or request Docker inference credentials from Cursor. Account, billing, profile, experiment and telemetry services are disabled locally. A packaged network policy rejects Cursor/Anysphere/GrokBot and telemetry vendor domains in Electron sessions, Node transports, desktop utility processes, and Docker Node services. Backend clients point to a disabled loopback endpoint as an additional safeguard. Action auto-review uses the same Codex account and Sol Medium model, preserves user approval for blocked actions, and fails closed on invalid responses. It does not use Cursor's classifier. This is an application connection policy, not a system-wide firewall for arbitrary programs an agent might launch. The original Grok Bot application remains independent.
This app defaults to `gpt-5.6-sol` with `medium` reasoning, independently of
the global Codex CLI model setting. Explicit `SAND_CODEX_MODEL` and
`SAND_CODEX_REASONING_EFFORT` environment overrides still take precedence.

The Docker container is `grok-bot-local-vm`. Its workspace is `/workspace`,
persisted in the `grok-bot-local-vm-workspace` Docker volume. Its agent data
uses the `grok-bot-local-vm-data` volume. Published ports bind to loopback.

Use the **Codex Local** bot. A verified turn ran `pwd` and `uname -s`,
reported `/workspace` and `Linux`, and created
`/workspace/codex-local-check.txt` containing `CODEX_DOCKER_OK`.
The original **Grok** test conversation also completed a subsequent test
sent through the desktop UI. Its initial failed turn reported a checkpoint
error; the later turn successfully ran the container command and replied.

Two source fixes connect Codex to container execution: Docker Codex turns
pass through the coordinator to the host, and the Responses adapter yields
tool calls to the existing host runner. All 29 tests and TypeScript checks
passed before packaging.

Known limitations: the repository's separate `verify` and `smoke` scripts
report renderer provenance/inventory mismatches for its patched shipped UI.
These checks have not been bypassed. This setup was validated with an actual
Codex container shell turn, not by claiming those checks pass.

Codex inference requires internet access. The agent runtime and its workspace
are local; the model itself runs through the Codex service.

Final independence validation (2026-09-08): direct Applications launch opens the
CodexBot window while the original Grok Bot process remains separate. Settings
show the local account and Codex Sol Medium with the local Docker VM ready.
A Codex task passed action review and returned `/workspace`, `Linux`, and
`CODEX_DOCKER_OK` from the preserved file. The running Docker Node policy returned
`ERR_CODEXBOT_VENDOR_BLOCKED` for a Cursor request before network dispatch.
The container has no Cursor inference credential mount.

The reconstructed turn runner now restores the transcript journal from the
durable base checkpoint before preparing new checkpoints. A regression test
verifies recovery, preparation, durable persistence, and commit ordering.

Finder reconnect fix: Docker commands resolve an executable from PATH or the
standard Docker Desktop, OrbStack, and Homebrew installation locations. macOS
Applications launches normally provide only `/usr/bin:/bin:/usr/sbin:/sbin`,
which previously made `spawn("docker")` fail even while the container was healthy.
The resolver now uses the full executable path and includes its directory for
Docker subprocess helpers. Tests cover the restricted PATH and installation paths.

Verified the reconnect fix with a full quit followed by launch using exactly
`PATH=/usr/bin:/bin:/usr/sbin:/sbin`. The running app inherited that restricted
PATH and reconnected to the existing healthy container without a Retry or
Reconnecting banner. The Docker container was not recreated for this fix.
