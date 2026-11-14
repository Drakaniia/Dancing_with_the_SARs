import {useCurrentFrame} from 'remotion';
import {GEO, MAP_VIEWBOX} from '../data/geo';
import {T} from '../timeline';
import {ease, lerp, prog} from '../util';
import {MapDefs, MapLabels, ProvinceLayer, TintLayer} from './map/BaseLayers';
import {QuakeLayer, SlideLayer} from './map/EventLayers';
import {Satellites} from './map/Satellites';
import {CloudLayer, RadarLayer} from './map/WeatherRadar';

// Screen placement of the map: centred hero, then docked in the app's map area.
const HERO = {left: 504.6, top: 110, scale: 0.86};
const DOCK = {left: 579, top: 169, scale: 0.72};

/** One continuous map that carries scenes 1–5 and docks into the app UI. */
export const MapStory = () => {
  const frame = useCurrentFrame();
  const dock = prog(frame, T.app, T.app + 30, ease);
  const scale = lerp(dock, HERO.scale, DOCK.scale);

  // Damped shake when the quake hits.
  const since = frame - (T.quake + 10);
  const amp = since >= 0 ? 15 * Math.exp(-since / 9) : 0;
  const shakeX = amp * Math.sin(frame * 2.1);
  const shakeY = amp * 0.6 * Math.cos(frame * 2.9);

  return (
    <div
      style={{
        position: 'absolute',
        left: lerp(dock, HERO.left, DOCK.left) + shakeX,
        top: lerp(dock, HERO.top, DOCK.top) + shakeY,
        width: GEO.width * scale,
        height: GEO.height * scale,
      }}
    >
      <svg viewBox={MAP_VIEWBOX} width="100%" height="100%" style={{overflow: 'visible'}}>
        <MapDefs />
        <ProvinceLayer frame={frame} />
        <TintLayer frame={frame} />
        <MapLabels frame={frame} />
        <CloudLayer frame={frame} />
        <RadarLayer frame={frame} />
        <QuakeLayer frame={frame} />
        <SlideLayer frame={frame} />
        <Satellites frame={frame} />
      </svg>
    </div>
  );
};
