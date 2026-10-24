"""Measure voice clips without listening: speaker similarity, pitch, naturalness, spectrograms.

Run with the Irodori venv python from the repository root:
  D:/AI/Irodori-TTS-v4_1/.venv/Scripts/python.exe scripts/assets/voice-analyze.py <out_dir> <set> [<set> ...]

Each <set> is "<label>:<speaker>:<path>" where <path> is a folder or a single file (wav/mp3).
The label "ref" marks reference clips; every other clip is compared with the reference clips of
every speaker, so you can see whether a line sounds closer to its own character than to the others.
  python scripts/assets/voice-analyze.py tmp/voice-analysis \
    ref:tsukimi:assets_src/voice/refs/tsukimi game:tsukimi:assets/audio/voice/tsukimi ...

Writes <out_dir>/report.md, report.json and one spectrogram sheet per speaker and label (<label>-<speaker>.png).

Metrics:
- spk_own / spk_other: cosine similarity of WavLM x-vectors (microsoft/wavlm-base-plus-sv) to the
  mean reference embedding of the clip's own speaker and to the closest other speaker. The model's
  usual "same speaker" threshold is about 0.86. Clips under ~0.5 s give unstable embeddings.
- f0_med / f0_p10-p90 / f0_semi: pitch from librosa.pyin (Hz) and the 10-90% range in semitones (intonation).
- voiced: share of audible frames with a pitch. Below ~0.4 the line is mostly breath or whisper and f0 is unreliable.
- energy_db: 10-90% range of frame loudness in dB (dynamics).
- mos: torchaudio SQUIM_SUBJECTIVE naturalness estimate (1-5), scored against a reference clip of
  the same speaker. Trained on natural speech; treat as a relative score between candidates.
"""
import json
import sys
from pathlib import Path

ARGS = sys.argv[1:]
START_DIR = Path.cwd()
sys.path.insert(0, r"D:\AI\Irodori-TTS-v4_1")
from local_runtime import configure  # noqa: E402

configure()  # HF cache under the Irodori folder and FFmpeg on PATH (mp3 decoding)

import librosa  # noqa: E402
import matplotlib  # noqa: E402

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import torch  # noqa: E402
import torchaudio  # noqa: E402
from transformers import AutoFeatureExtractor, WavLMForXVector  # noqa: E402

SR = 16000
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


def load(path):
    audio, _ = librosa.load(path, sr=SR, mono=True)
    trimmed, _ = librosa.effects.trim(audio, top_db=40)
    return trimmed if len(trimmed) > SR * 0.1 else audio


def at_least(audio, seconds=1.0):
    # The models need a little length; repeat very short clips instead of padding with silence.
    need = int(SR * seconds)
    return np.tile(audio, int(np.ceil(need / len(audio)))) if len(audio) < need else audio


def collect(sets):
    clips = []
    for spec in sets:
        label, speaker, raw = spec.split(":", 2)
        path = (START_DIR / raw).resolve()
        files = [path] if path.is_file() else sorted(p for p in path.iterdir() if p.suffix.lower() in (".wav", ".mp3"))
        clips += [{"label": label, "speaker": speaker, "path": p, "name": p.stem} for p in files]
    return clips


class Speaker:
    def __init__(self):
        name = "microsoft/wavlm-base-plus-sv"
        self.fe = AutoFeatureExtractor.from_pretrained(name)
        self.model = WavLMForXVector.from_pretrained(name).to(DEVICE).eval()

    @torch.no_grad()
    def embed(self, audio):
        inputs = self.fe(at_least(audio), sampling_rate=SR, return_tensors="pt", padding=True).to(DEVICE)
        vec = self.model(**inputs).embeddings[0]
        return torch.nn.functional.normalize(vec, dim=-1).cpu().numpy()


class Naturalness:
    def __init__(self):
        self.model = torchaudio.pipelines.SQUIM_SUBJECTIVE.get_model().to(DEVICE).eval()

    @torch.no_grad()
    def score(self, audio, reference):
        wav = torch.from_numpy(at_least(audio)).float().unsqueeze(0).to(DEVICE)
        ref = torch.from_numpy(reference).float().unsqueeze(0).to(DEVICE)
        return float(self.model(wav, ref)[0])


def prosody(audio):
    f0, voiced, _ = librosa.pyin(audio, fmin=80, fmax=800, sr=SR, frame_length=1024)
    rms = librosa.feature.rms(y=audio, frame_length=1024, hop_length=256)[0]
    db = 20 * np.log10(np.maximum(rms, 1e-5))
    loud = db > db.max() - 40
    n = min(len(loud), len(voiced))
    # Share of audible frames that have a pitch; low values mean whisper, breath or noise, so f0 is unreliable.
    voiced_ratio = float(voiced[:n][loud[:n]].mean()) if loud[:n].any() else 0.0
    f0 = f0[voiced & ~np.isnan(f0)]
    db = db[loud]
    out = {"dur": round(len(audio) / SR, 2), "voiced": round(voiced_ratio, 2),
           "energy_db": round(float(np.percentile(db, 90) - np.percentile(db, 10)), 1)}
    if len(f0) >= 3:
        p10, p50, p90 = np.percentile(f0, [10, 50, 90])
        out.update(f0_med=round(float(p50)), f0_p10=round(float(p10)), f0_p90=round(float(p90)),
                   f0_semi=round(float(12 * np.log2(p90 / p10)), 1))
    return out


def sheet(group, out_path):
    cols = 3
    rows = int(np.ceil(len(group) / cols))
    fig, axes = plt.subplots(rows, cols, figsize=(cols * 4.2, rows * 2.6), squeeze=False)
    for ax in axes.flat:
        ax.axis("off")
    for ax, clip in zip(axes.flat, group):
        audio = clip["audio"]
        mel = librosa.power_to_db(librosa.feature.melspectrogram(y=audio, sr=SR, n_mels=80, fmax=8000), ref=np.max)
        ax.axis("on")
        ax.imshow(mel, origin="lower", aspect="auto", cmap="magma", vmin=-70, vmax=0,
                  extent=[0, len(audio) / SR, 0, 80])
        f0, voiced, _ = librosa.pyin(audio, fmin=80, fmax=800, sr=SR, frame_length=1024)
        times = librosa.times_like(f0, sr=SR, hop_length=256)
        mel_f0 = np.where(voiced, 80 * np.log1p(np.nan_to_num(f0) / 700) / np.log1p(8000 / 700), np.nan)
        ax.plot(times, mel_f0, color="cyan", linewidth=1.2)
        m = clip["metrics"]
        ax.set_title(f"{clip['name'][:34]}\nspk {m.get('spk_own', 0):.2f}  f0 {m.get('f0_med', '-')}Hz  mos {m.get('mos', 0):.2f}",
                     fontsize=8)
        ax.set_yticks([])
        ax.tick_params(labelsize=7)
    fig.tight_layout()
    fig.savefig(out_path, dpi=90)
    plt.close(fig)


def main():
    out_dir, *sets = ARGS
    out = (START_DIR / out_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    clips = collect(sets)
    spk, nat = Speaker(), Naturalness()
    for clip in clips:
        clip["audio"] = load(clip["path"])
        clip["emb"] = spk.embed(clip["audio"])
        clip["metrics"] = prosody(clip["audio"])

    refs = {}
    for clip in clips:
        if clip["label"] == "ref":
            refs.setdefault(clip["speaker"], []).append(clip)
    centroids = {s: np.mean([c["emb"] for c in group], axis=0) for s, group in refs.items()}
    centroids = {s: v / np.linalg.norm(v) for s, v in centroids.items()}
    longest_ref = {s: max(group, key=lambda c: len(c["audio"]))["audio"] for s, group in refs.items()}

    for clip in clips:
        m, s = clip["metrics"], clip["speaker"]
        if s in centroids:
            if clip["label"] == "ref":
                # Leave the clip out of its own centroid so references are not compared with themselves.
                others = [c["emb"] for c in refs[s] if c is not clip]
                own = np.mean(others, axis=0) if others else centroids[s]
                own = own / np.linalg.norm(own)
            else:
                own = centroids[s]
            m["spk_own"] = round(float(clip["emb"] @ own), 3)
            other = {o: float(clip["emb"] @ v) for o, v in centroids.items() if o != s}
            if other:
                closest = max(other, key=other.get)
                m["spk_other"] = round(other[closest], 3)
                m["spk_other_who"] = closest
            ref_audio = longest_ref[s] if clip["label"] != "ref" else max(
                (c for c in refs[s] if c is not clip), key=lambda c: len(c["audio"]), default=clip)["audio"]
            m["mos"] = round(nat.score(clip["audio"], ref_audio), 2)

    lines = ["| 区分 | キャラ | ファイル | 長さ | 有声 | 手本との近さ | 他キャラ最大 | 声の高さ中央(Hz) | 高さ10-90%(Hz) | 抑揚(半音) | 強弱(dB) | 自然さ |",
             "|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for c in clips:
        m = c["metrics"]
        lines.append("| {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} |".format(
            c["label"], c["speaker"], c["name"], m["dur"], m["voiced"], m.get("spk_own", "-"),
            f"{m['spk_other']} ({m['spk_other_who']})" if "spk_other" in m else "-",
            m.get("f0_med", "-"), f"{m['f0_p10']}-{m['f0_p90']}" if "f0_p10" in m else "-",
            m.get("f0_semi", "-"), m["energy_db"], m.get("mos", "-")))
    (out / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    (out / "report.json").write_text(json.dumps(
        [{"label": c["label"], "speaker": c["speaker"], "file": str(c["path"]), **c["metrics"]} for c in clips],
        ensure_ascii=False, indent=1), encoding="utf-8")

    groups = {}
    for c in clips:
        groups.setdefault((c["label"], c["speaker"]), []).append(c)
    for (label, speaker), group in groups.items():
        sheet(group, out / f"{label}-{speaker}.png")
    print("\n".join(lines))
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
