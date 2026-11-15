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
    </Track>
    <Track
      name="ElevenLabs_2026-11-15T12_56_41_Hope - upbeat and clear_pvc_s50_sim75_v4.mp3"
    >
      <Audio
        src={staticFile('ElevenLabs_2026-11-15T12_56_41_Hope - upbeat and clear_pvc_s50_sim75_v4.mp3')}
        durationInFrames={121}
      />
      <Audio
        src={staticFile('ElevenLabs_2026-11-15T12_56_41_Hope - upbeat and clear_pvc_s50_sim75_v4.mp3')}
        from={121}
        durationInFrames={344}
        trimBefore={203}
      />
      <Audio
        src={staticFile('ElevenLabs_2026-11-15T12_56_41_Hope - upbeat and clear_pvc_s50_sim75_v4.mp3')}
        from={472}
        durationInFrames={176}
        trimBefore={551}
      />
      <Audio
        src={staticFile('ElevenLabs_2026-11-15T12_56_41_Hope - upbeat and clear_pvc_s50_sim75_v4.mp3')}
        from={663}
        durationInFrames={160}
        trimBefore={733}
      />
      <Audio
        src={staticFile('ElevenLabs_2026-11-15T12_56_41_Hope - upbeat and clear_pvc_s50_sim75_v4.mp3')}
        from={828}
        durationInFrames={69}
        trimBefore={890}
      />
    </Track>
  </>
);
