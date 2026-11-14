import {interpolate} from 'remotion';
import {C, MONO} from '../../theme';
import {T} from '../../timeline';
import {prog} from '../../util';
import {TRACK, nisarY, trackX} from './WeatherRadar';

type P = {readonly frame: number};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Stylised spacecraft. `nisar` adds the boom-mounted 12 m reflector dish. */
export const SatelliteIcon = ({nisar = false}: {readonly nisar?: boolean}) => (
  <g strokeLinejoin="round">
    {[-1, 1].map((side) => (
      <g key={side}>
        <line x1={side * 16} y1={0} x2={side * 24} y2={0} stroke={C.ink} strokeWidth={2} />
        <rect x={side > 0 ? 24 : -72} y={-10} width={48} height={20} rx={2} fill={C.rain} stroke={C.ink} strokeWidth={1.8} />
        {[1, 2, 3].map((k) => (
          <line
            key={k}
            x1={(side > 0 ? 24 : -72) + k * 12}
            y1={-10}
            x2={(side > 0 ? 24 : -72) + k * 12}
            y2={10}
            stroke={C.paperWhite}
            strokeOpacity={0.6}
            strokeWidth={1}
          />
        ))}
      </g>
    ))}
    <rect x={-16} y={-15} width={32} height={30} rx={4} fill={C.paperWhite} stroke={C.ink} strokeWidth={2} />
    {nisar ? (
      <g>
        <line x1={6} y1={15} x2={34} y2={48} stroke={C.ink} strokeWidth={2.2} />
        <ellipse cx={44} cy={60} rx={32} ry={12} fill={C.amber} stroke={C.ink} strokeWidth={1.8} />
        <ellipse cx={44} cy={60} rx={18} ry={6.5} fill="none" stroke={C.paperWhite} strokeOpacity={0.55} />
        <line x1={12} y1={60} x2={76} y2={60} stroke={C.paperWhite} strokeOpacity={0.45} />
      </g>
    ) : (
      <circle cx={0} cy={15} r={6} fill={C.ink} stroke={C.paperWhite} strokeWidth={1.5} />
    )}
  </g>
);

/** Optical pass whose view is stopped by the cloud deck. */
const OpticalPass = ({frame}: P) => {
  const a = T.clouds + 46;
  const b = T.clouds + 116;
  if (frame < a || frame > b) return null;
  const x = interpolate(frame, [a, b], [-180, 1240], clamp);
  const op = Math.min(prog(frame, a, a + 8), 1 - prog(frame, b - 8, b));
  const beamOn = x > 0 && x < 1060 ? 1 : 0.3;
  const deck = 300;
  return (
    <g opacity={op}>
      <polygon points={`${x - 6},-58 ${x + 6},-58 ${x + 74},${deck} ${x - 74},${deck}`} fill="url(#beam)" opacity={beamOn} />
      <ellipse cx={x} cy={deck} rx={78} ry={13} fill="#f2c86b" opacity={0.45 * beamOn} filter="url(#glow)" />
      <g transform={`translate(${x} -80) scale(0.95)`}>
        <SatelliteIcon />
      </g>
    </g>
  );
};

/** NISAR pass with side-looking radar pulses toward the swath. */
const NisarPass = ({frame}: P) => {
  const a = T.radar + 6;
  const b = T.radar + 134;
  if (frame < a || frame > b) return null;
  const y = nisarY(frame);
  const x = trackX(y) - TRACK.half - 90;
  const rot = (Math.atan(TRACK.slope) * 180) / Math.PI;
  const op = Math.min(prog(frame, a, a + 8), 1 - prog(frame, b - 8, b));
  const dishX = x + 44;
  const dishY = y + 60;
  const pulses = [];
  for (let born = T.radar + 12; born < T.radar + 124; born += 6) {
    const age = frame - born;
    if (age < 0 || age > 30) continue;
    const t = age / 30;
    const r = 40 + t * 420;
    const a1 = (-12 * Math.PI) / 180;
    const a2 = (42 * Math.PI) / 180;
    pulses.push(
      <path
        key={born}
        d={`M${dishX + r * Math.cos(a1)},${dishY + r * Math.sin(a1)} A${r},${r} 0 0 1 ${dishX + r * Math.cos(a2)},${dishY + r * Math.sin(a2)}`}
        fill="none"
        stroke="#1f6f6a"
        strokeWidth={3.2 - t * 2}
        strokeLinecap="round"
        opacity={(1 - t) * 0.8}
      />,
    );
  }
  return (
    <g opacity={op}>
      {pulses}
      <g transform={`translate(${x} ${y}) rotate(${rot})`}>
        <SatelliteIcon nisar />
      </g>
      <text x={x - 10} y={y - 30} textAnchor="end" fontFamily={MONO} fontSize={22} fontWeight={600} letterSpacing={3} fill={C.ink}>
        NISAR
      </text>
    </g>
  );
};

export const Satellites = ({frame}: P) => (
  <g>
    <OpticalPass frame={frame} />
    <NisarPass frame={frame} />
  </g>
);
