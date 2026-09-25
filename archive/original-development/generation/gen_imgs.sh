#!/bin/bash
# 批量生成第二章修复素材（白天背景/证物图标/新CT图）
cd /app/.agents/plugins/image_generation
A=/mnt/agents/output/app/public/assets
REF_CTL="https://www.kimi.com/apiv2-files/sign-obj/kimi-fs%2Ffiles%2Fblob%2F5cabcc8e3f925750448447711d9ccdaaafb39c4b192a77be495e3c6cc233b633?filename=bg_ctcontrol.png&sig=lhAVzgQnbbukZOXqrf45MpXEEuN_wqH_4e2ST18pa54=&t=o"
REF_OFF="https://www.kimi.com/apiv2-files/sign-obj/kimi-fs%2Ffiles%2Fblob%2F4678070da749ac655871751c2f4f41b7ac0ca3ee0040421fa90500050571816f?filename=bg_office.png&sig=Nw7QY3f3ht3OO565sE0FusmXRUxajtm9oTihT6RIfLA=&t=o"

gen() { # name size prompt [ref]
  local out="$A/$1.png"; local size="$2"; local prompt="$3"; local ref="$4"
  if [ -n "$ref" ]; then
    nohup python3 scripts/image_generation_tool.py generate --description "$prompt" --size "$size" --background opaque --reference-image "$ref" --output "$out" > "/tmp/imggen.$1.log" 2>&1 &
  else
    nohup python3 scripts/image_generation_tool.py generate --description "$prompt" --size "$size" --background opaque --output "$out" > "/tmp/imggen.$1.log" 2>&1 &
  fi
}

PIX="retro pixel art style, 16-bit game asset, dark black background, single object centered, muted colors, detailed pixel shading"
CT="grayscale medical CT scan image, axial slice, realistic radiology imaging style, black background, no text, no watermark"

gen bg_ctcontrol_day 2048x1152 "Same pixel-art hospital CT control room as reference, but in bright DAYTIME: warm sunlight streaming through a window, monitors glowing with CT brain scans, desks and chairs, light walls, cheerful morning atmosphere, retro 16-bit pixel art, wide interior view, no people" "$REF_CTL"
gen bg_office_day 2048x1152 "Same pixel-art doctor office as reference, but in bright DAYTIME: sunlight through window blinds, wooden desk with papers, bookshelf, wall clock, certificates on wall, warm morning light, retro 16-bit pixel art, wide interior view, no people" "$REF_OFF"
gen ct_liver_hemangioma 1024x1024 "$CT, liver axial CT in arterial phase contrast enhancement: a round lesion in the right hepatic lobe showing peripheral discontinuous nodular bright enhancement at its rim, center still dark, aorta brightly enhanced, classic hepatic hemangioma early arterial phase"
gen ct_head_epidural 1024x1024 "$CT, head axial CT bone-window brain: a biconvex lens-shaped bright white hyperdense collection between skull and brain on the left temporal side, does not cross suture lines, classic epidural hematoma"
gen ev_maintenance_draft 1024x1024 "$PIX, a maintenance contract draft document: stacked papers with a red pen, a wrench icon and price table visible on the page"
gen ev_remote_proposal 1024x1024 "$PIX, a glossy vendor brochure flyer: cloud with upload arrows and a CT scanner icon on the cover, salesman leaflet"
gen ev_old_register 1024x1024 "$PIX, an old yellowed hospital registration ledger book, brittle pages, handwritten entries, one page corner torn out, 1980s style"
gen ev_nameless_films 1024x1024 "$PIX, a stack of old brown film envelopes for X-ray films, no names written, only date stamps, dusty"
gen ev_wen_card 1024x1024 "$PIX, a white business card with a small company logo and phone icon, elegant, slightly tilted"
gen ev_kai_survey 1024x1024 "$PIX, a room survey form clipboard: floor plan sketch with ruler and pencil markings, measurement numbers"
gen ev_pacs_log 1024x1024 "$PIX, a printed computer log page: terminal green text lines with timestamps on white paper, dot-matrix printout"
gen ev_mystery_sign 1024x1024 "$PIX, a hospital registration slip with a潦草 scribbled signature line, fountain pen resting on paper, dim mood"
gen ev_zhou_note 1024x1024 "$PIX, a handwritten medication instruction note on slightly crumpled paper, careful Chinese-doctor handwriting style strokes, a pill bottle beside"
echo "ALL LAUNCHED"; jobs | wc -l
