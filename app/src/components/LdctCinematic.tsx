import type { LdctCinematic as Scene } from '../game/ldct-cinematics'
import { imageAsset } from '../lib/image-assets'
import './LdctCinematic.css'

/** A quiet camera beat inside the normal shared dialogue stage. It neither
 * captures input nor owns playback/state: click-to-advance stays unchanged. */
export function LdctCinematic({ scene }: { scene: Scene }) {
  return <figure className={`ldct-cinematic ldct-cinematic--${scene.motion}`}
    data-ldct-cinematic={scene.id}>
    <div className="ldct-cinematic__frame">
      <img className="ldct-cinematic__image pixel" src={imageAsset(scene.image)} alt={scene.alt} draggable={false} />
    </div>
    {scene.locked && <figcaption className="ldct-cinematic__locked" data-ldct-module-locked>
      <svg viewBox="0 0 24 24" aria-hidden="true" shapeRendering="crispEdges">
        <path d="M7 10V5h10v5M5 10h14v11H5z" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M11 14h2v4h-2z" fill="currentColor" />
      </svg>
      <span>迭代重建 <span aria-hidden="true">·</span> 未购买模块</span>
    </figcaption>}
  </figure>
}
