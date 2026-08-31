import type { MajorFlag } from '@/engine/types';

export interface FlagDef {
  code: string; // 'F01'
  id: MajorFlag | string;
  label: string;
  where: string;
  effect: string;
  /** 周回横断の判定に使うか（F20 の材料）。 */
  seam?: boolean;
}

/**
 * フラグ台帳。設計書 2-3 に一致させる。
 * validator は「ここに無いフラグをシナリオが参照していないか」を検査する。
 */
export const FLAG_LEDGER: FlagDef[] = [
  { code: 'F01', id: 'TUNNEL_SHADOW', label: 'トンネルの影', where: '第一夜', effect: 'CG-03解放／第四夜で先制情報' },
  { code: 'F02', id: 'NABE_MEMORY', label: '鍋の記憶', where: '第二夜', effect: '全好感度+3／CG-05／第十二夜の回想解放' },
  { code: 'F03', id: 'KANAME_NAME', label: 'カナメの名', where: '第二夜', effect: 'JIN+10／F14の前提' },
  { code: 'F04', id: 'EYE_WITNESS', label: '魔眼の立会', where: '第三夜', effect: 'MEM-10／HYU+8／BE-03の起点' },
  { code: 'F05', id: 'LENNY_ROAR', label: '名前を呼ぶ', where: '第四夜', effect: 'LEN+15／RES+10／CG-14' },
  { code: 'F06', id: 'NEO_NOODLE', label: 'コンビニの剣士', where: '第五夜', effect: 'NEO+15／CG-19／ネオルート事実上必須' },
  { code: 'F07', id: 'LEDGER_PEEK', label: '名簿を見る', where: '第五夜', effect: '見る:GER-5・F15前提／見ない:GER+10' },
  { code: 'F08', id: 'MUNI_PROMISE', label: 'ムニとの約束', where: '第五夜', effect: 'MUN+20／RES+15／CG-17' },
  { code: 'F09a', id: 'SIDE_GUARD', label: '陣営A・守る', where: '第六夜', effect: '陣営確定' },
  { code: 'F09b', id: 'SIDE_TRUTH', label: '陣営B・暴く', where: '第六夜', effect: '陣営確定' },
  { code: 'F09c', id: 'SIDE_BREAK', label: '陣営C・壊す', where: '第六夜', effect: '陣営確定' },
  { code: 'F10', id: 'HYU_HAND', label: 'ヒュウの手', where: '第六夜', effect: 'HYU+15／CG-21' },
  { code: 'F11', id: 'SEVEN_YEARS', label: '七年前の縮刷版', where: '第七夜', effect: '第九夜の反転が早く理解できる' },
  { code: 'F12', id: 'GERU_TRUST', label: '殴らずに聞く', where: '第八夜B', effect: 'GER+25／BE-05回避' },
  { code: 'F13', id: 'JIN_HOLD', label: '抱き止める', where: '第八夜C', effect: 'JIN+25／BE-09回避' },
  { code: 'F14', id: 'HINATA_NAME', label: 'ヒナタの名', where: '第九夜', effect: 'ジンパチHAPPY必須', seam: true },
  { code: 'F15', id: 'LEDGER_SEN', label: 'センを尋ねる', where: '第九夜', effect: 'ゲルHAPPY必須', seam: true },
  { code: 'F16', id: 'NEO_SCAR', label: '古傷', where: '第九夜', effect: 'ネオHAPPY必須／七年前の回収', seam: true },
  { code: 'F17', id: 'HYU_STORY', label: '思い出を語る', where: '第十〜十二夜', effect: 'ヒュウHAPPY必須', seam: true },
  { code: 'F18', id: 'MUNI_SHARE', label: 'わけっこ', where: '第十一夜', effect: 'ムニHAPPY必須', seam: true },
  { code: 'F19', id: 'LENNY_WAKE', label: '起きて', where: '第十二夜', effect: 'レニィHAPPY必須', seam: true },
  { code: 'F20', id: 'SEAM_STITCH', label: '継ぎ目を縫う', where: '周回横断', effect: 'TRUEルート開放（F14〜F19を別周回で3種以上）' },
  { code: 'F21', id: 'OBSERVER', label: '立会人', where: '第十三夜', effect: 'TRUE END確定（OBS≧300＋「見るのをやめる」）' },
  { code: 'F99', id: 'NOX_OVER', label: '夜度超過', where: '自動', effect: 'NOX≧80でBE-07／BE-12へ強制' },

  /* --- 以下は本文中の小分岐（設計書「小分岐21種」に相当する実装フラグ） --- */
  { code: 'S01', id: 'N1_SLEPT', label: '第一夜に眠る', where: '第一夜', effect: '青い水底の夢（伏線②）' },
  { code: 'S02', id: 'N1_ASKED_GERU', label: 'ゲルに尋ねた', where: '第一夜', effect: 'GER+5' },
  { code: 'S03', id: 'N2_SEVEN_ROOMS', label: '七つ目の部屋', where: '第一夜', effect: '伏線⑳' },
  { code: 'S04', id: 'N3_TAIYAKI', label: 'たい焼きの記憶', where: '第三夜', effect: 'HYU+5／第十二夜の語り直しに使える' },
  { code: 'S05', id: 'N4_STOPPED', label: 'レニィを止めた', where: '第四夜', effect: 'RES上昇を抑える' },
  { code: 'S06', id: 'N5_LEDGER_SKIP', label: '名簿を見なかった', where: '第五夜', effect: 'GER+10' },
  { code: 'S07', id: 'N6_HELD_HAND', label: '手を取らなかった', where: '第六夜', effect: 'HYU据え置き' },
  { code: 'S08', id: 'A7_BARRIER', label: '結界の中の日常', where: '第七夜A', effect: 'RES上昇' },
  { code: 'S09', id: 'A8_CHASE', label: 'ムニを追う', where: '第八夜A', effect: 'BE-04回避' },
  { code: 'S10', id: 'B7_CARDS', label: '名前カードの束', where: '第七夜B', effect: 'CG-26／HYU+10' },
  { code: 'S11', id: 'B8_PUNCH', label: 'ゲルを殴った', where: '第八夜B', effect: 'GER-15' },
  { code: 'S12', id: 'C7_TIE_HAIR', label: '金髪を結ぶ', where: '第七夜C', effect: 'CG-27／NEO+10' },
  { code: 'S13', id: 'C8_CROSSED', label: '境界を越えた', where: '第八夜C', effect: 'ジンパチ肉体崩壊の起点' },
  { code: 'S14', id: 'HYU_STORY_1', label: '思い出①', where: '個別', effect: 'F17の材料' },
  { code: 'S15', id: 'HYU_STORY_2', label: '思い出②', where: '個別', effect: 'F17の材料' },
  { code: 'S16', id: 'HYU_STORY_3', label: '思い出③', where: '個別', effect: 'F17の材料' },
  { code: 'S17', id: 'NEO_BETRAY_FORGIVE', label: '責めない', where: '第十二夜⑥', effect: 'NEO+20／CG-40' },
  { code: 'S18', id: 'GERU_BURN_STOP', label: '名簿を燃やさせない', where: '第十一夜⑤', effect: 'BE-05回避' },
  { code: 'S19', id: 'JIN_FORGET_ACCEPT', label: '忘れることを選ぶ', where: '第十一夜③', effect: 'F14の前提' },
  { code: 'S20', id: 'MUNI_REFUSE_MERGE', label: '統合を拒む', where: '第十一夜④', effect: 'BE-10回避' },
  { code: 'S21', id: 'TRUE_SEEN', label: '観測者を見た', where: '第十三夜', effect: 'TRUE選択肢の前提' },
  { code: 'S22', id: 'LEDGER_RETURN_ALL', label: '全件返却', where: '第十三夜⑤', effect: 'BE-08へ' },
  { code: 'S23', id: 'NEO_NO_CUT', label: '斬らせない', where: '第十三夜⑥', effect: 'BE-06へ' },
];

export const FLAG_IDS = new Set(FLAG_LEDGER.map((f) => f.id));

export function flagDef(id: string): FlagDef | undefined {
  return FLAG_LEDGER.find((f) => f.id === id);
}
