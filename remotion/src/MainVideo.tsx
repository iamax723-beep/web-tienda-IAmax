import { 
  TransitionSeries, 
  springTiming 
} from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { fade } from "@remotion/transitions/fade";
import { AbsoluteFill } from "remotion";
import { Intro } from "./scenes/Intro";
import { Features } from "./scenes/Features";
import { Pricing } from "./scenes/Pricing";
import { Outro } from "./scenes/Outro";

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill className="bg-[#1a0b2e]">
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={75}>
          <Intro />
        </TransitionSeries.Sequence>
        
        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-bottom' })}
          timing={springTiming({ config: { damping: 20 }, durationInFrames: 20 })}
        />
        
        <TransitionSeries.Sequence durationInFrames={90}>
          <Features />
        </TransitionSeries.Sequence>
        
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
        />
        
        <TransitionSeries.Sequence durationInFrames={80}>
          <Pricing />
        </TransitionSeries.Sequence>
        
        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={springTiming({ config: { damping: 20 }, durationInFrames: 20 })}
        />
        
        <TransitionSeries.Sequence durationInFrames={75}>
          <Outro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};