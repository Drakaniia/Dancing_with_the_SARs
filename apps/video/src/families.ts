import {C} from './theme';
import {T} from './timeline';
import {prog} from './util';

// The app's seven data families (manifest.json), cycled in the app scene.
export const FAMILIES = [
  {name: 'Radar backscatter', color: '#2f8a8a'},
  {name: 'Vegetation', color: C.olive},
  {name: 'Land cover', color: C.amber},
  {name: '8 June earthquake', color: C.candidate},
  {name: 'El Niño series', color: C.rain},
  {name: '12-month outlook', color: C.ochre},
  {name: 'SRTM terrain', color: C.muted},
] as const;

const START = T.app + 34;
const STEP = 10;

/** How strongly family i is "switched on" at this frame (0..1). */
export const familyWeight = (frame: number, i: number) => {
  const a = START + i * STEP;
  const isLast = i === FAMILIES.length - 1;
  return prog(frame, a, a + 5) * (isLast ? 1 : 1 - prog(frame, a + STEP, a + STEP + 5));
};

export const activeFamily = (frame: number) =>
  frame < START ? -1 : Math.min(FAMILIES.length - 1, Math.floor((frame - START) / STEP));
