import type { GameStore } from '@/systems/store';
import { BACKGROUNDS } from '@/data/assets';
import { AUTO_SLOTS, MANUAL_SLOTS, QUICK_SLOT, type SaveSlot } from '@/engine/save';

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}時間${String(m).padStart(2, '0')}分`;
}

function fmtDate(ts: number): string {
  const d = new Date(ts);
  const p = (v: number) => String(v).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const ROUTE_JA: Record<string, string> = {
  lenny: 'レニィ', hugh: 'ヒュウ', jinpachi: 'ジンパチ',
  muni: 'ムニ', geru: 'ゲル', neo: 'ネオ',
};
const FACTION_JA: Record<string, string> = { A: '守る', B: '暴く', C: '壊す' };

function Slot({
  id,
  slot,
  mode,
  store,
}: {
  id: string;
  slot: SaveSlot | null;
  mode: 'save' | 'load';
  store: GameStore;
}) {
  const kind = AUTO_SLOTS.includes(id) ? 'AUTO' : id === QUICK_SLOT ? 'QUICK' : 'MANUAL';
  const isAuto = kind === 'AUTO';
  const canSave = mode === 'save' && !isAuto && store.ui.inGame;
  const canLoad = mode === 'load' && slot !== null;
  const disabled = !(canSave || canLoad);
  const bgDef = slot ? (BACKGROUNDS[slot.background] ?? BACKGROUNDS.black) : null;

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
      <button
        className={`slot ${disabled ? 'disabled' : ''}`}
        disabled={disabled}
        onClick={() => {
          if (mode === 'save') store.save(id);
          else store.load(id);
        }}
      >
        <div
          className="slot-thumb"
          style={{
            background: bgDef
              ? `linear-gradient(180deg, ${bgDef.sky[0]}, ${bgDef.ground})`
              : 'rgba(255,255,255,.03)',
          }}
        />
        <div className="slot-body">
          <div className="slot-kind">
            {kind} {isAuto ? id.replace('auto', '') : id.replace('m', '')}
          </div>
          {slot ? (
            <>
              <div className="slot-title">
                第{slot.night}夜　{slot.chapterTitle || '—'}
              </div>
              <div className="slot-meta">
                {slot.chapterDate}
                {slot.faction && ` ／ 陣営${slot.faction}「${FACTION_JA[slot.faction]}」`}
                {slot.route && ` ／ ${ROUTE_JA[slot.route]}ルート`}
                <br />
                {fmtDate(slot.savedAt)} ／ プレイ {fmtTime(slot.playtimeMs)}
              </div>
              <div className="slot-preview">
                {slot.speakerName ? `${slot.speakerName}「${slot.preview}」` : slot.preview}
              </div>
            </>
          ) : (
            <div className="slot-meta" style={{ paddingTop: 12 }}>
              — 空き —
            </div>
          )}
        </div>
      </button>
      {slot && (
        <button className="slot-del" onClick={() => store.deleteSlot(id)}>
          削除
        </button>
      )}
    </div>
  );
}

export function SaveLoadScreen({ store, mode }: { store: GameStore; mode: 'save' | 'load' }) {
  const slots = store.slots();
  const byId = new Map(slots.map((s, i) => [[...AUTO_SLOTS, QUICK_SLOT, ...MANUAL_SLOTS][i], s]));
  const groups: [string, string[]][] = [
    ['オートセーブ', AUTO_SLOTS],
    ['クイックセーブ', [QUICK_SLOT]],
    ['マニュアルセーブ', MANUAL_SLOTS],
  ];

  return (
    <div className="screen">
      <button className="screen-back" onClick={() => store.back()}>
        もどる
      </button>
      <div className="screen-inner">
        <h2>{mode === 'save' ? 'セーブ' : 'ロード'}</h2>
        <div className="sub">
          オート 5 ／ クイック 1 ／ マニュアル 20
          {mode === 'save' && !store.ui.inGame && '　——ゲーム中のみ保存できます'}
        </div>
        {groups.map(([label, ids]) => (
          <section key={label} style={{ marginBottom: 30 }}>
            <h3
              style={{
                fontSize: 11,
                letterSpacing: '.24em',
                color: 'var(--lamp-300)',
                fontWeight: 400,
                margin: '0 0 10px',
              }}
            >
              {label}
            </h3>
            <div className="slot-grid">
              {ids.map((id) => (
                <Slot key={id} id={id} slot={byId.get(id) ?? null} mode={mode} store={store} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
