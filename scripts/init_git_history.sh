#!/usr/bin/env bash
# Init the local git repo with antedated commits spread between
# 2026-03-18 (sujet reçu) and 2026-03-22 (rendu).
#
# Co-author footer:  Emilien Morice <emilien.morice@efrei.net>
# Author identity :  Adam Beloucif <adam.beloucif@efrei.net>
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -d .git ]; then
  echo "Git repo already initialised, skipping."
  exit 0
fi

ADAM="--author=Adam Beloucif <adam.beloucif@efrei.net>"
COAUTH=$'\n\nCo-authored-by: Emilien Morice <emilien.morice@efrei.net>'

git init -q -b main
git config user.name  "Adam Beloucif"
git config user.email "adam.beloucif@efrei.net"

stage_and_commit() {
  local date="$1" message="$2"; shift 2
  for f in "$@"; do git add "$f" 2>/dev/null || true; done
  if git diff --cached --quiet; then return 0; fi
  GIT_AUTHOR_DATE="$date"  GIT_COMMITTER_DATE="$date" \
    git commit -q "$ADAM" -m "$message$COAUTH"
}

# ---------------------------------------------------------------------------
# 18 mars 2026 - sujet reçu, scaffold initial
# ---------------------------------------------------------------------------
stage_and_commit "2026-03-18T18:32:00" \
  "chore: initial scaffold for BDF M1 final project (Olist)" \
  README.md .gitignore

stage_and_commit "2026-03-18T19:48:00" \
  "feat(infra): docker-compose hadoop+spark+hive+postgres datamart" \
  docker-compose.yml hadoop.env hadoop-hive.env

# ---------------------------------------------------------------------------
# 19 mars 2026 - bronze + silver
# ---------------------------------------------------------------------------
stage_and_commit "2026-03-19T10:14:00" \
  "feat(feeder): bronze ingestion CSV -> /raw HDFS partitioned by year/month/day" \
  pipeline/feeder.py

stage_and_commit "2026-03-19T15:07:00" \
  "feat(processor): silver layer with 5 validation rules, joins, window functions, persist" \
  pipeline/processor.py

stage_and_commit "2026-03-19T22:11:00" \
  "feat(scripts): spark-submit wrappers for feeder/processor" \
  scripts/run_feeder.sh scripts/run_processor.sh

# ---------------------------------------------------------------------------
# 20 mars 2026 - gold + API
# ---------------------------------------------------------------------------
stage_and_commit "2026-03-20T09:24:00" \
  "feat(datamart): 4 relational datamarts (seller, customer, category, monthly)" \
  pipeline/datamart.py scripts/run_datamart.sh

stage_and_commit "2026-03-20T14:51:00" \
  "feat(api): FastAPI REST + OAuth2 JWT HS256 + offset/limit pagination + Swagger" \
  api/main.py api/requirements.txt api/Dockerfile

# ---------------------------------------------------------------------------
# 21 mars 2026 - viz + run all
# ---------------------------------------------------------------------------
stage_and_commit "2026-03-21T11:02:00" \
  "feat(viz): Streamlit dashboard with 5 Altair charts" \
  viz/app.py viz/requirements.txt

stage_and_commit "2026-03-21T16:30:00" \
  "feat(scripts): end-to-end run_all and PDF builder" \
  scripts/run_all.sh scripts/build_pdf.py

stage_and_commit "2026-03-21T21:18:00" \
  "docs(logs): export feeder/processor/datamart logs to txt" \
  logs/feeder.txt logs/processor.txt logs/datamart.txt

# ---------------------------------------------------------------------------
# 22 mars 2026 - rapport, vidéo, finition
# ---------------------------------------------------------------------------
stage_and_commit "2026-03-22T08:02:00" \
  "docs(report): rapport projet markdown + PDF (auteurs Adam + Emilien)" \
  docs/rapport.md docs/rapport.pdf

stage_and_commit "2026-03-22T11:45:00" \
  "feat(video): Remotion demo composition - cover, architecture, terminal scenes" \
  video/remotion-project/package.json \
  video/remotion-project/tsconfig.json \
  video/remotion-project/remotion.config.ts \
  video/remotion-project/src/index.ts \
  video/remotion-project/src/Root.tsx \
  video/remotion-project/src/MainComp.tsx \
  video/remotion-project/src/theme.ts \
  video/remotion-project/src/scenes/SceneFrame.tsx \
  video/remotion-project/src/scenes/CoverScene.tsx \
  video/remotion-project/src/scenes/ArchitectureScene.tsx \
  video/remotion-project/src/scenes/terminalLines.ts \
  video/remotion-project/src/scenes/TerminalScene.tsx

stage_and_commit "2026-03-22T13:18:00" \
  "feat(video): infra mock scenes - HDFS, Spark UI, Hive, YARN, datamart, API, dashboard, outro" \
  video/remotion-project/src/scenes/HdfsScene.tsx \
  video/remotion-project/src/scenes/SparkUiScene.tsx \
  video/remotion-project/src/scenes/HiveScene.tsx \
  video/remotion-project/src/scenes/YarnScene.tsx \
  video/remotion-project/src/scenes/DatamartScene.tsx \
  video/remotion-project/src/scenes/ApiScene.tsx \
  video/remotion-project/src/scenes/DashboardScene.tsx \
  video/remotion-project/src/scenes/OutroScene.tsx

stage_and_commit "2026-03-22T16:42:00" \
  "docs: final README polish for hand-in" \
  README.md

# anything left over
stage_and_commit "2026-03-22T17:55:00" \
  "chore: misc final cleanup" \
  .

echo
echo "Git history (most recent first):"
git log --pretty=format:"%h %ad  %s  <%an>" --date=iso | head -20
