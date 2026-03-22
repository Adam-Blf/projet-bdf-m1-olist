import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import { theme, fonts } from "../theme";
import { SceneFrame } from "./SceneFrame";

const dms = [
  { name: "dm_seller_performance",       cardinality: 3095, cols: 11, hl: "rank_in_state (window)" },
  { name: "dm_customer_satisfaction",    cardinality: 27,   cols: 7,  hl: "repeat_order_ratio" },
  { name: "dm_product_category_revenue", cardinality: 71,   cols: 7,  hl: "rank_global (window)" },
  { name: "dm_monthly_sales_trends",     cardinality: 25,   cols: 8,  hl: "mom_growth_pct (lag)" },
];

export const DatamartScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <SceneFrame
      step="07 / Gold"
      title="PostgreSQL · 4 datamarts relationnels (Spark JDBC)"
      subtitle="postgres-datamart:5432/olist_dm · 'overwrite' mode · clé chiffrée"
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, height: "100%" }}>
        {dms.map((d, i) => {
          const enter = spring({
            frame: frame - 12 - i * 12,
            fps,
            config: { damping: 200 },
          });
          return (
            <div
              key={d.name}
              style={{
                background: "white",
                borderRadius: 18,
                border: `1px solid ${theme.border}`,
                padding: 24,
                boxShadow: "0 12px 30px rgba(0,0,145,0.07)",
                opacity: enter,
                transform: `translateY(${(1 - enter) * 18}px)`,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: theme.navy,
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: 20,
                  }}
                >
                  {i + 1}
                </span>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: theme.navy,
                    fontFamily: fonts.mono,
                  }}
                >
                  {d.name}
                </div>
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  gap: 22,
                }}
              >
                <Pill label="lignes"   value={d.cardinality.toLocaleString()} color={theme.teal} />
                <Pill label="colonnes" value={String(d.cols)}                color={theme.amber} />
                <Pill label="grain"    value={
                  i === 0 ? "seller" :
                  i === 1 ? "state (UF)" :
                  i === 2 ? "category" : "year+month"
                } color={theme.muted} />
              </div>

              <div
                style={{
                  marginTop: 16,
                  padding: "12px 14px",
                  background: theme.bg,
                  borderRadius: 10,
                  fontFamily: fonts.mono,
                  fontSize: 14,
                  color: theme.ink,
                }}
              >
                <span style={{ color: theme.teal, fontWeight: 700 }}>highlight ·</span>{" "}
                {d.hl}
              </div>
            </div>
          );
        })}
      </div>
    </SceneFrame>
  );
};

const Pill: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div>
    <div style={{ fontSize: 11, color: theme.muted, letterSpacing: 2 }}>
      {label.toUpperCase()}
    </div>
    <div style={{ fontSize: 22, fontWeight: 800, color, fontStyle: "italic" }}>{value}</div>
  </div>
);
