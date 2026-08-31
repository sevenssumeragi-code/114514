import { useEffect } from 'react';
import type { GameStore, UiState } from '@/systems/store';
import { Stage } from './Stage';
import { MessageWindow } from './MessageWindow';
import { ChoiceBox } from './ChoiceBox';
import { ChapterCardView } from './ChapterCard';

export function GameScreen({ store, ui }: { store: GameStore; ui: UiState }) {
  const state = store.debugState();
  const nox = state?.params.NOX ?? 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ui.screen !== 'game') return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        store.advance();
      } else if (e.key === 'Control') {
        if (!ui.skip) store.toggleSkip();
      } else if (e.key === 'a' || e.key === 'A') {
        store.toggleAuto();
      } else if (e.key === 'l' || e.key === 'L') {
        store.toggleBacklog();
      } else if (e.key === 's' || e.key === 'S') {
        store.goto('save');
      } else if (e.key === 'o' || e.key === 'O') {
        store.goto('load');
      } else if (e.key === 'h' || e.key === 'H') {
        store.toggleHideWindow();
      } else if (e.key === 'Escape') {
        if (ui.hideWindow) store.toggleHideWindow();
        else if (ui.showBacklog) store.toggleBacklog();
      } else if (e.key === 'F9' && import.meta.env.DEV) {
        e.preventDefault();
        store.toggleDebug();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' && ui.skip) store.toggleSkip();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [store, ui.screen, ui.skip, ui.hideWindow, ui.showBacklog]);

  return (
    <div
      className="game-screen"
      style={{ position: 'absolute', inset: 0 }}
      onClick={() => {
        if (ui.hideWindow) {
          store.toggleHideWindow();
          return;
        }
        store.advance();
      }}
    >
      <Stage stage={ui.stage} effects={ui.effects} nox={nox} />

      {ui.chapterCard && (
        <ChapterCardView
          card={ui.chapterCard}
          onDone={() => {
            /* 表示時間はカード側で管理 */
          }}
        />
      )}

      <MessageWindow
        entry={ui.current}
        speed={store.config.textSpeed}
        done={ui.typingDone}
        onDone={() => store.markTypingDone()}
        hidden={ui.hideWindow || !!ui.choices}
        breakFrame={ui.stage.breakFrame}
      />

      {ui.choices && (
        <ChoiceBox
          options={ui.choices}
          prompt={ui.choicePrompt}
          onChoose={(i) => store.choose(i)}
        />
      )}

      {!ui.hideWindow && (
        <div className="ctrl-bar" onClick={(e) => e.stopPropagation()}>
          <button
            className={`ctrl-btn ${ui.auto ? 'active' : ''}`}
            onClick={() => store.toggleAuto()}
          >
            AUTO
          </button>
          <button
            className={`ctrl-btn ${ui.skip ? 'active' : ''}`}
            onClick={() => store.toggleSkip()}
          >
            SKIP
          </button>
          <button className="ctrl-btn" onClick={() => store.toggleBacklog()}>
            LOG
          </button>
          <button className="ctrl-btn" onClick={() => store.goto('save')}>
            SAVE
          </button>
          <button className="ctrl-btn" onClick={() => store.goto('load')}>
            LOAD
          </button>
          <button className="ctrl-btn" onClick={() => store.goto('config')}>
            設定
          </button>
          <button className="ctrl-btn" onClick={() => store.toggleHideWindow()}>
            非表示
          </button>
          <button className="ctrl-btn" onClick={() => store.returnToTitle()}>
            タイトル
          </button>
        </div>
      )}

      {ui.error && (
        <div
          style={{
            position: 'absolute', left: 12, bottom: 12, zIndex: 60,
            background: 'rgba(60,10,10,.95)', border: '1px solid #a55',
            padding: '10px 14px', fontSize: 12, borderRadius: 2, maxWidth: '80vw',
          }}
        >
          {ui.error}
        </div>
      )}
    </div>
  );
}
