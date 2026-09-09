import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";

function executable(path: string): boolean {
  try { accessSync(path, constants.X_OK); return true; } catch { return false; }
}

/** Finder's PATH omits Docker Desktop, OrbStack and Homebrew CLI locations. */
export function resolveDockerExecutable(options: {
  path?: string;
  home?: string;
  isExecutable?: (path: string) => boolean;
} = {}): string {
  const home = options.home ?? homedir();
  const candidates = [
    ...(options.path ?? process.env.PATH ?? "").split(delimiter).filter(Boolean).map(directory => join(directory, "docker")),
    "/usr/local/bin/docker",
    "/opt/homebrew/bin/docker",
    join(home, ".orbstack/bin/docker"),
    join(home, ".docker/bin/docker"),
    "/Applications/Docker.app/Contents/Resources/bin/docker",
  ];
  const exists = options.isExecutable ?? executable;
  const result = [...new Set(candidates)].find(exists);
  if (result == null) throw new Error("Docker CLI was not found. Install or open OrbStack or Docker Desktop, then retry.");
  return result;
}
