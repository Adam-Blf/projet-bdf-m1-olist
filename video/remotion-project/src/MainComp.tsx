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

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

const sec = (s: number) => s * FPS;

const SCENES: { duration: number; node: React.ReactNode }[] = [
  { duration: sec(6),  node: <CoverScene /> },
  { duration: sec(38), node: <ArchitectureScene /> },
  { duration: sec(34), node: <TerminalScene
                          title="spark-submit feeder.py - bronze layer"
                          command="$ bash scripts/run_feeder.sh 2026-03-22"
                          lines={feederLines} /> },
  { duration: sec(24), node: <HdfsScene /> },
  { duration: sec(28), node: <SparkUiScene /> },
  { duration: sec(34), node: <TerminalScene
                          title="spark-submit processor.py - silver layer"
                          command="$ bash scripts/run_processor.sh 2026-03-22"
                          lines={processorLines} /> },
  { duration: sec(22), node: <HiveScene /> },
  { duration: sec(20), node: <YarnScene /> },
  { duration: sec(24), node: <DatamartScene /> },
  { duration: sec(34), node: <ApiScene /> },
  { duration: sec(42), node: <DashboardScene /> },
  { duration: sec(20), node: <OutroScene /> },
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
