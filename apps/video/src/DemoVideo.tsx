import {Audio} from '@remotion/media';
import {AbsoluteFill, Sequence, staticFile, Track} from 'remotion';
import {AppChrome} from './components/AppChrome';
import {CreditsCard} from './components/CreditsCard';
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
      <Sequence
        from={T.credits}
        premountFor={30}
        style={{
          translate: '-1px 0px'
        }}
      >
        <CreditsCard />
      </Sequence>
    </AbsoluteFill>
    <Track
      name="ElevenLabs_2026-11-14T12_21_12_Jessica - Playful, Bright, Warm_pvc_s50_sim75_v4.mp3"
    >
      <Audio
        src={staticFile(
          'ElevenLabs_2026-11-14T12_21_12_Jessica - Playful, Bright, Warm_pvc_s50_sim75_v4.mp3'
        )}
        from={5}
        durationInFrames={43}
      />
      <Audio
        src={staticFile(
          'ElevenLabs_2026-11-14T12_21_12_Jessica - Playful, Bright, Warm_pvc_s50_sim75_v4.mp3'
        )}
        from={49}
        durationInFrames={73}
        trimBefore={52.4300000000001}
      />
      <Audio
        src={staticFile(
          'ElevenLabs_2026-11-14T12_21_12_Jessica - Playful, Bright, Warm_pvc_s50_sim75_v4.mp3'
        )}
        from={123}
        durationInFrames={146}
        trimBefore={198.43}
      />
      <Audio
        src={staticFile(
          'ElevenLabs_2026-11-14T12_21_12_Jessica - Playful, Bright, Warm_pvc_s50_sim75_v4.mp3'
        )}
        from={271}
        durationInFrames={234}
        trimBefore={351.43}
      />
      <Audio
        src={staticFile(
          'ElevenLabs_2026-11-14T12_21_12_Jessica - Playful, Bright, Warm_pvc_s50_sim75_v4.mp3'
        )}
        from={506}
        durationInFrames={482.57}
        trimBefore={642.43}
      />
    </Track>
  </>
);
