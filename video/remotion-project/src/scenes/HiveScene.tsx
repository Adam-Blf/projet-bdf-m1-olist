import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { theme, fonts } from "../theme";
import { SceneFrame } from "./SceneFrame";

const rows = [
  ["e481f51c", "delivered", "SP", "watches_gifts",  "189.00", "5", "8"],
  ["53cdb2fc", "delivered", "RJ", "health_beauty",  "239.90", "4", "11"],
  ["47770eb9", "shipped",   "MG", "auto",           "115.50", "3", "12"],
  ["949d5b44", "delivered", "BA", "bed_bath_table", " 49.90", "5", "9"],
  ["ad21c59c", "delivered", "PR", "computers_acc",  "159.90", "4", "7"],
  ["a4591c26", "canceled",  "AL", "perfumery",      " 79.99", "1", "—"],
  ["136cce7f", "delivered", "PE", "garden_tools",   " 99.99", "5", "10"],
  ["6514b8ad", "delivered", "RS", "telephony",      "129.00", "5", "8"],
];

const cols = [
  "order_id", "order_status", "customer_state", "category_en",
  "price", "review_score", "delivery_delay_days",
];

export const HiveScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sql =
`SELECT order_id, order_status, customer_state, category_en,
       price, review_score, delivery_delay_days
FROM   default.silver_orders_enriched
WHERE  year=2026 AND month=3 AND day=22
LIMIT  8;`;

  const sqlReveal = interpolate(frame, [0, 60], [0, sql.length], {
    extrapolateRight: "clamp",
  });

  return (
    <SceneFrame
      step="05 / Hive"
      title="Beeline · default.silver_orders_enriched"
      subtitle="metastore Postgres · table partitionnée year/month/day · 111 263 lignes"
    >
      <div style={{ display: "grid", gridTemplateRows: "auto 1fr", gap: 18, height: "100%" }}>
        <div
          style={{
            background: theme.bgDark,
            color: "#e2e8f0",
            borderRadius: 14,
            padding: "18px 22px",
            fontFamily: fonts.mono,
            fontSize: 18,
            lineHeight: 1.5,
            whiteSpace: "pre",
            boxShadow: "0 12px 30px rgba(0,0,145,0.18)",
          }}
        >
          <div style={{ color: "#86efac", marginBottom: 8 }}>
            beeline -u jdbc:hive2://hive-server:10000
          </div>
          <span style={{ color: "#a78bfa" }}>0: jdbc:hive2&gt; </span>
          <span>{sql.slice(0, Math.floor(sqlReveal))}</span>
          <span style={{ opacity: (frame % 30 < 15 ? 1 : 0) }}>▌</span>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: 14,
            border: `1px solid ${theme.border}`,
            overflow: "hidden",
            fontFamily: fonts.mono,
            fontSize: 14,
            boxShadow: "0 8px 24px rgba(0,0,145,0.06)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1.4fr 1fr 1fr 1fr",
              padding: "14px 18px",
              background: theme.navy,
              color: "white",
              fontWeight: 700,
            }}
          >
            {cols.map((c) => <div key={c}>{c}</div>)}
          </div>
          {rows.map((r, i) => {
            const enter = spring({ frame: frame - 60 - i * 6, fps, config: { damping: 200 } });
            return (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1.4fr 1fr 1fr 1fr",
                  padding: "10px 18px",
                  background: i % 2 ? theme.bg : "white",
                  borderBottom: `1px solid ${theme.border}`,
                  opacity: enter,
                  transform: `translateY(${(1 - enter) * 8}px)`,
                }}
              >
                {r.map((v, j) => (
                  <div
                    key={j}
                    style={{
                      color: j === 1
                        ? (v === "delivered" ? theme.green : v === "canceled" ? theme.red : theme.amber)
                        : theme.ink,
                      fontWeight: j === 1 ? 700 : 400,
                    }}
                  >
                    {v}
                  </div>
                ))}
              </div>
            );
          })}
          <div
            style={{
              padding: "10px 18px",
              fontSize: 13,
              color: theme.muted,
              fontStyle: "italic",
            }}
          >
            8 rows selected · scan time 0.42 s · 16 partitions
          </div>
        </div>
      </div>
    </SceneFrame>
  );
};
