import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { theme, fonts } from "../theme";
import { SceneFrame } from "./SceneFrame";

const tables = [
  { name: "customers",            rows: "99 441",     size: "8.7 MB" },
  { name: "geolocation",          rows: "1 000 163", size: "59.4 MB" },
  { name: "order_items",          rows: "112 650",   size: "14.7 MB" },
  { name: "order_payments",       rows: "103 886",   size: "5.6 MB" },
  { name: "order_reviews",        rows: "104 719",   size: "13.8 MB" },
  { name: "orders",               rows: "99 441",    size: "16.8 MB" },
  { name: "products",             rows: "32 951",    size: "2.3 MB" },
  { name: "sellers",              rows: "3 095",     size: "171 KB" },
  { name: "category_translation", rows: "71",        size: "2.6 KB" },
];

export const HdfsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <SceneFrame
      step="03 / Data Lake"
      title="HDFS NameNode · /data/raw/olist (bronze)"
      subtitle="9 tables · partitionnées year=2026/month=3/day=22 · format parquet snappy"
    >
      <div
        style={{
          background: "white",
          borderRadius: 18,
          border: `1px solid ${theme.border}`,
          padding: 24,
          fontFamily: fonts.mono,
          height: "100%",
          boxShadow: "0 8px 24px rgba(0,0,145,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
            paddingBottom: 14,
            borderBottom: `2px solid ${theme.navy}`,
          }}
        >
          <span style={{ fontSize: 24, fontWeight: 900, color: theme.navy }}>
            🐘 Hadoop NameNode
          </span>
          <span style={{ marginLeft: "auto", fontSize: 16, color: theme.muted }}>
            namenode:9870 · CLUSTER_NAME=test · 1 datanode online · DFS Used 119.4 MB
          </span>
        </div>

        <div style={{ fontSize: 17, color: theme.muted, marginBottom: 14 }}>
          /data/raw/olist/
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {tables.map((t, i) => {
            const enter = spring({
              frame: frame - 6 - i * 6,
              fps,
              config: { damping: 200 },
            });
            return (
              <div
                key={t.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto auto",
                  alignItems: "center",
                  gap: 14,
                  padding: "10px 14px",
                  background: i % 2 ? theme.bg : "white",
                  borderRadius: 10,
                  border: `1px solid ${theme.border}`,
                  opacity: enter,
                  transform: `translateX(${(1 - enter) * -20}px)`,
                  fontSize: 15,
                }}
              >
                <span style={{ color: theme.amber, fontSize: 22 }}>📁</span>
                <span style={{ color: theme.ink, fontWeight: 600 }}>
                  {t.name}/year=2026/month=3/day=22/
                </span>
                <span style={{ color: theme.teal, fontWeight: 700 }}>{t.rows}</span>
                <span style={{ color: theme.muted }}>{t.size}</span>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 18,
            paddingTop: 14,
            borderTop: `1px solid ${theme.border}`,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 16,
          }}
        >
          <span style={{ color: theme.muted }}>
            Live HDFS · replication=1 · permissions disabled (lab cluster)
          </span>
          <span style={{ color: theme.navy, fontWeight: 700 }}>
            Total: 1 556 417 rows · 121.0 MB
          </span>
        </div>
      </div>
    </SceneFrame>
  );
};
