# 生成アセットの台帳

生成したアセットは必ずここに1行追加する。差し替えて使わなくなったものも、行を消さずに状態を「不採用」「置換済み」にする。

## ライセンス（2026-10-21 調査。法的助言ではない。公開・販売の前に原文を再確認する）

| アプリ・モデル | ライセンス | 商用 | 注意点 |
|---|---|---|---|
| Irodori-TTS 4.1（コード・モデル） | MIT | ○ | モデルカードの禁止事項: 本人の同意なく実在の人の声を複製しない、人を欺く音声に使わない。出力には Sony silentcipher の透かしが入る（MIT） |
| Semantic-DACVAE-Japanese（Irodori の音声コーデック） | MIT | ○ | 元の facebook/dacvae-watermarked は SAM License（使用料なし、商用の禁止なし。軍事・諜報用途の禁止、輸出規制の順守、再配布時はライセンス同梱） |
| Mesh Avatar Studio（エディタ・ランタイム） | MIT | ○ | 同梱のサンプル絵（Miko）は対象外。今回のアバターは自前の立ち絵から作成 |
| HyperFrames（CLI・core） | Apache-2.0 | ○ | — |
| GSAP（動画のアニメーション） | GSAP Standard License（無料） | ○ | Webflow と競合するノーコードのアニメーション制作ツールへの組み込みは不可 |
| しっぽり明朝／Zen角ゴシック New | SIL OFL 1.1 | ○ | 動画への使用は自由。フォント単体の販売は不可 |
| Playwright / FFmpeg / Whisper small | Apache-2.0 / LGPL・GPL / MIT | ○ | 制作用の道具で、出力物には影響しない（Whisper は読み確認だけに使用） |
| Stable Audio 3 Small-SFX | Stability AI Community License（コードは MIT） | △ | 年間売上100万ドル未満なら商用可。**商用で使うなら Stability AI への登録が必要**。出力は自分のもの。出力を他の生成AIの学習に使わない。文章処理に使う T5Gemma は Gemma 利用規約にも従う |
| Hunyuan3D 2.0 | Tencent Hunyuan 3D 2.0 Community License | △〜× | **EU・英国・韓国は対象外。生成物をその地域で使用・配布・表示することも禁止**。世界向けに公開するゲームに生成物を入れると条件に触れるおそれがある。月間利用者100万人超は別途許諾が必要 |
| SDXL base 1.0 | CreativeML Open RAIL++-M | ○ | 利用制限（有害用途の禁止）を守る |
| juggernautXL_ragnarokBy | CreativeML Open RAIL 系＋RunDiffusion の追加条件 | 要確認 | 有料のAPIやサービスでモデルを動かすのは要許諾。生成画像の商用利用は版ごとに表記が違うため、Ragnarok 版のモデルページを確認する |
| softsketchIllustrious_v125 | Illustrious XL 由来（Fair AI Public License 1.0-SD） | 要確認 | 生成画像の商用利用は可とする説明が多いが、原文で未確認。派生モデルの公開条件がある |
| bluePencilXLLCM_v200 | 未確認 | 要確認 | モデルページで確認する |

**運用ルール**
- Hunyuan3D の生成物は、配布地域を決めるまで `config.js` の切り替えで元のモックに戻せる状態を保つ。世界向けに公開するなら、MIT などの3D生成（例: Microsoft TRELLIS）への切り替えを検討する。
- Stable Audio で作った効果音を入れたゲームを商用で公開する前に、ユーザーが Stability AI に登録する（アカウント操作なので自動では行わない）。
- 画像生成のモデルは、この表で「要確認」のものを商用の素材に使わない。使った場合は台帳に記録し、公開前にモデルページを確認する。
- ゲーム内の既存素材の出どころ（2026-10-21 ユーザー回答）: BGM `assets/audio/bgm.mp3` は **Magnific（旧 Freepik）の AI Music Generator**、立ち絵とプロモ画像（`assets/ui/characters`、`assets/promo`、タイトル画）は **GPT Image**。効果音 `assets/audio/sfx` と音声 `assets/audio/voice` の出どころは未記録。

| 既存素材の生成元 | 条件 | 商用 | 注意点 |
|---|---|---|---|
| Magnific AI Music Generator（BGM） | Magnific の FAQ「生成した曲の権利は利用者が持つ。有料プランなら完全な商用ライセンス付き」。**有料プランで生成（ユーザー確認済み）** | ○ | これから作る曲も有料プランで生成する |
| GPT Image（立ち絵・プロモ画像。**Codex の画像生成で作成**、ユーザー確認済み） | OpenAI 利用規約「お客様はアウトプットを所有。権利を譲渡する」 | ○ | 生成物は唯一ではなく、他の人が似た画像を得ることがある。著作権の保護までは保証されない |

紹介動画（`D:\0001_App_Dev\search_survive_promo\meibuki-intro`、2026-10-21 書き出し）の素材は、すべて商用利用できることを確認済み。

## 置き換え候補（B0-1 で埋める）

| 対象 | 今の状態 | 場所 | 優先度 | 状態 |
|---|---|---|---|---|

## 生成済み

| 日付 | 種類 | ファイル | ツール・モデル | プロンプト / 台詞 | シード | 元ファイル | 状態 |
|---|---|---|---|---|---|---|---|
| 2026-10-21 | イラスト（画風比較） | `assets_src/illust/2026-10-21/bg-softsketch.png` | Forge / softsketchIllustrious_v125（Euler a 28 steps CFG 5.5） | 白い廃墟都市・花弁状の塔・冠水・朝の光（全文は同名 JSON） | 2101 | jobs.json | 不採用（比較用） |
| 2026-10-21 | イラスト（画風比較） | `assets_src/illust/2026-10-21/bg-bluepencil.png` | Forge / bluePencilXLLCM_v200（LCM 8 steps CFG 2） | 同上 | 2101 | jobs.json | 不採用（比較用） |
| 2026-10-21 | イラスト（画風比較） | `assets_src/illust/2026-10-21/bg-juggernaut.png` | Forge / juggernautXL_ragnarokBy（DPM++ 2M 28 steps CFG 5） | 同上（concept art 向けに調整） | 2101 | jobs.json | 不採用（比較用、背景の候補モデル） |
