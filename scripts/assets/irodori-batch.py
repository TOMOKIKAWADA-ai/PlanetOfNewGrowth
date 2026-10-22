"""Generate voice lines with Irodori-TTS 4.1, loading the model once (backlog B0-2 / B3).

Run with the Irodori venv python (cwd does not matter):
  D:/AI/Irodori-TTS-v4_1/.venv/Scripts/python.exe scripts/assets/irodori-batch.py <lines.json> <out_dir> [id ...]

lines.json:
  {
    "speakers": {"akame": {"caption": "voice description", "seed": 2202}},
    "lines": [{"id": "battle_start", "speaker": "akame", "text": "...", "style": "extra caption", "seeds": [2202, 2203]}]
  }
Each line writes <out_dir>/<speaker>-<id>-s<seed>.wav for every seed. "style" is appended to the speaker caption.
Based on search_survive_promo/meibuki-intro/tools/tts_batch.py.
"""
import json
import sys
from pathlib import Path

IRODORI = Path(r"D:\AI\Irodori-TTS-v4_1")
sys.path.insert(0, str(IRODORI))
# configure() changes the working directory, so resolve the arguments first.
ARGS = [str(Path(arg).resolve()) for arg in sys.argv[1:3]] + sys.argv[3:]

from local_runtime import configure  # noqa: E402

configure()

import infer  # noqa: E402
from irodori_tts.inference_runtime import get_cached_runtime  # noqa: E402


class _CachedRuntime:
    @staticmethod
    def from_key(key):
        return get_cached_runtime(key)[0]


infer.InferenceRuntime = _CachedRuntime


def main():
    lines_path, out_dir, *only = ARGS
    spec = json.loads(Path(lines_path).read_text(encoding="utf-8"))
    out = Path(out_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    for line in spec["lines"]:
        if only and line["id"] not in only:
            continue
        speaker = spec["speakers"][line["speaker"]]
        caption = speaker["caption"] + line.get("style", "")
        for seed in line.get("seeds", [speaker["seed"]]):
            target = out / f"{line['speaker']}-{line['id']}-s{seed}.wav"
            sys.argv = [
                "infer.py",
                "--hf-checkpoint", "Aratako/Irodori-TTS-v4.1-Small",
                "--model-device", "cuda", "--codec-device", "cuda",
                "--model-precision", "bf16", "--codec-precision", "fp32",
                "--text", line["text"],
                "--caption", caption,
                "--no-ref",
                "--seed", str(seed),
                "--no-show-timings",
                "--output-wav", str(target),
            ]
            print(f"== {line['speaker']} {line['id']} seed={seed}", flush=True)
            infer.main()


if __name__ == "__main__":
    main()
