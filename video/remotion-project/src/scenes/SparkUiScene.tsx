import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { theme, fonts } from "../theme";
import { SceneFrame } from "./SceneFrame";

export const SparkUiScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stages = [
    { id: 14, name: "scan parquet (raw.orders)",      tasks: 4,  status: "DONE",    duration: "1.2 s" },
    { id: 15, name: "scan parquet (raw.order_items)", tasks: 4,  status: "DONE",    duration: "0.9 s" },
    { id: 16, name: "BroadcastHashJoin items↔orders", tasks: 8,  status: "DONE",    duration: "2.1 s" },
    { id: 17, name: "filter cond_ok (5 rules)",       tasks: 8,  status: "DONE",    duration: "0.6 s" },
    { id: 18, name: "Window row_number/dense_rank",   tasks: 16, status: "DONE",    duration: "4.8 s" },
    { id: 19, name: "ParquetWrite /silver",           tasks: 8,  status: "RUNNING", duration: "..."   },
  ];

  return (
    <SceneFrame
      step="04 / Spark UI"
      title="Spark UI · DAG + Storage cache visible"
      subtitle="spark-master:4040 · cache(MEMORY_AND_DISK) sur joined_validated"
    >
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24, height: "100%" }}>
        <div
          style={{
            background: "white",
            borderRadius: 18,
            border: `1px solid ${theme.border}`,
            padding: 22,
            boxShadow: "0 8px 24px rgba(0,0,145,0.06)",
            fontFamily: fonts.mono,
            fontSize: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#E25A1C" }}>
              🔥 Spark Stages (job 2 - processor.py)
            </span>
            <span style={{ color: theme.muted }}>
              app-20260322091850-0002 · 2 executors · 4 cores
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "60px 1fr 80px 100px 80px",
              gap: 12,
              fontSize: 13,
              color: theme.muted,
              padding: "8px 12px",
              borderBottom: `1px solid ${theme.border}`,
            }}
          >
            <span>Stage</span><span>Description</span><span>Tasks</span>
            <span>Status</span><span>Duration</span>
          </div>

          {stages.map((s, i) => {
            const enter = spring({ frame: frame - 12 - i * 8, fps, config: { damping: 200 } });
            const isRun = s.status === "RUNNING";
            const pulse = isRun ? 0.5 + 0.5 * Math.sin(frame / 5) : 1;
            return (
              <div
                key={s.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "60px 1fr 80px 100px 80px",
                  gap: 12,
                  padding: "10px 12px",
                  background: i % 2 ? theme.bg : "white",
                  alignItems: "center",
                  opacity: enter,
                }}
              >
                <span style={{ color: theme.muted }}>#{s.id}</span>
                <span style={{ color: theme.ink, fontWeight: 600 }}>{s.name}</span>
                <span>{s.tasks}</span>
                <span
                  style={{
                    color: isRun ? theme.amber : theme.green,
                    fontWeight: 700,
                    opacity: pulse,
                  }}
                >
                  {s.status}
                </span>
                <span>{s.duration}</span>
              </div>
            );
          })}
        </div>

        <div
          style={{
            background: "white",
            borderRadius: 18,
            border: `2px solid ${theme.teal}`,
            padding: 22,
            boxShadow: "0 8px 24px rgba(0,137,123,0.18)",
            fontFamily: fonts.mono,
            fontSize: 14,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: theme.teal,
              marginBottom: 8,
            }}
          >
            💾 Storage tab
          </div>
          <div style={{ color: theme.muted, marginBottom: 18 }}>
            cache() / persist() visible
          </div>

          <CacheBar
            label="joined_validated"
            level="MEMORY_AND_DISK"
            sizeMb={386}
            partitions={16}
            cached={1}
            frame={frame}
          />

          <div
            style={{
              marginTop: 24,
              padding: "16px 18px",
              background: "#0b1220",
              color: "#e2e8f0",
              borderRadius: 12,
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            <div style={{ color: "#a78bfa" }}>// Cache effect</div>
            joined_validated.persist(MEMORY_AND_DISK)<br />
            count()         &nbsp;-&gt; 111 263 (cached)<br />
            window apply    &nbsp;-&gt; reuses cache ✓<br />
            parquet write   &nbsp;-&gt; reuses cache ✓<br />
            Hive saveAsTable -&gt; reuses cache ✓
          </div>

          <div
            style={{
              marginTop: 16,
              fontSize: 13,
              color: theme.muted,
            }}
          >
            ✓ 4 réutilisations sans relire le HDFS bronze
          </div>
        </div>
      </div>
    </SceneFrame>
  );
};

const CacheBar: React.FC<{
  label: string;
  level: string;
  sizeMb: number;
  partitions: number;
  cached: number;
  frame: number;
}> = ({ label, level, sizeMb, partitions, cached, frame }) => {
  const fill = interpolate(frame, [20, 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
        <span style={{ color: theme.ink, fontWeight: 700 }}>{label}</span>
        <span style={{ color: theme.muted }}>{level}</span>
      </div>
      <div
        style={{
          marginTop: 8,
          height: 22,
          background: theme.bg,
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${fill * 100}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${theme.teal}, ${theme.navy})`,
          }}
        />
      </div>
      <div
        style={{
          marginTop: 6,
          display: "flex",
          gap: 18,
          fontSize: 12,
          color: theme.muted,
        }}
      >
        <span>{sizeMb} MB</span>
        <span>{partitions} partitions</span>
        <span>cached: {cached}</span>
      </div>
    </div>
  );
};
