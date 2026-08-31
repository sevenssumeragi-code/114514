# 不足素材一覧 — ASSET REQUIREMENTS

本作は素材が一枚も無くても最後まで遊べる（プレースホルダへ自動フォールバックする）。
以下は「置けば差し替わる」ファイルの一覧である。

## 置き場所と命名

```
public/assets/backgrounds/<背景ID に対応するファイル名>
public/assets/characters/<キャラID小文字>_<表情>.png
public/assets/cg/<CG-番号>.png          ← 例: public/assets/cg/CG-19.png
public/assets/bgm/<BGM ファイル名>.ogg
public/assets/se/<SE ファイル名>.ogg
```

ファイルを置くだけでよい。コードの変更は不要。
見つからない場合はコンソールに警告を残し、プレースホルダ／無音で継続する。

---

## 1. CG（54枚）

推奨サイズ **1920×1080 PNG**。光源は「街灯（橙）」「雪の反射（青）」「朝日（白）」の三種のみ。
HAPPY は白、BAD は無光、TRUE は白＋無人。

| ファイル名 | 題 | 章 | 種別 | 光源 | 構図・演出指示 | 回収条件 |
|---|---|---|---|---|---|---|
| `cg/CG-01.png` | 寮の朝 | 1 | イベント | 街灯（橙） | 俯瞰。こたつで寝るレニィ。暖色。 | 自動 |
| `cg/CG-02.png` | 坂の街灯 | 1 | イベント | 街灯（橙） | 等間隔の街灯。坂の上から下へ。 | 自動 |
| `cg/CG-03.png` | トンネルの金 | 1 | イベント | 無光 | 逆光、シルエットのみ。顔を見せない。 | F01 TUNNEL_SHADOW |
| `cg/CG-04.png` | 青い水底 | 1 | イベント | 無光 | レニィの夢。沈む光。 | 第一夜「寝る」 |
| `cg/CG-05.png` | 鍋の湯気 | 2 | イベント | 街灯（橙） | 七人。湯気で輪郭が柔らかい。最も温かいCG。 | F02 NABE_MEMORY |
| `cg/CG-06.png` | 空いた席 | 2 | イベント | 朝日（白） | 教室。誰も座っていない机ひとつ。 | 自動 |
| `cg/CG-07.png` | 七年分の手帳 | 2 | イベント | 街灯（橙） | ジンパチの手帳。知らない名前の列。 | 自動 |
| `cg/CG-08.png` | 赤い左目 | 3 | イベント | 街灯（橙） | ヒュウの前髪が上がる瞬間。虹彩に縫い目。 | 自動 |
| `cg/CG-09.png` | たい焼き | 3 | イベント | 街灯（橙） | 湯気とあんことクリーム。ムニが両方持つ。 | S04 N3_TAIYAKI |
| `cg/CG-10.png` | 十回の署名 | 3 | イベント | 無光 | 鏡の前。紙に自分の名前が十個。 | 自動 |
| `cg/CG-11.png` | 剣士の降臨 | 4 | イベント | 雪（青） | ネオ全身。雪。マント。俯瞰でムニを見下ろす。 | 自動 |
| `cg/CG-12.png` | 砕ける結界 | 4 | イベント | 無光 | ゲルの結界が割れる。紫の破片。 | 自動 |
| `cg/CG-13.png` | 効かない拳 | 4 | イベント | 雪（青） | ジンパチの拳がネオの魔術をすり抜ける。 | 自動 |
| `cg/CG-14.png` | 開いた青 | 4 | イベント | 街灯（橙） | レニィの目のアップ。瞳孔が縦。街灯の光が集まる。 | 自動 |
| `cg/CG-15.png` | 斬ったはずだ | 4 | イベント | 雪（青） | ネオの後退。剣の切っ先が震える。 | 自動 |
| `cg/CG-16.png` | 五歳の誕生日 | 5 | イベント | 街灯（橙） | 七人＋窓の外のネオ。必ずネオを画面端に小さく。 | 自動 |
| `cg/CG-17.png` | 指切り | 5 | イベント | 街灯（橙） | ムニとレニィの小指のみのアップ。 | F08 MUNI_PROMISE |
| `cg/CG-18.png` | 名簿の頁 | 5 | イベント | 街灯（橙） | 古い帳面。びっしりと名前。最後の行に「セン」。 | F07 LEDGER_PEEK |
| `cg/CG-19.png` | コンビニの魔法剣士 | 5 | イベント | 無光 | ネオがカップ麺を凝視。蛍光灯。ギャグ調。 | F06 NEO_NOODLE |
| `cg/CG-20.png` | ごめんね | 5 | イベント | 街灯（橙） | 眠るレニィの枕元、ムニの後ろ姿。 | 自動 |
| `cg/CG-21.png` | 割れた朝 | 6 | イベント | 朝日（白） | ヒュウが倒れる。ムニを見る目に光がない。 | F10 HYU_HAND |
| `cg/CG-22.png` | 私が、そうした | 6 | イベント | 無光 | ゲルの告白。俯いた顔に影。 | 自動 |
| `cg/CG-23.png` | 窓の外の剣士 | 6 | イベント | 雪（青） | 三択のあと、窓越しに立つネオ。 | 自動 |
| `cg/CG-24.png` | ひらがなの手紙 | 8A | イベント | 街灯（橙） | 手紙のみのアップ。子どもの字。文字を実際に読ませる。 | 陣営A |
| `cg/CG-25.png` | 結界の日常 | 7A | イベント | 街灯（橙） | 寮の中。四角く切り取られた安全。 | 陣営A |
| `cg/CG-26.png` | 名前カード | 7B | イベント | 街灯（橙） | ジンパチが作った不格好なカードの束。 | 陣営B |
| `cg/CG-27.png` | 金髪を結ぶ | 7C | イベント | 街灯（橙） | ジンパチがネオの髪を後ろで縛る。ネオ不機嫌。 | 陣営C |
| `cg/CG-28.png` | 「どなたでしたか」 | 9B | イベント | 無光 | ヒュウがゲルを見る。ゲルの表情が崩れる。 | 陣営B |
| `cg/CG-29.png` | 越境 | 8C | イベント | 無光 | ジンパチが境界をくぐる。輪郭が解けかける。 | 陣営C |
| `cg/CG-30.png` | 同じ斬り方 | 9C | イベント | 雪（青） | ネオの剣。七年前と同じ軌跡。 | 陣営C |
| `cg/CG-31.png` | 泣くレニィ | 10① | イベント | 雪（青） | 初めての涙。夜明け前の青。唯一レニィが泣くCG。 | レニィルート |
| `cg/CG-32.png` | 眠りの七十二時間 | 11① | イベント | 無光 | 町の街灯が全部消えた坂。 | レニィルート |
| `cg/CG-33.png` | 初めまして | 11② | イベント | 朝日（白） | ヒュウがレニィに丁寧にお辞儀。 | ヒュウルート |
| `cg/CG-34.png` | 語り直しの夜 | 12② | イベント | 街灯（橙） | 全員がヒュウに思い出を語る。鍋の湯気の再演。 | ヒュウルート |
| `cg/CG-35.png` | ヒナタの名前 | 12③ | イベント | 街灯（橙） | 七人が輪になって声を出す。口元だけの構図。 | ジンパチルート |
| `cg/CG-36.png` | 裏返る町 | 11④ | イベント | 無光 | ムニ暴走。町が上下反転。最も情報量が多い。 | ムニルート |
| `cg/CG-37.png` | わけっこ | 13④ | イベント | 街灯（橙） | 七つの手が同じ重さを持つ。 | ムニルート |
| `cg/CG-38.png` | 配られる側 | 12⑤ | イベント | 街灯（橙） | ゲルの前に取り皿が置かれる。手だけ。 | ゲルルート |
| `cg/CG-39.png` | 古傷 | 10⑥ | イベント | 無光 | ネオの右肩。青白い光の残る傷跡。 | F16 NEO_SCAR |
| `cg/CG-40.png` | 笑う剣士 | 12⑥ | イベント | 雪（青） | 雪の中、ネオが初めて笑う。メインビジュアル候補。 | ネオルート |
| `cg/CG-41.png` | 継ぎ足された夜 | 13 | イベント | 無光 | 坂の上から順に街灯が消え、そこが開く。 | 自動 |
| `cg/CG-42.png` | 名簿の返却台帳 | 13⑤ | イベント | 街灯（橙） | 書き換えられていく頁。 | ゲルルート |
| `cg/CG-43.png` | 故郷を斬る | 13⑥ | イベント | 無光 | ネオが残骸を斬る。背後で都が崩れる。 | ネオルート |
| `cg/CG-44.png` | 形のない観測者 | 13T | イベント | 無光 | 眠るレニィの上に重なる、輪郭のない何か。 | TRUE進行 |
| `cg/CG-45.png` | あさ | END | エンディング | 朝日（白） | 初めて自分から早起きしてくるレニィ。 | HE-LEN |
| `cg/CG-46.png` | 共有記憶 | END | エンディング | 朝日（白） | 朝の食卓。ヒュウに全員が名乗る。 | HE-HYU |
| `cg/CG-47.png` | おかえり | END | エンディング | 朝日（白） | 戻ってきたヒナタと、忘れたジンパチ。 | HE-JIN |
| `cg/CG-48.png` | みんなの夜 | END | エンディング | 朝日（白） | 朝の食卓で全員があくびをしている。 | HE-MUN |
| `cg/CG-49.png` | 配られる名前 | END | エンディング | 朝日（白） | 六人がゲルの名を呼ぶ。 | HE-GER |
| `cg/CG-50.png` | 新しい記録 | END | エンディング | 朝日（白） | 名簿に書き足される滅んだ国の名。 | HE-NEO |
| `cg/CG-51.png` | 灯の消えた坂 | BAD | エンディング | 無光 | 街灯が消えた画面。人影なし。 | BE-01/04/10 いずれか |
| `cg/CG-52.png` | 名前のない部屋 | BAD | エンディング | 無光 | 鏡のない壁。書きかけの名前。 | BE-02/03/05 いずれか |
| `cg/CG-53.png` | 繰り返す十二月 | BAD | エンディング | 無光 | 同じ坂、同じ雪、同じ足跡。 | BE-06〜12 いずれか |
| `cg/CG-54.png` | 朝の坂道 | TRUE | 隠し | 朝日（白） | 人物なし。誰もいない坂を朝日が上る。全街灯が消えている。 | TE-01 |

## 2. 立ち絵

推奨サイズ **1000×2000 PNG（背景透過）**。腰から上ではなく全身で、足元は自然に消える処理を推奨。

### レニィ（`LEN`）

| ファイル名 | 表情 |
|---|---|
| `characters/len_normal.png` | normal |
| `characters/len_sleepy.png` | sleepy |
| `characters/len_smile.png` | smile |
| `characters/len_blank.png` | blank |
| `characters/len_awake.png` | awake |
| `characters/len_cry.png` | cry |

### ヒュウ（`HYU`）

| ファイル名 | 表情 |
|---|---|
| `characters/hyu_normal.png` | normal |
| `characters/hyu_smug.png` | smug |
| `characters/hyu_smile.png` | smile |
| `characters/hyu_pain.png` | pain |
| `characters/hyu_blank.png` | blank |
| `characters/hyu_eye.png` | eye |

### ジンパチ（`JIN`）

| ファイル名 | 表情 |
|---|---|
| `characters/jin_normal.png` | normal |
| `characters/jin_angry.png` | angry |
| `characters/jin_laugh.png` | laugh |
| `characters/jin_shock.png` | shock |
| `characters/jin_sad.png` | sad |
| `characters/jin_quiet.png` | quiet |

### ムニ（`MUN`）

| ファイル名 | 表情 |
|---|---|
| `characters/mun_normal.png` | normal |
| `characters/mun_smile.png` | smile |
| `characters/mun_cry.png` | cry |
| `characters/mun_scared.png` | scared |
| `characters/mun_sleep.png` | sleep |
| `characters/mun_hollow.png` | hollow |

### ゲル（`GER`）

| ファイル名 | 表情 |
|---|---|
| `characters/ger_normal.png` | normal |
| `characters/ger_quiet.png` | quiet |
| `characters/ger_pain.png` | pain |
| `characters/ger_smile.png` | smile |
| `characters/ger_turn.png` | turn |
| `characters/ger_broken.png` | broken |
| `characters/ger_shock.png` | shock |

### ネオ（`NEO`）

| ファイル名 | 表情 |
|---|---|
| `characters/neo_normal.png` | normal |
| `characters/neo_cold.png` | cold |
| `characters/neo_shock.png` | shock |
| `characters/neo_pain.png` | pain |
| `characters/neo_smile.png` | smile |
| `characters/neo_resolve.png` | resolve |

### カナメ（`KANAME`）

| ファイル名 | 表情 |
|---|---|
| `characters/kaname_normal.png` | normal |
| `characters/kaname_fade.png` | fade |

### ヒナタ（`HINATA`）

| ファイル名 | 表情 |
|---|---|
| `characters/hinata_normal.png` | normal |
| `characters/hinata_ember.png` | ember |
| `characters/hinata_cry.png` | cry |

### セン（`SEN`）

| ファイル名 | 表情 |
|---|---|
| `characters/sen_normal.png` | normal |
| `characters/sen_ember.png` | ember |

### 残骸（`REMNANT`）

| ファイル名 | 表情 |
|---|---|
| `characters/remnant_normal.png` | normal |

立ち絵の総数：**45 枚**

## 3. 背景

推奨サイズ **1920×1080 JPG**。

| ファイル名 | 場所 |
|---|---|
| `backgrounds/dorm_room.jpg` | 寮・居間 |
| `backgrounds/dorm_night.jpg` | 寮・夜 |
| `backgrounds/dorm_hall.jpg` | 寮・廊下 |
| `backgrounds/dorm_kitchen.jpg` | 寮・台所 |
| `backgrounds/slope_night.jpg` | 坂・夜 |
| `backgrounds/slope_morning.jpg` | 坂・朝 |
| `backgrounds/slope_dark.jpg` | 坂・灯が消えた |
| `backgrounds/tunnel.jpg` | トンネル |
| `backgrounds/school_class.jpg` | 教室 |
| `backgrounds/school_corridor.jpg` | 校舎廊下 |
| `backgrounds/park_snow.jpg` | 公園・雪 |
| `backgrounds/convenience.jpg` | コンビニ |
| `backgrounds/library.jpg` | 図書館 |
| `backgrounds/townhall.jpg` | 町役場 |
| `backgrounds/temple.jpg` | 寺 |
| `backgrounds/geru_room.jpg` | ゲルの部屋 |
| `backgrounds/boundary.jpg` | 境界 |
| `backgrounds/boundary_deep.jpg` | 境界の底 |
| `backgrounds/backside_ruin.jpg` | 裏側・崩れた都 |
| `backgrounds/inverted_town.jpg` | 裏返った町 |
| `backgrounds/rooftop.jpg` | 屋上 |
| `backgrounds/station.jpg` | 駅 |
| `backgrounds/shrine_steps.jpg` | 石段 |

`black` / `white` は単色のためファイル不要。

## 4. BGM

推奨形式 **OGG Vorbis（ループ点はファイル内で完結させる）**。

| ファイル名 | 用途 |
|---|---|
| `bgm/daily_winter.ogg` | 冬の日常 |
| `bgm/warm.ogg` | ストーブ |
| `bgm/unease.ogg` | 不穏 |
| `bgm/mystery.ogg` | 調査 |
| `bgm/battle.ogg` | 襲来 |
| `bgm/sorrow.ogg` | 喪失 |
| `bgm/neo_theme.ogg` | 記録されない国 |
| `bgm/boundary.ogg` | 境界 |
| `bgm/finale.ogg` | 継ぎ足された夜 |
| `bgm/morning.ogg` | 朝 |
| `bgm/title.ogg` | タイトル |

`silence` は意図的な無音のためファイル不要。

## 5. SE

| ファイル名 | 用途 |
|---|---|
| `se/streetlight_off.ogg` | 街灯が落ちる |
| `se/streetlight_on.ogg` | 街灯が点く |
| `se/door.ogg` | 扉 |
| `se/snow_step.ogg` | 雪を踏む |
| `se/sword.ogg` | 抜刀 |
| `se/glass.ogg` | 結界が割れる |
| `se/heartbeat.ogg` | 鼓動 |
| `se/page.ogg` | 頁をめくる |
| `se/clock.ogg` | 時計 |
| `se/wind.ogg` | 風 |
| `se/ui_select.ogg` | UI決定 |
| `se/ui_hover.ogg` | UIカーソル |
| `se/ui_back.ogg` | UI戻る |

## 6. ボイス

未収録。CONFIG にボイス音量のスライダだけを将来用として残してある。
収録する場合は `public/assets/voice/<シーンID>_<行番号>.ogg` を想定した拡張点を
`src/systems/audio.ts` に追加すること。

## 7. 優先順位（少ない予算で効かせる順）

1. `CG-05`（鍋の湯気）… 全ルートの喪失の単価を決める一枚
2. `CG-40`（笑う剣士）… 販促用メインビジュアル候補
3. `CG-54`（朝の坂道）… TRUE の着地
4. `CG-19`（コンビニの魔法剣士）… 軽さが後で刺さる
5. `CG-35`（ヒナタの名前）／`CG-31`（泣くレニィ）
6. 背景 `slope_night` / `dorm_room` / `tunnel`（登場回数が突出して多い）
7. 立ち絵 `normal` 表情 6 人分
8. BGM `daily_winter` / `unease` / `finale`
