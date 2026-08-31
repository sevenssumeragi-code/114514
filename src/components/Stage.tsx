import { useEffect, useState } from 'react';
import type { StageState } from '@/engine/state';
import type { StagedEffect } from '@/engine/interpreter';
import { BACKGROUNDS, bgUrl, cgUrl, charUrl } from '@/data/assets';
import { CHARACTERS } from '@/data/characters';
import { cgDef } from '@/data/cg';

/** 素材の有無を一度だけ調べ、無ければプレースホルダへ落とす。 */
function useImageExists(url: string | null): boolean | null {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    if (!url) {
      setOk(false);
      return;
    }
    let alive = true;
    const img = new Image();
    img.onload = () => alive && setOk(true);
    img.onerror = () => {
      if (!alive) return;
      console.warn(`[asset] 画像が見つかりません: ${url}（プレースホルダで継続）`);
      setOk(false);
    };
    img.src = url;
    return () => {
      alive = false;
    };
  }, [url]);
  return ok;
}

/** NOX に応じた街灯の色。数値は一切出さず、色だけで暗示する（実装指示 22）。 */
function lampColor(nox: number): string {
  if (nox >= 80) return '#c07bff';
  if (nox >= 55) return '#e08a5a';
  if (nox >= 30) return '#ffa851';
  return '#ffc978';
}

function BackgroundLayer({ id, nox }: { id: string; nox: number }) {
  const def = BACKGROUNDS[id] ?? BACKGROUNDS.black;
  const url = bgUrl(def);
  const exists = useImageExists(url);
  const lamp = lampColor(nox);
  const lampOp = id === 'slope_dark' ? 0.08 : 1;

  if (exists && url) {
    return <div className="bg-layer" style={{ backgroundImage: `url(${url})` }} />;
  }
  // プレースホルダ：空と地面のグラデーション＋等間隔の街灯
  const showLamps = /slope|park|station|shrine|dorm_night|tunnel|inverted|backside/.test(id);
  return (
    <div
      className="bg-layer bg-placeholder"
      style={{
        background: `linear-gradient(180deg, ${def.sky[0]} 0%, ${def.sky[1]} 62%, ${def.ground} 100%)`,
      }}
    >
      {showLamps && (
        <div className="lamps">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="lamp"
              style={
                {
                  left: `${6 + i * 11}%`,
                  bottom: `${16 + i * 4.6}%`,
                  '--lamp-color': lamp,
                  '--lamp-op': lampOp,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CharacterSprite({
  id,
  expression,
  pos,
}: {
  id: string;
  expression: string;
  pos: string;
}) {
  const url = charUrl(id, expression);
  const exists = useImageExists(url);
  const def = CHARACTERS[id as keyof typeof CHARACTERS];
  return (
    <div className={`char ${pos}`}>
      {exists ? (
        <img src={url} alt={def?.name ?? id} />
      ) : (
        <div
          className="char-placeholder"
          style={{
            background: `linear-gradient(180deg, ${def?.color ?? '#444'} 0%, rgba(6,10,20,.6) 78%)`,
            boxShadow: `0 0 90px -34px ${def?.accent ?? '#888'}`,
          }}
        >
          <span className="nm">{def?.name ?? id}</span>
          <span className="ex">{expression}</span>
        </div>
      )}
    </div>
  );
}

function CgLayer({ id }: { id: string }) {
  const url = cgUrl(id);
  const exists = useImageExists(url);
  const def = cgDef(id);
  if (exists) {
    return (
      <div className="cg-layer">
        <img src={url} alt={def?.title ?? id} />
      </div>
    );
  }
  return (
    <div
      className="cg-layer"
      style={{
        background:
          def?.light === 'morning'
            ? 'linear-gradient(180deg,#cfe0f5,#f6f2e8 70%,#e8e2d4)'
            : def?.light === 'snow'
              ? 'linear-gradient(180deg,#16223a,#2a3c5c 70%,#4b5c78)'
              : def?.light === 'lamp'
                ? 'linear-gradient(180deg,#241a10,#3a2a18 70%,#120c07)'
                : 'linear-gradient(180deg,#05070d,#0b0f18)',
        color: def?.light === 'morning' ? '#22262e' : undefined,
      }}
    >
      <div className="cg-placeholder">
        <div className="id">{id}</div>
        <div className="ti">{def?.title ?? '（未定義）'}</div>
        <div className="desc">{def?.composition ?? ''}</div>
        <div className="missing">[ IMAGE NOT YET PROVIDED ]</div>
      </div>
    </div>
  );
}

export function Stage({
  stage,
  effects,
  nox,
}: {
  stage: StageState;
  effects: StagedEffect[];
  nox: number;
}) {
  const [shake, setShake] = useState<string | null>(null);
  const [flash, setFlash] = useState<'light' | 'dark' | null>(null);
  const [blur, setBlur] = useState(false);
  const [invert, setInvert] = useState(false);

  useEffect(() => {
    if (effects.length === 0) return;
    for (const e of effects) {
      switch (e.name) {
        case 'shake':
        case 'bigshake':
          setShake(e.name === 'shake' ? 'fx-shake' : 'fx-bigshake');
          window.setTimeout(() => setShake(null), e.duration ?? 500);
          break;
        case 'flash':
          setFlash('light');
          window.setTimeout(() => setFlash(null), e.duration ?? 600);
          break;
        case 'darkflash':
        case 'lamp-out':
          setFlash('dark');
          window.setTimeout(() => setFlash(null), e.duration ?? 600);
          break;
        case 'blur':
          setBlur(true);
          window.setTimeout(() => setBlur(false), e.duration ?? 900);
          break;
        case 'unblur':
          setBlur(false);
          break;
        case 'invert':
          setInvert(true);
          window.setTimeout(() => setInvert(false), e.duration ?? 1200);
          break;
        default:
          break;
      }
    }
  }, [effects]);

  const cls = [
    'stage',
    shake ?? '',
    blur ? 'fx-blur' : '',
    invert ? 'fx-invert' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls}>
      <BackgroundLayer id={stage.background} nox={nox} />
      <div className={`snow-layer ${stage.snow ? 'on' : ''}`} />
      {!stage.cg && (
        <div className="char-layer">
          {stage.characters.map((c) => (
            <CharacterSprite key={c.id} id={c.id} expression={c.expression} pos={c.pos} />
          ))}
        </div>
      )}
      {stage.cg && <CgLayer id={stage.cg} />}
      <div className={`dark-overlay ${stage.dark ? 'on' : ''}`} />
      <div className={`flash-layer ${flash ? 'on' : ''} ${flash === 'dark' ? 'dark' : ''}`} />
    </div>
  );
}
