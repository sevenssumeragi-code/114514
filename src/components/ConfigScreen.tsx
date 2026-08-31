import type { GameStore } from '@/systems/store';

function Range({
  label, hint, value, min, max, step, fmt, onChange,
}: {
  label: string; hint?: string; value: number; min: number; max: number; step: number;
  fmt: (v: number) => string; onChange: (v: number) => void;
}) {
  return (
    <div className="cfg-row">
      <div>
        <label>{label}</label>
        {hint && <div className="hint">{hint}</div>}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="val">{fmt(value)}</div>
    </div>
  );
}

export function ConfigScreen({ store }: { store: GameStore }) {
  const c = store.config;
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <div className="screen">
      <button className="screen-back" onClick={() => store.back()}>
        もどる
      </button>
      <div className="screen-inner">
        <h2>コンフィグ</h2>
        <div className="sub">設定はブラウザに保存されます</div>

        <h3 style={{ fontSize: 11, letterSpacing: '.24em', color: 'var(--lamp-300)', fontWeight: 400 }}>
          テキスト
        </h3>
        <Range
          label="文字送り速度" hint="100で瞬時表示"
          value={c.textSpeed} min={0} max={100} step={1}
          fmt={(v) => (v >= 100 ? '瞬時' : String(v))}
          onChange={(v) => store.setConfig({ textSpeed: v })}
        />
        <Range
          label="オート待ち時間" hint="一行読み終えてから次へ進むまで"
          value={c.autoWait} min={200} max={4000} step={100}
          fmt={(v) => `${(v / 1000).toFixed(1)}秒`}
          onChange={(v) => store.setConfig({ autoWait: v })}
        />
        <div className="cfg-row">
          <div>
            <label>スキップ対象</label>
            <div className="hint">既定は「既読のみ」。未読を飛ばすと伏線を落とします</div>
          </div>
          <div />
          <button
            className={`toggle ${c.skipUnread ? 'on' : ''}`}
            onClick={() => store.setConfig({ skipUnread: !c.skipUnread })}
          >
            {c.skipUnread ? '未読も飛ばす' : '既読のみ'}
          </button>
        </div>

        <h3 style={{ fontSize: 11, letterSpacing: '.24em', color: 'var(--lamp-300)', fontWeight: 400, marginTop: 28 }}>
          音量
        </h3>
        <Range label="マスター" value={c.masterVolume} min={0} max={1} step={0.05} fmt={pct}
          onChange={(v) => store.setConfig({ masterVolume: v })} />
        <Range label="BGM" value={c.bgmVolume} min={0} max={1} step={0.05} fmt={pct}
          onChange={(v) => store.setConfig({ bgmVolume: v })} />
        <Range label="SE" value={c.seVolume} min={0} max={1} step={0.05} fmt={pct}
          onChange={(v) => store.setConfig({ seVolume: v })} />
        <Range label="ボイス" hint="現時点では未収録（将来用）" value={c.voiceVolume} min={0} max={1} step={0.05} fmt={pct}
          onChange={(v) => store.setConfig({ voiceVolume: v })} />

        <h3 style={{ fontSize: 11, letterSpacing: '.24em', color: 'var(--lamp-300)', fontWeight: 400, marginTop: 28 }}>
          表示
        </h3>
        <div className="cfg-row">
          <div>
            <label>演出を控えめに</label>
            <div className="hint">画面の揺れ・点滅を弱めます</div>
          </div>
          <div />
          <button
            className={`toggle ${c.effectsReduced ? 'on' : ''}`}
            onClick={() => store.setConfig({ effectsReduced: !c.effectsReduced })}
          >
            {c.effectsReduced ? 'ひかえめ' : '通常'}
          </button>
        </div>

        <div style={{ marginTop: 34, fontSize: 11, color: 'var(--text-dim)', lineHeight: 2 }}>
          <div>キーボード：Space / Enter＝進む　Ctrl＝スキップ　A＝オート　L＝バックログ</div>
          <div>　　　　　　　S＝セーブ　O＝ロード　H＝ウィンドウ非表示　Esc＝もどる</div>
        </div>
      </div>
    </div>
  );
}
