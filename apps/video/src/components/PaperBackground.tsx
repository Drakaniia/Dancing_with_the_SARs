import {AbsoluteFill} from 'remotion';
import {C} from '../theme';

// Survey-paper backdrop with a faint graticule, matching the Sand Atlas theme.
export const PaperBackground = () => {
  const cols = Array.from({length: 21}, (_, i) => i * 96);
  const rows = Array.from({length: 12}, (_, i) => i * 96);
  return (
    <AbsoluteFill style={{backgroundColor: C.paper}}>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        {cols.map((x) => (
          <line key={`c${x}`} x1={x} x2={x} y1={0} y2={1080} stroke={C.line} strokeWidth={1} opacity={0.5} />
        ))}
        {rows.map((y) => (
          <line key={`r${y}`} x1={0} x2={1920} y1={y} y2={y} stroke={C.line} strokeWidth={1} opacity={0.5} />
        ))}
      </svg>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 55% 45%, rgba(255,253,248,0.6) 0%, rgba(239,234,222,0) 55%, rgba(46,42,30,0.09) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};
