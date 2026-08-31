import { useState } from 'react';
import type { GameStore } from '@/systems/store';
import { SCENES } from '@/scenario/index';
import { CHAR_IDS, SEAM_SOURCE_FLAGS, evaluateSeamStitch } from '@/engine/state';
import { decideRoute } from '@/engine/routing';
import { FLAG_LEDGER } from '@/data/flags';

/**
 * 開発用 Route Debugger。import.meta.env.DEV のときだけ App から描画される。
 * 本番ビルドには出さない。
 */
export function DebugPanel({ store }: { store: GameStore }) {
  const state = store.debugState();
  const [target, setTarget] = useState('n1_open');
  const sceneIds = Object.keys(SCENES);

  const seam = state
    ? evaluateSeamStitch(
        store.persistent.loopRecords,
        SEAM_SOURCE_FLAGS.filter((f) => state.flags[f] === true),
        state.loop,
      )
    : null;

  return (
    <div className="debug-panel">
      <h3>ROUTE DEBUGGER</h3>
      <div className="dbg-warn">開発ビルド専用。本番には出力されません。</div>

      <h3>現在地</h3>
      {state ? (
        <>
          <div className="debug-row"><span className="k">scene</span><span>{state.sceneId}:{state.pc}</span></div>
          <div className="debug-row"><span className="k">night</span><span>{state.night} {state.chapterTitle}</span></div>
          <div className="debug-row"><span className="k">faction</span><span>{state.faction ?? '—'}</span></div>
          <div className="debug-row"><span className="k">route</span><span>{state.route ?? '—'}</span></div>
          <div className="debug-row"><span className="k">loop</span><span>{state.loop}</span></div>
          <div className="debug-row"><span className="k">判定ルート</span><span>{decideRoute(state).route ?? 'NE-1'}</span></div>
          <div className="debug-row"><span className="k">判定根拠</span><span style={{ fontSize: 10 }}>{decideRoute(state).reason}</span></div>
        </>
      ) : (
        <div className="dbg-warn">ゲーム未開始</div>
      )}

      <h3>パラメータ</h3>
      {state &&
        [...CHAR_IDS, 'RES', 'NOX', 'MEM', 'OBS'].map((k) => (
          <div className="debug-row" key={k}>
            <span className="k">{k}</span>
            <span>
              <input
                type="text"
                style={{ width: 54, display: 'inline-block', padding: 2 }}
                value={String(state.params[k as keyof typeof state.params])}
                onChange={(e) => store.debugSetParam(k, Number(e.target.value) || 0)}
              />
            </span>
          </div>
        ))}

      <h3>F20 / SEAM_STITCH</h3>
      {seam && (
        <>
          <div className="debug-row"><span className="k">達成種類</span><span>{seam.achieved.length} / 3</span></div>
          <div className="debug-row"><span className="k">成立</span><span>{seam.satisfied ? 'YES' : 'no'}</span></div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.8 }}>
            {SEAM_SOURCE_FLAGS.map((f) => (
              <div key={f}>
                {f}: {(seam.byFlag[f] ?? []).join(',') || '—'}
              </div>
            ))}
          </div>
        </>
      )}

      <h3>周回記録</h3>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.8 }}>
        <div>persistent.obs = {store.persistent.obs}</div>
        <div>loopCount = {store.persistent.loopCount}</div>
        {store.persistent.loopRecords.map((r) => (
          <div key={r.loop}>
            L{r.loop}: {r.endingId} [{r.achievements.join(',')}]
          </div>
        ))}
      </div>

      <h3>フラグ（{state ? Object.keys(state.flags).length : 0}）</h3>
      <div className="debug-flags">
        {state && Object.keys(state.flags).map((f) => <span key={f}>{f}</span>)}
      </div>

      <h3>フラグ操作</h3>
      <select
        onChange={(e) => {
          if (!e.target.value) return;
          store.debugSetFlag(e.target.value, !(state?.flags[e.target.value]));
          e.target.value = '';
        }}
      >
        <option value="">— toggle —</option>
        {FLAG_LEDGER.map((f) => (
          <option key={f.id} value={f.id}>
            {f.code} {f.id}
          </option>
        ))}
      </select>

      <h3>シーンジャンプ（{sceneIds.length}）</h3>
      <select value={target} onChange={(e) => setTarget(e.target.value)}>
        {sceneIds.map((id) => (
          <option key={id} value={id}>{id}</option>
        ))}
      </select>
      <button
        className="ctrl-btn"
        style={{ width: '100%', marginTop: 6 }}
        onClick={() => store.debugJump(target)}
      >
        JUMP
      </button>

      <button
        className="ctrl-btn"
        style={{ width: '100%', marginTop: 16 }}
        onClick={() => store.toggleDebug()}
      >
        CLOSE (F9)
      </button>
    </div>
  );
}
