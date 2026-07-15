# Search Survive Three

Three.js / Vite 製の見下ろし型 3D サバイバルゲームです。Godot はランタイムから外し、Web ブラウザだけで起動します。

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

- WASD / 矢印キー: 移動
- Q: 人間形態と鳥形態を切り替え
- Space: 人間形態で近距離攻撃
- E: 人間形態でバースト技
- 鳥形態: 卵や母卵へ近づくと自動で急降下
- Esc: 一時停止
- R: 再開始
- F3: 開発情報表示

## 実装内容

- Three.js の単一 Web アプリとして実装
- 現在の見た目はプレーンな低ポリゴン Primitive 基準
- `assets/player/tsukimi_base.glb` を自キャラ表示として有効化しています
- 背景装飾は `assets/background` のGLBのみを使用し、Primitiveの草・石・木は無効化しています
- `src/config.js` の `visuals.useAssetModels` を `true` に戻すと、GLB アセット読み込みを再有効化できます
- 卵の成熟、孵化、増殖、卵ゼロ時の即時復帰スポーン
- 産卵獣、追跡敵、射撃敵、守護敵
- 鳥形態の上空移動、自動捕食、母卵への自動急降下
- 人間形態の自動射撃、特殊弾、近距離攻撃、バースト技、範囲パルス強化
- 経験値、レベルアップ、ランダム 3 択強化
- 母卵 HP バーと画面外アラート
- 敵検索用の空間グリッド
- 弾と経験値オーブのオブジェクトプール
- 草、岩、木の `InstancedMesh` 配置

## 主な設定場所

- `src/config.js`: ゲーム数値、カメラ、スポーン、敵、強化候補、アセットパス
- `src/config.js` の `performance`: 高DPI描画、アンチエイリアス、シャドウ、装飾数、粒子数、卵ライトの軽量化設定
- `src/entities.js`: プレイヤー、卵、敵、弾、経験値
- `src/main.js`: ゲームループ、スポーン、勝敗、演出、環境生成
- `src/styles.css`: HUD とレスポンシブ UI

## アセット

- `assets/models/Tsuyukusa_003rig.glb`
- `assets/models/seed_001_ritpo.glb`
- `assets/player/Run.fbx` は前回テスト用に残っていますが、現在は未使用
- `assets/player/tsukimi_rig.glb`
- `assets/player/tsukimi_base.glb`
- `assets/enemies/ene_001.glb`
- `assets/eggs/darkseed.glb`
- `assets/background/*.glb`
- `assets/floor/flr_001.png`
- Kenney `Nature Kit` / `Graveyard Kit` の CC0 GLB
- Kenney と Tsuyukusa 系GLBは段階的に追加し直すために残していますが、現在は `visuals.useAssetModels: false` のため使用していません
- 外部モデルOFF時は Vite の `publicDir` も無効化されるため、`dist` へGLB/JPGはコピーされません
- ライセンスは `assets/kenney` に同梱

## 旧 Godot 版

旧 Godot プロジェクトは `legacy_godot` に退避しています。現在の起動・ビルドには使用しません。
