import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, MONO, SANS} from '../theme';

import {PaperBackground} from './PaperBackground';

const MEMBERS = [
  {name: 'Peter Dominic Montero', role: 'Team owner'},
  {name: 'Alistair M. Ybanez', role: 'Member'},
  {name: 'Habi Chenna G. Garduque', role: 'Member'},
  {name: 'Alfie Pelicano', role: 'Member'},
];

/** Final card: challenge and team members. Frames are local to the Sequence that hosts it. */
export const CreditsCard = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const rise = (delay: number) => {
    const s = spring({frame: frame - delay, fps, config: {damping: 200}});
    return {opacity: s, transform: `translateY(${(1 - s) * 20}px)`};
  };

  return (
    <AbsoluteFill>
      <PaperBackground />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
        <div style={{...rise(2), fontFamily: MONO, fontSize: 22, letterSpacing: '0.16em', color: C.terracotta}}>
          NASA SPACE APPS 2026 · OUR CHALLENGE
        </div>
        <div style={{...rise(5), fontFamily: SANS, fontSize: 84, fontWeight: 600, color: C.ink, letterSpacing: '-0.02em', marginTop: 14}}>
          Dancing with the SARs
        </div>
        <div style={{...rise(8), width: 120, height: 2, background: C.ink, opacity: 0.25, margin: '44px 0 36px'}} />
        <div style={{...rise(10), fontFamily: MONO, fontSize: 22, letterSpacing: '0.16em', color: C.ink700}}>
          THE CARTOGRAPHERS · MANILA, PHILIPPINES
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 520px)', rowGap: 26, marginTop: 34}}>
          {MEMBERS.map((m, i) => (
            <div key={m.name} style={{...rise(12 + i * 3), textAlign: 'center'}}>
              <div style={{fontFamily: SANS, fontSize: 40, fontWeight: 500, color: C.ink}}>{m.name}</div>
              <div style={{fontFamily: MONO, fontSize: 16, letterSpacing: '0.12em', color: C.muted, marginTop: 6}}>
                {m.role.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
