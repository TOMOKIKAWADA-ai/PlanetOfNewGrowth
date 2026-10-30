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
| Hunyuan3D 2.0 | Tencent Hunyuan 3D 2.0 Community License | × **使わない** | **EU・英国・韓国は対象外。生成物をその地域で使用・配布・表示することも禁止**。世界向けに公開するゲームに生成物を入れると条件に触れるおそれがある。月間利用者100万人超は別途許諾が必要。**2026-10-29 ユーザーの判断で使用をやめ、生成物はゲームとリポジトリから外した** |
| Tripo（Tripo Studio、有料のクレジット） | Tripo の利用規約 | ○（要再確認） | 3D はこれだけを使う。敵の3D化で使用中。商用の条件（プランごとの権利）は、公開前に Tripo の規約の原文で再確認する |
| SDXL base 1.0 | CreativeML Open RAIL++-M | ○ | 利用制限（有害用途の禁止）を守る |
| juggernautXL_ragnarokBy | CreativeML Open RAIL 系＋RunDiffusion の追加条件 | 要確認 | 有料のAPIやサービスでモデルを動かすのは要許諾。生成画像の商用利用は版ごとに表記が違うため、Ragnarok 版のモデルページを確認する |
| softsketchIllustrious_v125 | Illustrious XL 由来（Fair AI Public License 1.0-SD） | 要確認 | 生成画像の商用利用は可とする説明が多いが、原文で未確認。派生モデルの公開条件がある |
| bluePencilXLLCM_v200 | 未確認 | 要確認 | モデルページで確認する |

**運用ルール**
- 3D は Tripo で作る。Hunyuan3D は使わない（試作も含めて。2026-10-29 ユーザー「Hunyuan3D はライセンスの問題があるのでやめておこう。Tripo にして」）。
- Stable Audio で作った効果音を入れたゲームを商用で公開する前に、ユーザーが Stability AI に登録する（アカウント操作なので自動では行わない）。
- 画像生成のモデルは、この表で「要確認」のものを商用の素材に使わない。使った場合は台帳に記録し、公開前にモデルページを確認する。
- ゲーム内の既存素材の出どころ（2026-10-21 ユーザー回答）: BGM `assets/audio/bgm.mp3` は **Magnific（旧 Freepik）の AI Music Generator**、立ち絵とプロモ画像（`assets/ui/characters`、`assets/promo`、タイトル画）は **GPT Image**、効果音 `assets/audio/sfx` は **Adobe Firefly**、キャラクター音声 `assets/audio/voice` は **Irodori-TTS**。ゲーム内の既存素材の出どころは、これですべて記録済み。

| 既存素材の生成元 | 条件 | 商用 | 注意点 |
|---|---|---|---|
| Magnific AI Music Generator（BGM） | Magnific の FAQ「生成した曲の権利は利用者が持つ。有料プランなら完全な商用ライセンス付き」。**有料プランで生成（ユーザー確認済み）** | ○ | これから作る曲も有料プランで生成する |
| GPT Image（立ち絵・プロモ画像。**Codex の画像生成で作成**、ユーザー確認済み） | OpenAI 利用規約「お客様はアウトプットを所有。権利を譲渡する」 | ○ | 生成物は唯一ではなく、他の人が似た画像を得ることがある。著作権の保護までは保証されない |
| Adobe Firefly（効果音） | Adobe 公式「Firefly のモデルで作ったコンテンツは商用利用しても安全」「ロイヤリティフリー、クレジット表記不要」 | ○ | 対象は Adobe 自社の Firefly モデル。Firefly アプリ内で他社のパートナーモデルを選んだ場合は、そのモデルの条件になる |
| Irodori-TTS（キャラクター音声） | MIT（v4-Small・v4.1-Small とも） | ○ | 本人の同意なく実在の人の声を複製しない。参照音声に他人の声を使っていないこと（声質の指定文だけで作った声なら問題なし） |

紹介動画（`D:\0001_App_Dev\search_survive_promo\meibuki-intro`、2026-10-21 書き出し）の素材は、すべて商用利用できることを確認済み。

## 置き換え候補（B0-1 で埋める）

2026-10-26 に棚卸し。優先度は「プレイ中に目に入る頻度 × 今の見た目の弱さ」で付けた（高: 毎回何度も見る、中: 場面による、低: ほぼ見えない・予備）。

| 対象 | 今の状態 | 場所 | 優先度 | 状態 |
|---|---|---|---|---|
| 拾うアイテム6種（HP・MP・バースト・磁石・シールド・スピード） | 単色の多面体・球・輪・円柱・円錐 | `src/entities.js` `PICKUP_GEOMETRIES` | 高 | B1-1。2026-10-26 に HP・MP・バースト・シールドを置き換え。磁石・スピードは作り直し |
| 水没ステージの装飾（葦・草・岩） | 円錐と十二面体のインスタンス | `src/main.js` 671〜679 行付近 | 高（第2・3・5・6章で常に画面にある） | B1-6 |
| 渇きの母の吸い上げの管・しずく | 円柱と球（2026-10-26 追加。効果なので当面このまま） | `src/main.js` `spawnThirstTether` | 低 | 見た目の調整候補 |
| 経験値オーブ | 八面体（`usePrimitiveXp: true`。`assets/xp/blue_crystal.glb` は使っていない） | `src/entities.js` `ExperienceOrb` | 中（数が多いので軽さ優先） | B1-2 |
| 卵の遠景表示 | 十二面体1つ | `src/entities.js` `EGG_LOD_GEOMETRY` | 低（遠くて小さい） | B1-5 |
| 魚形態の体 | 球＋三角錐（魚のモデルが無い時の予備） | `src/entities.js` `createFishModel` | 中（第2・3・5・6章の水中で見る。モデルの有無を要確認） | 未着手 |
| プレイヤーの予備の体 | 円柱＋十二面体＋円錐 | `src/entities.js` `createFallbackBody` | 低（モデルの読み込み失敗時だけ） | 対象外 |
| 卵・母卵の予備の体 | 十二面体 | `src/entities.js` `Egg.createFallback` | 低（読み込み失敗時だけ） | 対象外 |
| 予備の装飾（草・岩・木） | 円錐・十二面体（`usePrimitiveDecor: false` で普段は不使用） | `src/main.js` `createPrimitiveDecor` | 低 | 対象外 |
| 硬直の印 | 紫の八面体3つ | `src/main.js` `spawnStunMarker` | 低（目印として形は単純でよい） | 対象外 |
| 第1章のポンプ | 無い（台本のみ） | — | 中 | B1-7 |
| 効果音: アイテム取得、卵の孵化、母卵出現の警告、残り1分、メニューのカーソル移動、文字送り、渇きの母の吸い上げ（2026-10-27 アイテム取得と吸い上げは作成済み） | 無い（吸い上げは `motherCharge` を小さく流用） | `assets/audio/sfx`（今あるのは20種） | 中 | B2-1 に追加 |
| 声: 母卵出現・レベルアップ・残り1分の一言 | 無い | `assets/audio/voice` | 中 | B3-2 |

## 生成済み

| 日付 | 種類 | ファイル | ツール・モデル | プロンプト / 台詞 | シード | 元ファイル | 状態 |
|---|---|---|---|---|---|---|---|
| 2026-10-21 | イラスト（画風比較） | `assets_src/illust/2026-10-21/bg-softsketch.png` | Forge / softsketchIllustrious_v125（Euler a 28 steps CFG 5.5） | 白い廃墟都市・花弁状の塔・冠水・朝の光（全文は同名 JSON） | 2101 | jobs.json | 不採用（比較用） |
| 2026-10-21 | イラスト（画風比較） | `assets_src/illust/2026-10-21/bg-bluepencil.png` | Forge / bluePencilXLLCM_v200（LCM 8 steps CFG 2） | 同上 | 2101 | jobs.json | 不採用（比較用） |
| 2026-10-21 | イラスト（画風比較） | `assets_src/illust/2026-10-21/bg-juggernaut.png` | Forge / juggernautXL_ragnarokBy（DPM++ 2M 28 steps CFG 5） | 同上（concept art 向けに調整） | 2101 | jobs.json | 不採用（比較用、背景の候補モデル） |
| 2026-10-23 | 音声（戦闘開始） | `assets/audio/voice/akame/battle_start_01.mp3` | Irodori-TTS 4.1 Small（`--no-ref`、bf16） | 「前は、私が引き受ける。」＋アカメの声質指定＋「戦いの直前、静かに気合いを入れて短く言い切る。」 | 2202 | `scripts/assets/voices/2026-10-23-b3-1.json`、`assets_src/voice/2026-10-23/` | 採用（候補 2211・2212 は不採用） |
| 2026-10-23 | 音声（死亡） | `assets/audio/voice/akame/death_01.mp3` | 同上 | 「……まだ、終わって……ない……」＋「深い傷を負って倒れる。苦しそうに息を切らし、かすれた声で途切れ途切れに。」 | 2202 | 同上 | 採用（候補 2221・2222 は不採用） |
| 2026-10-23 | 音声（戦闘開始） | `assets/audio/voice/kiichigo/battle_start_01.mp3` | 同上 | 「さーて、ひと暴れしよっか！」＋キイチゴの声質指定＋「戦いの直前、楽しそうに張りのある声で。」 | 3303 | 同上 | 採用（候補 3311・3312 は不採用） |
| 2026-10-23 | 音声（死亡） | `assets/audio/voice/kiichigo/death_01.mp3` | 同上 | 「うそ……ここまで、かぁ……」＋「深い傷を負って倒れる。苦しそうに息を切らし、力なく笑うように途切れ途切れに。」 | 3303 | 同上 | 採用（候補 3321・3322 は不採用） |
| 2026-10-23 | 音声（変換のみ） | `assets/audio/voice/tsukimi/battle_start_01.mp3`、`death_01.mp3` | 既存の同名 .wav（Irodori-TTS、生成日不明）を FFmpeg で -15 LUFS の mp3 に | 「倒してやる！」「もうダメ」（Whisper の聞き取り） | — | 同名の .wav | 置換済み（同日、下の作り直しで差し替え） |

### 2026-10-23 既存の声の作り直し（ユーザーの指示「前の音声と今の音声で結構違うので作り直して」）
ツール・モデル・声質の指定は上の行と同じ（Irodori-TTS 4.1 Small、`--no-ref`、ツキミ 1101／アカメ 2202／キイチゴ 3303 の声質指定）。台詞ファイル `scripts/assets/voices/2026-10-23-remake.json`、候補は `assets_src/voice/2026-10-23-remake/`（各3シード、計42本）。台詞は前の声を Whisper で聞き取った内容に合わせた。音量は平均 -16 dB にそろえた。前の声（出どころは Irodori-TTS、生成日不明）はすべて置換済み。ツキミの .wav（`battle_start_01.wav`、`death_0*.wav`、`dying.wav`、`hit_0*.wav`、`burst_01.wav`）はゲームで使っていない古い声。

| ファイル | 台詞 | 演技の指定 | 採用シード | 備考 |
|---|---|---|---|---|
| `tsukimi/hit_01.mp3` | ああっ！ | 攻撃を受けて、短く痛みの声を上げる。 | 1141 | 「あっ！」の3本はどれも余計な語が付いたので不採用、「ああっ！」の別シードで代用 |
| `tsukimi/hit_02.mp3` | ああっ！ | 同上 | 1101 | |
| `tsukimi/dying.mp3` | もう……だめ……！ | 致命傷を受けて、苦しそうに悲鳴まじりに。 | 1101 | |
| `tsukimi/burst_01.mp3` | 行けっ！ | 必殺技を放つ瞬間、力強く短く叫ぶ。 | 1161 | 1101・1162 は後ろに余計な声 |
| `tsukimi/battle_start_01.mp3` | 倒してみせます。 | 戦いの直前、静かに決意を込めて言う。 | 1112 | 前は「倒してやる！」。丁寧語の口調に合わせて変更 |
| `tsukimi/death_01.mp3` | ……どうして…… | 深い傷を負って倒れる。苦しそうに息を切らし、かすれた声で途切れ途切れに。 | 1101 | 前は「もうダメ」（叫びと重複）。「どうして」で止まる癖に合わせて変更 |
| `akame/hit_01.mp3` | くっ！ | 攻撃を受けて、短く痛みの声を上げる。 | 2202 | |
| `akame/hit_02.mp3` | いたっ！ | 同上 | 2202 | |
| `akame/dying.mp3` | ああああっ！ | 致命傷を受けて、苦しそうに悲鳴を上げる。 | 2252 | 2202 は弱い |
| `akame/burst_01.mp3` | 行けっ！ | 必殺技を放つ瞬間、力強く短く叫ぶ。 | 2202 | |
| `kiichigo/hit_01.mp3` | いたっ！ | 攻撃を受けて、短く痛みの声を上げる。 | 3331 | |
| `kiichigo/hit_02.mp3` | んっ！ | 同上 | 3303 | |
| `kiichigo/dying.mp3` | うそっ、だめっ！ | 致命傷を受けて、苦しそうに悲鳴まじりに。 | 3351 | |
| `kiichigo/burst_01.mp3` | これで終わり！ | 必殺技を放つ瞬間、力強く楽しそうに叫ぶ。 | 3303 | |

上の表のツキミの6本は、同日に下の版で置き換えた（置換済み）。

### 2026-10-23 ツキミの声を温かく（ユーザーの指示「ツキミの声は無機質すぎるかな」）
声質の指定を「柔らかく温かみのある若い女性の声。丁寧で知的だが、感情がはっきりと声に出る。息づかいがあり、人間味のある自然な話し方。」に変更（前は「落ち着いた…静かなトーンで…」）。台詞ファイル `scripts/assets/voices/2026-10-23-tsukimi-warm.json`、候補は `assets_src/voice/2026-10-23-tsukimi-warm/`（各3シード 1201〜1203）。ツール・後処理は上と同じ。

| ファイル | 台詞 | 演技の指定 | 採用シード | 備考 |
|---|---|---|---|---|
| `tsukimi/hit_01.mp3` | うっ！ | 攻撃を受けて、思わず痛みの声が漏れる。 | 1202 | 3本とも声が2つ続いたので、最初のひと声だけを切り出した（`cut-` 付きのファイル） |
| `tsukimi/hit_02.mp3` | ああっ！ | 同上 | 1201 | 長く伸びたので先頭 0.8 秒を切り出し、フェードアウト |
| `tsukimi/dying.mp3` | もう……だめ……！ | 致命傷を受けて、苦しそうに悲鳴まじりに。 | 1201 | |
| `tsukimi/burst_01.mp3` | 行けっ！ | 必殺技を放つ瞬間、気持ちを込めて力強く叫ぶ。 | 1203 | |
| `tsukimi/battle_start_01.mp3` | 倒してみせます。 | 戦いの直前、少し緊張しながらも、自分を奮い立たせるように決意を込めて言う。 | 1203 | 1201・1202 は後ろに余計な語 |
| `tsukimi/death_01.mp3` | ……どうして…… | 深い傷を負って倒れる。悔しさと悲しさのにじむ、かすれた声で途切れ途切れに。 | 1203 | |

上の表の6本は、同日に下の版で置き換えた（置換済み）。

### 2026-10-23 ツキミの声を少し弱々しく（ユーザーの指示「ツキミの声はすこし弱弱しく」）
声質の指定を「柔らかく温かみのある若い女性の声。少し線が細く、儚げで頼りなさが残る声。丁寧で知的、感情が声ににじむ。息づかいのある自然な話し方。」に変更。台詞ファイル `scripts/assets/voices/2026-10-23-tsukimi-soft.json`、候補は `assets_src/voice/2026-10-23-tsukimi-soft/`（各3シード 1301〜1303）。後処理は上と同じ。

| ファイル | 台詞 | 演技の指定 | 採用シード | 備考 |
|---|---|---|---|---|
| `tsukimi/hit_01.mp3` | うっ！ | 攻撃を受けて、思わず小さく痛みの声が漏れる。 | 1302 | 最初のひと声を切り出し |
| `tsukimi/hit_02.mp3` | ああっ！ | 同上 | 1301 | 先頭 0.8 秒を切り出し |
| `tsukimi/dying.mp3` | もう……だめ……！ | 致命傷を受けて、か細く苦しそうに悲鳴まじりに。 | 1301 | |
| `tsukimi/burst_01.mp3` | 行けっ！ | 必殺技を放つ瞬間、精一杯の力を込めて叫ぶ。 | 1301 | |
| `tsukimi/battle_start_01.mp3` | 倒してみせます。 | 戦いの直前、不安を押し込めて、自分に言い聞かせるように小さく決意を言う。 | 1301 | |
| `tsukimi/death_01.mp3` | ……どうして…… | 深い傷を負って倒れる。悔しさと悲しさのにじむ、消え入りそうなかすれた声で途切れ途切れに。 | 1301 | |

## 2026-10-24 プレイ動画のハイライト（B6-1）
| ファイル | ツール | 元 | 設定 | 備考 |
|---|---|---|---|---|
| `promo/2026-10-24/raw/page@a369062f….webm` | Playwright `recordVideo`（`scripts/bot-play.mjs --record`） | 第1章・ツキミ、自動プレイボット | seed 3、実時間、1280×800 | 233 秒で敗北まで。git 対象外 |
| `promo/2026-10-24/highlight-9x16.mp4` | FFmpeg 8.1（`scripts/promo/cut-highlights.mjs`） | 上の録画 | 28 秒目標、7 場面、字幕は游ゴシック Bold | 1080×1920、29.8 秒、音なし。git 対象外 |
| `promo/2026-10-24/highlight-16x9.mp4` | 同上 | 同上 | 同上 | 1280×720。git 対象外 |

ゲームの画面をそのまま録ったもので、生成モデルは使っていない。投稿文の案は `promo/2026-10-24/post.md`。

## 2026-10-24 手本の声の候補（B3-3、ユーザーの指示「指定文では安定しないので、手本の声を参照させたい」）
ツール: Irodori-TTS v4.1（`Aratako/Irodori-TTS-v4.1-Small`、bf16、`--no-ref`）、`scripts/assets/irodori-batch.py`。台詞ファイル `scripts/assets/voices/2026-10-24-ref-candidates.json`。声質の指定文とシードは今のゲーム内の声と同じ（ツキミ 1301、アカメ 2202、キイチゴ 3303）。台詞は手本用に私が書いた普通の会話（ゲームには入れない）。

| 置き場所 | 内容 | 確認 |
|---|---|---|
| `assets_src/voice/2026-10-24-ref-candidates/<キャラ>-ref_0N_<調子>-s<シード>.wav` | 3人×7本（落ち着いた説明・丁寧／報告・小声・考え込む／拒む・安堵／気遣い・仲間への呼びかけ・疲れ）、各 6.1〜10.2 秒、48kHz WAV。git 対象外 | Whisper small の一致率 0.86〜1.00（全21本が台詞どおり） |

採用: ユーザーが合わない候補を消し、残ったものを手本にした（ツキミ 04・06、アカメ 02・04・05・06、キイチゴ 01・04・06・07）。`assets_src/voice/refs/<キャラ>/` にコピー済み。動作確認として、ツキミの手本 3 本（01・02・06）を参照して「倒してみせます。」「もう……だめ……！」を作れることを確かめた（`assets_src/voice/2026-10-24-ref-smoke/`、採用しない）。

## 2026-10-24 手本の声を参照したゲーム内の声（B3-3）
ツール: Irodori-TTS v4.1（`Aratako/Irodori-TTS-v4.1-Small`、bf16）、`scripts/assets/irodori-batch.py` に `refs` を指定（`--ref-wavs`、手本は上の表で採用したもの）。指定文（caption）は空にし、台詞ごとの演技の指定だけを渡した。台詞と演技の指定は前の声と同じ。台詞ファイル `scripts/assets/voices/2026-10-24-ref-remake.json`、候補は `assets_src/voice/2026-10-24-ref-remake/`（各3シード、54 本を 7 分 15 秒）。
後処理: 前後の無音を削り loudnorm -15 LUFS のあと、平均音量を -16 dB に合わせて mp3（結果 -16.0〜-18.1 dB）。置き場所は `assets/audio/voice/<キャラ>/`（最初は `voice_ref/` に置いて前の声と切り替えられるようにしたが、ユーザーが「新しい声でよい」としたので、同日に前の声とツキミの古い .wav を消して `voice/` に移した。前の声は git の履歴にある）。
選び方: 最初のシードを基本にし、文字起こしが違う・声が2つに分かれたものだけ別のシードにした（前回と違い、後ろに余計な語が付いた候補はなかった）。

| キャラ | ファイル（hit_01 / hit_02 / dying / burst_01 / battle_start_01 / death_01） | 採用シード | 長さ（秒） |
|---|---|---|---|
| ツキミ | うっ！／ああっ！／もう……だめ……！／行けっ！／倒してみせます。／……どうして…… | 1403／1401／1401／1401／1401／1401 | 0.52／0.77／1.62／0.74／1.22／0.97 |
| アカメ | くっ！／いたっ！／ああああっ！／行けっ！／前は、私が引き受ける。／……まだ、終わって……ない…… | 2401（全部） | 0.34／0.30／1.09／0.32／1.74／3.36 |
| キイチゴ | いたっ！／んっ！／うそっ、だめっ！／これで終わり！／さーて、ひと暴れしよっか！／うそ……ここまで、かぁ…… | 3402／3401／3401／3401／3401／3401 | 0.60／0.20／1.45／2.09→1.19／2.51／3.61 |

2026-10-25 余分な音の検証（ユーザーの指示「余分な音は検証して削除して」）: 18 本を音のかたまりに分け、かたまりごとに Whisper で聞き取った。キイチゴの「これで終わり！」だけ、台詞の 0.54 秒前に 0.32 秒の「ん？」が付いていた（3 シードとも先頭に「ん？」「バイバーイ！」「へっ」があった）。候補 s3401 の 0.78 秒より前を切り、同じ後処理（無音カット、loudnorm -15 LUFS、平均 -16.0 dB）で作り直した。ほかの 17 本の途切れは台詞の「……」や読点の間、語尾の息で、台詞の外の音はなかった。手本（`assets_src/voice/refs/`）も台詞の外の語はなかった（キイチゴの手本の 0.2 秒ほどの息を Whisper が「チャンネル登録をお願いいたします」と聞き違えるが、音は息）。

## 2026-10-25 アバターの口パク動画（B5-1 の評価用）
ツール: Mesh Avatar Studio（`D:\AI\Live2D_AI\mesh-avatar-studio`、MIT）の `work/render-talk.mjs`。アバターは 2026-10-20 に作った `projects/meibuki-tsukimi`・`meibuki-akame`・`meibuki-kiichigo`（元絵は `assets/ui/characters/faces/<キャラ>/normal.png`）。声は `assets/audio/voice/<キャラ>/battle_start_01.mp3`。新しい生成モデルは使っていない（乱数はスクリプト内で固定、毎回同じ結果）。
後処理: FFmpeg で声を 0.6 秒遅らせて重ねた。背景は単色 #2b3a33。

| ファイル | 内容 |
|---|---|
| `promo/2026-10-25/avatar-<キャラ>-talk.mp4` | 768×826、30fps、3.0〜4.0 秒、声つき。git 対象外 |
| `docs/devlog/img/2026-10-25-avatar-talk.png` | 3人のコマ一覧（0.4 秒ごと） |

採用: 評価用。ゲームにはまだ組み込んでいない（B5-2 で判断）。

## 2026-10-25 会話画面の動く立ち絵（B5-2）
ツール: Mesh Avatar Studio（MIT）。2026-10-20 に作ったプロジェクト `projects/meibuki-<キャラ>` の `avatar.json`・`rig.json`・`built/` を、そのまま ZIP（無圧縮）にまとめて `.mavatar` にした（形式は `mesh-avatar-studio/docs/format.md`）。新しい生成はしていない。表示には `packages/element/dist/standalone.js`（mesh-avatar-element 0.1.1、MIT、スタジオのコミット 15d3d60）を `src/vendor/mesh-avatar-element.js` に複製し、ライセンス文を `src/vendor/mesh-avatar-element.LICENSE` に置いた。

| ファイル | 内容 |
|---|---|
| `assets/avatars/tsukimi.mavatar` | 1.09MB。元絵は `assets/ui/characters/faces/tsukimi/normal.png` の上 1024×1100 |
| `assets/avatars/akame.mavatar` | 1.18MB。同上（アカメ） |
| `assets/avatars/kiichigo.mavatar` | 1.04MB。同上（キイチゴ） |

採用: ゲームの会話画面で使用。`Config.story.avatarPortraits: false` で元の静止画に戻る。

## 2026-10-26 拾うアイテムの3Dモデル（B1-1）
ツール: Forge（`juggernautXL_ragnarokBy`、DPM++ 2M、28 steps、CFG 5、1024×1024）で元絵 → Hunyuan3D-2mini turbo（形状のみ、octree 256、5 steps、seed 1234）→ Blender 5.1（`scripts/assets/blender/prep-pickups.py`、約 1200 三角形に削減、中心を原点、最長辺 1、マテリアルなし）。色はゲーム側（`PICKUP_SPECS` の色で陰影つきのマテリアル）。
元絵・途中の GLB: `assets_src/3d/2026-10-26-pickups/`（jobs.json にプロンプト全文。git 対象外）。
共通プロンプト（後半）: `, single small game item, centered, three-quarter view, whole object in frame, isolated on plain pure white background, no shadow, stylized hand-painted 3d game asset, soft natural colors, clean simple silhouette, chunky readable shape`
ネガティブ: `text, watermark, logo, multiple objects, hands, person, background scenery, ground, cast shadow, frame, border, cropped, blurry, photo of a table`

| ファイル | 元絵（シード） | プロンプト（前半） | 採用 |
|---|---|---|---|
| `assets/pickups/pickup_hp.glb`（22KB） | hp-2601 | a plump glossy red berry with a small curled green leaf on top, organic healing fruit | 採用 |
| `assets/pickups/pickup_mp.glb`（22KB） | mp-2601 | a clear teardrop-shaped seed capsule filled with glowing blue water | 採用 |
| `assets/pickups/pickup_burst.glb`（94KB、面を平らに塗るため頂点が多い） | burst-2601 | a jagged golden amber crystal shard glowing from inside, warm yellow | 採用 |
| `assets/pickups/pickup_shield.glb`（21KB） | shield-2602 | a closed pale mint translucent flower bud shell, layered petals like armor | 採用 |
| （`assets_src` のみ）pickup_magnet.glb | magnet-2601 | a smooth violet river stone with a carved spiral groove, faint lavender glow | 不採用: ゲームのカメラからは渦巻きが見えず、ただの球に見えた。元の輪の形のまま |
| — | speed-2601 / 2602 | a lime-yellow winged maple seed (samara) with a single swept wing | 不採用: 2601 は鳥の顔が出た、2602 は薄い葉で立体に向かない |

採用: ~~ゲームで使用~~ → **2026-10-29 に撤去**（下の「2026-10-29 Hunyuan3D をやめる」）。表の `assets/pickups/` のファイルはもう無い（git の履歴にだけある）。
ライセンス: juggernautXL（CreativeML Open RAIL++-M 系）と Hunyuan3D-2mini（Tencent Hunyuan Community License。地域の制限あり）。

## 2026-10-27 効果音: アイテム取得と渇きの母の吸い上げ（B2-1）
ツール: Stable Audio 3 Small-SFX（`D:\0001_App_Dev\audioMCP`、steps 8、CFG 1.0）。`scripts/assets/stable-audio-batch.py` で一括生成（プロンプトの末尾に `, no music, no speech` を自動で付ける）。
候補と jobs: `assets_src/sfx/2026-10-27/`（git 対象外）。後処理は FFmpeg（先頭の無音を削る → 長さを切る → フェード → ラウドネスを合わせる → 0.89 でリミッター）。

| ファイル | 元（シード、長さ） | プロンプト | 後処理 | 採用 |
|---|---|---|---|---|
| `assets/audio/sfx/item_pickup.wav`（0.9 秒、-15.9 LUFS） | item_pickup3_s11（3 秒） | A short bright magical pickup chime, two quick rising glassy notes with a soft sparkle tail, video game item collect sound | 0.9 秒に切り、0.6 秒から 0.3 秒のフェードアウト | 採用: 1046 Hz → 2093 Hz（ド→上のド）の2音がはっきりしていて、ノイズ寄りの `xp_pickup`（中心周波数 8.5 kHz）と聞き分けやすい |
| — | item_pickup3_s23 / s37 / s51、item_pickup2_s11 | 同上 | — | 不採用: どれも同じ 2093 Hz の音で、s11 より2音目の立ち上がりが弱い（候補として残す） |
| — | item_pickup_s11〜s51（**1.2 秒**） | 同上 | — | 失敗: 半分以上の標本が振り切れた白色雑音。短すぎる長さを指定すると壊れる（asset-pipeline.md に記録） |
| `assets/audio/sfx/thirst_drain.wav`（2.9 秒、-15.6 LUFS） | thirst_drain_s11（3.4 秒） | A deep wet sucking sound of water being drawn up through a hollow plant stem, gurgling liquid suction slowly rising in pitch, creature draining fluid | 先頭の無音 0.4 秒を削り、2.8 秒から 0.4 秒のフェードアウト | 採用: 途切れずに続き、低い成分（156 Hz）が一番強い。吸い上げの 3.4 秒にほぼ重なる |
| — | thirst_drain_s37 | 同上 | — | 次点: 途切れないが高め（556 Hz） |
| — | thirst_drain_s23 / s51 | 同上 | — | 不採用: 途中に 0.8〜1.3 秒の無音がある |

使い方: アイテム（xp 以外）を拾うと `itemPickup`、渇きの母が吸い始めると `thirstDrain`。`Config.audio.newSfx: false` で元の `xp_pickup` / `mother_charge` の流用に戻る。
ライセンス: Stable Audio 3（Stability AI Community License）。商用で公開する前の登録は上の「ライセンス」の節のとおり。
**耳での確認はまだ**（自動のサイクルでは音を聞けないので、波形・周波数・ラウドネスで選んだ）。

## 2026-10-28 画風の基準づくりの試し描き（B0-3 / B4-1）

すべて**不採用（比較用）**。手本との違いと次の手は `asset-pipeline.md` の「画風の基準」。設定とプロンプトの全文は `assets_src/illust/2026-10-28/jobs.json` と各 PNG と同名の JSON。

| ファイル | ツール・モデル | 内容 | シード | 判定 |
|---|---|---|---|---|
| `assets_src/illust/2026-10-28/world-a.png` | Forge / juggernautXL_ragnarokBy（DPM++ 2M 28 steps CFG 5） | 世界の系統。白い廃墟・花弁状の塔・逆光・霧 | 2801 | 不採用: 逆光と霧は近いが黄色すぎ、塔がゴシックの尖塔 |
| `assets_src/illust/2026-10-28/world-b.png` | 同上 | 同上 | 2802 | 不採用: 同上 |
| `assets_src/illust/2026-10-28/enemy-a.png` | 同上 | 敵の系統。棘の蔓に覆われた赤い卵・石畳・曇天 | 2811 | 不採用: 写真調でつるっとした卵、光る筋がない |
| `assets_src/illust/2026-10-28/enemy-b.png` | 同上 | 同上 | 2812 | 不採用: 同上 |
| `assets_src/illust/2026-10-28/chara-a.png` | Forge / softsketchIllustrious_v125（Euler a 28 steps CFG 5.5） | 人物の系統。青い髪のポニーテール・紺の装甲服・あおり | 2821 | 不採用: 線画寄りの淡い塗りで、手本のセル塗りと違う |

## 2026-10-29 拾うアイテムの3Dモデル: 吸引石と加速の作り直し（B1-1 の続き）
ツール: 2026-10-26 と同じ（Forge `juggernautXL_ragnarokBy`、DPM++ 2M、28 steps、CFG 5、1024×1024 → Hunyuan3D-2mini turbo 形状のみ、octree 256、5 steps、seed 1234 → Blender 5.1 `prep-pickups.py`、1200 三角形）。
元絵・途中の GLB・確認画像: `assets_src/3d/2026-10-29-pickups/`（jobs.json にプロンプト全文、`sheet.jpg` が元絵8枚、`renders.jpg` が整形後5個）。
共通プロンプト（後半）は 10-26 と同じ。ネガティブに `thin, flat, paper` を足した。

| ファイル | 元絵（シード） | プロンプト（前半） | 採用 |
|---|---|---|---|
| `assets/pickups/pickup_magnet.glb`（22KB） | magnet-horseshoe-2902 | a chunky violet horseshoe-shaped magnet carved from smooth purple stone, thick U shape with two rounded prongs | 採用: ゲームのカメラから U の字に見える |
| — | magnet-horseshoe-2901 | 同上 | 不採用: 斜めから見た形で、立体にすると口が狭い |
| — | magnet-ring-2902 | a thick chunky donut-shaped violet stone ring with a large round hole in the center, smooth polished amethyst torus | 不採用: きれいな輪だが、元の輪の多面体と見分けが付かない |
| — | magnet-ring-2901 | 同上 | 不採用: ドーナツ（パンの断面）が出た |
| `assets/pickups/pickup_speed.glb`（22KB） | speed-arrow-2901 | a thick chunky lime-yellow arrowhead-shaped seed pod, plump pointed triangular nut with a rounded back | 採用: 尖った紡錘形。ゲームでは横に寝かせて速く回す |
| — | speed-arrow-2902 | 同上 | 不採用: 立体にするといびつな塊 |
| — | speed-wingseed-2901 / 2902 | a plump lime-yellow seed with two thick short swept-back wings, chunky winged nut shaped like a dart | 不採用: 2枚とも目のある鳥になった（10-26 に続き2回目。「翼」は鳥を呼ぶ） |

採用: ~~ゲームで使用~~ → **同日に撤去**（下の節）。
ライセンス: 10-26 と同じ（Hunyuan3D の地域の制限あり）。

## 2026-10-29 Hunyuan3D をやめる（ユーザーの判断「Hunyuan3D はライセンスの問題があるのでやめておこう。Tripo にして」）
- ゲームから外したもの: `assets/pickups/pickup_{hp,mp,burst,shield,magnet,speed}.glb`（10-26・10-29 の6種）。`PICKUP_MODELS`（`src/main.js`）を空にし、`Config.pickups.models.enabled: false`。拾うアイテムは元の多面体に戻った。
- リポジトリから外したもの: Hunyuan3D の出力が写った devlog の画像3枚（`2026-10-26-pickup-shapes.png`・`2026-10-26-pickups-compare.png`・`2026-10-29-pickups-compare.png`）、`scripts/assets/start-hunyuan-api.bat`・`hunyuan-img2glb.mjs`。git の履歴には残っている（履歴の書き換えはしていない）。
- 手元に残っているもの（git 対象外）: `assets_src/3d/2026-10-26-pickups/`・`2026-10-29-pickups/` の Hunyuan3D の GLB。ゲームには使わない。元絵（Forge 製）は Tripo の入力に使える。
- 2026-10-27 に試した敵（03 黒い棘の鎧）の Hunyuan3D 版は、もともとゲームに入れていない。
- 作り直しは backlog B1-1（Tripo、ユーザーがクレジットの量を決めてから）。

## 2026-10-30 ボス出現・レベルアップ・残り1分の一言（B3-2）
ツール: Irodori-TTS v4.1（`Aratako/Irodori-TTS-v4.1-Small`、bf16）、`scripts/assets/irodori-batch.py` に手本（`assets_src/voice/refs/<キャラ>/`、10-24 にユーザーが選んだもの）を `refs` で指定。指定文は空、台詞ごとの演技の指定だけ。台詞ファイル `scripts/assets/voices/2026-10-30-b3-2.json`（演技の指定の全文はここ）、候補は `assets_src/voice/2026-10-30/`（各3シード、27 本、git 対象外）。手本は以前の worktree（`search_survive_daily`）からこのフォルダの `assets_src/voice/refs/` にコピーした。
選び方（asset-pipeline.md の手順どおり）: Whisper small の文字起こし（全候補 0.75 以上。「一分→1分」「がんばろっ→頑張ろう」の表記違いは問題なし。アカメ s2502「お敷」は落とした）→ `voice-analyze.py` の声の高さと画像。後処理: 前後の 0.2 秒未満で 0.25 秒以上離れた音のかたまりを切る → loudnorm -15 LUFS → mp3（結果 -15.0〜-17.3 LUFS）。置き場所 `assets/audio/voice/<キャラ>/`。`Config.audio.cueVoices: false` で鳴らなくなる。

| キャラ | ファイル | 台詞 | 採用シード | 長さ（秒） | 選んだ理由・落とした候補 |
|---|---|---|---|---|---|
| ツキミ | `boss_appear_01.mp3` | 来ました……大きいのが。 | 1501 | 2.37 | 3本とも同じ形。1502 は末尾に短い音、自然さも 2.33 と低い |
| ツキミ | `level_up_01.mp3` | まだ、強くなれる。 | 1502 | 2.04 | 1501 は手本との近さ 0.85、1503 は高さ 237Hz で手本（285〜347）より低い |
| ツキミ | `last_minute_01.mp3` | あと一分。落ち着いて。 | 1501 | 2.20 | 高さ 327Hz が手本の範囲内。1502 は 374Hz で高め |
| アカメ | `boss_appear_01.mp3` | 大物だ。私が行く。 | 2501 | 1.87 | 低く言い切る（195Hz、手本 189〜210）。2502 は語の間に別の声、2503 は 264Hz で高め |
| アカメ | `level_up_01.mp3` | 体が軽い。 | 2502 | 0.95 | 有声 0.74 で最もはっきり。2501・2503 は息が多い |
| アカメ | `last_minute_01.mp3` | あと一分。押し切る。 | 2503 | 1.65 | 文字起こしが最も正確（0.88）。2501 は末尾に短い音、2502 は「お敷」 |
| キイチゴ | `boss_appear_01.mp3` | うわ、でっかいの来た！ | 3501 | 2.63 | 3502・3503 は 0.8 秒後ろに余分な音 |
| キイチゴ | `level_up_01.mp3` | いいね、いいね！ | 3503 | 1.94 | 3501・3502 は先頭に短い音。手本との近さも 0.83 で最も高い |
| キイチゴ | `last_minute_01.mp3` | ラスト一分、がんばろっ！ | 3502 | 1.83 | 3501・3503 は前後に余分な音がいくつも付き 3.2 秒 |

ツキミの3シードはどの台詞もほぼ同じ波形になった（手本が2本だけで、手本の調子が強く移る）。声色を変えたいときは、シードより演技の指定を変えるほうが効く。
