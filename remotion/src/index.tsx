import { registerRoot } from "remotion";
import { Composition } from "remotion";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { fade } from "@remotion/transitions/fade";

const Intro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleSpring = spring({ frame, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill className="items-center justify-center bg-[#1a0b2e]">
      <div style={{ transform: `scale(${interpolate(titleSpring, [0, 1], [0.5, 1])})`, color: 'white', textAlign: 'center' }}>
        <h1 className="text-[120px] font-black tracking-tighter uppercase leading-none">IAmax</h1>
        <div className="h-2 w-32 bg-[#9b4dff] mx-auto mt-4 rounded-full" />
      </div>
    </AbsoluteFill>
  );
};

const Outro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const finalSpring = spring({ frame, fps, config: { damping: 15 } });
  return (
    <AbsoluteFill className="items-center justify-center bg-gradient-to-t from-[#0d041a] to-[#1a0b2e]">
      <div style={{ transform: `scale(${interpolate(finalSpring, [0, 1], [0.8, 1])})`, textAlign: 'center' }}>
        <h2 className="text-white text-7xl font-black tracking-tighter uppercase mb-2">IAmax</h2>
        <p className="text-purple-400 text-xl font-bold tracking-[0.4em] uppercase">Empieza Ahora</p>
      </div>
    </AbsoluteFill>
  );
};

const MainVideo = () => (
  <AbsoluteFill className="bg-[#1a0b2e]">
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={75}><Intro /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: 30 })} />
      <TransitionSeries.Sequence durationInFrames={75}><Outro /></TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);

const RemotionRoot = () => (
  <Composition id="main" component={MainVideo} durationInFrames={120} fps={30} width={1080} height={1920} />
);

registerRoot(RemotionRoot);