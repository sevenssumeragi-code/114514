import { describe, it, expect } from 'vitest';
import { ALL_SCENES } from '@/scenario/index';
import type { CmdDialogue, SpeakerId } from '@/engine/types';
import { CHARACTERS } from '@/data/characters';
import { FLAG_LEDGER } from '@/data/flags';
import { CG_LIST } from '@/data/cg';
import { ENDINGS } from '@/data/endings';

interface Line {
  scene: string;
  speaker: SpeakerId;
  text: string;
}

const LINES: Line[] = [];
for (const s of ALL_SCENES) {
  for (const c of s.commands) {
    if (c.type === 'dialogue') {
      const d = c as CmdDialogue;
      LINES.push({ scene: s.id, speaker: d.speaker, text: d.text });
      for (const v of d.memVariants ?? [])
        LINES.push({ scene: s.id, speaker: d.speaker, text: v.text });
    }
  }
}

function linesOf(id: SpeakerId): Line[] {
  return LINES.filter((l) => l.speaker === id);
}

function violations(id: SpeakerId, re: RegExp): string[] {
  return linesOf(id)
    .filter((l) => re.test(l.text))
    .map((l) => `${l.scene}: ${l.text}`);
}

describe('口調の絶対遵守表（設計書 10-1）', () => {
  it('レニィの一人称は「僕」のみ', () => {
    expect(violations('LEN', /(?:^|[^十])私(?![たち])|俺|わたくし/)).toEqual([]);
    expect(linesOf('LEN').some((l) => l.text.includes('僕'))).toBe(true);
  });

  it('ヒュウの一人称は「わたくし」。「私」「僕」「俺」を使わない', () => {
    const bad = linesOf('HYU').filter(
      (l) => /僕|俺/.test(l.text) || /(?<!わたく)私/.test(l.text),
    );
    expect(bad.map((l) => `${l.scene}: ${l.text}`)).toEqual([]);
    expect(linesOf('HYU').some((l) => l.text.includes('わたくし'))).toBe(true);
  });

  it('ジンパチの一人称は「俺」', () => {
    expect(violations('JIN', /わたくし|僕(?!、)/)).toEqual([]);
    expect(linesOf('JIN').some((l) => l.text.includes('俺'))).toBe(true);
  });

  it('ゲルの一人称は「私」。「貴様」は一人称でも二人称でも厳禁', () => {
    expect(violations('GER', /貴様/)).toEqual([]);
    expect(violations('GER', /僕|俺|わたくし/)).toEqual([]);
    expect(linesOf('GER').some((l) => l.text.includes('私'))).toBe(true);
  });

  it('ネオの一人称は「私」、二人称は「貴様」。「俺」にしない', () => {
    expect(violations('NEO', /俺|僕|わたくし/)).toEqual([]);
    expect(linesOf('NEO').some((l) => l.text.includes('貴様'))).toBe(true);
    expect(linesOf('NEO').some((l) => l.text.includes('私'))).toBe(true);
  });

  it('ムニは自称「ムニ」。一人称代名詞を使わない', () => {
    expect(violations('MUN', /私|僕|俺|わたくし/)).toEqual([]);
    expect(linesOf('MUN').some((l) => l.text.includes('ムニ'))).toBe(true);
  });

  it('ムニは五歳の語彙で話す（難語を使わない）', () => {
    const hard = /契約|境界|統合|観測|代償|術式|再起動|存在|概念|論理|事象|不可逆/;
    expect(violations('MUN', hard)).toEqual([]);
  });

  it('ヒュウは常に敬語（タメ口の断定で終わらない）', () => {
    // 「〜だ。」「〜だぞ」等の非敬語断定を弾く（「〜のだ」等の引用は除く）
    const casual = /[^ずのん]だ$|だぜ|だろ$|かよ$|じゃねぇ/;
    expect(violations('HYU', casual)).toEqual([]);
  });
});

describe('台帳の整合', () => {
  it('フラグ台帳にIDの重複がない', () => {
    const ids = FLAG_LEDGER.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('F01〜F21・F99 がすべて台帳にある', () => {
    const codes = new Set(FLAG_LEDGER.map((f) => f.code));
    for (let i = 1; i <= 21; i++) {
      const c = `F${String(i).padStart(2, '0')}`;
      const present = codes.has(c) || [...codes].some((k) => k.startsWith(c));
      expect(present, `${c} が台帳にない`).toBe(true);
    }
    expect(codes.has('F99')).toBe(true);
  });

  it('CG は CG-01 から CG-54 まで 54 枚', () => {
    expect(CG_LIST).toHaveLength(54);
    for (let i = 1; i <= 54; i++) {
      const id = `CG-${String(i).padStart(2, '0')}`;
      expect(CG_LIST.some((c) => c.id === id), `${id} が無い`).toBe(true);
    }
  });

  it('END は HAPPY6 / NORMAL3 / BAD12 / TRUE1 の 22 種', () => {
    const by = (k: string) => ENDINGS.filter((e) => e.kind === k).length;
    expect(by('HAPPY')).toBe(6);
    expect(by('NORMAL')).toBe(3);
    expect(by('BAD')).toBe(12);
    expect(by('TRUE')).toBe(1);
    expect(ENDINGS).toHaveLength(22);
  });

  it('好感度対象は6人', () => {
    expect(Object.values(CHARACTERS).filter((c) => c.affectionTarget)).toHaveLength(6);
  });
});

describe('本文の作法（設計書 10-2）', () => {
  it('全13夜＋終夜のうち、第一〜十三夜の章宣言が存在する', () => {
    const nights = new Set<number>();
    for (const s of ALL_SCENES)
      for (const c of s.commands) if (c.type === 'chapter') nights.add(c.night);
    for (let i = 1; i <= 13; i++) expect(nights.has(i), `第${i}夜が無い`).toBe(true);
  });

  it('章の冒頭に情景描写がある（chapter 直後に地の文が続く）', () => {
    for (const s of ALL_SCENES) {
      const idx = s.commands.findIndex((c) => c.type === 'chapter');
      if (idx < 0) continue;
      const after = s.commands.slice(idx + 1, idx + 12);
      const narrations = after.filter((c) => c.type === 'narration').length;
      expect(narrations, `${s.id} の章冒頭に地の文が足りない`).toBeGreaterThanOrEqual(3);
    }
  });

  it('選択肢はモバイル基準で同時4つまで', () => {
    for (const s of ALL_SCENES)
      for (const c of s.commands)
        if (c.type === 'choice')
          expect(c.options.length, `${s.id} の選択肢が多すぎる`).toBeLessThanOrEqual(4);
  });

  it('地の文と会話の比率がおおむね 6:4（会話に偏りすぎない）', () => {
    let nar = 0;
    let dia = 0;
    for (const s of ALL_SCENES)
      for (const c of s.commands) {
        if (c.type === 'narration') nar += c.text.length;
        if (c.type === 'dialogue') dia += c.text.length;
      }
    const ratio = nar / (nar + dia);
    expect(ratio).toBeGreaterThan(0.5);
  });
});
