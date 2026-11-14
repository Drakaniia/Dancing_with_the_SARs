import {FAMILIES, familyWeight} from '../../families';
import {GEO} from '../../data/geo';
import {C, MONO, SANS} from '../../theme';
import {T} from '../../timeline';
import {ease, prog} from '../../util';
import {nisarDip} from './EventLayers';

type P = {readonly frame: number};

/** Shared clip/filter definitions used by every map layer. */
export const MapDefs = () => (
  <defs>
    <clipPath id="prov">
      {GEO.provinces.map((p) => (
        <path key={p.name} d={p.d} />
      ))}
    </clipPath>
    {/* Speckled backscatter-change texture: brown (loss) → paper → teal (gain). */}
    <filter id="radarTex" x={0} y={0} width={GEO.width} height={GEO.height} filterUnits="userSpaceOnUse">
      <feTurbulence type="fractalNoise" baseFrequency="0.024" numOctaves={4} seed={11} result="n" />
      <feColorMatrix in="n" type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1" result="g" />
      <feComponentTransfer in="g" result="c">
        <feFuncR type="linear" slope={2.6} intercept={-0.8} />
        <feFuncG type="linear" slope={2.6} intercept={-0.8} />
        <feFuncB type="linear" slope={2.6} intercept={-0.8} />
      </feComponentTransfer>
      <feComponentTransfer in="c">
        <feFuncR type="table" tableValues="0.62 0.95 0.12" />
        <feFuncG type="table" tableValues="0.42 0.94 0.48" />
        <feFuncB type="table" tableValues="0.22 0.88 0.46" />
      </feComponentTransfer>
    </filter>
    <filter id="cloudBlur" x={-300} y={-300} width={1700} height={1600} filterUnits="userSpaceOnUse">
      <feGaussianBlur stdDeviation={11} />
    </filter>
    <filter id="cloudShadow" x={-300} y={-300} width={1700} height={1600} filterUnits="userSpaceOnUse">
      <feGaussianBlur stdDeviation={18} />
    </filter>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation={6} />
    </filter>
    <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#f2c86b" stopOpacity={0.55} />
      <stop offset="1" stopColor="#f2c86b" stopOpacity={0.05} />
    </linearGradient>
  </defs>
);

/** Province outlines draw themselves, then fill with land colour. */
export const ProvinceLayer = ({frame}: P) => {
  const draw = prog(frame, 4, 66, ease);
  const fill = prog(frame, 42, 86);
  return (
    <g>
      {GEO.provinces.map((p) => (
        <path
          key={`halo-${p.name}`}
          d={p.d}
          fill="none"
          stroke={C.rain}
          strokeWidth={10}
          strokeOpacity={0.1 * fill}
          strokeLinejoin="round"
        />
      ))}
      {GEO.provinces.map((p) => (
        <path
          key={p.name}
          d={p.d}
          fill={C.land}
          fillOpacity={fill}
          stroke={C.ink}
          strokeOpacity={0.78}
          strokeWidth={1.7}
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - draw}
        />
      ))}
    </g>
  );
};

/** App scene: each data family tints the provinces in turn. */
export const TintLayer = ({frame}: P) => {
  if (frame < T.app) return null;
  return (
    <g clipPath="url(#prov)">
      {FAMILIES.map((f, i) => (
        <rect
          key={f.name}
          width={GEO.width}
          height={GEO.height}
          fill={f.color}
          opacity={familyWeight(frame, i) * 0.5}
        />
      ))}
    </g>
  );
};

export const MapLabels = ({frame}: P) => {
  const op = prog(frame, 50, 80) * (1 - 0.4 * prog(frame, T.app, T.app + 20));
  const caps = {fontFamily: MONO, fontSize: 22, letterSpacing: 4, fill: C.ink700} as const;
  return (
    <g opacity={op}>
      <text x={250} y={668} textAnchor="middle" {...caps}>
        SARANGANI
      </text>
      <text x={890} y={18} textAnchor="middle" {...caps}>
        DAVAO OCCIDENTAL
      </text>
      <text x={300} y={905} textAnchor="middle" fontFamily={SANS} fontStyle="italic" fontSize={26} fill={C.rain} opacity={nisarDip(frame)}>
        Celebes Sea
      </text>
    </g>
  );
};
