import { AbsoluteFill, Series } from "remotion";
import { theme, fonts } from "./theme";
import { CoverScene } from "./scenes/CoverScene";
import { ArchitectureScene } from "./scenes/ArchitectureScene";
import { TerminalScene } from "./scenes/TerminalScene";
import { HdfsScene } from "./scenes/HdfsScene";
import { SparkUiScene } from "./scenes/SparkUiScene";
import { HiveScene } from "./scenes/HiveScene";
import { YarnScene } from "./scenes/YarnScene";
import { DatamartScene } from "./scenes/DatamartScene";
import { ApiScene } from "./scenes/ApiScene";
import { DashboardScene } from "./scenes/DashboardScene";
import { OutroScene } from "./scenes/OutroScene";
import { feederLines, processorLines } from "./scenes/terminalLines";

// 24 fps + 1280x720 keeps the render budget reasonable (~9k frames total).
// Hand-in version targets ~5min50s (between the 5-8 min spec window).
export const FPS = 24;
export const WIDTH = 1280;
export const HEIGHT = 720;

const sec = (s: number) => s * FPS;

const SCENES: { duration: number; node: React.ReactNode }[] = [
  { duration: sec(5),  node: <CoverScene /> },
  { duration: sec(28), node: <ArchitectureScene /> },
  { duration: sec(28), node: <TerminalScene
                          title="spark-submit feeder.py - bronze layer"
                          command="$ bash scripts/run_feeder.sh 2026-03-22"
                          lines={feederLines} /> },
  { duration: sec(20), node: <HdfsScene /> },
  { duration: sec(24), node: <SparkUiScene /> },
  { duration: sec(28), node: <TerminalScene
                          title="spark-submit processor.py - silver layer"
                          command="$ bash scripts/run_processor.sh 2026-03-22"
                          lines={processorLines} /> },
  { duration: sec(18), node: <HiveScene /> },
  { duration: sec(16), node: <YarnScene /> },
  { duration: sec(20), node: <DatamartScene /> },
  { duration: sec(28), node: <ApiScene /> },
  { duration: sec(34), node: <DashboardScene /> },
  { duration: sec(16), node: <OutroScene /> },
];

export const TOTAL_FRAMES = SCENES.reduce((a, s) => a + s.duration, 0);

export const MainComp: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: theme.bg,
        fontFamily: fonts.display,
        color: theme.text,
      }}
    >
      <Series>
        {SCENES.map((s, i) => (
          <Series.Sequence key={i} durationInFrames={s.duration} premountFor={FPS}>
            {s.node}
          </Series.Sequence>
        ))}
      </Series>
      <ProgressBar />
    </AbsoluteFill>
  );
};

const ProgressBar: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        bottom: 0,
        height: 4,
        width: "100%",
        background: "rgba(0,0,145,0.08)",
      }}
    >
      <ProgressFill />
    </div>
  );
};

import { useCurrentFrame } from "remotion";

const ProgressFill: React.FC = () => {
  const frame = useCurrentFrame();
  const pct = Math.min(1, frame / TOTAL_FRAMES);
  return (
    <div
      style={{
        height: "100%",
        width: `${pct * 100}%`,
        background: theme.navy,
        transition: "width 60ms linear",
      }}
    />
  );
};
