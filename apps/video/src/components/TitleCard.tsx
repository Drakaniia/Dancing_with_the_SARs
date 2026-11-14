import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, MONO, SANS} from '../theme';
import {ease, prog} from '../util';
import {SatelliteIcon} from './map/Satellites';
import {PaperBackground} from './PaperBackground';

/** Closing card. Frames are local to the Sequence that hosts it. */
export const TitleCard = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const bg = prog(frame, 0, 16, ease);
  const rise = (delay: number) => {
    const s = spring({frame: frame - delay, fps, config: {damping: 200}});
    return {opacity: s, transform: `translateY(${(1 - s) * 24}px)`};
  };
  const ring = (k: number) => prog(frame, 8 + k * 6, 40 + k * 6);

  return (
    <AbsoluteFill style={{opacity: bg}}>
      <PaperBackground />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
        <svg width={170} height={170} viewBox="-85 -85 170 170" style={rise(4)}>
          {[0, 1, 2].map((k) => (
            <circle
              key={k}
              r={30 + k * 22}
              fill="none"
              stroke={C.terracotta}
              strokeWidth={2}
              strokeDasharray="4 6"
              opacity={ring(k) * (0.7 - k * 0.18)}
            />
          ))}
          <g transform="translate(-14 -22) rotate(-18) scale(0.62)">
            <SatelliteIcon nisar />
          </g>
        </svg>
        <div style={{...rise(10), fontFamily: SANS, fontSize: 86, fontWeight: 600, color: C.ink, letterSpacing: '-0.02em', marginTop: 28}}>
          NISAR Surface Change Monitor
        </div>
        <div style={{...rise(16), fontFamily: SANS, fontSize: 36, color: C.terracotta, marginTop: 14}}>
          Seeing surface change, even through the clouds.
        </div>
        <div style={{...rise(24), width: 120, height: 2, background: C.ink, opacity: 0.25, margin: '40px 0 30px'}} />
        <div style={{...rise(28), fontFamily: MONO, fontSize: 22, letterSpacing: '0.16em', color: C.ink700}}>
          THE CARTOGRAPHERS · NASA SPACE APPS CHALLENGE 2026
        </div>
        <div style={{...rise(34), fontFamily: MONO, fontSize: 17, letterSpacing: '0.08em', color: C.muted, marginTop: 16}}>
          NISAR L2 GCOV · Landsat HLS · MODIS · GPM IMERG · SRTM
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
