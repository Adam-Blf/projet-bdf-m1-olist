import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { theme, fonts } from "../theme";
import { SceneFrame } from "./SceneFrame";

const monthly = [
  { p: "16-09", v:  3.2 }, { p: "16-10", v:  4.1 }, { p: "16-11", v:  6.8 },
  { p: "16-12", v:  9.4 }, { p: "17-01", v: 11.2 }, { p: "17-02", v: 14.6 },
  { p: "17-03", v: 18.9 }, { p: "17-04", v: 17.3 }, { p: "17-05", v: 22.8 },
  { p: "17-06", v: 25.1 }, { p: "17-07", v: 27.5 }, { p: "17-08", v: 29.7 },
  { p: "17-09", v: 31.4 }, { p: "17-10", v: 35.0 }, { p: "17-11", v: 65.3 },
  { p: "17-12", v: 49.0 }, { p: "18-01", v: 50.1 }, { p: "18-02", v: 47.2 },
  { p: "18-03", v: 53.4 }, { p: "18-04", v: 51.8 }, { p: "18-05", v: 39.8 },
  { p: "18-06", v: 41.2 }, { p: "18-07", v: 42.8 }, { p: "18-08", v: 44.1 },
];

const states = [
  { st: "AL", s: 3.72 }, { st: "MA", s: 3.78 }, { st: "PI", s: 3.81 },
  { st: "PE", s: 3.91 }, { st: "BA", s: 3.94 }, { st: "RJ", s: 4.02 },
  { st: "MG", s: 4.08 }, { st: "RS", s: 4.11 }, { st: "PR", s: 4.14 },
  { st: "SP", s: 4.18 },
];

const cats = [
  { c: "health_beauty",         v: 1.26 },
  { c: "watches_gifts",         v: 1.21 },
  { c: "bed_bath_table",        v: 1.03 },
  { c: "sports_leisure",        v: 0.98 },
  { c: "computers_accessories", v: 0.91 },
  { c: "furniture_decor",       v: 0.87 },
  { c: "housewares",            v: 0.81 },
];

export const DashboardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <SceneFrame
      step="09 / Visualisation"
      title="Streamlit dashboard · 5 charts Altair branchés sur les datamarts"
      subtitle="streamlit run viz/app.py · port 8501 · cache 5 min · refresh manuel"
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gridTemplateRows: "auto 1fr 1fr",
          gap: 16,
          height: "100%",
        }}
      >
        <KpiCard label="Revenue total"     value="14.50 M BRL"  color={theme.navy} delay={0} frame={frame} fps={fps} />
        <KpiCard label="Vendeurs actifs"   value="3 095"       color={theme.teal} delay={6} frame={frame} fps={fps} />
        <KpiCard label="Clients uniques"   value="96 096"      color={theme.amber} delay={12} frame={frame} fps={fps} />
        <KpiCard label="Avg review score"  value="4.13 / 5"    color={theme.green} delay={18} frame={frame} fps={fps} />

        <Card title="Tendance mensuelle CA" wide={2} delay={24} frame={frame} fps={fps}>
          <MonthlyChart frame={frame} />
        </Card>
        <Card title="Top catégories produits" delay={30} frame={frame} fps={fps}>
          <CategoryChart frame={frame} />
        </Card>
        <Card title="Top vendeurs (Pareto)" delay={36} frame={frame} fps={fps}>
          <ParetoChart frame={frame} />
        </Card>

        <Card title="Satisfaction par état" wide={2} delay={42} frame={frame} fps={fps}>
          <StatesChart frame={frame} />
        </Card>
        <Card title="Heatmap rank × état" wide={2} delay={48} frame={frame} fps={fps}>
          <Heatmap frame={frame} />
        </Card>
      </div>
    </SceneFrame>
  );
};

const KpiCard: React.FC<{
  label: string; value: string; color: string;
  delay: number; frame: number; fps: number;
}> = ({ label, value, color, delay, frame, fps }) => {
  const enter = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        background: "white",
        borderRadius: 14,
        padding: "16px 20px",
        boxShadow: "0 6px 16px rgba(0,0,145,0.05)",
        borderLeft: `5px solid ${color}`,
        opacity: enter,
        transform: `translateY(${(1 - enter) * 12}px)`,
      }}
    >
      <div style={{ fontSize: 13, color: theme.muted, letterSpacing: 2 }}>
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 900,
          color: color,
          fontFamily: fonts.display,
          fontStyle: "italic",
          marginTop: 4,
        }}
      >
        {value}
      </div>
    </div>
  );
};

const Card: React.FC<{
  title: string; wide?: number;
  delay: number; frame: number; fps: number;
  children: React.ReactNode;
}> = ({ title, wide = 1, delay, frame, fps, children }) => {
  const enter = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        gridColumn: `span ${wide}`,
        background: "white",
        borderRadius: 14,
        padding: "16px 20px",
        boxShadow: "0 8px 22px rgba(0,0,145,0.06)",
        opacity: enter,
        transform: `translateY(${(1 - enter) * 18}px)`,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: theme.navy,
          marginBottom: 12,
          fontFamily: fonts.display,
        }}
      >
        {title}
      </div>
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>{children}</div>
    </div>
  );
};

// ---------------- Charts ----------------
const MonthlyChart: React.FC<{ frame: number }> = ({ frame }) => {
  const reveal = interpolate(frame, [40, 220], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const max = Math.max(...monthly.map((m) => m.v));
  const W = 100, H = 100;
  const pts = monthly.map((m, i) => {
    const x = (i / (monthly.length - 1)) * W;
    const y = H - (m.v / max) * (H - 12) - 8;
    return [x, y] as const;
  });
  const visiblePts = pts.slice(0, Math.ceil(pts.length * reveal));
  const path = visiblePts.length > 1
    ? "M " + visiblePts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(" L ")
    : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor={theme.teal} stopOpacity={0.4} />
          <stop offset="100%" stopColor={theme.teal} stopOpacity={0} />
        </linearGradient>
      </defs>
      {visiblePts.length > 1 && (
        <path
          d={`${path} L ${visiblePts[visiblePts.length - 1][0]} ${H} L 0 ${H} Z`}
          fill="url(#g1)"
        />
      )}
      <path d={path} stroke={theme.teal} strokeWidth={1.4} fill="none" strokeLinejoin="round" />
      {visiblePts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={0.6} fill={theme.navy} />
      ))}
    </svg>
  );
};

const CategoryChart: React.FC<{ frame: number }> = ({ frame }) => {
  const max = Math.max(...cats.map((c) => c.v));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontFamily: fonts.display }}>
      {cats.map((c, i) => {
        const w = interpolate(frame, [40 + i * 4, 90 + i * 4], [0, c.v / max], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        return (
          <div key={c.c} style={{ display: "grid", gridTemplateColumns: "100px 1fr 38px", alignItems: "center", gap: 6 }}>
            <span style={{ color: theme.text, fontSize: 10 }}>{c.c}</span>
            <div style={{ background: theme.bg, height: 10, borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: `${w * 100}%`, height: "100%", background: theme.teal }} />
            </div>
            <span style={{ color: theme.muted, fontSize: 10 }}>{c.v.toFixed(2)} M</span>
          </div>
        );
      })}
    </div>
  );
};

const ParetoChart: React.FC<{ frame: number }> = ({ frame }) => {
  const data = Array.from({ length: 50 }, (_, i) => Math.exp(-i * 0.08));
  const max = data[0];
  const W = 100, H = 100;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
      {data.map((v, i) => {
        const reveal = interpolate(frame, [50 + i, 80 + i], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        const h = (v / max) * 90 * reveal;
        const x = (i / data.length) * W;
        return (
          <rect
            key={i}
            x={x}
            y={H - h - 4}
            width={W / data.length - 0.4}
            height={h}
            fill={theme.navy}
            opacity={0.85 - i * 0.012}
          />
        );
      })}
    </svg>
  );
};

const StatesChart: React.FC<{ frame: number }> = ({ frame }) => {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: "100%", gap: 4 }}>
      {states.map((s, i) => {
        const reveal = interpolate(frame, [40 + i * 4, 90 + i * 4], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        const h = (s.s - 3.5) / 0.8 * reveal;
        const colorH = (s.s - 3.7) / 0.5; // 0..1
        const color = `hsl(${120 * colorH}, 65%, 45%)`;
        return (
          <div key={s.st} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
            <div style={{ fontSize: 10, color: theme.text }}>{s.s.toFixed(2)}</div>
            <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
              <div
                style={{
                  width: "100%",
                  height: `${h * 100}%`,
                  background: color,
                  borderRadius: 4,
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: theme.ink, fontWeight: 700 }}>{s.st}</div>
          </div>
        );
      })}
    </div>
  );
};

const Heatmap: React.FC<{ frame: number }> = ({ frame }) => {
  const ufs = ["SP","RJ","MG","RS","PR","BA","SC","DF","ES","GO"];
  const buckets = ["#1", "Top5", "Top20", "Top100", "Other"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: `90px repeat(${ufs.length}, 1fr)`, gap: 3 }}>
      <div />
      {ufs.map((u) => <div key={u} style={{ fontSize: 11, textAlign: "center", color: theme.text, fontWeight: 600 }}>{u}</div>)}
      {buckets.map((b, ri) => (
        <>
          <div key={b} style={{ fontSize: 11, color: theme.text, fontWeight: 600, alignSelf: "center" }}>{b}</div>
          {ufs.map((u, ci) => {
            const intensity = (1 - ri / 5) * (ci < 3 ? 1 : 0.4) * (Math.random() * 0.3 + 0.7);
            const enter = spring({ frame: frame - 40 - ri * 6 - ci * 2, fps: 30, config: { damping: 200 } });
            return (
              <div
                key={u + b}
                style={{
                  height: 22,
                  background: `rgba(0,0,145,${intensity * 0.85})`,
                  borderRadius: 4,
                  opacity: enter,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  color: intensity > 0.5 ? "white" : theme.muted,
                  fontFamily: fonts.mono,
                }}
              >
                {Math.floor(intensity * 700)}
              </div>
            );
          })}
        </>
      ))}
    </div>
  );
};
