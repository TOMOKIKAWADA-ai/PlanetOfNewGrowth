# アセット生成の手順

このPCの GPU は RTX 4060 Laptop（VRAM 8GB）。**生成ツールは必ず1つずつ起動し、使い終わったら終了する。**
ゲームの開発サーバーやブラウザ確認は、生成ツールを終了してから行う。
使い方が分かった時点で、この文書に追記していく（コマンド、所要時間、失敗例）。

## ローカルアプリ一覧（D:\AI ほか）

| アプリ | 場所 | 使い道 | 状態 |
|---|---|---|---|
| Stable Diffusion WebUI Forge | `D:\AI\webui_forge_cu121_torch231` | **画像生成の本命**。SDXL・Illustrious・Pony のモデル、LoRA、ControlNet（AnyTest）、タグ付け拡張が入っている | API 起動を確認済み（2026-10-21）。`scripts/assets/start-forge-api.bat` |
| ComfyUI | `D:\AI\ComfyUI` | 細かいワークフロー（背景透過、連続生成、将来の動画生成） | 2024年末の版。起動方法を初回に確認。動かなければ更新か入れ直しで可 |
| A1111 | `D:\AI\A1111` | SD1.5 しかないので基本は使わない | 予備 |
| Hunyuan3D 2 | `D:\AI\3D_local` | 画像から3Dモデル | 形状のみ確認済み。テクスチャ生成は未検証 |
| Blender 5.1 | `C:\Program Files\Blender Foundation\Blender 5.1` | 3Dの整形、ポリゴン削減、ターンテーブル画像 | 使用可 |
| Stable Audio 3 Small-SFX | `D:\0001_App_Dev\audioMCP` | 効果音 | 認証済み、生成確認済み |
| Irodori-TTS 4.1 | `D:\AI\Irodori-TTS-v4_1` | キャラクター音声 | 生成確認済み。v4（`D:\AI\Irodori-TTS-v4`）は旧版なので使わない |
| Mesh Avatar Studio（Live2D_AI） | `D:\AI\Live2D_AI` | 1枚の立ち絵から、まばたき・口パク・首振りする2Dアバター。`<mesh-avatar>` 要素でWebに埋め込める（MIT） | 起動確認済み。品質は未評価（B5-1） |
| Kohya_ss | `D:\AI\Kohya` | LoRA 学習（キャラクターの見た目をそろえる） | 長時間 GPU を使うので日曜のみ |
| Bionic（LM Studio） | `D:\AI\Bionic` | ローカルLLM | 文章は自分で書くので基本は使わない |
| FFmpeg | `D:\AI\Irodori-TTS-v4_1\tools\ffmpeg-*\bin` | 音声の後処理、動画の編集・書き出し | 使用可 |

ポートの重複に注意: Mesh Avatar Studio は 5173、Irodori の画面は 7860/7861、Stable Audio の画面は 7860、Hunyuan3D は 8080/8081、Forge は 7860。ゲームの開発サーバーは 5183 を使う。
新しいアプリを入れたら、この表に追加する。

## 共通の流れ

1. 生成の元ファイルは `assets_src/`（ゲームに同梱しない作業用。`.gitignore` 対象にするか、容量が小さいものだけコミット）に置く。
2. ゲームで使う完成品だけを `assets/` 以下に置く。
3. `asset-ledger.md` に1行追加する。
4. `src/config.js` の切り替えで、モックと新アセットを比較できるようにする。並べたスクリーンショットを devlog に貼る。

## 画像生成（イラスト、3Dモデルの元絵）

- 本命は Forge。`webui\webui-user.bat` は書き換えず、`scripts/assets/start-forge-api.bat`（`--api --nowebui --port 7865`）をバックグラウンドで起動する。PowerShell からは `cmd /c "D:\0001_App_Dev\search_survive_daily\scripts\assets\start-forge-api.bat"`。
  - API が応答するまで約2分。`curl http://127.0.0.1:7865/sdapi/v1/sd-models` が返れば準備完了。
  - 起動中に `stable-diffusion-webui-dataset-tag-editor` の `ModuleNotFoundError` が出るが、API には影響しない。
  - 起動用の .bat は CRLF・絶対パスで書く（LF のままや `cd /d` 頼りだと `environment.bat` が見つからず失敗した）。
  - 生成: `node scripts/assets/forge-txt2img.mjs <jobs.json> <出力先>`。jobs の書式はスクリプト先頭のコメント。PNG と同名の JSON（設定とシード）を保存する。
  - 所要時間（1344×768、VRAM に空きがあるとき）: softsketch 28 steps 52秒、bluePencil LCM 8 steps 40秒、juggernaut 28 steps 69秒（初回はモデル読み込みを含む）。
  - **他のプロセスが GPU を使っていると VRAM が尽き、1 step 100 秒まで遅くなる**（2026-10-21、別のチャットの TTS と重なった）。生成前に `nvidia-smi` で他の利用者がいないか確認する。Node の fetch は 5 分で `HeadersTimeoutError` になるので、遅いときは待たずに中止する。
  - 終了: `Get-CimInstance Win32_Process | ? { $_.ExecutablePath -like 'D:\AI\webui_forge_cu121_torch231\*' } | % { Stop-Process -Id $_.ProcessId -Force }`。
- 背景の画風（2026-10-21 の比較）: `juggernautXL_ragnarokBy`（DPM++ 2M、28 steps、CFG 5）が `assets/promo/world-awakening.png` に最も近い。暖かい逆光・厚い霧・白い花弁状の塔を明示すると良さそう（未確認）。softsketch は線画寄りで余白が多く、bluePencil は平坦でぼやける。
- モデルは `D:\AI\webui_forge_cu121_torch231\webui\models\Stable-diffusion`:
  - 3Dの元絵・背景・小物: `juggernautXL_ragnarokBy` か `sd_xl_base_1.0`
  - キャラクター・アニメ調のイラスト: `softsketchIllustrious_v125`、`bluePencilXLLCM_v200`
  - 名前に NSFW を含むモデルは使わない。
- LoRA は `webui\models\Lora`。画風に合いそうなもの（Flat_style など）を B4-1 で比較する。
- ComfyUI を使う場合は、モデルを `extra_model_paths.yaml` で Forge のフォルダから参照し、コピーしない。ワークフローは `scripts/assets/comfy/*.json` に保存する。
- 3Dにする元絵の条件: 対象1つ、正面か斜め45度、白か無地の背景、影なし、全体が画面に収まる。
- 立ち絵に近い絵が必要なときは、既存の `assets/ui/characters` を参照画像にして ControlNet（AnyTest）か img2img を使う。
- 画風の共通プロンプトは B0-3 / B4-1 で決めてここに書く。

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
- キャラクターの声は既存の `assets/audio/voice/<名前>/` に合わせたいが、既存の声は短い叫び声ばかりで参照音声に向かない。紹介動画（2026-10-20）では `--no-ref` で声質の指定文とシードを固定した。採用した指定:
  - ツキミ: 「落ち着いた若い女性の声。丁寧で知的、静かなトーンで、聞き手に語りかけるように話す。」seed 1101
  - アカメ: 「低めで落ち着いた若い女性の声。口数が少なく、短く言い切る。感情を抑えた、芯のある話し方。」seed 2202
  - キイチゴ: 「明るく元気な若い女性の声。軽い調子で、親しげに冗談まじりに話す。」seed 3303
- 一括生成と確認のスクリプト: `D:\0001_App_Dev\search_survive_promo\meibuki-intro\tools\tts_batch.py`（モデルを一度だけ読み込む）と `asr_check.py`（Whisper small で文字起こしして台本と比べる）。どちらも Irodori の `.venv` の Python で実行する。
- ゲーム用の一括生成（2026-10-23）: `scripts/assets/irodori-batch.py <lines.json> <出力先>`。台詞ごとに複数シードの候補を `<キャラ>-<id>-s<シード>.wav` で出す。台詞ファイルは `scripts/assets/voices/YYYY-MM-DD-*.json`（声質指定＋台詞ごとの演技指定 `style`）。
  - 実行: `D:/AI/Irodori-TTS-v4_1/.venv/Scripts/python.exe scripts/assets/irodori-batch.py scripts/assets/voices/2026-10-23-b3-1.json assets_src/voice/2026-10-23`
  - 所要時間: 短い台詞 12 本で 2 分 16 秒（モデル読み込みを含む、VRAM に空きがあるとき）。
  - `configure()` が作業フォルダを Irodori に変えるので、引数のパスはスクリプト側で先に絶対パスにしている。
  - 聞いて確かめられないので、Whisper small で文字起こしして台本との一致率（句読点を除いた文字列の類似度）を見る。0.7 以上なら台詞どおり。同音の漢字違い（「ひと暴れ」→「人暴れ」）は問題なし。Python の出力は `PYTHONIOENCODING=utf-8` を付けないと文字化けする。
  - シェルの heredoc から Python に日本語を渡すと cp932 で化ける。日本語を含む置換は Edit ツールで行う。
- ゲームに入れる後処理（FFmpeg）: 前後の無音を削り、既存の声に合わせて **-15 LUFS**（真のピーク -1.5 dB）にそろえて mp3 にする。
  `-af "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-15:TP=-1.5:LRA=11,afade=t=in:d=0.01" -ar 44100 -ac 1 -codec:a libmp3lame -q:a 4`
  - 失敗例: `afade=t=out:st=0:d=0.001` を入れたら開始直後にフェードアウトしてほぼ無音（-60 LUFS 以下）になった。書き出したら `-af ebur128 -f null -` で音量を必ず確かめる。0.4 秒未満の短い音は ebur128 が -70 と出るが無音ではない。
  - 既存の声の音量（2026-10-23 計測）: -13.6〜-16.6 LUFS。
  - **0.5 秒前後の短い声は loudnorm が効かない**（平均音量が -11.7〜-22.5 dB にばらついた）。そのあとで `volumedetect` の平均音量を測り、`volume=<-16 − 平均>dB,alimiter=limit=0.84:level=false` で平均 -16 dB に合わせ直した（結果 -16〜-18 dB）。
  - 短い掛け声（「あっ！」など）は、後ろに意味のない語が付くことが多い。文字起こしと、`librosa.effects.trim` で測った声の長さ（被弾の声なら 1 秒未満）の両方で選ぶ。「くっ！」のような促音だけの声は Whisper が「くっっっ…」と繰り返して一致率が 0 になるが、声の長さが短ければ問題ない。
- 読み間違いやすい語は仮名で書く（例: 孵る→かえる）。**母卵の読みは「マザーエッグ」**。字幕や表示は漢字のまま。
- 台詞はキャラクターの口調（`docs/story-direction.md` の「台本上の声」）に合わせる。新しい台詞は短い掛け声に限り、物語の台詞の追加はユーザーの確認を取る。

## 動くアバター（Mesh Avatar Studio）

- 起動: `D:\AI\Live2D_AI\Start-MeshAvatar.ps1 -NoBrowser`（ポート5173）。停止: `Stop-MeshAvatar.ps1`。
- アバター作成は `D:\AI\Live2D_AI\mesh-avatar-studio\docs\agent-guide.md` の手順に従う。そのフォルダの `CLAUDE.md` / `AGENTS.md` も読む。
- 元絵は正面向き・背景透過のバストアップPNGが向いている。既存の `assets/ui/characters/faces/<名前>/normal.png` から作る。
- 目・口の描き分け画像（閉じた目、あ・い・おの口など）は、Mesh Avatar Studio の README どおり **Codex の画像生成** で作るのが本命（ユーザーは立ち絵・プロモ画像も Codex で作っており、画風がそろう）。`tools/variant-requests.py` が作る依頼文とマスクを Codex に渡す作業はユーザーに頼む（Claude からは Codex を操作しない）。Codex が使えない日は Forge の img2img / インペイントで代用する。
- 作ったプロジェクトは `mesh-avatar-studio/projects/<名前>/`。ゲームで使う場合は Export `.mavatar` を `assets/avatars/` に置き、`mesh-avatar-element` で表示する。
- 作成済み（2026-10-20）: `projects/meibuki-tsukimi`・`meibuki-akame`・`meibuki-kiichigo`。元絵は表情差分 `normal.png` の上 1024×1100 を切り出したもの（背景は透過）。描き分け画像なし。アカメは横顔に近く、右目は顔の輪郭（x≈750）の内側に範囲を収めないと、閉じたときに黒目や輪郭線が残る。
- 方眼図（`tools/grid.py`）の画像は左と上に目盛りの余白がある。全体図では「表示座標−(65, 40)」がほぼ元画像の座標。拡大図は太線（50px ごと）から縮尺を出して読む。
- 動画用の口パク素材: `mesh-avatar-studio/work/render-talk.mjs <jobs.json> <出力先>`。ランタイムの手動モード（`manual: true` と `advance()`）で1フレームずつ進め、台詞の音量から `mouthOpen`、決まった間隔のまばたき、小さな首振りと呼吸を付けて MP4 にする。毎回同じ結果になる。Node と Playwright は `D:\AI\Live2D_AI\.tools` のものを PATH と `PLAYWRIGHT_BROWSERS_PATH` に設定して使う。

## 動画・SNS素材

- 置き場所: `promo/YYYY-MM-DD/`。動画や大きな画像は git に入れない（`.gitignore` 済み）。投稿文の案 `post.md` だけコミットする。
- プレイ動画: Playwright の `recordVideo` か、ブラウザの画面キャプチャで撮影し、FFmpeg で切り出し・縦横比の変換（9:16 / 16:9 / 1:1）・字幕を付ける。
- 構成のある動画（トレーラー、紹介動画）は、HyperFrames のスキル（hyperframes、product-launch-video、general-video など）が使えれば使う。
- **紹介動画の型「ゆるい3人の掛け合い」**（ユーザーが気に入った形）: HyperFrames レシピ `yurui-trio-howto` と、`D:\0001_App_Dev\search_survive_promo\_template-yurui-trio\README.md` の手順で作る。新しい紹介・SNS動画は、まずこのトーン（遊び方の説明中心、物語は一言だけ）で作る。
- 投稿文の案は日本語で、短い本文、ハッシュタグ候補、添付する素材の一覧を書く。**投稿はしない。**
