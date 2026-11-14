import {interpolate, random} from 'remotion';
import {GEO} from '../../data/geo';
import {C} from '../../theme';
import {T} from '../../timeline';
import {ease, easeOut, prog} from '../../util';

type P = {readonly frame: number};

// ---------- NISAR swath geometry (map viewBox units) ----------
// A single descending pass covering most, not all, of the study area,
// matching the app's caveat that one swath covers 19–89% of the provinces.
export const TRACK = {x0: 700, slope: 0.14, half: 300};
export const trackX = (y: number) => TRACK.x0 + (y - 500) * TRACK.slope;

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** NISAR's along-track position; the swath is revealed up to this line. */
export const nisarY = (frame: number) => interpolate(frame, [T.radar + 10, T.radar + 130], [-150, 1150], clamp);

export const RadarLayer = ({frame}: P) => {
  if (frame < T.radar) return null;
  const {half} = TRACK;
  const top = -60;
  const front = nisarY(frame);
  const bottom = Math.max(top, Math.min(front, GEO.height + 60));
  const swath = [
    [trackX(top) - half, top],
    [trackX(top) + half, top],
    [trackX(bottom) + half, bottom],
    [trackX(bottom) - half, bottom],
  ]
    .map((p) => p.join(','))
    .join(' ');

  const texOpacity = interpolate(frame, [T.slides, T.slides + 30, T.app, T.app + 30], [0.95, 0.35, 0.35, 0.18], clamp);
  const edgeOpacity = prog(frame, T.radar + 5, T.radar + 25) * (1 - prog(frame, T.slides, T.slides + 30)) * 0.55;
  const scanOpacity = front > 0 && front < GEO.height ? 1 : 0;

  return (
    <g>
      <defs>
        <clipPath id="swath">
          <polygon points={swath} />
        </clipPath>
      </defs>
      <g clipPath="url(#prov)" opacity={texOpacity}>
        <g clipPath="url(#swath)">
          <rect width={GEO.width} height={GEO.height} filter="url(#radarTex)" />
        </g>
      </g>
      {[-1, 1].map((side) => (
        <line
          key={side}
          x1={trackX(-80) + side * half}
          y1={-80}
          x2={trackX(1080) + side * half}
          y2={1080}
          stroke={C.ink}
          strokeWidth={1.6}
          strokeDasharray="7 9"
          opacity={edgeOpacity}
        />
      ))}
      <g opacity={scanOpacity}>
        <line
          x1={trackX(front) - half}
          y1={front}
          x2={trackX(front) + half}
          y2={front}
          stroke="#2f8a8a"
          strokeWidth={10}
          opacity={0.35}
          filter="url(#glow)"
        />
        <line x1={trackX(front) - half} y1={front} x2={trackX(front) + half} y2={front} stroke="#1f6f6a" strokeWidth={2.5} />
      </g>
    </g>
  );
};

// ---------- Clouds ----------
type Cloud = {
  cx: number;
  cy: number;
  speed: number;
  delay: number;
  puffs: {dx: number; dy: number; r: number}[];
};

const CLOUDS: Cloud[] = Array.from({length: 22}, (_, i) => {
  // Even clusters sit over the eastern hills, odd ones anywhere.
  const east = i % 2 === 0;
  const cx = east ? 600 + random(`cx${i}`) * 420 : 40 + random(`cx${i}`) * 960;
  const cy = east ? 60 + random(`cy${i}`) * 780 : 120 + random(`cy${i}`) * 780;
  return {
    cx,
    cy,
    speed: 0.2 + random(`sp${i}`) * 0.3,
    delay: random(`dl${i}`) * 28,
    puffs: Array.from({length: 5}, (__, j) => ({
      dx: (random(`px${i}-${j}`) - 0.5) * 150,
      dy: (random(`py${i}-${j}`) - 0.5) * 60,
      r: 38 + random(`pr${i}-${j}`) * 48,
    })),
  };
});

export const CloudLayer = ({frame}: P) => {
  if (frame < T.clouds - 2 || frame > T.slides + 80) return null;
  const items = CLOUDS.map((c) => {
    const pin = prog(frame, T.clouds + c.delay, T.clouds + c.delay + 36, easeOut);
    const outAt = T.slides + c.delay * 0.5;
    const pout = prog(frame, outAt, outAt + 42, ease);
    const dx = (1 - pin) * -170 + pout * 240 + (frame - T.clouds) * c.speed;
    return {c, op: pin * (1 - pout), dx};
  });
  const puffs = (fill: string, alpha: number) =>
    items.map(({c, op, dx}, i) => (
      <g key={i} opacity={op * alpha} transform={`translate(${c.cx + dx} ${c.cy})`}>
        {c.puffs.map((p, j) => (
          <circle key={j} cx={p.dx} cy={p.dy} r={p.r} fill={fill} />
        ))}
      </g>
    ));
  return (
    <g>
      <g filter="url(#cloudShadow)" transform="translate(18 24)">
        {puffs(C.ink, 0.13)}
      </g>
      <g filter="url(#cloudBlur)">{puffs(C.paperWhite, 0.93)}</g>
    </g>
  );
};
