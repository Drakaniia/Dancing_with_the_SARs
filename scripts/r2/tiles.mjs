#!/usr/bin/env node
/**
 * Host the generated map tiles on Cloudflare R2 using the repo's wrangler CLI.
 *
 *   node scripts/r2/tiles.mjs setup    # bucket + CORS + public r2.dev URL + apps/web/.env.local
 *   node scripts/r2/tiles.mjs index    # write apps/web/public/tiles/index.json
 *   node scripts/r2/tiles.mjs upload   # index + parallel, resumable upload of changed tiles
 *   node scripts/r2/tiles.mjs all      # setup, then upload (default)
 *
 * Options:
 *   --bucket <name>       Bucket name (default: $R2_BUCKET or "nisar-tiles")
 *   --location <hint>     Location hint on first create: weur, eeur, apac, wnam, enam, oc
 *   --concurrency <n>     Parallel `wrangler r2 object put` processes (default 8)
 *   --force               Re-upload every tile, ignoring the local upload state
 *   --github              Also run `gh variable set TILE_BASE_URL` for release builds
 *   --no-env              Do not write VITE_TILE_BASE_URL to apps/web/.env.local
 *   --dry-run             Print the wrangler commands instead of changing anything
 *
 * Log in once with `pnpm exec wrangler login`. R2 must be enabled on the account
 * (Cloudflare dashboard -> R2, free tier needs a payment method on file).
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const TILES_DIR = path.join(ROOT, "apps/web/public/tiles");
const INDEX_FILE = path.join(TILES_DIR, "index.json");
const ENV_FILE = path.join(ROOT, "apps/web/.env.local");
const TILE_CACHE_CONTROL = "public, max-age=86400";
const INDEX_CACHE_CONTROL = "public, max-age=60";
const CORS_RULES = {
  rules: [
    {
      allowed: { origins: ["*"], methods: ["GET", "HEAD"], headers: ["*"] },
      maxAgeSeconds: 86400,
    },
  ],
};

// ---------------------------------------------------------------- arguments

function parseArgs(argv) {
  const opts = {
    command: "all",
    bucket: process.env.R2_BUCKET || "nisar-tiles",
    location: undefined,
    concurrency: 8,
    force: false,
    github: false,
    env: true,
    dryRun: false,
  };
  const rest = [...argv];
  while (rest.length) {
    const arg = rest.shift();
    const value = () => {
      const v = rest.shift();
      if (!v) fail(`${arg} needs a value`);
      return v;
    };
    if (arg === "--bucket") opts.bucket = value();
    else if (arg === "--location") opts.location = value();
    else if (arg === "--concurrency") opts.concurrency = Number(value());
    else if (arg === "--force") opts.force = true;
    else if (arg === "--github") opts.github = true;
    else if (arg === "--no-env") opts.env = false;
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "-h" || arg === "--help") {
      console.log(
        fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0],
      );
      process.exit(0);
    } else if (!arg.startsWith("-")) opts.command = arg;
    else fail(`Unknown option ${arg}`);
  }
  if (!["setup", "index", "upload", "all"].includes(opts.command)) {
    fail(`Unknown command "${opts.command}" (use setup, index, upload or all)`);
  }
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(opts.bucket)) {
    fail(`Invalid bucket name "${opts.bucket}" (3-63 chars: a-z, 0-9, -)`);
  }
  if (
    !Number.isInteger(opts.concurrency) ||
    opts.concurrency < 1 ||
    opts.concurrency > 32
  ) {
    fail("--concurrency must be an integer from 1 to 32");
  }
  return opts;
}

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------- wrangler

const WRANGLER_BIN = (() => {
  const require = createRequire(path.join(ROOT, "package.json"));
  try {
    return path.join(
      path.dirname(require.resolve("wrangler/package.json")),
      "bin/wrangler.js",
    );
  } catch {
    fail("wrangler is not installed. Run `pnpm install` at the repo root.");
  }
})();

/** Runs `wrangler <args>` without a shell; resolves { code, out }. */
function run(args, { bin = process.execPath, prefix = [WRANGLER_BIN] } = {}) {
  return new Promise((resolve) => {
    const child = spawn(bin, [...prefix, ...args], {
      cwd: ROOT,
      env: { ...process.env, WRANGLER_SEND_METRICS: "false", FORCE_COLOR: "0" },
      windowsHide: true,
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("error", (error) => resolve({ code: -1, out: String(error) }));
    child.on("close", (code) => resolve({ code, out }));
  });
}

function show(args) {
  return `wrangler ${args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(" ")}`;
}

async function wrangler(
  args,
  opts,
  { mutates = true, allowFail = false } = {},
) {
  if (opts.dryRun && mutates) {
    console.log(`  [dry-run] ${show(args)}`);
    return { code: 0, out: "" };
  }
  const result = await run(args);
  if (result.code !== 0 && !allowFail) {
    console.error(result.out.trim());
    fail(`${show(args)} exited with ${result.code}`);
  }
  return result;
}

// ---------------------------------------------------------------- setup

async function setup(opts) {
  const { bucket } = opts;
  console.log(`Setting up R2 bucket "${bucket}"`);

  const who = await wrangler(["whoami"], opts, {
    mutates: false,
    allowFail: true,
  });
  if (
    who.code !== 0 ||
    /not authenticated|You are not logged in/i.test(who.out)
  ) {
    fail(
      "wrangler is not logged in. Run `pnpm exec wrangler login` and retry.",
    );
  }

  const info = await wrangler(["r2", "bucket", "info", bucket], opts, {
    mutates: false,
    allowFail: true,
  });
  if (info.code === 0) {
    console.log("  bucket exists");
  } else {
    const args = ["r2", "bucket", "create", bucket];
    if (opts.location) args.push("--location", opts.location);
    const created = await wrangler(args, opts, { allowFail: true });
    if (created.code !== 0) {
      console.error(created.out.trim());
      if (/enable R2|10042/i.test(created.out)) {
        fail(
          "R2 is not enabled. Enable it in the Cloudflare dashboard (R2 Object Storage), then retry.",
        );
      }
      if (/Authentication|10000|scope/i.test(created.out)) {
        fail(
          "The wrangler login lacks R2 access. Run `pnpm exec wrangler login` again and allow R2.",
        );
      }
      fail("Bucket creation failed.");
    }
    console.log(opts.dryRun ? "  (would create bucket)" : "  bucket created");
  }

  const corsFile = path.join(os.tmpdir(), `r2-cors-${bucket}.json`);
  fs.writeFileSync(corsFile, JSON.stringify(CORS_RULES, null, 2));
  await wrangler(
    ["r2", "bucket", "cors", "set", bucket, "--file", corsFile, "--force"],
    opts,
  );
  fs.rmSync(corsFile, { force: true });
  console.log("  CORS: GET/HEAD from any origin");

  await wrangler(
    ["r2", "bucket", "dev-url", "enable", bucket, "--force"],
    opts,
  );
  let url = null;
  if (!opts.dryRun) {
    const devUrl = await wrangler(
      ["r2", "bucket", "dev-url", "get", bucket],
      opts,
      {
        mutates: false,
      },
    );
    url = devUrl.out.match(/https:\/\/pub-[a-z0-9]+\.r2\.dev/i)?.[0] ?? null;
    if (!url) {
      console.error(devUrl.out.trim());
      fail("Could not read the r2.dev URL.");
    }
    console.log(`  public URL: ${url}`);
  }

  if (url && opts.env) writeEnvLocal(url);
  if (url && opts.github) await setGithubVariable(url);
  return url;
}

function writeEnvLocal(url) {
  const lines = fs.existsSync(ENV_FILE)
    ? fs
        .readFileSync(ENV_FILE, "utf8")
        .split(/\r?\n/)
        .filter((l) => l && !l.startsWith("VITE_TILE_BASE_URL="))
    : [];
  lines.push(`VITE_TILE_BASE_URL=${url}`);
  fs.writeFileSync(ENV_FILE, `${lines.join("\n")}\n`);
  console.log(`  wrote VITE_TILE_BASE_URL to ${path.relative(ROOT, ENV_FILE)}`);
}

async function setGithubVariable(url) {
  const gh = await run(["variable", "set", "TILE_BASE_URL", "--body", url], {
    bin: process.platform === "win32" ? "gh.exe" : "gh",
    prefix: [],
  });
  if (gh.code === 0) console.log("  set GitHub variable TILE_BASE_URL");
  else
    console.warn(
      `  warning: gh variable set failed (${gh.out.trim()}). Set TILE_BASE_URL by hand.`,
    );
}

// ---------------------------------------------------------------- index

function listTiles() {
  if (!fs.existsSync(TILES_DIR)) {
    fail(
      `${path.relative(ROOT, TILES_DIR)} not found. Run scripts/tiles/pipeline.py first.`,
    );
  }
  const entries = [];
  const walk = (dir) => {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) walk(full);
      else if (item.name.endsWith(".png")) {
        const stat = fs.statSync(full);
        const key = path.relative(TILES_DIR, full).split(path.sep).join("/");
        entries.push({
          key,
          full,
          size: stat.size,
          mtimeMs: Math.round(stat.mtimeMs),
        });
      }
    }
  };
  walk(TILES_DIR);
  entries.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return entries;
}

function writeIndex(entries) {
  const tiles = entries.map((e) => [e.key, e.size]);
  const version = createHash("sha256")
    .update(JSON.stringify(tiles))
    .digest("hex")
    .slice(0, 16);
  const bytes = entries.reduce((sum, e) => sum + e.size, 0);
  fs.writeFileSync(
    INDEX_FILE,
    JSON.stringify({ version, count: tiles.length, bytes, tiles }),
  );
  console.log(
    `Wrote ${path.relative(ROOT, INDEX_FILE)}: ${tiles.length} tiles, ${(bytes / 2 ** 20).toFixed(1)} MiB, version ${version}`,
  );
  return { version, bytes };
}

// ---------------------------------------------------------------- upload

function statePath(bucket) {
  return path.join(ROOT, "data", `.r2-upload-${bucket}.json`);
}

function loadState(bucket) {
  try {
    return JSON.parse(fs.readFileSync(statePath(bucket), "utf8"));
  } catch {
    return {};
  }
}

function saveState(bucket, state) {
  fs.mkdirSync(path.dirname(statePath(bucket)), { recursive: true });
  fs.writeFileSync(statePath(bucket), JSON.stringify(state));
}

async function putObject(opts, key, file, cacheControl) {
  const args = [
    "r2",
    "object",
    "put",
    `${opts.bucket}/tiles/${key}`,
    "--file",
    file,
    "--remote",
    "--content-type",
    key.endsWith(".json") ? "application/json" : "image/png",
    "--cache-control",
    cacheControl,
  ];
  if (opts.dryRun) return { code: 0, out: "" };
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    last = await run(args);
    if (last.code === 0) return last;
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
  }
  return last;
}

async function upload(opts) {
  const entries = listTiles();
  writeIndex(entries);

  const state = opts.force ? {} : loadState(opts.bucket);
  const todo = entries.filter((e) => {
    const prev = state[e.key];
    return !prev || prev.size !== e.size || prev.mtimeMs !== e.mtimeMs;
  });
  console.log(
    `Uploading ${todo.length} of ${entries.length} tiles to ${opts.bucket}/tiles/ ` +
      `(${opts.concurrency} parallel${opts.dryRun ? ", dry run" : ""})`,
  );
  if (opts.dryRun) {
    if (todo.length) {
      console.log(
        `  [dry-run] e.g. wrangler r2 object put ${opts.bucket}/tiles/${todo[0].key} --file ... --remote`,
      );
    }
    console.log(
      `  [dry-run] then wrangler r2 object put ${opts.bucket}/tiles/index.json ...`,
    );
    console.log("Dry run complete.");
    return;
  }

  const started = Date.now();
  let done = 0;
  const failed = [];
  let next = 0;
  let sinceSave = 0;
  const worker = async () => {
    while (next < todo.length) {
      const entry = todo[next++];
      const result = await putObject(
        opts,
        entry.key,
        entry.full,
        TILE_CACHE_CONTROL,
      );
      if (result.code === 0) {
        if (!opts.dryRun)
          state[entry.key] = { size: entry.size, mtimeMs: entry.mtimeMs };
        if (++sinceSave >= 200) {
          sinceSave = 0;
          if (!opts.dryRun) saveState(opts.bucket, state);
        }
      } else {
        failed.push(entry.key);
        console.error(
          `  failed ${entry.key}: ${result.out.trim().split("\n").pop()}`,
        );
      }
      done++;
      if (done % 100 === 0 || done === todo.length) {
        const rate = done / ((Date.now() - started) / 1000);
        const eta = rate > 0 ? Math.round((todo.length - done) / rate / 60) : 0;
        console.log(
          `  ${done}/${todo.length} (${rate.toFixed(1)}/s, ~${eta} min left)`,
        );
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(opts.concurrency, todo.length) }, worker),
  );
  if (!opts.dryRun) saveState(opts.bucket, state);

  if (failed.length) {
    fail(
      `${failed.length} tile(s) failed. Re-run the same command to retry only those.`,
    );
  }

  // Publish the index last, so clients never see entries that are not uploaded yet.
  const indexResult = await putObject(
    opts,
    "index.json",
    INDEX_FILE,
    INDEX_CACHE_CONTROL,
  );
  if (indexResult.code !== 0)
    fail(`index.json upload failed: ${indexResult.out.trim()}`);
  console.log("Upload complete: tiles/index.json published.");
}

// ---------------------------------------------------------------- main

const opts = parseArgs(process.argv.slice(2));
if (opts.command === "setup") await setup(opts);
else if (opts.command === "index") writeIndex(listTiles());
else if (opts.command === "upload") await upload(opts);
else {
  const url = await setup(opts);
  await upload(opts);
  if (url)
    console.log(
      `\nTiles are served from ${url}/tiles/. Rebuild the app to use them.`,
    );
}
