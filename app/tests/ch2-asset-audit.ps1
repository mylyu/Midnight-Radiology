param([string]$OutputPath = (Join-Path $PSScriptRoot '../../../ch2-portraits-contact.png'))
# Decode the actual canonical WebP with pinned Sharp, not nonexistent old PNGs.
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
$auditAppDirectory = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$auditScript = @'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { deliveryManifest, liveMedia, sha256 } from './tests/game-delivery-media.mjs'
const rows=deliveryManifest().images.filter(row=>row.name.startsWith('ch2_pixel_')).sort((a,b)=>a.name.localeCompare(b.name))
assert(rows.length>0,'Do not pass an empty portrait inventory')
const cellW=224,cellH=330,layers=[],audit=[]
for(const [i,row] of rows.entries()){
 const bytes=liveMedia(row.sourcePath).bytes
 const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 const x=(i%5)*cellW,y=Math.floor(i/5)*cellH
 const thumb=await sharp(bytes).resize({width:210,height:292,fit:'inside',kernel:'nearest'}).toBuffer()
 const metadata=await sharp(thumb).metadata()
 layers.push({input:thumb,left:x+Math.floor((cellW-metadata.width)/2),top:y})
 const label=row.name.replace('ch2_pixel_','');assert(/^[\w-]+$/.test(label))
 layers.push({input:Buffer.from(`<svg width='224' height='24'><text x='5' y='16' font-family='monospace' font-size='12' fill='white'>${label}</text></svg>`),left:x,top:y+299})
 let transparent=0,total=0
 for(let py=0;py<info.height;py+=20)for(let px=0;px<info.width;px+=20){total++;if(data[(py*info.width+px)*4+3]===0)transparent++}
 audit.push({File:row.deliveryPath,Width:info.width,Height:info.height,TransparentSamplePercent:Math.round(1000*transparent/total)/10,SHA256:sha256(bytes)})
}
await sharp({create:{width:5*cellW,height:Math.ceil(rows.length/5)*cellH,channels:4,background:{r:33,g:44,b:60,alpha:1}}}).composite(layers).png().toFile(process.argv[1])
console.log(JSON.stringify(audit,null,2))
'@
Push-Location -LiteralPath $auditAppDirectory
try {
  & node --input-type=module --eval $auditScript $resolvedOutput
  if ($LASTEXITCODE -ne 0) { throw 'Canonical portrait audit failed' }
} finally { Pop-Location }
