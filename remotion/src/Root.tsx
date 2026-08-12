import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

export const RemotionRoot = () => {
  return (
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={300} // 10 seconds at 30fps
      fps={30}
      width={1080}
      height={1920}
    />
  );
};