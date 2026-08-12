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

export const Pricing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardSpring = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 100 },
  });

  const y = interpolate(cardSpring, [0, 1], [200, 0]);
  const rotate = interpolate(cardSpring, [0, 1], [5, 0]);

  return (
    <AbsoluteFill className="items-center justify-center bg-[#1a0b2e] p-12">
      <div 
        style={{ 
          fontFamily,
          transform: `translateY(${y}px) rotate(${rotate}deg)`,
          width: '100%',
        }}
        className="bg-gradient-to-b from-purple-900/40 to-black/60 border border-white/10 rounded-[60px] p-16 backdrop-blur-3xl shadow-2xl"
      >
        <span className="text-purple-400 font-black tracking-widest uppercase text-sm mb-4 block">Dólar Hoy</span>
        <div className="flex items-baseline gap-4 mb-8">
          <span className="text-white/60 text-4xl font-bold">1 USD =</span>
          <span className="text-white text-9xl font-black tracking-tighter">
            $980
          </span>
        </div>
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-30" />
        <p className="text-purple-200/50 mt-8 text-2xl font-medium italic">Precios actualizados al instante</p>
      </div>
    </AbsoluteFill>
  );
};