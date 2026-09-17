#!/bin/bash
cd /app/.agents/plugins/image_generation
A=/mnt/agents/output/app/public/assets
gen() {
  nohup python3 scripts/image_generation_tool.py generate --description "$2" --size "$3" --background opaque --output "$A/$1.png" > "/tmp/imggen.$1.log" 2>&1 &
}
PIX="retro pixel art style, 16-bit game asset icon, solid black background, single object centered, muted warm colors, detailed pixel shading"
CT="grayscale medical CT scan image, axial slice, realistic radiology imaging style, black background, no text, no watermark"

gen item_coffee "$PIX, a instant coffee packet and a white mug with steam, night shift vibe" 1024x1024
gen item_milktea "$PIX, a plastic cup of bubble milk tea with straw and pearls" 1024x1024
gen item_snack "$PIX, a snack gift bag with cookies and chips spilling out" 1024x1024
gen item_book "$PIX, a thick old second-hand medical textbook with worn cover and sticky notes" 1024x1024
gen item_lottery "$PIX, a scratch-off lottery ticket, half scratched, coin beside" 1024x1024
gen item_toolbox "$PIX, a red metal toolbox with multimeter and insulating tape" 1024x1024
gen item_dosimeter "$PIX, a personal radiation dosimeter badge with small digital screen and clip" 1024x1024
gen item_key "$PIX, an old brass key with aged patina, ornate head" 1024x1024
gen ct_head_bleed "$CT, hypertensive intracerebral hemorrhage: a large bright white hyperdense hematoma in the right basal ganglia region, surrounded by darker edema, slight midline shift" 1024x1024
gen ct_kidney_stone "$CT, abdominal CT at kidney level: a tiny very bright white calcified stone at the left ureterovesical junction, kidneys and spine visible" 1024x1024
gen ct_ring_artifact "$CT, head CT with severe ring artifact: concentric circular rings centered on the image overlaying the brain, calibration error artifact" 1024x1024
gen ev_old_photo "$PIX, an old faded yellowed photograph of a hospital radiology team from the 1980s, white border, curled corner" 1024x1024
echo LAUNCHED; sleep 3; jobs | wc -l