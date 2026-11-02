"""Measure model speed and memory on THIS machine. Use it on each device you test.

    cd backend
    pip install psutil          # optional: adds memory and CPU figures
    python scripts/benchmark.py                 # 20 runs on synthetic 640x480 photos
    python scripts/benchmark.py --n 50 --photos C:\\path\\to\\real_photos

Copy the printed block into your report's performance table.
"""

import argparse
import platform
import statistics
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
from PIL import Image

try:
    import psutil
except ImportError:  # psutil is optional
    psutil = None


def environment():
    import tensorflow as tf

    info = {
        "OS": f"{platform.system()} {platform.release()} ({platform.machine()})",
        "Python": platform.python_version(),
        "TensorFlow": tf.__version__,
        "CPU": platform.processor() or "unknown",
    }
    if psutil:
        info["CPU cores"] = f"{psutil.cpu_count(logical=False)} physical / {psutil.cpu_count()} logical"
        info["RAM"] = f"{psutil.virtual_memory().total / 1e9:.1f} GB"
    return info


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=20, help="number of timed predictions")
    parser.add_argument("--photos", help="folder of real 640x480 photos (optional)")
    args = parser.parse_args()

    from app.services import predictor

    process = psutil.Process() if psutil else None
    rss = lambda: process.memory_info().rss / 1e6 if process else float("nan")

    folder = Path(tempfile.mkdtemp())
    if args.photos:
        photos = sorted(p for p in Path(args.photos).iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png"))
    else:
        photos = []
        for seed in range(5):
            path = folder / f"synthetic{seed}.jpg"
            rng = np.random.default_rng(seed)
            Image.fromarray(rng.integers(0, 256, (480, 640, 3), dtype=np.uint8)).save(path, quality=90)
            photos.append(path)

    before = rss()
    start = time.perf_counter()
    predictor.get_state()
    load_time = time.perf_counter() - start
    after_load = rss()

    predictor.predict_with_explanation(str(photos[0]))  # warm-up
    times = []
    if process:
        process.cpu_percent(None)
    for i in range(args.n):
        start = time.perf_counter()
        predictor.predict_with_explanation(str(photos[i % len(photos)]))
        times.append(time.perf_counter() - start)
    cpu = process.cpu_percent(None) if process else float("nan")
    times.sort()

    print("\n=== Environment ===")
    for key, value in environment().items():
        print(f"{key:12} {value}")
    print("\n=== Results ===")
    print(f"Model load (once)      {load_time:.2f} s")
    print(f"Prediction median      {statistics.median(times):.3f} s")
    print(f"Prediction p95         {times[min(len(times) - 1, int(len(times) * 0.95))]:.3f} s")
    print(f"Prediction min / max   {times[0]:.3f} / {times[-1]:.3f} s")
    print(f"Throughput             {1 / statistics.mean(times):.1f} photos/s (one at a time)")
    print(f"Memory (RSS)           {before:.0f} MB before load -> {after_load:.0f} MB after load -> {rss():.0f} MB after {args.n} runs")
    print(f"CPU during the runs    {cpu:.0f}% of one core")


if __name__ == "__main__":
    main()