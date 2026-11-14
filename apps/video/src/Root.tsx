import './fonts';
import {Composition} from 'remotion';
import {DemoVideo} from './DemoVideo';
import {FPS, T} from './timeline';

export const RemotionRoot: React.FC = () => (
  <Composition id="DemoVideo" component={DemoVideo} durationInFrames={T.end} fps={FPS} width={1920} height={1080} />
);
