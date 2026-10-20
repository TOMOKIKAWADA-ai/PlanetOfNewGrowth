# Search Survive Three

Three.js / Vite 製の見下ろし型 3D サバイバルゲームです。Web ブラウザだけで起動します。

## 起動方法

```powershell
npm install
npm run dev
```

表示された URL、通常は `http://127.0.0.1:5173/` をブラウザで開きます。

本番ビルド確認:

```powershell
npm run build
```

## 操作

GAME START → 世界観のプロローグ → キャラクター選択・出撃確認 → 第1章「守る順番」の出撃前会話 → 戦闘 → 母卵撃破 → 帰還後の会話 → 結果画面。
戦闘は4分制です。開始3分で母卵が現れ、残り1分で倒せなければ時間切れになります。人間形態の射撃は自動で、通常の近接攻撃はありません。
ストーリーはクリック・Enter・Space・コントローラーの×で進みます。文字送り中は全文表示、全文表示後は次のページへ進みます。
BACKで前のページ、LOGで既読の文章を確認、AUTOで自動送り、SKIPで現在のシーンを省略できます。会話ログはEsc／○でも閉じられます。
帰還会話は第1章の勝利時のみ再生し、戦闘とタイマーは停止します。結果画面の「帰還後の会話を読み返す」から再生できます。敗北・時間切れでは再生しません。
台本は `src/story-data.js`、演出と操作は `src/story.js`、画面デザインは `src/story.css` で編集できます。
現在の台本を読み物として確認する場合は `docs/implemented-story-script.txt` を参照してください。`node scripts/export-story-text.mjs` で実装データから再生成できます。
一般市民は根を張った植物・機械の姿で、旧人類の体を模した三人を恐れる者もいます。`assets/story` の市民画を物語画面へ表示し、救助は土ごとの移動槽と避難所での給水として描いています。市民の立ち絵は `src/story-data.js` の `CIVILIAN_ART` から割り当てています。
出撃前の会話は選択キャラクターと草原／水没ステージに応じて一部が変化します。
第1章ではプレイヤーがポンプの周りを担当し、救助班が六人を救う場面と温室の損失は台本で描きます。護送AI・ポンプ耐久値・救助成否の分岐は未実装です。本編はステージ1の帰還会話と結果画面でいったん終了します。ステージ2へは自動進行せず、水没ステージはF3の開発用ステージ選択から引き続き遊べます。
台本データの検証は `npm test`。演出仕様とブラウザ検証方法は `docs/story-direction.md` を参照してください。

- WASD / 矢印キー: 移動
- Q: 人間形態と鳥形態を切り替え
- E: 人間形態でバースト技
- 鳥形態: 卵や母卵へ近づくと自動で急降下
- Esc: 一時停止
- R: 再開始
- F3: 開発情報表示

### PS5コントローラー（DualSense）

- 左スティック / 方向キー: 移動、メニュー選択
- ×: メニュー決定。キャラクター画面では候補を選び、続けて「出撃」を押す
- レベルアップ画面: 方向キー / 左スティックで強化を選び、×で決定。選択中の候補は黄色い枠で表示
- □ / R1: バースト技
- △: 人間形態と鳥形態を切り替え
- OPTIONS: 一時停止 / 再開
- ○: メニューを戻る、ポーズ解除
- CREATE: ポーズ中に再開始

USBまたはBluetoothで接続し、ブラウザ上でいずれかのボタンを押すと認識されます。
コントローラーが接続されている間は、誤操作を避けるためゲーム内のキーボード操作を無効にします。取り外すとキーボード操作に戻ります。メニューでは白い枠がコントローラーのカーソル、キャラクターの金色の「選択中」が出撃対象です。

### スマートフォン

スマートフォンのブラウザでは、画面左下のスティックをドラッグして移動します。右下の「変身」と「バースト」をタップし、右上の「一時停止」で操作ガイドと再開ボタンを開けます。攻撃は自動です。タイトル、会話、キャラクター選択、強化選択は画面をタップして進めます。縦向き・横向きの両方に対応しています。

同じWi-Fi上のスマートフォンで開く場合は、開発サーバーを `npm run dev -- --host 0.0.0.0` で起動し、PCのローカルIPアドレスと表示されたポートを指定します。スマートフォンから `localhost` を指定してもPCのサーバーには接続できません。

## 実装内容

- Three.js の単一 Web アプリとして実装
- プレイヤーはキャラクターごとのGLB（`tsukimi_v2_mix3.glb` / `akame_002_rtp.glb` / `kiichigo_BLD.glb`）に、FBXのアニメーションを適用して表示
- 卵・母卵・敵・ドローン・経験値は `src/main.js` の `GAMEPLAY_MODELS` に列挙したGLBを常に読み込みます（`visuals.useAssetModels` とは無関係）
- 背景装飾は `assets/background` のGLBのみを使用し、Primitiveの草・石・木は無効化しています
- `src/config.js` の `visuals.useAssetModels` を `true` にすると、Kenney などの旧アセット（`assets.js` の `AssetStore`）を追加で読み込みます
- 卵の成熟、孵化、増殖、卵ゼロ時の即時復帰スポーン
- 産卵獣、追跡敵、射撃敵、狙撃敵、守護敵
- 鳥形態の上空移動、自動捕食、母卵への自動急降下
- 人間形態の自動射撃、特殊弾、キャラクター別バースト技、範囲パルス強化
- 経験値、レベルアップ、ランダム 3 択強化
- 母卵 HP バーと画面外アラート
- 敵検索用の空間グリッド
- 弾と経験値オーブのオブジェクトプール
- 消えた卵・敵が個別に作ったジオメトリとマテリアルの解放

## 主な設定場所

- `src/config.js`: ゲーム数値、カメラ、スポーン、敵、強化候補、アセットパス
- `src/config.js` の `performance`: 高DPI描画、アンチエイリアス、シャドウ、装飾数、粒子数、卵ライトの軽量化設定
- `src/entities.js`: プレイヤー、卵、敵、弾、経験値
- `src/main.js`: ゲームループ、スポーン、勝敗、演出、環境生成
- `src/styles.css`: HUD とレスポンシブ UI

## アセット

- 使用中: `assets/player`（上記GLBとFBXアニメーション）、`assets/eggs`、`assets/mother`、`assets/enemies`、`assets/drones`、`assets/xp`、`assets/background`、`assets/floor`、`assets/effects`、`assets/audio`、`assets/story`、`assets/promo`、`assets/ui`
- チュートリアルのアニメーションは animated WebP（`assets/ui/tutorial/*.webp`）。GIFより大幅に軽量です
- 現在は未使用ですが、段階的に追加し直すために残しているもの:
  - `assets/player/Run.fbx`、`Idle.fbx`、`tsukimi_base.glb`、`tsukimi_rig.glb`、`tukimi_v2.fbx`
  - `assets/models/Tsuyukusa_*.glb`、`assets/models/seed_001_ritpo.glb`
  - Kenney `Nature Kit` / `Graveyard Kit` の CC0 GLB（ライセンスは `assets/kenney` に同梱）
- `visuals.useAssetModels: false` の間は Vite の `publicDir` も無効化されるため、未使用のGLB/JPGは `dist` へコピーされません
