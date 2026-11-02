"""Stress test: many clinicians using a running backend at the same time.

    # terminal 1 (backend running as usual), then in terminal 2:
    cd backend
    python scripts/load_test.py --users 5 --uploads 3
    python scripts/load_test.py --users 20 --uploads 3 --url http://127.0.0.1:8000

Each simulated user signs up, logs in and uploads photos. It prints success rate and
latency so you can show how the system behaves as load grows. It creates test
accounts, so run it against a throwaway database.
"""

import argparse
import statistics
import threading
import time
import uuid
from collections import Counter
from io import BytesIO

import httpx
import numpy as np
from PIL import Image


def photo(seed):
    rng = np.random.default_rng(seed)
    buffer = BytesIO()
    Image.fromarray(rng.integers(0, 256, (480, 640, 3), dtype=np.uint8)).save(buffer, "JPEG", quality=90)
    return buffer.getvalue()


def one_user(base, uploads, results, lock, index):
    email = f"load-{uuid.uuid4().hex[:10]}@example.com"
    password = "correct-horse-1"
    record = []  # (step, status, seconds)

    def timed(step, call):
        start = time.perf_counter()
        try:
            response = call()
            record.append((step, response.status_code, time.perf_counter() - start))
            return response
        except httpx.HTTPError as error:
            record.append((step, type(error).__name__, time.perf_counter() - start))
            return None

    with httpx.Client(base_url=base, timeout=120) as client:
        timed("signup", lambda: client.post("/auth/signup", json={"full_name": f"Load User {index}", "email": email, "password": password}))
        login = timed("login", lambda: client.post("/auth/login", data={"username": email, "password": password}))
        if login is not None and login.status_code == 200:
            headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
            for n in range(uploads):
                data = photo(index * 100 + n)
                timed("upload", lambda: client.post("/images", files={"file": ("p.jpg", data, "image/jpeg")}, headers=headers))
            timed("history", lambda: client.get("/images", headers=headers))
    with lock:
        results.extend(record)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:8000")
    parser.add_argument("--users", type=int, default=5)
    parser.add_argument("--uploads", type=int, default=3)
    args = parser.parse_args()

    results, lock = [], threading.Lock()
    started = time.perf_counter()
    threads = [threading.Thread(target=one_user, args=(args.url, args.uploads, results, lock, i)) for i in range(args.users)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    wall = time.perf_counter() - started

    print(f"\n{args.users} users x {args.uploads} uploads, all at once -> {len(results)} requests in {wall:.1f}s")
    print(f"{'step':8} {'ok':>4} {'failed':>7} {'median':>9} {'p95':>9} {'max':>9}")
    for step in ("signup", "login", "upload", "history"):
        rows = [r for r in results if r[0] == step]
        if not rows:
            continue
        ok = [r[2] for r in rows if r[1] in (200, 201)]
        failed = Counter(str(r[1]) for r in rows if r[1] not in (200, 201))
        times = sorted(r[2] for r in rows)
        p95 = times[min(len(times) - 1, int(len(times) * 0.95))]
        print(f"{step:8} {len(ok):>4} {sum(failed.values()):>7} {statistics.median(times):>8.2f}s {p95:>8.2f}s {times[-1]:>8.2f}s  {dict(failed) or ''}")
    uploads_ok = sum(1 for r in results if r[0] == "upload" and r[1] == 201)
    print(f"\nUpload throughput: {uploads_ok / wall:.2f} analyses/second across all users")


if __name__ == "__main__":
    main()