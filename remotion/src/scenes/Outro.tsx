import { 
  AbsoluteFill, 
  interpolate, 
  spring, 
  useCurrentFrame, 
  useVideoConfig 
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["900"],
});

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const finalSpring = spring({
    frame,
    fps,
    config: { damping: 15 },
  });

  const scale = interpolate(finalSpring, [0, 1], [0.8, 1]);
  const opacity = interpolate(frame, [0, 20], [0, 1]);

  return (
    <AbsoluteFill className="items-center justify-center bg-gradient-to-t from-[#0d041a] to-[#1a0b2e]">
      <div 
        style={{ 
          fontFamily,
          transform: `scale(${scale})`,
          opacity,
          textAlign: 'center'
        }}
      >
        <h2 className="text-white text-7xl font-black tracking-tighter uppercase mb-2">
          IAmax
        </h2>
        <p className="text-purple-400 text-xl font-bold tracking-[0.4em] uppercase">
          Empieza Ahora
        </p>
      </div>
      
      <div className="absolute bottom-20 text-white/30 text-sm font-medium tracking-widest uppercase">
        iamax.lovable.app
      </div>
    </AbsoluteFill>
  );
};