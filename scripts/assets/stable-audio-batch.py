"""Stable Audio 3 Small-SFX で効果音の候補をまとめて作る。

使い方（作業ディレクトリは D:/0001_App_Dev/audioMCP/stable-audio-3、Python はその .venv）:
  .venv/Scripts/python.exe <このファイル> <jobs.json> <出力フォルダ>

jobs.json: [{"name": "item_pickup", "prompt": "...", "duration": 1.2, "seeds": [11, 22, 33]}]
プロンプトの末尾には自動で ", no music, no speech" を付ける。出力は <name>_s<seed>.wav。
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path.cwd()))
from local_runtime import configure  # noqa: E402

configure()

import numpy as np  # noqa: E402
import soundfile as sf  # noqa: E402
import torch  # noqa: E402
from stable_audio_3 import StableAudioModel  # noqa: E402


def main():
    jobs = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    out = Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    start = time.time()
    model = StableAudioModel.from_pretrained("small-sfx")
    print(f"model loaded in {time.time() - start:.1f}s", flush=True)
    rate = model.model_config["sample_rate"]
    for job in jobs:
        prompt = job["prompt"].rstrip(". ") + ", no music, no speech"
        for seed in job["seeds"]:
            t = time.time()
            audio = model.generate(prompt=prompt, duration=job["duration"], steps=job.get("steps", 8),
                                   cfg_scale=job.get("cfg", 1.0), seed=seed)
            samples = audio[0].float().cpu().numpy().T
            if not np.isfinite(samples).all() or np.abs(samples).max() == 0:
                print(f"skip {job['name']} seed {seed}: silent or invalid", flush=True)
                continue
            path = out / f"{job['name']}_s{seed}.wav"
            sf.write(path, samples, rate)
            print(f"{path.name} {time.time() - t:.1f}s", flush=True)
    if torch.cuda.is_available():
        print(f"peak GPU {torch.cuda.max_memory_allocated() / 1024**3:.2f} GiB", flush=True)


if __name__ == "__main__":
    main()
