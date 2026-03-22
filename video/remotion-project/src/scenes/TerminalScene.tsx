import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { theme, fonts } from "../theme";
import { SceneFrame } from "./SceneFrame";

type Line = { ts: string; level: "INFO" | "ERROR"; msg: string };

export const TerminalScene: React.FC<{
  title: string;
  command: string;
  lines: Line[];
}> = ({ title, command, lines }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 24 frames before showing first line (cmd reveal), then ~36 frames per line
  const FRAMES_PER_LINE = 30;
  const visibleCount = Math.max(
    0,
    Math.floor((frame - 24) / FRAMES_PER_LINE)
  );

  const cmdReveal = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: "clamp" });

  return (
    <SceneFrame step="02 / Pipeline" title={title} subtitle="logs INFO/ERROR exportés dans /opt/pipeline/logs/*.txt">
      <div
        style={{
          background: theme.bgDark,
          borderRadius: 18,
          padding: "24px 28px",
          fontFamily: fonts.mono,
          fontSize: 18,
          color: "#cbd5e1",
          height: "100%",
          boxShadow: "0 18px 50px rgba(0,0,145,0.18)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 16,
            paddingBottom: 14,
            borderBottom: "1px solid #1e293b",
          }}
        >
          <Dot color="#ef4444" />
          <Dot color="#f59e0b" />
          <Dot color="#22c55e" />
          <div style={{ marginLeft: 18, color: theme.muted, fontSize: 14 }}>
            adam@spark-master:/opt/pipeline$
          </div>
        </div>

        <div style={{ color: "#86efac", marginBottom: 10 }}>
          <span style={{ color: "#a78bfa" }}>$ </span>
          {command.slice(2, 2 + Math.floor(cmdReveal * (command.length - 2)))}
          <span style={{ opacity: (frame % 30 < 15 ? 1 : 0) }}>▌</span>
        </div>

        {lines.slice(0, visibleCount).map((l, i) => {
          const localFrame = frame - 24 - i * FRAMES_PER_LINE;
          const opacity = interpolate(localFrame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
          return (
            <div
              key={i}
              style={{
                opacity,
                lineHeight: 1.55,
                color: l.level === "ERROR" ? "#fca5a5" : "#e2e8f0",
              }}
            >
              <span style={{ color: theme.muted }}>2026-03-22 </span>
              <span style={{ color: "#a78bfa" }}>{l.ts}</span>{"  "}
              <span
                style={{
                  color: l.level === "ERROR" ? theme.red : theme.teal,
                  fontWeight: 700,
                }}
              >
                [{l.level}]
              </span>{"  "}
              {l.msg}
            </div>
          );
        })}
      </div>
    </SceneFrame>
  );
};

const Dot: React.FC<{ color: string }> = ({ color }) => (
  <div
    style={{
      width: 14,
      height: 14,
      borderRadius: "50%",
      background: color,
    }}
  />
);
