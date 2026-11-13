# Whisper small で声の候補を文字起こしし、台詞との一致率・声の長さ・音のかたまりを出す（2026-11-13）。
# 実行: PYTHONIOENCODING=utf-8 D:/AI/Irodori-TTS-v4_1/.venv/Scripts/python.exe scripts/assets/voice-asr.py <候補のフォルダ> <台詞ファイル.json>
import sys, os, glob, json, difflib, re
sys.path.insert(0, r"D:\AI\Irodori-TTS-v4_1")
folder = os.path.abspath(sys.argv[1])
expected = json.load(open(os.path.abspath(sys.argv[2]), encoding="utf-8"))
import local_runtime
local_runtime.configure()
from transformers import pipeline
import librosa
asr = pipeline("automatic-speech-recognition", model="openai/whisper-small", device=0)
norm = lambda t: re.sub(r"[\s、。！？!?…・「」]", "", t)
out = []
for line in expected["lines"]:
    for path in sorted(glob.glob(os.path.join(folder, f"{line['speaker']}-{line['id']}-s*.wav"))):
        y, sr = librosa.load(path, sr=16000)
        text = asr({"raw": y, "sampling_rate": sr}, generate_kwargs={"language": "japanese"})["text"]
        yt, _ = librosa.effects.trim(y, top_db=35)
        chunks = [(round(a / sr, 2), round(b / sr, 2)) for a, b in librosa.effects.split(y, top_db=35)]
        ratio = difflib.SequenceMatcher(None, norm(text), norm(line["text"])).ratio()
        out.append({"file": os.path.basename(path), "text": text, "ratio": round(ratio, 2), "voiced": round(len(yt) / sr, 2), "chunks": chunks})
print(json.dumps(out, ensure_ascii=False, indent=1))
