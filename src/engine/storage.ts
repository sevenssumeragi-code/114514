/**
 * 保存層。localStorage を第一候補とし、使えない環境（プライベートウィンドウ、
 * テスト、SSR）ではメモリへフォールバックする。呼び出し側は失敗を意識しない。
 */

const memory = new Map<string, string>();

function ls(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = '__nw_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

export const storage = {
  get(key: string): string | null {
    const s = ls();
    if (s) {
      try {
        return s.getItem(key);
      } catch {
        /* fallthrough */
      }
    }
    return memory.has(key) ? (memory.get(key) as string) : null;
  },
  set(key: string, value: string): void {
    const s = ls();
    if (s) {
      try {
        s.setItem(key, value);
        return;
      } catch {
        /* fallthrough: 容量超過など */
      }
    }
    memory.set(key, value);
  },
  remove(key: string): void {
    const s = ls();
    if (s) {
      try {
        s.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    memory.delete(key);
  },
  keys(): string[] {
    const s = ls();
    const out = new Set<string>(memory.keys());
    if (s) {
      try {
        for (let i = 0; i < s.length; i++) {
          const k = s.key(i);
          if (k) out.add(k);
        }
      } catch {
        /* ignore */
      }
    }
    return [...out];
  },
  getJSON<T>(key: string, fallback: T): T {
    const raw = this.get(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  setJSON(key: string, value: unknown): void {
    this.set(key, JSON.stringify(value));
  },
};
