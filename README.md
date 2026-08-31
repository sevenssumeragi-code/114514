# 夜継ぎの魔法使い — Nightweaver —

冬の坂の町「宵ノ辻」を舞台にした、伝奇ノベルゲーム。
ブラウザで動く。サーバは要らない。

七年ごとに、この町は夜を一晩だけ「向こう側」に貸す。
借りられた夜に攫われた者は、名前ごと世界から抜け落ちて、誰も覚えていない。
十二月十三日から始まる十三の夜。そして、カレンダーに存在しない十四番目の夜。

- 共通 6 夜 → 陣営 3 夜 → 個別 4 夜
- 3 陣営／6 個別ルート
- エンディング 22 種（HAPPY 6／NORMAL 3／BAD 12／TRUE 1）
- 周回を越えて引き継がれるものがある

---

## 起動方法

Node.js 18 以上が必要（開発は v22 で確認）。

```bash
npm install
npm run dev
```

`http://localhost:5173/` をブラウザで開く。Windows / macOS / Linux いずれも同じ。

## ビルド方法

```bash
npm run build     # tsc --noEmit → vite build（dist/ に出力）
npm run preview   # ビルド結果をローカルで確認
```

`dist/` は静的ファイルのみ。任意の静的ホスティングにそのまま置ける。

## その他のコマンド

```bash
npm test          # Vitest 63件（シナリオ検証・全END到達・周回・セーブ・口調）
npm run validate  # シナリオ検証だけを実行
npm run typecheck # 型チェックのみ
```

---

## ディレクトリ構成

```
src/
  engine/            作品に依存しない実行系
    types.ts           シナリオ命令の型定義
    state.ts           GameState（周回内）／ PersistentData（周回横断）
    conditions.ts      条件DSLの評価
    interpreter.ts     VM。命令を実行し、停止点を返す
    routing.ts         個別ルート確定・HAPPY判定
    validator.ts       シナリオデータの静的検証
    save.ts            セーブスロット・CONFIG・完全初期化
    storage.ts         localStorage フォールバック
  systems/
    store.ts           エンジンと React をつなぐストア
    audio.ts           BGM/SE（素材が無ければ無音）
  components/        画面（タイトル／ゲーム／名簿／END一覧／セーブ／設定／デバッガ）
  data/              台帳（フラグ・CG・END・キャラクター・アセット manifest）
  scenario/          本文（純データ。エンジンを import しない）
    dsl.ts             執筆用ヘルパ
    common/            共通第一〜六夜
    faction/           陣営別第七〜九夜
    character/         個別6ルート第十〜十三夜＋HAPPY/NORMAL
    true/              TRUE第十三夜＋終夜
    bad/ normal/       BAD 12／NE-1
  styles/global.css
public/assets/
  backgrounds/ characters/ cg/ bgm/ se/    ← 素材を置く場所
docs/
  IMPLEMENTATION_PLAN.md     実装計画
  IMPLEMENTATION_STATUS.md   進捗チェックリストと実測値
  ASSET_REQUIREMENTS.md      不足素材の全件一覧
  DESIGN_GAPS.md             設計書との差分と最小修正の記録
  FINAL_QA_REPORT.md         最終監査報告
tests/                       Vitest
```

**原則：本文は `src/scenario/` の外に一行も書かない。**
コンポーネントにセリフをハードコードしない。

---

## シナリオの追加方法

シーンは「ID と命令列」の組。`src/scenario/dsl.ts` のヘルパを使う。

```ts
import { scene, n, d, bg, ch, choice, opt, jump, flag, p } from '../dsl';

export const myScenes = [
  scene('n1_example',
    bg('slope_night'),
    ch('NEO', 'cold', 'center'),
    n('坂の上から、街灯が順に消えていく。'),
    d('NEO', '……好きにするがいい。', { exp: 'cold' }),
    choice('——どうする?',
      opt('トンネルを覗きに行く', 'n1_tunnel', {
        setFlags: ['TUNNEL_SHADOW'],
        affection: { NOX: 6 },
      }),
      opt('寝る', 'n1_sleep', { affection: { LEN: 5 } }),
    ),
  ),
];
```

追加したら `src/scenario/index.ts` の `ALL_SCENE_LISTS` に載せる。

使える命令：`n`（地の文）／`d`（セリフ）／`sys`（システム表示・HTML可）／
`bg` `ch` `hide` `clearCh` `cg` `closeCg` `bgm` `se` `fx` `wait` ／
`flag` `unflag` `p` `setP` ／ `choice` `opt` `jump` `branch` ／
`chapter` `route` `ending` `autosave` `breakFrame`

守ること：

- **すべてのシーンは `jump` / `branch` / `choice` / `ending` のいずれかで終える。**
- **新しいフラグは必ず `src/data/flags.ts` の台帳に追記する。** 台帳外は検証で弾かれる。
- 選択肢は同時 4 つまで（モバイル基準）。
- 選択肢は「言い方の違い」ではなく「相手の運命の違い」を作る。

`npm test` が、飛び先の実在・台帳外フラグ・未定義CG／背景／BGM／SE・到達不能シーン・
到達不能END・無限ループ・口調違反を機械的に検出する。

## CG の追加方法

1. `src/data/cg.ts` に定義（`id` / `title` / `night` / `composition` / `unlock` / `group` / `light`）
2. シナリオで `cg('CG-19')` を呼ぶ（表示せず解放だけなら `cgOnly('CG-19')`）
3. 画像を `public/assets/cg/CG-19.png` に置く

画像が無い間は構図テキストと `[ IMAGE NOT YET PROVIDED ]` を表示し、進行は止まらない。
後から同名ファイルを置くだけで差し替わる。

## BGM / SE の追加方法

1. `src/data/assets.ts` の `BGM` / `SE` に追記（`file` にファイル名）
2. シナリオで `bgm('daily_winter')` / `se('streetlight_off')`
3. 音源を `public/assets/bgm/` `public/assets/se/` に置く

見つからない場合は無音で継続し、コンソールに一度だけ警告を出す。

## 背景・立ち絵の追加方法

- 背景：`src/data/assets.ts` の `BACKGROUNDS` に追記し、`public/assets/backgrounds/` へ
- 立ち絵：`public/assets/characters/<キャラID小文字>_<表情>.png`
  （例 `neo_cold.png`）。表情名は `src/data/characters.ts` の `expressions` に登録

いずれも無い場合は CSS のプレースホルダで代替する。
必要ファイルの全件一覧は `docs/ASSET_REQUIREMENTS.md`。

---

## セーブ仕様

| 種別 | 枠数 | 挙動 |
|---|---|---|
| オートセーブ | 5 | 章開始／大きな選択肢の直前／ルート確定／END直前。空き→最古の順に回る |
| クイックセーブ | 1 | 任意 |
| マニュアルセーブ | 20 | 任意 |

各スロットに、章・日付・ルート・陣営・シーン・話者・表示テキストの冒頭・
プレイ日時・背景（サムネイル代替）・プレイ時間を表示する。
ロードすると、フラグ・パラメータ・立ち絵・背景・BGM・CG を含めて完全に復元する。

保存先は `localStorage`。使えない環境（プライベートウィンドウ等）では
自動的にメモリへ退避し、クラッシュしない。

## 周回仕様

**New Game では周回データは消えない。** 消えるのは今回の周回のぶんだけ。

| New Game で消える | 周回を越えて残る |
|---|---|
| 好感度 6 種 | 観測度 |
| 共鳴値 / 夜度 / 記憶残量 | 到達済みEND（初回到達日時つき） |
| 通常フラグ | CG 解放（宵ノ辻名簿） |
| 現在の陣営・個別ルート | 既読テキスト |
| 現在章・現在シーン | 周回数と、周回ごとの達成記録 |

完全初期化はタイトル画面の **「全データ削除」** からのみ実行できる。

2 周目以降は、既読の選択肢や地の文にごく稀に「ずれ」が混ざる。
これは演出であり、バグではない。

---

## Debug 起動方法

開発ビルド（`npm run dev`）でのみ有効。本番ビルドには含まれない。

**F9** で Route Debugger が開く。表示・操作できるもの：

- 現在シーン／章／陣営／個別ルート／周回数
- 好感度 6 種・共鳴値・夜度・記憶残量・観測度（その場で書き換え可）
- 現在のルート判定結果とその根拠
- F20 の成立状況（どのフラグをどの周回で取ったか）
- 周回記録の一覧
- 立っているフラグの一覧と、台帳からのトグル
- 全 327 シーンへの任意ジャンプ

## キーボード操作

| キー | 動作 |
|---|---|
| Space / Enter | 進む（1回目で全文表示、2回目で次へ） |
| Ctrl（押している間） | スキップ |
| A | オート |
| L | バックログ |
| S / O | セーブ / ロード |
| H | メッセージウィンドウ非表示 |
| Esc | 戻る |
| F9 | Route Debugger（開発ビルドのみ） |

---

## 素材について

画像・音声は未提供のまま、**最初から最後まで通してプレイできる**。
不足素材は `docs/ASSET_REQUIREMENTS.md` に、ファイル名・種類・使用章・
推奨サイズ・構図指示・設計書CG番号つきで全件列挙してある。
