import { useEffect, useSyncExternalStore, useState } from 'react';
import { store } from '@/systems/store';
import { TitleScreen } from '@/components/TitleScreen';
import { GameScreen } from '@/components/GameScreen';
import { ConfigScreen } from '@/components/ConfigScreen';
import { SaveLoadScreen } from '@/components/SaveLoadScreen';
import { Gallery } from '@/components/Gallery';
import { EndList } from '@/components/EndList';
import { EndingScreen } from '@/components/EndingScreen';
import { Backlog } from '@/components/Backlog';
import { DebugPanel } from '@/components/DebugPanel';

function EraseScreen() {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="screen">
      <button className="screen-back" onClick={() => store.back()}>
        もどる
      </button>
      <div className="screen-inner">
        <h2>全データ削除</h2>
        <div className="sub">
          セーブ、周回記録、観測度、到達END、名簿、既読——すべてを消去します
        </div>
        <p style={{ fontSize: 13, lineHeight: 2.1, color: 'var(--text-dim)', maxWidth: '58ch' }}>
          NEW GAME では周回データは消えません。周回を越えて引き継がれるもの（観測度・到達END・
          名簿の回収・F20 の判定に必要な過去周回の記録）を消せるのは、この操作だけです。
          <br />
          <br />
          元に戻せません。
        </p>
        {!confirm ? (
          <button className="toggle" style={{ marginTop: 20 }} onClick={() => setConfirm(true)}>
            削除の確認へ
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            <button
              className="toggle"
              style={{ borderColor: '#a55', color: '#ff9a9a' }}
              onClick={() => {
                store.eraseAll();
              }}
            >
              本当に全部消す
            </button>
            <button className="toggle" onClick={() => setConfirm(false)}>
              やめる
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const ui = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    setHasSave(store.hasContinue());
  }, [ui.screen]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        store.toggleDebug();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      {ui.inGame && <GameScreen store={store} ui={ui} />}
      {!ui.inGame && ui.screen !== 'ending' && <TitleScreen store={store} hasSave={hasSave} />}

      {ui.screen === 'config' && <ConfigScreen store={store} />}
      {ui.screen === 'save' && <SaveLoadScreen store={store} mode="save" />}
      {ui.screen === 'load' && <SaveLoadScreen store={store} mode="load" />}
      {ui.screen === 'gallery' && <Gallery store={store} />}
      {ui.screen === 'endlist' && <EndList store={store} />}
      {ui.screen === 'erase' && <EraseScreen />}
      {ui.screen === 'ending' && ui.endingId && (
        <EndingScreen store={store} endingId={ui.endingId} />
      )}

      {ui.showBacklog && (
        <Backlog entries={ui.backlog} onClose={() => store.toggleBacklog()} />
      )}

      {import.meta.env.DEV && ui.debug && <DebugPanel store={store} />}
    </div>
  );
}
