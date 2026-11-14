import {Easing, interpolate, spring, useVideoConfig} from 'remotion';
import {GEO, slideRadius} from '../../data/geo';
import {C, MONO} from '../../theme';
import {T} from '../../timeline';
import {easeOut, prog} from '../../util';

/** 1 normally, 0 while NISAR crosses the south of the map (radar scene). */
export const nisarDip = (frame: number) =>
  1 - Math.min(prog(frame, T.radar + 60, T.radar + 72), 1 - prog(frame, T.slides - 12, T.slides));

type P = {readonly frame: number};

const [EX, EY] = GEO.epicentre;
const QUAKE_AT = T.quake + 10;

const starPoints = (r: number) =>
  Array.from({length: 10}, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    return `${EX + Math.cos(a) * rr},${EY + Math.sin(a) * rr}`;
  }).join(' ');

/** Epicentre star, seismic rings and magnitude label. */
export const QuakeLayer = ({frame}: P) => {
  const {fps} = useVideoConfig();
  if (frame < QUAKE_AT - 1) return null;
  const pop = spring({frame: frame - QUAKE_AT, fps, config: {damping: 11, stiffness: 170}});
  // Hide the label while the NISAR satellite flies past it.
  const labelOp = prog(frame, QUAKE_AT + 8, QUAKE_AT + 22) * nisarDip(frame);
  return (
    <g>
      {[0, 1, 2, 3].map((k) => {
        const age = frame - (QUAKE_AT + k * 10);
        if (age < 0 || age > 72) return null;
        const t = age / 72;
        return (
          <circle
            key={k}
            cx={EX}
            cy={EY}
            r={18 + easeOut(t) * 640}
            fill="none"
            stroke={C.terracotta}
            strokeWidth={3 - t * 2}
            opacity={(1 - t) * 0.75}
          />
        );
      })}
      <circle cx={EX} cy={EY} r={34 * pop} fill={C.terracotta} opacity={0.14} />
      <polygon points={starPoints(20 * pop)} fill={C.terracotta} stroke={C.paperWhite} strokeWidth={3} strokeLinejoin="round" />
      <g opacity={labelOp} fontFamily={MONO}>
        <text x={EX - 34} y={EY + 2} textAnchor="end" fontSize={30} fontWeight={600} fill={C.terracotta}>
          M7.8
        </text>
        <text x={EX - 34} y={EY + 28} textAnchor="end" fontSize={18} letterSpacing={2} fill={C.ink700}>
          8 JUN 2026
        </text>
      </g>
    </g>
  );
};

// ---------- Landslides ----------
const DIST = GEO.slides.map((s) => Math.hypot(s.x - EX, s.y - EY));
const D_MIN = Math.min(...DIST);
const D_MAX = Math.max(...DIST);

/** Radius of the outward sweep that reveals landslides, in map units. */
export const sweepRadius = (frame: number) =>
  interpolate(frame, [T.slides + 18, T.slides + 98], [D_MIN - 12, D_MAX + 12], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  });

export const revealedSlides = (frame: number) => {
  const r = sweepRadius(frame);
  return DIST.filter((d) => d <= r).length;
};

export const SlideLayer = ({frame}: P) => {
  if (frame < T.slides + 12) return null;
  const R = sweepRadius(frame);
  const ringOp = prog(frame, T.slides + 12, T.slides + 24) * (1 - prog(frame, T.slides + 92, T.slides + 104));
  return (
    <g>
      <circle cx={EX} cy={EY} r={R} fill="none" stroke={C.candidate} strokeWidth={2} strokeDasharray="4 7" opacity={ringOp * 0.6} />
      {GEO.slides.map((s, i) => {
        const d = DIST[i];
        if (d > R) return null;
        const k = Math.min(1, (R - d) / 28);
        const scale = interpolate(k, [0, 0.55, 1], [0, 1.6, 1]);
        const r = slideRadius(s.areaHa) * scale;
        return (
          <g key={i}>
            {k < 1 ? <circle cx={s.x} cy={s.y} r={r * 2.6} fill={C.candidate} opacity={(1 - k) * 0.35} /> : null}
            <circle cx={s.x} cy={s.y} r={r} fill={C.candidate} stroke={C.paperWhite} strokeWidth={0.8} />
          </g>
        );
      })}
    </g>
  );
};
