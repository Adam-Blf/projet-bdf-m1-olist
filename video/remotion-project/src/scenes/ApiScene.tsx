import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { theme, fonts } from "../theme";
import { SceneFrame } from "./SceneFrame";

export const ApiScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cmd1 =
`$ curl -s -X POST http://localhost:8000/token \\
       -d "username=adam&password=olist2026"`;
  const resp1 =
`{"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXV...",
 "token_type":"bearer","expires_in":3600}`;
  const cmd2 =
`$ curl -H "Authorization: Bearer $TOKEN" \\
       "http://localhost:8000/datamarts/dm_seller_performance \\
        ?page=1&size=3&order_by=revenue_total&direction=desc"`;
  const resp2 =
`{
  "page": 1, "size": 3, "total": 3095, "pages": 1032,
  "items": [
    { "seller_id":"4869f7a5...", "seller_state":"SP",
      "n_orders":1854, "revenue_total":226472.99,
      "avg_review_score":4.21, "rank_in_state":1 },
    { "seller_id":"53243585...", "seller_state":"SP",
      "n_orders":1456, "revenue_total":204710.13,
      "avg_review_score":4.08, "rank_in_state":2 },
    { "seller_id":"4a3ca999...", "seller_state":"SP",
      "n_orders":1183, "revenue_total":177670.45,
      "avg_review_score":4.15, "rank_in_state":3 }
  ]
}`;

  const c1 = interpolate(frame, [0, 30],   [0, cmd1.length],  { extrapolateRight: "clamp" });
  const r1 = interpolate(frame, [40, 80],  [0, resp1.length], { extrapolateRight: "clamp" });
  const c2 = interpolate(frame, [110, 170],[0, cmd2.length],  { extrapolateRight: "clamp" });
  const r2 = interpolate(frame, [180, 280],[0, resp2.length], { extrapolateRight: "clamp" });

  return (
    <SceneFrame
      step="08 / API"
      title="FastAPI · JWT HS256 · pagination offset/limit"
      subtitle="POST /token → access_token · GET /datamarts/{name}?page=&size= · Swagger /docs"
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
          height: "100%",
        }}
      >
        <div
          style={{
            background: theme.bgDark,
            color: "#e2e8f0",
            borderRadius: 14,
            padding: "18px 22px",
            fontFamily: fonts.mono,
            fontSize: 14,
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
            boxShadow: "0 12px 30px rgba(0,0,145,0.18)",
            overflow: "hidden",
          }}
        >
          <div style={{ color: "#86efac", marginBottom: 6 }}>1) Login OAuth2 password</div>
          <span style={{ color: "#a78bfa" }}>{cmd1.slice(0, Math.floor(c1))}</span>
          <span style={{ opacity: frame % 30 < 15 ? 1 : 0 }}>▌</span>
          <div style={{ color: "#fbbf24", marginTop: 14, marginBottom: 6 }}>↳ response</div>
          <div>{resp1.slice(0, Math.floor(r1))}</div>

          <div style={{ color: "#86efac", marginTop: 22, marginBottom: 6 }}>
            2) Paginated datamart query
          </div>
          <span style={{ color: "#a78bfa" }}>{cmd2.slice(0, Math.floor(c2))}</span>
          <div style={{ color: "#fbbf24", marginTop: 14, marginBottom: 6 }}>↳ response</div>
          <div>{resp2.slice(0, Math.floor(r2))}</div>
        </div>

        <SwaggerMock frame={frame} />
      </div>
    </SceneFrame>
  );
};

const endpoints = [
  { method: "GET",  path: "/healthz",                  auth: false, desc: "Liveness probe" },
  { method: "POST", path: "/token",                    auth: false, desc: "OAuth2 → JWT"  },
  { method: "GET",  path: "/datamarts",                auth: true,  desc: "List datamarts" },
  { method: "GET",  path: "/datamarts/{name}",         auth: true,  desc: "Paginated rows" },
];

const SwaggerMock: React.FC<{ frame: number }> = ({ frame }) => {
  return (
    <div
      style={{
        background: "white",
        border: `1px solid ${theme.border}`,
        borderRadius: 14,
        padding: 22,
        fontFamily: fonts.display,
        fontSize: 16,
        boxShadow: "0 8px 24px rgba(0,0,145,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: `2px solid ${theme.teal}`,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800, color: theme.teal }}>
          📘 Olist Datamarts API <span style={{ color: theme.muted, fontSize: 14 }}>v1.0.0</span>
        </div>
      </div>
      <div style={{ fontSize: 14, color: theme.muted, marginBottom: 16 }}>
        OAS 3.1.0 · /docs · Swagger UI
      </div>

      {endpoints.map((e, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "80px 1.6fr 60px 2fr",
            gap: 12,
            alignItems: "center",
            padding: "12px 12px",
            background: i % 2 ? theme.bg : "white",
            borderRadius: 8,
            fontFamily: fonts.mono,
            fontSize: 14,
          }}
        >
          <span
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 800,
              color: "white",
              background: e.method === "GET" ? "#10B981" : theme.amber,
              textAlign: "center",
            }}
          >
            {e.method}
          </span>
          <span style={{ color: theme.ink, fontWeight: 600 }}>{e.path}</span>
          <span
            style={{
              fontSize: 12,
              color: e.auth ? theme.red : theme.muted,
            }}
          >
            {e.auth ? "🔒 JWT" : "open"}
          </span>
          <span style={{ color: theme.muted }}>{e.desc}</span>
        </div>
      ))}

      <div
        style={{
          marginTop: 20,
          padding: 14,
          background: "#fef3c7",
          borderRadius: 10,
          fontSize: 14,
          fontFamily: fonts.mono,
        }}
      >
        Authorize · Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXV...
      </div>
    </div>
  );
};
