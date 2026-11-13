"""Fetch the pinned NISAR release into the gitignored ``data/`` tree.

The release repo is ~700 MB. A plain ``git clone`` negotiates one pack and stalls on
slow links, so this pulls the same bytes from the pinned commit in parallel and
verifies every file against the size the Git tree reports.

    python scripts/tiles/fetch_data.py                 # resolve main, fetch, pin
    python scripts/tiles/fetch_data.py --commit <sha>  # fetch a specific commit
    python scripts/tiles/fetch_data.py --verify        # re-check local files only

Exit status is non-zero if any file is missing or the wrong size.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import sys
import time
import urllib.error
import urllib.request

DEFAULT_REPO = "monteropeterdominic-arch/sarangani-davao-occidental-nisar"
API = "https://api.github.com/repos/{repo}"
RAW = "https://raw.githubusercontent.com/{repo}/{sha}/{path}"
PIN_NAME = ".pin.json"


def _get_json(url: str) -> dict:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "nisar-tile-pipeline",
            "Accept": "application/vnd.github+json",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)


def resolve_commit(repo: str, commit: str | None) -> str:
    if commit:
        return _get_json(f"{API.format(repo=repo)}/commits/{commit}")["sha"]
    return _get_json(f"{API.format(repo=repo)}/branches/main")["commit"]["sha"]


def list_blobs(repo: str, sha: str) -> list[dict]:
    tree = _get_json(f"{API.format(repo=repo)}/git/trees/{sha}?recursive=1")
    if tree.get("truncated"):
        sys.exit("error: git tree was truncated by the API; fetch a subdirectory instead")
    return [entry for entry in tree["tree"] if entry["type"] == "blob"]


def download(repo: str, sha: str, dest: str, blob: dict, attempts: int = 3) -> tuple[str, int, str]:
    """Download one blob. Returns (path, bytes written, error-or-empty)."""
    path = blob["path"]
    target = os.path.join(dest, *path.split("/"))
    os.makedirs(os.path.dirname(target), exist_ok=True)

    if os.path.exists(target) and os.path.getsize(target) == blob["size"]:
        return path, 0, ""

    tmp = target + ".part"
    url = RAW.format(repo=repo, sha=sha, path=path)
    last = ""
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(url, timeout=180) as resp, open(tmp, "wb") as fh:
                written = 0
                while chunk := resp.read(1 << 20):
                    fh.write(chunk)
                    written += len(chunk)
            if written != blob["size"]:
                last = f"size {written} != {blob['size']}"
                if attempt + 1 < attempts:
                    time.sleep(2 * (attempt + 1))
                    continue
                os.remove(tmp)
                return path, 0, last
            os.replace(tmp, target)
            return path, written, ""
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            last = f"{type(exc).__name__}: {exc}"
            if attempt + 1 < attempts:
                time.sleep(2 * (attempt + 1))
    if os.path.exists(tmp):
        os.remove(tmp)
    return path, 0, last


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--repo", default=DEFAULT_REPO)
    ap.add_argument("--commit", default=None, help="commit sha or ref (default: main)")
    ap.add_argument("--dest", default="data")
    ap.add_argument("--jobs", type=int, default=16)
    ap.add_argument("--verify", action="store_true", help="check file sizes without downloading")
    args = ap.parse_args()

    pin_path = os.path.join(args.dest, PIN_NAME)
    pinned = None
    if os.path.exists(pin_path):
        with open(pin_path, encoding="utf-8") as fh:
            pinned = json.load(fh)

    if args.verify:
        if not pinned:
            sys.exit(f"error: no {pin_path}; run without --verify first")
        sha = pinned["commit"]
    else:
        sha = resolve_commit(args.repo, args.commit or (pinned or {}).get("commit"))
        if pinned and pinned.get("commit") != sha:
            print(f"pin moves {pinned['commit'][:8]} -> {sha[:8]}; refetching changed files", flush=True)

    blobs = list_blobs(args.repo, sha)
    total = sum(b["size"] for b in blobs)
    print(f"{len(blobs)} files, {total / 1e6:.0f} MB at {sha[:12]}", flush=True)

    started = time.time()
    done_bytes = 0
    failures: list[tuple[str, str]] = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.jobs) as pool:
        futures = [pool.submit(download, args.repo, sha, args.dest, b) for b in blobs]
        for n, fut in enumerate(concurrent.futures.as_completed(futures), 1):
            path, written, err = fut.result()
            done_bytes += written
            if err:
                failures.append((path, err))
                print(f"FAIL {path}: {err}", file=sys.stderr, flush=True)
            if n % 20 == 0 or n == len(futures):
                rate = done_bytes / max(time.time() - started, 0.001) / 1e6
                print(f"  {n}/{len(futures)} files, {done_bytes / 1e6:.0f} MB at {rate:.1f} MB/s", flush=True)

    if failures:
        print(f"\n{len(failures)} file(s) failed; rerun to retry (completed files are skipped)", file=sys.stderr)
        return 1

    pin = {
        "repo": f"https://github.com/{args.repo}",
        "commit": sha,
        "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "files": len(blobs),
        "bytes": total,
    }
    with open(pin_path, "w", encoding="utf-8") as fh:
        json.dump(pin, fh, indent=2)
        fh.write("\n")
    print(f"pinned {sha} -> {pin_path} ({len(blobs)} files, {total / 1e6:.0f} MB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
