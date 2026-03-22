import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { theme, fonts } from "../theme";

export const CoverScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleY = spring({ frame, fps, config: { damping: 200 } });
  const subtitleOpacity = spring({ frame: frame - 12, fps, config: { damping: 200 } });
  const metaOpacity = spring({ frame: frame - 30, fps, config: { damping: 200 } });
  const lineWidth = spring({ frame: frame - 14, fps, durationInFrames: 30, config: { damping: 200 } });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${theme.navy} 0%, ${theme.ink} 100%)`,
        color: "white",
        padding: 120,
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontSize: 26,
          color: theme.teal,
          letterSpacing: 6,
          fontWeight: 600,
          marginBottom: 32,
          opacity: subtitleOpacity,
          textTransform: "uppercase",
        }}
      >
        M1 Data Engineering & IA · EFREI · 2026
      </div>
      <div
        style={{
          fontSize: 132,
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: -3,
          fontStyle: "italic",
          transform: `translateY(${interpolate(titleY, [0, 1], [40, 0])}px)`,
          opacity: titleY,
        }}
      >
        Olist Data Platform
      </div>
      <div
        style={{
          height: 6,
          width: `${lineWidth * 480}px`,
          background: theme.teal,
          marginTop: 28,
          marginBottom: 28,
          borderRadius: 3,
        }}
      />
      <div
        style={{
          fontSize: 38,
          color: "#cbd5e1",
          fontWeight: 500,
          opacity: subtitleOpacity,
        }}
      >
        Architecture médaillon Hadoop · Spark · Hive · PostgreSQL
      </div>

      <div
        style={{
          marginTop: 90,
          display: "flex",
          gap: 90,
          opacity: metaOpacity,
          fontSize: 24,
        }}
      >
        <Meta label="Auteurs" value="Adam Beloucif · Emilien Morice" />
        <Meta label="Module" value="Big Data Frameworks" />
        <Meta label="Date" value="22 mars 2026" />
      </div>

      <div
        style={{
          position: "absolute",
          right: 120,
          top: 120,
          width: 240,
          height: 240,
          border: `4px solid ${theme.teal}`,
          borderRadius: 32,
          transform: `rotate(${interpolate(frame, [0, 180], [0, 12])}deg)`,
          opacity: 0.35,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 200,
          top: 220,
          width: 180,
          height: 180,
          border: `3px solid ${theme.teal}`,
          borderRadius: 24,
          transform: `rotate(${interpolate(frame, [0, 180], [0, -8])}deg)`,
          opacity: 0.5,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 120,
          bottom: 80,
          fontFamily: fonts.mono,
          fontSize: 18,
          color: theme.muted,
          opacity: metaOpacity,
        }}
      >
        github.com/Adam-Blf/projet-bdf-m1-olist
      </div>
    </AbsoluteFill>
  );
};

const Meta: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 16, color: theme.teal, letterSpacing: 3, marginBottom: 6 }}>
      {label.toUpperCase()}
    </div>
    <div style={{ fontSize: 24, fontWeight: 600, color: "white" }}>{value}</div>
  </div>
);
