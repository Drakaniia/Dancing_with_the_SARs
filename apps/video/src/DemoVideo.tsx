import {Audio} from '@remotion/media';
import {AbsoluteFill, Sequence, staticFile} from 'remotion';
import {AppChrome} from './components/AppChrome';
import {Hud} from './components/Hud';
import {MapStory} from './components/MapStory';
import {PaperBackground} from './components/PaperBackground';
import {TitleCard} from './components/TitleCard';
import {T} from './timeline';

export const DemoVideo = () => (
  <>
    <AbsoluteFill>
      <PaperBackground />
      <AppChrome />
      <MapStory />
      <Hud />
      <Sequence from={T.title} premountFor={30}>
        <TitleCard />
      </Sequence>
    </AbsoluteFill>
    <Audio
      src={staticFile(
        'ElevenLabs_2026-11-14T12_21_12_Jessica - Playful, Bright, Warm_pvc_s50_sim75_v4.mp3'
      )}
      durationInFrames={1124.57}
      from={5}
    />
  </>
);
