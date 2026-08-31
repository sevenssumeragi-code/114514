# 実装計画書 — 『夜継ぎの魔法使い』 Nightweaver

設計書（シナリオ設計書＋システム設計書＋執筆仕様書）を唯一の正本として、
ブラウザで最初から最後まで遊べるノベルゲームとして実装するための計画。

---

## 1. 着手時点のプロジェクト状態

| 項目 | 状態 |
|---|---|
| リポジトリ | `sevenssumeragi-code/114514`（`.gitattributes` のみ。実質の新規） |
| package.json | 無し |
| フレームワーク | 無し |
| 既存エンジン／UI | 無し |
| public/assets | 無し |
| 既存シナリオ | 無し |
| README | 無し |

**判断**：既存実装が存在しないため、新規プロジェクトとして構築する。
既存ファイルの削除・`git reset --hard` は行っていない。

> 併せて渡されたリポジトリ `sevenssumeragi-code/-23` には、別作品
> （『ミッドナイトライン ―澪原市いのちの電話―』）の `CLAUDE.md` が置かれている。
> そちらの規約（バニラJS・単一HTML・外部依存禁止）は本作の要求（Vite/TypeScript/React）
> と両立しないため、本作は `114514` 側に実装し、`-23` には手を入れていない。

---

## 2. 採用技術

| 層 | 採用 | 理由 |
|---|---|---|
| ビルド | Vite 5 | `npm run dev` / `npm run build` が要求どおり動く。サーバ不要 |
| 言語 | TypeScript 5（strict） | シナリオ命令を型で守り、飛び先・フラグの取り違えを静的に潰す |
| UI | React 18 | 画面状態（タイトル／ゲーム／名簿／END一覧）の切り替えが素直 |
| 保存 | localStorage（失敗時メモリ） | サーバ不要。プライベートウィンドウでも落ちない |
| テスト | Vitest | Vite と同じ解決系をそのまま使える |
| 外部依存 | 上記のみ | ゲームランタイムに追加ライブラリを持ち込まない |

`npm install` → `npm run dev` で Windows PC 上のブラウザから起動できる。
`npm run build` は `tsc --noEmit` を通してから静的ファイルを吐く。

---

## 3. ゲームアーキテクチャ

```
src/
  engine/      … 作品に依存しない実行系
    types.ts        シナリオ命令の型（narration / dialogue / choice / branch …）
    state.ts        GameState（周回内）と PersistentData（周回横断）の分離
    conditions.ts   条件DSLの評価
    interpreter.ts  VM。命令列を実行し、停止点（テキスト／選択肢／END）を返す
    routing.ts      陣営内1位＋固有フラグによる個別ルート確定、HAPPY判定
    validator.ts    シナリオデータの静的検証
    save.ts         スロット26枠・CONFIG・完全初期化
    storage.ts      localStorage フォールバック
  systems/
    store.ts        エンジンと React をつなぐ観測可能ストア
    audio.ts        BGM/SE。素材が無ければ無音へフォールバック
  components/  … 画面（タイトル／ゲーム／名簿／END一覧／セーブ／設定／デバッガ）
  data/        … 台帳（フラグ・CG・END・キャラ・アセット manifest）
  scenario/    … 本文。エンジンを一切 import しない純データ
```

**原則**：本文は `src/scenario/` の外に一行も書かない。
コンポーネントにセリフをハードコードしない。

---

## 4. シナリオ管理方式

シーン（`{ id, commands[] }`）の集合。命令は次を扱える。

`narration` / `dialogue` / `system` / `background` / `character` / `cg` / `bgm` / `se` /
`effect` / `wait` / `flag` / `param` / `choice` / `jump` / `branch` / `chapter` / `route` /
`ending` / `autosave` / `breakFrame` / `clearCharacters` / `closeCg`

執筆は `src/scenario/dsl.ts` の薄いヘルパ（`n()` `d()` `choice()` `opt()` `branch()` …）
を通す。読みやすさのためだけの糖衣で、生成されるのは素のデータ。

```ts
d('NEO', '……好きにするがいい。', { exp: 'cold' })

choice('——どうする?',
  opt('トンネルを覗きに行く', 'n1_tunnel', { setFlags: ['TUNNEL_SHADOW'] }),
  opt('寝る', 'n1_sleep', { affection: { LEN: 5 } }),
)
```

配置：

```
scenario/common/night1..6.ts     共通第一〜六夜
scenario/faction/factionA|B|C.ts 陣営別第七〜九夜（完全別テキスト）
scenario/character/*.ts          個別6ルート第十〜十三夜＋各HAPPY/NORMAL
scenario/true/trueRoute.ts       TRUE第十三夜＋終夜
scenario/bad/badEndings.ts       BE-01〜BE-12
scenario/normal/normalEndings.ts NE-1
```

---

## 5. セーブ方式

- スロット 26 枠：オート 5（リングバッファ）／クイック 1／マニュアル 20
- 各スロットに保持：章・日付・ルート・陣営・シーンID・話者・表示テキスト冒頭・
  保存日時・背景（サムネイル代替）・プレイ時間・`GameState` 全体
- オートセーブ発火：章開始、大きな選択肢の直前、ルート確定、END直前
- ロードは `GameState` をそのまま復元 → 同じ地点から完全に再開する

---

## 6. 周回管理方式

**二層に分ける。New Game で消えるのは上だけ。**

| 周回内（`GameState`） | 周回横断（`PersistentData`） |
|---|---|
| 好感度 6 種 / `RES` / `NOX` / `MEM` | `OBS`（観測度） |
| 通常フラグ・章・シーン・舞台状態 | 到達済みEND（初回時刻つき） |
| 現在陣営・現在個別ルート | 周回ごとの達成記録（`loopRecords`） |
| | CG解放・既読テキスト・周回数・TRUE解放 |

`New Game` は `createGameState()` を呼ぶだけで、`PersistentData` に触れない。
完全初期化はタイトルの「全データ削除」だけが実行できる。

---

## 7. フラグ方式

`src/data/flags.ts` を台帳の実体とし、validator が
「台帳に無いフラグをシナリオが参照していないか」を機械的に検査する。

- F01〜F21・F99 を設計書の内部名そのままで実装
- F09 は陣営三択なので `SIDE_GUARD` / `SIDE_TRUTH` / `SIDE_BREAK` の3つに割る
- F20 `SEAM_STITCH` と F99 `NOX_OVER` は状態から自動導出（`syncDerivedFlags`）
- **F20 は現在のセーブだけを見ない。** `PersistentData.loopRecords` を横断し、
  F14〜F19 のうち3種以上が **2つ以上の異なる周回に分散して** 達成されている
  ときだけ成立する（単一周回で3種そろえても不成立）

---

## 8. CG管理方式

`src/data/cg.ts` に CG-01〜CG-54 を定義（題・章・構図・回収条件・光源）。
画像は `public/assets/cg/CG-19.png` のように **ID と同名で置くだけ** で差し替わる。
未提供のあいだは構図テキスト＋`[ IMAGE NOT YET PROVIDED ]` のプレースホルダを表示し、
ゲームは止まらない。ギャラリーは一般的なCG一覧ではなく **「宵ノ辻名簿」**。
未回収は空欄の氏名欄として並ぶ。

---

## 9. 実装工程

1. エンジン（型・状態・条件・VM・保存）
2. 台帳（フラグ・CG・END・キャラ・アセット manifest）
3. validator（飛び先・フラグ・CG・到達性）
4. 共通第一〜六夜
5. TRUE 第十三夜＋終夜（着地点を先に固定）
6. ネオルート（最長）→ 残り5ルート
7. 陣営A/B/C 第七〜九夜
8. BAD 12 ／ NORMAL 3
9. UI（タイトル／ゲーム／バックログ／セーブ／設定／名簿／END一覧／デバッガ）
10. 自動テスト → ビルド → 実機確認

---

## 10. テスト方法

- `npm test` … Vitest。63 件。
  - シナリオ静的検証（飛び先・フラグ・CG・背景・話者・到達性・無限ループ）
  - 3陣営到達／HAPPY6／BAD12／NORMAL3 の実プレイ到達
  - F20 が単一周回で成立しないこと／別周回で成立すること
  - `OBS<300` でTRUE選択肢が出ないこと／`OBS≧300`＋F20でTRUEへ進めること
  - `MEM=0`→BE-03、`NOX≧80`→BE-07/BE-12
  - Save→Load の完全復元／New Game で周回データが残ること／全データ削除
  - 口調の絶対遵守表（ゲルの「貴様」禁止、ネオの「俺」禁止 等）
- `npm run build` … 型チェック＋本番ビルド
- 実機確認 … Chromium で 1366×768 と 390×844 を実操作
