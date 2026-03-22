import { Composition } from "remotion";
import { MainComp, FPS, WIDTH, HEIGHT, TOTAL_FRAMES } from "./MainComp";

export const RemotionRoot = () => {
  return (
    <Composition
      id="olist-demo"
      component={MainComp}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
