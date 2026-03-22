import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { theme, fonts } from "../theme";
import { SceneFrame } from "./SceneFrame";

const layers = [
  {
    name: "SOURCE",
    title: "9 fichiers CSV Olist",
    detail: "1 556 425 lignes · CC BY-NC-SA",
    color: theme.muted,
  },
  {
    name: "BRONZE",
    title: "feeder.py → HDFS /raw/olist",
    detail: "parquet snappy · partitionné year=YYYY/month=MM/day=DD · cache()",
    color: "#CD7F32",
  },
  {
    name: "SILVER",
    title: "processor.py → /silver + Hive",
    detail: "5 règles validation · 6 joins · 3 windows · persist MEMORY_AND_DISK",
    color: "#9CA3AF",
  },
  {
    name: "GOLD",
    title: "datamart.py → PostgreSQL",
    detail: "4 datamarts relationnels · Spark JDBC overwrite",
    color: "#D4A017",
  },
  {
    name: "SERVING",
    title: "FastAPI + JWT + Streamlit",
    detail: "endpoints paginés · 5 charts Altair · Swagger /docs",
    color: theme.teal,
  },
];

export const ArchitectureScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <SceneFrame
      step="01 / Architecture"
      title="Médaillon : bronze → silver → gold → serving"
      subtitle="Aucun chemin codé en dur · tout passe par spark-submit"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 24 }}>
        {layers.map((l, i) => {
          const enter = spring({
            frame: frame - 8 - i * 14,
            fps,
            config: { damping: 200 },
          });
          return (
            <div
              key={l.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 32,
                background: "white",
                borderRadius: 24,
                padding: 28,
                boxShadow: "0 8px 24px rgba(0,0,145,0.08)",
                opacity: enter,
                transform: `translateX(${(1 - enter) * -40}px)`,
                border: `1px solid ${theme.border}`,
              }}
            >
              <div
                style={{
                  width: 180,
                  fontSize: 28,
                  fontWeight: 900,
                  color: l.color,
                  fontStyle: "italic",
                  letterSpacing: 1,
                }}
              >
                {l.name}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: theme.navy }}>
                  {l.title}
                </div>
                <div style={{ fontSize: 18, color: theme.text, marginTop: 4, fontFamily: fonts.mono }}>
                  {l.detail}
                </div>
              </div>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: l.color,
                  opacity: 0.15,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  fontWeight: 900,
                  color: l.color,
                }}
              >
                {i + 1}
              </div>
            </div>
          );
        })}
      </div>

      <ArrowFlow frame={frame} />
    </SceneFrame>
  );
};

const ArrowFlow: React.FC<{ frame: number }> = ({ frame }) => {
  const opacity = interpolate(frame, [60, 90], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        right: 160,
        top: 240,
        width: 4,
        height: 600,
        background: `linear-gradient(180deg, ${theme.navy}, ${theme.teal})`,
        opacity: opacity * 0.6,
        borderRadius: 2,
      }}
    />
  );
};
