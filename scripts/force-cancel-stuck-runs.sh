#!/usr/bin/env bash
# Force-cancel wedged GitHub Actions runs (requires repo admin + gh auth login).
set -euo pipefail

REPO="${1:-Outrageous-Yak/TestGame}"
RUN_IDS=(31124812384 31122319176)

for run_id in "${RUN_IDS[@]}"; do
  echo "Force-canceling run ${run_id}..."
  if gh api --method POST "repos/${REPO}/actions/runs/${run_id}/force-cancel"; then
    echo "  force-cancel accepted"
    continue
  fi
  echo "  force-cancel failed, trying delete..."
  gh api --method DELETE "repos/${REPO}/actions/runs/${run_id}" || true
done

echo "Done. Check: gh run list --limit 10"
