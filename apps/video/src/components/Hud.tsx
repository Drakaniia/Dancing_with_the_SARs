import {random, useCurrentFrame} from 'remotion';
import {GEO} from '../data/geo';
import {C, MONO, SANS} from '../theme';
import {T} from '../timeline';
import {easeOut, inOut, prog} from '../util';
import {revealedSlides} from './map/EventLayers';

type NoteProps = {
  readonly frame: number;
  readonly from: number;
  readonly to: number;
  readonly x: number;
  readonly y: number;
  readonly kicker: string;
  readonly children?: React.ReactNode;
};

/** Small cartographic annotation in the page margin. */
const Note = ({frame, from, to, x, y, kicker, children}: NoteProps) => {
  const op = inOut(frame, from, to, 12);
  if (op <= 0) return null;
  const dy = (1 - prog(frame, from, from + 18, easeOut)) * 16;
  return (
    <div style={{position: 'absolute', left: x, top: y + dy, width: 380, opacity: op}}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 18,
          fontWeight: 500,
          letterSpacing: '0.16em',
          color: C.terracotta,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{width: 9, height: 9, borderRadius: 9, background: C.terracotta}} />
        {kicker}
      </div>
      {children ? (
        <div style={{fontFamily: SANS, fontSize: 32, fontWeight: 500, color: C.ink, lineHeight: 1.22, marginTop: 12}}>
          {children}
        </div>
      ) : null}
    </div>
  );
};

// Seismogram trace with a burst that lands as the map shakes.
const SEISMO = (() => {
  const pts: string[] = [];
  for (let i = 0; i <= 190; i++) {
    const t = i / 190;
    const env = t < 0.25 ? 0.07 : Math.exp(-(t - 0.25) * 5.2);
    const n = random(`seis${i}`) - 0.5;
    pts.push(`${i * 2},${(50 + n * env * 96).toFixed(1)}`);
  }
  return `M${pts.join('L')}`;
})();

const Seismogram = ({frame}: {readonly frame: number}) => {
  const op = inOut(frame, T.quake, T.clouds + 10, 12);
  if (op <= 0) return null;
  const w = prog(frame, T.quake - 2, T.quake + 46) * 380;
  return (
    <svg width={380} height={100} style={{position: 'absolute', left: 90, top: 300, opacity: op}}>
      <line x1={0} y1={50} x2={380} y2={50} stroke={C.line} />
      <clipPath id="seisClip">
        <rect width={w} height={100} />
      </clipPath>
      <path d={SEISMO} fill="none" stroke={C.terracotta} strokeWidth={2} clipPath="url(#seisClip)" />
    </svg>
  );
};

const EviBar = () => (
  <div style={{display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, fontFamily: MONO, fontSize: 26, color: C.ink}}>
    <span style={{width: 26, height: 26, borderRadius: 6, background: C.olive}} />
    0.57
    <span style={{color: C.muted}}>→</span>
    <span style={{width: 26, height: 26, borderRadius: 6, background: C.ochre}} />
    0.16
  </div>
);

export const Hud = () => {
  const frame = useCurrentFrame();
  const count = revealedSlides(frame);
  return (
    <>
      <Note frame={frame} from={18} to={T.quake + 4} x={90} y={150} kicker="MINDANAO · PHILIPPINES">
        Sarangani &amp; Davao Occidental
      </Note>

      <Note frame={frame} from={T.quake + 8} to={T.clouds + 10} x={90} y={150} kicker="8 JUNE 2026">
        M7.8 earthquake offshore
      </Note>
      <Seismogram frame={frame} />

      <Note frame={frame} from={T.clouds + 50} to={T.radar + 2} x={1460} y={150} kicker="OPTICAL SATELLITES">
        Cloud hides the slopes
      </Note>

      <Note frame={frame} from={T.radar + 20} to={T.slides + 4} x={1460} y={150} kicker="NASA-ISRO NISAR">
        L-band radar sees through cloud
      </Note>
      <Note frame={frame} from={T.radar + 60} to={T.slides + 4} x={1460} y={920} kicker="ONE PASS · PROVISIONAL" />

      <Note frame={frame} from={T.slides + 14} to={T.app + 6} x={90} y={150} kicker="AFTER THE QUAKE">
        <div style={{fontSize: 132, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums'}}>
          {count}
        </div>
        <div style={{marginTop: 8}}>possible landslides</div>
      </Note>
      <Note frame={frame} from={T.slides + 70} to={T.app + 6} x={1460} y={150} kicker="GREENNESS · EVI">
        <div style={{fontSize: 26, color: C.ink700}}>Mean before → after</div>
        <EviBar />
        <div style={{fontFamily: MONO, fontSize: 16, color: C.muted, marginTop: 14, letterSpacing: '0.08em'}}>
          LANDSAT HLS · {GEO.stats.totalHa} HA
        </div>
      </Note>
    </>
  );
};
