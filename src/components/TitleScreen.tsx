import type { GameStore } from '@/systems/store';

export function TitleScreen({ store, hasSave }: { store: GameStore; hasSave: boolean }) {
  const p = store.persistent;
  const afterTrue = p.trueUnlocked;
  const loops = Math.max(0, p.loopCount - 1);

  return (
    <div className={`title-screen ${afterTrue ? 'after-true' : ''}`}>
      <div className="slope" />
      <div className="title-main">
        <h1 className="ja">夜継ぎの魔法使い</h1>
        <div className="en">N I G H T W E A V E R</div>
      </div>

      <nav className="title-menu">
        <button onClick={() => store.newGame()}>NEW GAME</button>
        <button disabled={!hasSave} onClick={() => store.continueGame()}>
          CONTINUE
        </button>
        <button disabled={!hasSave} onClick={() => store.goto('load')}>
          LOAD
        </button>
        <button onClick={() => store.goto('config')}>CONFIG</button>
        <button onClick={() => store.goto('gallery')}>GALLERY</button>
        <button onClick={() => store.goto('endlist')}>END LIST</button>
        <button onClick={() => store.goto('erase')}>全データ削除</button>
      </nav>

      <div className="title-foot">
        {loops > 0 && <>周回 {loops} ／ </>}
        到達 END {Object.keys(p.endings).length} / 22 ／ 名簿 {Object.keys(p.cg).length} / 54
        {afterTrue && <>　——街灯は、もう灯らない</>}
      </div>
    </div>
  );
}
