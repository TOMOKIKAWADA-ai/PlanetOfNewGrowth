# アセット生成の手順

このPCの GPU は RTX 4060 Laptop（VRAM 8GB）。**生成ツールは必ず1つずつ起動し、使い終わったら終了する。**
ゲームの開発サーバーやブラウザ確認は、生成ツールを終了してから行う。
使い方が分かった時点で、この文書に追記していく（コマンド、所要時間、失敗例）。

## 共通の流れ

1. 生成の元ファイルは `assets_src/`（ゲームに同梱しない作業用。`.gitignore` 対象にするか、容量が小さいものだけコミット）に置く。
2. ゲームで使う完成品だけを `assets/` 以下に置く。
3. `asset-ledger.md` に1行追加する。
4. `src/config.js` の切り替えで、モックと新アセットを比較できるようにする。並べたスクリーンショットを devlog に貼る。

## 画像生成（3Dモデルの元絵）

- 既存の環境: `D:\AI\ComfyUI`（2024年末の版。起動方法と Python 環境は初回に確認する）、`D:\AI\A1111`、`D:\AI\webui_forge_cu121_torch231`。
- SDXL のモデルは `D:\AI\A1111\models\Stable-diffusion` にある。使うのは `sd_xl_base_1.0.safetensors` か `juggernautXL_ragnarokBy.safetensors`。名前に NSFW を含むモデルは使わない。
- ComfyUI が動かない場合は、ComfyUI のポータブル版を `D:\AI\ComfyUI_portable` に新しく入れてよい。モデルは `extra_model_paths.yaml` で A1111 のフォルダを参照し、コピーしない。
- 自動化は ComfyUI の HTTP API（`/prompt` にワークフローの JSON を送る）を使い、ワークフローを `scripts/assets/comfy/*.json` に保存する。
- 3Dにする元絵の条件: 対象1つ、正面か斜め45度、白か無地の背景、影なし、全体が画面に収まる。
- 画風の共通プロンプトは B0-3 で決めてここに書く。

## 3Dモデル（Hunyuan3D 2.0 mini turbo）

- 場所: `D:\AI\3D_local`（説明は `README-Hunyuan3D.md`）。
- 自動化には API サーバーを使う（画面は使わない）。環境変数は `Hunyuan3D-Environment.bat` を `call` してから起動する:
  ```bat
  call D:\AI\3D_local\Hunyuan3D-Environment.bat
  cd /d D:\AI\3D_local\Hunyuan3D\Hunyuan3D-2
  "%HY3D_APP%\python_standalone\python.exe" -s api_server.py --host 127.0.0.1 --port 8081 --model_path tencent/Hunyuan3D-2mini
  ```
  low VRAM の起動オプションが api_server.py で使えるかは初回に確認する。足りなければ gradio_app.py の起動方法（`Start-Hunyuan3D.bat`）を参考に、小さな Python スクリプトから `hy3dgen` を直接呼ぶ。
- `POST /generate` に JSON `{"image": <base64 PNG>, "seed": 1234, "octree_resolution": 256, "num_inference_steps": 5, "face_count": 8000, "texture": false}` を送ると GLB が返る。
- テクスチャ生成は未検証（README 参照）。まずは形状だけを作り、色は Blender で頂点カラーかゲーム側のマテリアルで付ける。テクスチャ生成を試す日は、所要時間とVRAM使用量を記録する。
- 終了は起動したプロセスを止める（`Stop-Hunyuan3D.bat` はインストール時の処理用）。

## 3Dの整形（Blender）

- `C:\Program Files\Blender Foundation\Blender 5.1\blender.exe -b --python <script>` でバックグラウンド実行する。
- やること: 原点を接地面の中心へ、Y-up、ゲームの単位に合わせた大きさ、ポリゴン数の削減（目安: 拾うアイテム 500〜1500、敵 3000〜8000）、glTF 出力。
- スクリプトは `scripts/assets/blender/` に置く。

## 効果音（Stable Audio 3 Small-SFX）

- 場所: `D:\0001_App_Dev\audioMCP`（説明は `使い方.md`）。Hugging Face の認証は済んでいる（`.cache/huggingface/token` がある）。
- 画面を使わず、`stable-audio-3\.venv\Scripts\python.exe` から直接呼ぶ。`launch_local.py` の `--smoke` の処理が参考になる:
  ```python
  from local_runtime import configure; configure()
  from stable_audio_3 import StableAudioModel
  model = StableAudioModel.from_pretrained("small-sfx")
  audio = model.generate(prompt="..., no music, no speech", duration=1.5, steps=8, cfg_scale=1.0, seed=42)
  ```
  スクリプトは `stable-audio-3` フォルダを作業ディレクトリにして実行する。
- プロンプトは英語。末尾に `no music, no speech` を付ける。1つの音につき候補を3〜4本作り、devlog に選んだ理由を書く。
- 後処理: 無音のトリム、短いフェード、ラウドネスの正規化。FFmpeg は `D:\AI\Irodori-TTS-v4_1\tools\ffmpeg-*\bin` にある。

## 音声（Irodori-TTS v4.1）

- 場所: `D:\AI\Irodori-TTS-v4_1`（説明は `使い方.md`）。
- 画面を使わず `infer.py` を呼ぶ。`local_runtime.configure()` と同じ環境変数（HF_HOME など）を設定してから実行する:
  ```
  .venv\Scripts\python.exe infer.py --hf-checkpoint Aratako/Irodori-TTS-v4.1-Small --model-precision bf16 --codec-precision fp32 --text "..." --caption "..." --output-wav out.wav
  ```
  参照音声を使うときは `--ref-wav <既存の声>`（voice cloning 用のモデル名は README で確認する）。
- キャラクターの声は既存の `assets/audio/voice/<名前>/` に合わせる。参照音声を使った生成を優先し、声質の指定文をキャラクターごとにここへ固定する:
  - ツキミ: （初回に決める）
  - アカメ: （初回に決める）
  - キイチゴ: （初回に決める）
- 台詞はキャラクターの口調（`docs/story-direction.md` の「台本上の声」）に合わせる。新しい台詞は短い掛け声に限り、物語の台詞の追加はユーザーの確認を取る。
