import {useCurrentFrame} from 'remotion';
import {FAMILIES, activeFamily} from '../families';
import {C, MONO, SANS} from '../theme';
import {T} from '../timeline';
import {ease, easeOut, prog} from '../util';

// Window geometry; the map docks into the area between the side panels
// (x 470–1450, y 154–904), see DOCK in MapStory.
const WIN = {left: 140, top: 90, width: 1640, height: 910};
const HEADER = 64;
const SIDE = 330;
const BOTTOM = 96;

const kicker: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 14,
  letterSpacing: '0.14em',
  color: C.muted,
  marginBottom: 14,
};

const LogoMark = ({size = 30}: {readonly size?: number}) => (
  <svg width={size} height={size} viewBox="-16 -16 32 32">
    <circle r={14} fill="none" stroke={C.terracotta} strokeWidth={2} />
    <circle r={8} fill="none" stroke={C.terracotta} strokeWidth={1.5} strokeDasharray="2 3" />
    <circle r={3} fill={C.terracotta} />
  </svg>
);

/** Motion-graphics rendition of the app UI that the map docks into. */
export const AppChrome = () => {
  const frame = useCurrentFrame();
  if (frame < T.app) return null;
  const p = prog(frame, T.app, T.app + 28, ease);
  const active = activeFamily(frame);
  const play = prog(frame, T.app + 30, T.title + 10);
  const activeColor = active >= 0 ? FAMILIES[active].color : C.sand250;
  const slideIn = (delay: number) => prog(frame, T.app + delay, T.app + delay + 18, easeOut);

  return (
    <div
      style={{
        position: 'absolute',
        ...WIN,
        opacity: p,
        transform: `scale(${0.97 + 0.03 * p})`,
        background: C.paperLight,
        borderRadius: 18,
        border: '1px solid rgba(46,42,30,0.16)',
        boxShadow: '0 30px 80px rgba(46,42,30,0.16)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          height: HEADER,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '0 24px',
          borderBottom: `1px solid ${C.line}`,
          background: C.paper,
        }}
      >
        <LogoMark />
        <div>
          <div style={{fontFamily: SANS, fontSize: 21, fontWeight: 600, color: C.ink}}>NISAR Surface Change Monitor</div>
          <div style={{fontFamily: SANS, fontSize: 13, color: C.muted}}>Sarangani &amp; Davao Occidental · Mindanao</div>
        </div>
        <div
          style={{
            marginLeft: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 20,
            background: C.paperWhite,
            border: `1px solid ${C.line}`,
            fontFamily: MONO,
            fontSize: 15,
            color: C.ink700,
          }}
        >
          <span style={{width: 8, height: 8, borderRadius: 8, background: C.olive}} />
          57 layers · 81 dates
        </div>
        <div style={{flex: 1}} />
        <div
          style={{
            width: 360,
            height: 38,
            borderRadius: 10,
            border: `1px solid ${C.line}`,
            background: C.paperWhite,
            display: 'flex',
            alignItems: 'center',
            padding: '0 14px',
            fontFamily: SANS,
            fontSize: 15,
            color: C.muted,
          }}
        >
          Search places…
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{width: 38, height: 38, borderRadius: 10, border: `1px solid ${C.line}`, background: C.paperWhite}} />
        ))}
      </div>

      {/* Data families */}
      <div style={{position: 'absolute', left: 0, top: HEADER, bottom: 0, width: SIDE, padding: 22, borderRight: `1px solid ${C.line}`, background: C.paper}}>
        <div style={kicker}>DATA FAMILIES</div>
        {FAMILIES.map((f, i) => {
          const e = slideIn(6 + i * 3);
          const on = i === active;
          return (
            <div
              key={f.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                height: 50,
                padding: '0 14px',
                marginBottom: 9,
                borderRadius: 10,
                border: `1px solid ${on ? C.terracotta : C.line}`,
                background: on ? 'rgba(169,71,28,0.09)' : C.paperWhite,
                opacity: e,
                transform: `translateX(${(1 - e) * -30}px)`,
                fontFamily: SANS,
                fontSize: 17,
                color: C.ink,
              }}
            >
              <span style={{width: 18, height: 18, borderRadius: 5, background: f.color}} />
              <span style={{flex: 1}}>{f.name}</span>
              <span style={{width: 34, height: 20, borderRadius: 20, background: on ? C.terracotta : C.sand200, position: 'relative'}}>
                <span
                  style={{
                    position: 'absolute',
                    top: 3,
                    left: on ? 17 : 3,
                    width: 14,
                    height: 14,
                    borderRadius: 14,
                    background: C.paperWhite,
                  }}
                />
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend + stats */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: HEADER,
          bottom: 0,
          width: SIDE,
          padding: 22,
          borderLeft: `1px solid ${C.line}`,
          background: C.paper,
          opacity: slideIn(10),
          transform: `translateX(${(1 - slideIn(10)) * 30}px)`,
        }}
      >
        <div style={kicker}>LEGEND</div>
        <div style={{fontFamily: SANS, fontSize: 17, color: C.ink, marginBottom: 10}}>{active >= 0 ? FAMILIES[active].name : '—'}</div>
        <div style={{height: 14, borderRadius: 7, background: `linear-gradient(90deg, ${C.paperWhite}, ${activeColor})`, border: `1px solid ${C.line}`}} />
        <div style={{...kicker, marginTop: 40}}>QUICK STATS</div>
        {[
          ['305', 'landslide polygons'],
          ['5,268 km²', 'area monitored'],
          ['30 m', 'pixel resolution'],
        ].map(([v, l], i) => (
          <div
            key={l}
            style={{
              padding: '14px 16px',
              marginBottom: 10,
              borderRadius: 10,
              border: `1px solid ${C.line}`,
              background: C.paperWhite,
              opacity: slideIn(16 + i * 4),
            }}
          >
            <div style={{fontFamily: MONO, fontSize: 24, fontWeight: 600, color: C.terracotta}}>{v}</div>
            <div style={{fontFamily: SANS, fontSize: 14, color: C.muted, marginTop: 2}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div
        style={{
          position: 'absolute',
          left: SIDE,
          right: SIDE,
          bottom: 0,
          height: BOTTOM,
          borderTop: `1px solid ${C.line}`,
          background: C.paper,
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          padding: '0 28px',
          opacity: slideIn(14),
        }}
      >
        <div style={{width: 46, height: 46, borderRadius: 46, background: C.terracotta, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <svg width={18} height={18} viewBox="0 0 18 18">
            <path d="M5 3 L15 9 L5 15 Z" fill={C.paperWhite} />
          </svg>
        </div>
        <div style={{flex: 1}}>
          <div style={{position: 'relative', height: 6, borderRadius: 6, background: C.sand200}}>
            <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${play * 100}%`, borderRadius: 6, background: C.terracotta}} />
            <div
              style={{
                position: 'absolute',
                top: -7,
                left: `calc(${play * 100}% - 10px)`,
                width: 20,
                height: 20,
                borderRadius: 20,
                background: C.paperWhite,
                border: `3px solid ${C.terracotta}`,
              }}
            />
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 12, fontFamily: MONO, fontSize: 14, color: C.muted}}>
            {['2020', '2025', 'JUN 2026', 'OCT 2026', '2027'].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export {LogoMark};
