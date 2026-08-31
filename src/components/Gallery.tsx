import { useState } from 'react';
import type { GameStore } from '@/systems/store';
import { CG_LIST, cgDef } from '@/data/cg';
import { cgUrl } from '@/data/assets';

/**
 * ギャラリーは一般的なCG一覧ではなく「宵ノ辻名簿」として描く（実装指示 18）。
 * 未回収は空欄の氏名欄。
 */
export function Gallery({ store }: { store: GameStore }) {
  const [open, setOpen] = useState<string | null>(null);
  const unlocked = store.persistent.cg;
  const count = CG_LIST.filter((c) => unlocked[c.id]).length;

  return (
    <div className="screen">
      <button className="screen-back" onClick={() => store.back()}>
        もどる
      </button>
      <div className="screen-inner">
        <h2>宵ノ辻名簿</h2>
        <div className="sub">この町から抜け落ちたものの記録</div>

        <div className="ledger">
          <div className="ledger-head">
            <span>記　載</span>
            <span className="count">
              {count} ／ {CG_LIST.length}
            </span>
          </div>
          {CG_LIST.map((cg, i) => {
            const has = unlocked[cg.id] === true;
            return (
              <button
                key={cg.id}
                className={`ledger-row ${has ? 'unlocked' : 'locked'}`}
                disabled={!has}
                onClick={() => has && setOpen(cg.id)}
              >
                <span className="no">{String(i + 1).padStart(3, '　')}</span>
                <span className="nm">{has ? cg.title : ''}</span>
                <span className="tag">{has ? cg.id : ''}</span>
              </button>
            );
          })}
        </div>
      </div>

      {open && <CgViewer id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function CgViewer({ id, onClose }: { id: string; onClose: () => void }) {
  const def = cgDef(id);
  const [broken, setBroken] = useState(false);
  return (
    <div className="cg-view" onClick={onClose}>
      <button className="screen-back" onClick={onClose}>
        とじる
      </button>
      {!broken ? (
        <img
          src={cgUrl(id)}
          alt={def?.title ?? id}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          onError={() => {
            console.warn(`[asset] CG画像が未提供です: ${id}`);
            setBroken(true);
          }}
        />
      ) : (
        <div className="cg-placeholder">
          <div className="id">{id}</div>
          <div className="ti">{def?.title}</div>
          <div className="desc">{def?.composition}</div>
          <div className="missing">[ IMAGE NOT YET PROVIDED ]</div>
          <div className="desc" style={{ opacity: 0.6 }}>
            public/assets/cg/{id}.png を置くと差し替わります
          </div>
        </div>
      )}
    </div>
  );
}
