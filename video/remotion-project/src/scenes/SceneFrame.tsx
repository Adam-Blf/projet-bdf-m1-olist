import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig } from "remotion";
import { theme, fonts } from "../theme";

/** Common frame for the "content" scenes (everything except cover/outro). */
export const SceneFrame: React.FC<{
  step: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ step, title, subtitle, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill
      style={{
        padding: "60px 100px 80px 100px",
        background: theme.bg,
      }}
    >
      <div
        style={{
          opacity: enter,
          transform: `translateY(${(1 - enter) * 12}px)`,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            color: theme.muted,
            letterSpacing: 4,
            fontSize: 14,
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          <span
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: theme.navy,
              color: "white",
              letterSpacing: 2,
              fontWeight: 700,
            }}
          >
            {step}
          </span>
          <span>Olist BDF demo · M1 DE&IA · EFREI 2026</span>
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            color: theme.navy,
            fontStyle: "italic",
            letterSpacing: -1,
            lineHeight: 1,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 22, color: theme.text, marginTop: 12 }}>
            {subtitle}
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          opacity: enter,
          transform: `translateY(${(1 - enter) * 24}px)`,
        }}
      >
        {children}
      </div>

      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 14,
          color: theme.muted,
          opacity: 0.6,
        }}
      >
        Adam Beloucif · Emilien Morice · github.com/Adam-Blf/projet-bdf-m1-olist
      </div>
    </AbsoluteFill>
  );
};
