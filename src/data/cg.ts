export interface CgDef {
  id: string; // 'CG-19'
  title: string;
  night: string; // '5' | '8A' | '10⑥' | 'END'
  composition: string;
  unlock: string;
  /** ギャラリー（宵ノ辻名簿）での並び順グループ。 */
  group: 'event' | 'ending' | 'hidden';
  /** 光源。設計書 9 の統一指示。 */
  light: 'lamp' | 'snow' | 'morning' | 'none';
}

/**
 * CG-01〜CG-54。素材が無くてもゲームは進行する（プレースホルダ表示）。
 * ギャラリーは一般的なCG一覧ではなく「宵ノ辻名簿」として描画する。
 */
export const CG_LIST: CgDef[] = [
  { id: 'CG-01', title: '寮の朝', night: '1', composition: '俯瞰。こたつで寝るレニィ。暖色。', unlock: '自動', group: 'event', light: 'lamp' },
  { id: 'CG-02', title: '坂の街灯', night: '1', composition: '等間隔の街灯。坂の上から下へ。', unlock: '自動', group: 'event', light: 'lamp' },
  { id: 'CG-03', title: 'トンネルの金', night: '1', composition: '逆光、シルエットのみ。顔を見せない。', unlock: 'F01 TUNNEL_SHADOW', group: 'event', light: 'none' },
  { id: 'CG-04', title: '青い水底', night: '1', composition: 'レニィの夢。沈む光。', unlock: '第一夜「寝る」', group: 'event', light: 'none' },
  { id: 'CG-05', title: '鍋の湯気', night: '2', composition: '七人。湯気で輪郭が柔らかい。最も温かいCG。', unlock: 'F02 NABE_MEMORY', group: 'event', light: 'lamp' },
  { id: 'CG-06', title: '空いた席', night: '2', composition: '教室。誰も座っていない机ひとつ。', unlock: '自動', group: 'event', light: 'morning' },
  { id: 'CG-07', title: '七年分の手帳', night: '2', composition: 'ジンパチの手帳。知らない名前の列。', unlock: '自動', group: 'event', light: 'lamp' },
  { id: 'CG-08', title: '赤い左目', night: '3', composition: 'ヒュウの前髪が上がる瞬間。虹彩に縫い目。', unlock: '自動', group: 'event', light: 'lamp' },
  { id: 'CG-09', title: 'たい焼き', night: '3', composition: '湯気とあんことクリーム。ムニが両方持つ。', unlock: 'S04 N3_TAIYAKI', group: 'event', light: 'lamp' },
  { id: 'CG-10', title: '十回の署名', night: '3', composition: '鏡の前。紙に自分の名前が十個。', unlock: '自動', group: 'event', light: 'none' },
  { id: 'CG-11', title: '剣士の降臨', night: '4', composition: 'ネオ全身。雪。マント。俯瞰でムニを見下ろす。', unlock: '自動', group: 'event', light: 'snow' },
  { id: 'CG-12', title: '砕ける結界', night: '4', composition: 'ゲルの結界が割れる。紫の破片。', unlock: '自動', group: 'event', light: 'none' },
  { id: 'CG-13', title: '効かない拳', night: '4', composition: 'ジンパチの拳がネオの魔術をすり抜ける。', unlock: '自動', group: 'event', light: 'snow' },
  { id: 'CG-14', title: '開いた青', night: '4', composition: 'レニィの目のアップ。瞳孔が縦。街灯の光が集まる。', unlock: '自動', group: 'event', light: 'lamp' },
  { id: 'CG-15', title: '斬ったはずだ', night: '4', composition: 'ネオの後退。剣の切っ先が震える。', unlock: '自動', group: 'event', light: 'snow' },
  { id: 'CG-16', title: '五歳の誕生日', night: '5', composition: '七人＋窓の外のネオ。必ずネオを画面端に小さく。', unlock: '自動', group: 'event', light: 'lamp' },
  { id: 'CG-17', title: '指切り', night: '5', composition: 'ムニとレニィの小指のみのアップ。', unlock: 'F08 MUNI_PROMISE', group: 'event', light: 'lamp' },
  { id: 'CG-18', title: '名簿の頁', night: '5', composition: '古い帳面。びっしりと名前。最後の行に「セン」。', unlock: 'F07 LEDGER_PEEK', group: 'event', light: 'lamp' },
  { id: 'CG-19', title: 'コンビニの魔法剣士', night: '5', composition: 'ネオがカップ麺を凝視。蛍光灯。ギャグ調。', unlock: 'F06 NEO_NOODLE', group: 'event', light: 'none' },
  { id: 'CG-20', title: 'ごめんね', night: '5', composition: '眠るレニィの枕元、ムニの後ろ姿。', unlock: '自動', group: 'event', light: 'lamp' },
  { id: 'CG-21', title: '割れた朝', night: '6', composition: 'ヒュウが倒れる。ムニを見る目に光がない。', unlock: 'F10 HYU_HAND', group: 'event', light: 'morning' },
  { id: 'CG-22', title: '私が、そうした', night: '6', composition: 'ゲルの告白。俯いた顔に影。', unlock: '自動', group: 'event', light: 'none' },
  { id: 'CG-23', title: '窓の外の剣士', night: '6', composition: '三択のあと、窓越しに立つネオ。', unlock: '自動', group: 'event', light: 'snow' },
  { id: 'CG-24', title: 'ひらがなの手紙', night: '8A', composition: '手紙のみのアップ。子どもの字。文字を実際に読ませる。', unlock: '陣営A', group: 'event', light: 'lamp' },
  { id: 'CG-25', title: '結界の日常', night: '7A', composition: '寮の中。四角く切り取られた安全。', unlock: '陣営A', group: 'event', light: 'lamp' },
  { id: 'CG-26', title: '名前カード', night: '7B', composition: 'ジンパチが作った不格好なカードの束。', unlock: '陣営B', group: 'event', light: 'lamp' },
  { id: 'CG-27', title: '金髪を結ぶ', night: '7C', composition: 'ジンパチがネオの髪を後ろで縛る。ネオ不機嫌。', unlock: '陣営C', group: 'event', light: 'lamp' },
  { id: 'CG-28', title: '「どなたでしたか」', night: '9B', composition: 'ヒュウがゲルを見る。ゲルの表情が崩れる。', unlock: '陣営B', group: 'event', light: 'none' },
  { id: 'CG-29', title: '越境', night: '8C', composition: 'ジンパチが境界をくぐる。輪郭が解けかける。', unlock: '陣営C', group: 'event', light: 'none' },
  { id: 'CG-30', title: '同じ斬り方', night: '9C', composition: 'ネオの剣。七年前と同じ軌跡。', unlock: '陣営C', group: 'event', light: 'snow' },
  { id: 'CG-31', title: '泣くレニィ', night: '10①', composition: '初めての涙。夜明け前の青。唯一レニィが泣くCG。', unlock: 'レニィルート', group: 'event', light: 'snow' },
  { id: 'CG-32', title: '眠りの七十二時間', night: '11①', composition: '町の街灯が全部消えた坂。', unlock: 'レニィルート', group: 'event', light: 'none' },
  { id: 'CG-33', title: '初めまして', night: '11②', composition: 'ヒュウがレニィに丁寧にお辞儀。', unlock: 'ヒュウルート', group: 'event', light: 'morning' },
  { id: 'CG-34', title: '語り直しの夜', night: '12②', composition: '全員がヒュウに思い出を語る。鍋の湯気の再演。', unlock: 'ヒュウルート', group: 'event', light: 'lamp' },
  { id: 'CG-35', title: 'ヒナタの名前', night: '12③', composition: '七人が輪になって声を出す。口元だけの構図。', unlock: 'ジンパチルート', group: 'event', light: 'lamp' },
  { id: 'CG-36', title: '裏返る町', night: '11④', composition: 'ムニ暴走。町が上下反転。最も情報量が多い。', unlock: 'ムニルート', group: 'event', light: 'none' },
  { id: 'CG-37', title: 'わけっこ', night: '13④', composition: '七つの手が同じ重さを持つ。', unlock: 'ムニルート', group: 'event', light: 'lamp' },
  { id: 'CG-38', title: '配られる側', night: '12⑤', composition: 'ゲルの前に取り皿が置かれる。手だけ。', unlock: 'ゲルルート', group: 'event', light: 'lamp' },
  { id: 'CG-39', title: '古傷', night: '10⑥', composition: 'ネオの右肩。青白い光の残る傷跡。', unlock: 'F16 NEO_SCAR', group: 'event', light: 'none' },
  { id: 'CG-40', title: '笑う剣士', night: '12⑥', composition: '雪の中、ネオが初めて笑う。メインビジュアル候補。', unlock: 'ネオルート', group: 'event', light: 'snow' },
  { id: 'CG-41', title: '継ぎ足された夜', night: '13', composition: '坂の上から順に街灯が消え、そこが開く。', unlock: '自動', group: 'event', light: 'none' },
  { id: 'CG-42', title: '名簿の返却台帳', night: '13⑤', composition: '書き換えられていく頁。', unlock: 'ゲルルート', group: 'event', light: 'lamp' },
  { id: 'CG-43', title: '故郷を斬る', night: '13⑥', composition: 'ネオが残骸を斬る。背後で都が崩れる。', unlock: 'ネオルート', group: 'event', light: 'none' },
  { id: 'CG-44', title: '形のない観測者', night: '13T', composition: '眠るレニィの上に重なる、輪郭のない何か。', unlock: 'TRUE進行', group: 'event', light: 'none' },
  { id: 'CG-45', title: 'あさ', night: 'END', composition: '初めて自分から早起きしてくるレニィ。', unlock: 'HE-LEN', group: 'ending', light: 'morning' },
  { id: 'CG-46', title: '共有記憶', night: 'END', composition: '朝の食卓。ヒュウに全員が名乗る。', unlock: 'HE-HYU', group: 'ending', light: 'morning' },
  { id: 'CG-47', title: 'おかえり', night: 'END', composition: '戻ってきたヒナタと、忘れたジンパチ。', unlock: 'HE-JIN', group: 'ending', light: 'morning' },
  { id: 'CG-48', title: 'みんなの夜', night: 'END', composition: '朝の食卓で全員があくびをしている。', unlock: 'HE-MUN', group: 'ending', light: 'morning' },
  { id: 'CG-49', title: '配られる名前', night: 'END', composition: '六人がゲルの名を呼ぶ。', unlock: 'HE-GER', group: 'ending', light: 'morning' },
  { id: 'CG-50', title: '新しい記録', night: 'END', composition: '名簿に書き足される滅んだ国の名。', unlock: 'HE-NEO', group: 'ending', light: 'morning' },
  { id: 'CG-51', title: '灯の消えた坂', night: 'BAD', composition: '街灯が消えた画面。人影なし。', unlock: 'BE-01/04/10 いずれか', group: 'ending', light: 'none' },
  { id: 'CG-52', title: '名前のない部屋', night: 'BAD', composition: '鏡のない壁。書きかけの名前。', unlock: 'BE-02/03/05 いずれか', group: 'ending', light: 'none' },
  { id: 'CG-53', title: '繰り返す十二月', night: 'BAD', composition: '同じ坂、同じ雪、同じ足跡。', unlock: 'BE-06〜12 いずれか', group: 'ending', light: 'none' },
  { id: 'CG-54', title: '朝の坂道', night: 'TRUE', composition: '人物なし。誰もいない坂を朝日が上る。全街灯が消えている。', unlock: 'TE-01', group: 'hidden', light: 'morning' },
];

export const CG_IDS = new Set(CG_LIST.map((c) => c.id));

export function cgDef(id: string): CgDef | undefined {
  return CG_LIST.find((c) => c.id === id);
}
