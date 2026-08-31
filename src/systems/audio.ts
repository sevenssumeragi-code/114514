import { BGM, SE, bgmUrl, seUrl } from '@/data/assets';
import type { GameConfig } from '@/engine/save';

/**
 * 音響。素材が無ければ無音へフォールバックし、コンソールに一度だけ警告を出す。
 * ボイスは未実装だが、設定値だけ将来のために保持する。
 */
class AudioSystem {
  private ctxBgm: HTMLAudioElement | null = null;
  private currentBgm: string | null = null;
  private missing = new Set<string>();
  private cfg: GameConfig | null = null;
  private fadeTimer: number | null = null;

  setConfig(cfg: GameConfig): void {
    this.cfg = cfg;
    this.applyVolume();
  }

  private vol(kind: 'bgm' | 'se'): number {
    if (!this.cfg) return 0.6;
    const m = this.cfg.masterVolume;
    return m * (kind === 'bgm' ? this.cfg.bgmVolume : this.cfg.seVolume);
  }

  private applyVolume(): void {
    if (this.ctxBgm) this.ctxBgm.volume = this.vol('bgm');
  }

  private warnMissing(id: string, kind: string): void {
    if (this.missing.has(id)) return;
    this.missing.add(id);
    console.warn(`[audio] ${kind} "${id}" の音源が見つかりません。無音で継続します。`);
  }

  playBgm(id: string | null): void {
    if (id === this.currentBgm) return;
    this.currentBgm = id;
    this.stopBgm();
    if (!id) return;
    const def = BGM[id];
    if (!def) {
      this.warnMissing(id, 'BGM');
      return;
    }
    const url = bgmUrl(def);
    if (!url) return; // silence entry（意図的な無音）
    try {
      const el = new Audio(url);
      el.loop = def.loop;
      el.volume = 0;
      el.addEventListener('error', () => this.warnMissing(id, 'BGM'));
      void el.play().catch(() => {
        /* 自動再生ブロックは無視（ユーザー操作後に再試行される） */
      });
      this.ctxBgm = el;
      this.fadeTo(this.vol('bgm'), 800);
    } catch {
      this.warnMissing(id, 'BGM');
    }
  }

  private fadeTo(target: number, ms: number): void {
    if (!this.ctxBgm) return;
    const el = this.ctxBgm;
    const start = el.volume;
    const t0 = performance.now();
    if (this.fadeTimer !== null) cancelAnimationFrame(this.fadeTimer);
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      el.volume = start + (target - start) * k;
      if (k < 1) this.fadeTimer = requestAnimationFrame(tick);
    };
    this.fadeTimer = requestAnimationFrame(tick);
  }

  stopBgm(): void {
    if (this.ctxBgm) {
      try {
        this.ctxBgm.pause();
      } catch {
        /* ignore */
      }
      this.ctxBgm = null;
    }
  }

  playSe(id: string): void {
    const def = SE[id];
    if (!def) {
      this.warnMissing(id, 'SE');
      return;
    }
    const url = seUrl(def);
    if (!url) return;
    try {
      const el = new Audio(url);
      el.volume = this.vol('se');
      el.addEventListener('error', () => this.warnMissing(id, 'SE'));
      void el.play().catch(() => {
        /* ignore */
      });
    } catch {
      this.warnMissing(id, 'SE');
    }
  }

  ui(id: 'ui_select' | 'ui_hover' | 'ui_back'): void {
    this.playSe(id);
  }
}

export const audio = new AudioSystem();
