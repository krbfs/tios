import { execSync, spawn, type ChildProcess } from "node:child_process";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Free dedicated e2e port (3101 / 3099) before starting a test server. */
export async function freeE2EPort(port: string): Promise<void> {
  if (process.env.E2E_KEEP_PORT === "1") {
    return;
  }
  try {
    const raw = execSync(`lsof -ti :${port}`, { encoding: "utf8" }).trim();
    if (!raw) {
      return;
    }
    for (const pid of raw.split(/\s+/)) {
      if (pid) {
        process.kill(Number(pid), "SIGTERM");
      }
    }
    await sleep(500);
  } catch {
    // port already free
  }
}

async function isServerUp(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return response.status > 0 && response.status < 500;
  } catch {
    return false;
  }
}

export async function startTestServer(options: {
  port: string;
  rootUrl: string;
  useDev: boolean;
  skipBuild?: boolean;
  verbose?: boolean;
}): Promise<ChildProcess> {
  const { port, rootUrl, useDev, skipBuild, verbose } = options;

  await freeE2EPort(port);

  if (!useDev && !skipBuild) {
    await runCommand("npm", ["run", "build"], process.env);
  }

  const child = useDev
    ? spawn(
        "npx",
        ["next", "dev", "--turbopack", "-p", port, "-H", "127.0.0.1"],
        {
          cwd: process.cwd(),
          env: { ...process.env, PORT: port, HOSTNAME: "127.0.0.1" },
          stdio: "pipe",
        },
      )
    : spawn("npm", ["run", "start"], {
        cwd: process.cwd(),
        env: { ...process.env, PORT: port, HOSTNAME: "127.0.0.1" },
        stdio: "pipe",
      });

  let log = "";
  const append = (chunk: Buffer) => {
    const text = chunk.toString();
    log += text;
    if (verbose) {
      process.stdout.write(text);
    }
  };
  child.stdout?.on("data", append);
  child.stderr?.on("data", append);

  const maxAttempts = useDev ? 180 : 90;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (await isServerUp(rootUrl)) {
      return child;
    }
    if (child.exitCode !== null) {
      throw new Error(
        `Server exited early (code ${child.exitCode}) at ${rootUrl}:\n${tail(log)}`,
      );
    }
    await sleep(1000);
  }

  child.kill();
  throw new Error(
    `Server did not become ready at ${rootUrl} (${maxAttempts}s). Log:\n${tail(log)}`,
  );
}

export async function stopTestServer(child: ChildProcess | null) {
  if (!child || child.killed) {
    return;
  }
  child.kill("SIGTERM");
  await sleep(500);
  if (!child.killed) {
    child.kill("SIGKILL");
  }
}

function tail(text: string, max = 4000): string {
  return text.length > max ? text.slice(-max) : text;
}

function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
      }
    });
  });
}
