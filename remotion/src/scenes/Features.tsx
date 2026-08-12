import { 
  AbsoluteFill, 
  interpolate, 
  spring, 
  useCurrentFrame, 
  useVideoConfig,
  Sequence
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["700", "900"],
});

export const Features: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = [
    "Sincronización Total",
    "Precios en Tiempo Real",
    "Múltiples Tiendas API"
  ];

  return (
    <AbsoluteFill className="p-20 bg-[#120524] justify-center">
      <h2 
        style={{ fontFamily }} 
        className="text-white text-5xl font-black mb-16 border-l-8 border-purple-500 pl-8 uppercase"
      >
        Potencia Digital
      </h2>
      
      <div className="space-y-12">
        {items.map((text, i) => {
          const itemSpring = spring({
            frame: frame - (i * 10) - 10,
            fps,
            config: { damping: 15 },
          });
          
          const x = interpolate(itemSpring, [0, 1], [-100, 0]);
          const opacity = interpolate(itemSpring, [0, 1], [0, 1]);
          
          return (
            <div 
              key={i}
              style={{ 
                fontFamily,
                transform: `translateX(${x}px)`,
                opacity,
              }}
              className="flex items-center gap-6"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-500 shadow-lg shadow-purple-500/20" />
              <span className="text-white text-4xl font-bold">{text}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};