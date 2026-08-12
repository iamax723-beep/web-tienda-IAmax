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

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const scale = interpolate(titleSpring, [0, 1], [0.5, 1]);
  const opacity = interpolate(frame, [0, 10], [0, 1]);

  return (
    <AbsoluteFill className="items-center justify-center bg-[#1a0b2e]">
      <div 
        style={{ 
          fontFamily,
          transform: `scale(${scale})`,
          opacity,
          color: 'white',
          textAlign: 'center'
        }}
      >
        <h1 className="text-[120px] font-black tracking-tighter uppercase leading-none">
          IAmax
        </h1>
        <div className="h-2 w-32 bg-[#9b4dff] mx-auto mt-4 rounded-full" />
        <p className="text-3xl mt-8 font-medium text-purple-200/70 tracking-widest uppercase">
          La Tienda del Futuro
        </p>
      </div>
      
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-purple-600/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-600/20 rounded-full blur-[100px]" />
    </AbsoluteFill>
  );
};