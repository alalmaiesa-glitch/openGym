#!/usr/bin/env bash
set -euo pipefail

cat >&2 <<'EOF'
Exercise media download is disabled in this Arabic edition.

The inherited upstream image/GIF provenance is unresolved and the permission described by the
upstream dataset is not transferable to this fork. Built-in exercises work without those files
and show neutral placeholders.

Only add exercise media that you created yourself or for which you have independent rights.
See NOTICE.md for provenance details.
EOF

exit 2
