import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";

interface ShellSession {
  process: ChildProcess;
  output: string[];
  isRunning: boolean;
  cwd: string;
}

class ShellManager extends EventEmitter {
  private sessions: Map<string, ShellSession> = new Map();

  createSession(id: string, cwd: string = process.env.HOME || "/home/ubuntu"): string {
    if (this.sessions.has(id)) {
      return id;
    }

    const proc = spawn("bash", ["-i"], {
      cwd,
      env: { ...process.env, TERM: "xterm-256color" },
      stdio: ["pipe", "pipe", "pipe"],
    });

    const session: ShellSession = {
      process: proc,
      output: [],
      isRunning: true,
      cwd,
    };

    proc.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      session.output.push(text);
      this.emit(`output:${id}`, text);
    });

    proc.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      session.output.push(text);
      this.emit(`output:${id}`, text);
    });

    proc.on("exit", (code) => {
      session.isRunning = false;
      this.emit(`exit:${id}`, code);
    });

    this.sessions.set(id, session);
    return id;
  }

  async executeCommand(
    id: string,
    command: string,
    timeout: number = 30000
  ): Promise<{ output: string; exitCode: number | null }> {
    const session = this.sessions.get(id);
    if (!session || !session.isRunning) {
      this.createSession(id);
      return this.executeCommand(id, command, timeout);
    }

    return new Promise((resolve) => {
      const marker = `__EXIT_CODE_${Date.now()}__`;
      const outputChunks: string[] = [];
      let resolved = false;

      const onData = (data: Buffer) => {
        const text = data.toString();
        outputChunks.push(text);

        const combined = outputChunks.join("");
        const markerIdx = combined.indexOf(marker);
        if (markerIdx !== -1) {
          cleanup();
          const beforeMarker = combined.substring(0, markerIdx);
          const afterMarker = combined.substring(markerIdx + marker.length);
          const exitCodeMatch = afterMarker.match(/(\d+)/);
          const exitCode = exitCodeMatch ? parseInt(exitCodeMatch[1], 10) : null;

          const lines = beforeMarker.split("\n");
          const filteredLines = lines.filter(
            (line) => !line.includes(wrappedCmd) && !line.includes(marker)
          );
          resolved = true;
          resolve({
            output: filteredLines.join("\n").trim(),
            exitCode,
          });
        }
      };

      const timer = setTimeout(() => {
        if (!resolved) {
          cleanup();
          resolved = true;
          resolve({
            output: outputChunks.join("").trim(),
            exitCode: null,
          });
        }
      }, timeout);

      const cleanup = () => {
        session.process.stdout?.removeListener("data", onData);
        session.process.stderr?.removeListener("data", onData);
        clearTimeout(timer);
      };

      session.process.stdout?.on("data", onData);
      session.process.stderr?.on("data", onData);

      const wrappedCmd = `${command}; echo "${marker}$?"`;
      session.process.stdin?.write(wrappedCmd + "\n");
    });
  }

  killSession(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;
    session.process.kill("SIGTERM");
    this.sessions.delete(id);
    return true;
  }

  getSession(id: string): ShellSession | undefined {
    return this.sessions.get(id);
  }

  listSessions(): string[] {
    return Array.from(this.sessions.keys());
  }
}

const globalShellManager = new ShellManager();
export default globalShellManager;
