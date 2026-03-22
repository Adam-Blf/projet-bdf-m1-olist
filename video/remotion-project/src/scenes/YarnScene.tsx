import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import { theme, fonts } from "../theme";
import { SceneFrame } from "./SceneFrame";

const apps = [
  { id: "app-20260322091408-0001", name: "olist-feeder",    user: "root", state: "FINISHED",  cores: 4, mem: "1 GB", duration: "1m 53s" },
  { id: "app-20260322091850-0002", name: "olist-processor", user: "root", state: "FINISHED",  cores: 4, mem: "2 GB", duration: "0m 42s" },
  { id: "app-20260322092118-0003", name: "olist-datamart",  user: "root", state: "FINISHED",  cores: 4, mem: "1 GB", duration: "0m 29s" },
  { id: "app-20260322093344-0004", name: "olist-feeder",    user: "root", state: "RUNNING",   cores: 4, mem: "1 GB", duration: "0m 14s" },
];

export const YarnScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <SceneFrame
      step="06 / YARN bonus"
      title="Resource Manager · http://resourcemanager:8088"
      subtitle="bonus barème · 4 applications · 1 NodeManager actif · 4 vCores · 4 GB"
    >
      <div
        style={{
          background: "white",
          borderRadius: 18,
          border: `1px solid ${theme.border}`,
          padding: 24,
          fontFamily: fonts.mono,
          fontSize: 14,
          boxShadow: "0 8px 24px rgba(0,0,145,0.06)",
          height: "100%",
          display: "grid",
          gridTemplateRows: "auto auto 1fr",
          gap: 18,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#66CCFF" }}>
            🐘 YARN Cluster Metrics
          </div>
          <div style={{ color: theme.muted, fontSize: 13 }}>
            CapacityScheduler · root.default · 100% capacity
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          <Stat label="Apps Running"   value="1"     color={theme.green} />
          <Stat label="Apps Completed" value="3"     color={theme.navy} />
          <Stat label="Containers"     value="6"     color={theme.amber} />
          <Stat label="Memory Used"    value="2 GB"  color={theme.teal} />
          <Stat label="VCores Used"    value="4 / 4" color={theme.red} />
        </div>

        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: theme.navy, marginBottom: 12 }}>
            Application List
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2.5fr 1.4fr 0.8fr 0.8fr 0.6fr 0.7fr 0.8fr",
              gap: 10,
              padding: "8px 10px",
              fontSize: 12,
              color: theme.muted,
              borderBottom: `1px solid ${theme.border}`,
            }}
          >
            <span>Application ID</span><span>Name</span><span>User</span>
            <span>State</span><span>Cores</span><span>Mem</span><span>Duration</span>
          </div>
          {apps.map((a, i) => {
            const enter = spring({ frame: frame - 12 - i * 8, fps, config: { damping: 200 } });
            return (
              <div
                key={a.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2.5fr 1.4fr 0.8fr 0.8fr 0.6fr 0.7fr 0.8fr",
                  gap: 10,
                  padding: "10px",
                  background: i % 2 ? theme.bg : "white",
                  fontSize: 13,
                  alignItems: "center",
                  opacity: enter,
                  transform: `translateX(${(1 - enter) * -10}px)`,
                }}
              >
                <span style={{ color: theme.ink }}>{a.id}</span>
                <span style={{ fontWeight: 600 }}>{a.name}</span>
                <span style={{ color: theme.muted }}>{a.user}</span>
                <span
                  style={{
                    color: a.state === "RUNNING" ? theme.amber : theme.green,
                    fontWeight: 700,
                  }}
                >
                  {a.state}
                </span>
                <span>{a.cores}</span>
                <span>{a.mem}</span>
                <span>{a.duration}</span>
              </div>
            );
          })}
        </div>
      </div>
    </SceneFrame>
  );
};

const Stat: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div
    style={{
      background: theme.bg,
      borderRadius: 12,
      padding: "14px 18px",
      borderLeft: `4px solid ${color}`,
    }}
  >
    <div style={{ fontSize: 12, color: theme.muted, letterSpacing: 1 }}>{label.toUpperCase()}</div>
    <div style={{ fontSize: 28, fontWeight: 800, color: color, fontStyle: "italic" }}>{value}</div>
  </div>
);
