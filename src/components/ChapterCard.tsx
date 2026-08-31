import { useEffect, useState } from 'react';
import type { ChapterCard as Card } from '@/systems/store';

const KANJI = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三'];

export function ChapterCardView({ card, onDone }: { card: Card; onDone: () => void }) {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    setGone(false);
    const t = window.setTimeout(() => {
      setGone(true);
      onDone();
    }, 2600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.night, card.title]);

  if (gone) return null;
  const label = card.night >= 14 ? '終　夜' : `第 ${KANJI[card.night] ?? card.night} 夜`;

  return (
    <div className="chapter-card">
      <div className="night">{label}</div>
      <div className="rule" />
      <div className="title">{card.title}</div>
      <div className="rule" />
      <div className="date">{card.date}</div>
      {card.mood && <div className="mood">{card.mood}</div>}
    </div>
  );
}
