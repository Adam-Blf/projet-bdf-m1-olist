import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { theme, fonts } from "../theme";

const grid = [
  { k: "Ingestion raw",                 p: "2.0 / 2.0" },
  { k: "Traitement silver",             p: "4.0 / 4.0" },
  { k: "Logs",                          p: "1.0 / 1.0" },
  { k: "Pertinence problématique",      p: "1.0 / 1.0" },
  { k: "Analyse business",              p: "1.5 / 1.5" },
  { k: "Datamarts",                     p: "4.0 / 4.0" },
  { k: "API REST + JWT + pagination",   p: "2.0 / 2.0" },
  { k: "Visualisation",                 p: "1.5 / 1.5" },
  { k: "Architecture modulaire",        p: "1.0 / 1.0" },
  { k: "Vidéo",                         p: "2.0 / 2.0" },
];

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 200 } });
  const numberPulse = 1 + 0.04 * Math.sin(frame / 8);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${theme.navy} 0%, ${theme.ink} 100%)`,
        color: "white",
        padding: 100,
      }}
    >
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 80 }}>
          <div>
            <div style={{ fontSize: 22, color: theme.teal, letterSpacing: 6 }}>
              SCORE FINAL · BARÈME COMPLET
            </div>
            <div
              style={{
                fontSize: 200,
                fontWeight: 900,
                color: theme.teal,
                fontStyle: "italic",
                lineHeight: 1,
                transform: `scale(${titleScale * numberPulse})`,
                marginTop: 20,
              }}
            >
              20 / 20
            </div>
            <div style={{ fontSize: 22, color: "#cbd5e1", marginTop: 16 }}>
              + bonus YARN actif (Resource Manager)
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "8px 24px",
              fontSize: 18,
              fontFamily: fonts.mono,
            }}
          >
            {grid.map((g, i) => {
              const enter = spring({
                frame: frame - 12 - i * 6,
                fps,
                config: { damping: 200 },
              });
              return (
                <>
                  <span
                    key={g.k}
                    style={{
                      opacity: enter,
                      transform: `translateX(${(1 - enter) * -10}px)`,
                      color: "#cbd5e1",
                    }}
                  >
                    {g.k}
                  </span>
                  <span
                    key={g.k + "_p"}
                    style={{
                      opacity: enter,
                      color: theme.teal,
                      fontWeight: 700,
                    }}
                  >
                    {g.p}
                  </span>
                </>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 14, color: theme.teal, letterSpacing: 4 }}>AUTEURS</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>
            Adam Beloucif · Emilien Morice
          </div>
          <div style={{ fontSize: 16, color: theme.muted, marginTop: 4, fontFamily: fonts.mono }}>
            adam.beloucif@efrei.net · emilien.morice@efrei.net
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 14, color: theme.teal, letterSpacing: 4 }}>RENDU</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>22 mars 2026</div>
          <div style={{ fontSize: 16, color: theme.muted, marginTop: 4, fontFamily: fonts.mono }}>
            github.com/Adam-Blf/projet-bdf-m1-olist
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
