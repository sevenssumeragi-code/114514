import type { ResolvedOption } from '@/engine/interpreter';

export function ChoiceBox({
  options,
  prompt,
  onChoose,
}: {
  options: ResolvedOption[];
  prompt?: string;
  onChoose: (i: number) => void;
}) {
  return (
    <div className="choice-layer">
      {prompt && <div className="choice-prompt">{prompt}</div>}
      {options.map((o, i) => (
        <button
          key={i}
          className={`choice-btn ${o.echoed ? 'echoed' : ''}`}
          disabled={!o.enabled}
          onClick={(e) => {
            e.stopPropagation();
            onChoose(i);
          }}
        >
          {o.text}
          {!o.enabled && o.lockedNote && <span className="locked">{o.lockedNote}</span>}
        </button>
      ))}
    </div>
  );
}
