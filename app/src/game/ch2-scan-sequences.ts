import { assetUrl } from '../lib/chapter-assets'

/** Preview-only slice atlases. Case observations and diagnostic images stay separate.
 * Each admitted atlas must be backed by a reviewed, licensed volume and provenance.
 * No fallback to another body part, a different age group, or a fabricated stack.
 */
export interface Ch2SliceSequence {
  id: string
  /** Site-relative path, resolved using the configured Pages base. */
  asset: string
  frameCount: number
  columns: number
  rows: number
  frameWidth: number
  frameHeight: number
  label: string
  /** Same-series first frame, embedded tiny fallback; never waits on the network. */
  preview?: string
}

const PREVIEWS: Record<string, string> = {
  "adult-neck-cta-v1": "data:image/webp;base64,UklGRm4BAABXRUJQVlA4IGIBAAAQCgCdASpAAEAAP0WSulewKiUjqA36ACiJaQAW2AXVtYaTCm4lmK6rYm3jWBG3zGGlTrbRYWbWbVIEbvImV4KxHzrzQ41xps7tL1KZUbeWu8ditDRgQaiTAAD+8Uj3Xq7Qx4r6YIl96T7ycxBoqrW/1MgYlv+audqOoWle4Yza7lfH+HrkmkG7EGTIWnCFS5IcoKGA8B7zzwTg1b/YVhLusMXH1Ll+/u1vI7CArPJ7Y7tVogpA6QlONQbKYfdwm9zZPpr5TJjbL+eL2NbtVgvl4VWg+mK2WzQX7cwQAtnrhktzrN1wjif2gjd3Aj/q5pkRtIIM5sGm+RpgV+wv5HX0vB5R4GrON+sbWerwHXSCpFVegri9Z5os5J4zCbROuR/cP01FFf3r9qllEzrIvaPtkCyNWZsvJ0MwrK5HqI4tKwb+qEYCpM4bbrmW6nvhtCQXwfDc3Kptanb/lWBk16468AA=",
  "adult-head-dental-v1": "data:image/webp;base64,UklGRq4BAABXRUJQVlA4IKIBAABQCwCdASpAAEAAP0WGvFewKCWjrBqrMgAoiWkACwpnUzkFWP389imAgP2wdGVEHiPEOmDOLhOn/HeXJNQsGXbE04qQq+cc5BdnRFFqjCtTS4cn0lDzvj3hXIAXsHn2YsyKGAAA/vUiL43KwkuKKw7FzcEMBAoxwMwIw5+O08PS5OmIluW48Vv8wmUc8U8M24PJ+KsySD85zeFg1PZPLL0TQpt7GMlkaMHbruv3hMh1THpBKE/vBOGP2nqdxCpCemqQLmwH9VDr/dWl2tcOpY2A1UOOseaa6VAquY04D+NceUYOij6290dF/Bj0ULh1g2XgOmX2RiHvWsfTV2eXFDDr3KS8GQJYny28nSn6XE1S29oraVUuNsAglm30iOIK/Z3vGHQythwkW0WhStymAYIqTwT5L7sOWoraWNBG8inVoZ6bEXSozTaZshcM0o86sHgnCKqZ9o+AMxeKhPFIW63tanyfCSz2M3AygHHyU8ruPmYRpKAafGVJIQAf+7FfG2Hfty9G558hINlENh1UKf5YVI+3VV6UPNSYPZJgVxuYAAAA",
  "adult-head-plain-v1": "data:image/webp;base64,UklGRiABAABXRUJQVlA4IBQBAABwCACdASpAAEAAP0WUulgwKiUjrBK9mgAoiWkACBlqhd7rwkvl+XIKf/H7NzfX/KVhGYm2bTjZzN7df5FUmEBHZmM5CQjt9Dy4iaAAAP7xRMn7bwuSooEnlyqNko0yxQtfeoqXP1tUwylZDbUAtf3APrLrGcQYxtmf5+4FHinRXXYt/RuGWxTYHMStt79K0IcQC2uL06xK0bE0hGtWRq5YTVFAkB/Kqs2YSMPJtK1jzqB+r+tBtDgurbFeYfzdpjielG+73ahfaCpoju9vTySz3CWDF4qhOEBaxlUHwdKIQeD8Xpr1g1PvZ5lI4QyZWwWJuhtCEcoaZGLvKBPkcAsfo5vE3n6mFIo3dBE8uaId3kgAAAA=",
  "coronary-cta-v1": "data:image/webp;base64,UklGRmIBAABXRUJQVlA4IFYBAADQCwCdASpAAEAAP0WOulWwKiWjLhbccgAoiWkAAN433WOtGI8Dkm39m7jxOusUCtijTVBbOwYuvehcs7z7N6b2RrSbkl8b9MofgI7f2k0hOZUXrDlg+WDqTUZxddWK3Q/jR7HmxsAAAP7y4luRD60U21ZeqvfSEgJz2oDJ71nbz0hy+bKkiB23BlTXOypWeS6Aa5kwFHucxhXx8q5V+x9SeInsSoLZrijdLTzUzO8oCDh/ROEFDg86J35JO9lHY0UN0QyjJRuH9n6w3kxuD33ZWfdWZsHzynFcRcyb9gryIwVrHLLN4dpQ0hSwvHlTBZlm2X6l9hJSfY0WEVgyjIQTlByLBRap79ruvkzpRN4aomGTR3hSZlKxzq5TQQuLCLWGWF4UdOZyMq+7Immdu0r7FlQ6DzevctEA0vNr0V8AYkbSexg4t/BeX9OSom3+o7H+pVdAAAA=",
  "lumbar-pelvis-plain-v1": "data:image/webp;base64,UklGRsoAAABXRUJQVlA4IL4AAACQCACdASpAAEAAP0WIvVYwKCajrhSdUgAoiWkAAQif/MSHIRtnyZeCPJb2rxkQrgra50NTfrd04gzQwzFkRnz6MoewGdVpQV8rqOyKAAD+8PgeJSt4yLKxlICASgna9etE0GrjGIL8CxMDz0Oy0zwof7AGizW5wjtKuJRgpEq8IzBE5ANBPwK1CfTzLxGACV3COCy20AKQpioIDZRznFK4jHSnIGMJhTw1j4M+yFO1j849338cnj2vrihJAAAA",
  "chest-plain-v1": "data:image/webp;base64,UklGRuYBAABXRUJQVlA4INoBAADQDgCdASpAAEAAP0WWxFowKiekKBQKqgAoiWkADrA2fy5FRAJRqJ83ThHcUXfb6cO54KGcYd1Q/j7Tod8c4isCDcBOmkg7c5k4iZZ1CoELkQTcFpfp1PLy4QN0Uqaror+7NySzuCasdgDRHH/ceIl4Cp4HKAz4j7d0MXrn5QAAAP73cqNv1yMyO9hyeLw0IApc922Qx8YPqFdg7Jpk4+lJE+z0cWrEXfgYBU1jGNh42NQEorEly03KOSzRUC2rJrEJtc4lw6SJJOQuT7gKnuGYEHsNB3paxabAX6S/FyF1+xK92ywpKdSFuIprD6utDxR5D0NitGguimfONWvFZ2kNnrFGOfsfVCYOdRUzA2AJ8Z+ntaXE2Odyur6X8oi8MnwiIz4/UogiSP7DXtI7u5LT+m5Ig5dqTY94iThkIQnOBLuZRYrt68JIADkv6rlz5gnfOjeNP3qCzfG03OjCp5ANmSDkd+2U8vdjtskS9wYIHzSoeHkh3UmBvaTkoGzuaf8G28iSU2bHVJjFHVAxrmjCeo5DsoCR2aIYv1MEnJHbM8w/19qAIYoj3Bm/TLJCfD+ZdcqDS2D7LusqQC25sUn+tvumxjFWwZsmrfA7tCmddcDawkLc3aAAAAA=",
  "adult-head-dental-repeat-v1": "data:image/webp;base64,UklGRqYBAABXRUJQVlA4IJoBAAAQCwCdASpAAEAAP0WCu1ewJyWjrhkqqgAoiWkADo52YypIcRohVnBolyZYsxvxbStXBz5cjVyvMibKe/rlSz9XkysxsW8edEUWqR31mOsYkHjB4oTrYTpdn6Wv4yIoG0KgAP71Ii37YEi/hICg/d64IG8xUR+D3QuZ8YUgLQ8taEMam9lXkyTRHtMKPR3CGTjaFpQ/coPatIUnbwvUCB6VvLdkjhQEexuUN18FThToPyfjiwwTVa5iRmBF88amQCQweUq79dxXeXOjOzwRSei8D37f1zXvPoCrvlKOEiOMg1IVin/cUWrIZouCJZBu+ORfmQTyEkHuvIUfq3yhA8n4AiAze6WYe+p+F9i7/9lUbo5F2Bv+Ffz1ERGrmybASDKPsmXR89ksHbCTzjv/6X5z8ckSiqg4MV0YiaIZoOUoiwzrGModZAl2/Hr7NomNCNMQ2uEyDhxd7KwW7p34QfU178uLOtsEwveTD9G8CwxB8BEc/PlH2rzUkR09pQf+wdZ1U5Qa6ZH18dKzXygfP+hEljgXuDDAAAAAAA==",
  "wrist-bone-v1": "data:image/webp;base64,UklGRrAAAABXRUJQVlA4IKQAAAAwCACdASpAAEAAP0WWwVuwKaakKBQKqgAoiWkAAJ9QS0LO3r4adF4PCoTPDyKQyGAfOXjXqO/Vhfjr50oOtnTsZn9uAQUC04qUMAD+8K2+ET/UYNAYmSKctx3P6ctOeWLXq+vB18Jys/SpuwelJqoNybWHEFWgp9ZMMYtJ5qKcYY+Va/jFCrjIOm2eq+BLrkCWG/2v4h+IS6sbq829Z0ICMAAAAA==",
  "urinary-plain-v1": "data:image/webp;base64,UklGRjwBAABXRUJQVlA4IDABAAAQCwCdASpAAEAAP0WQvFWwKiYjLBVdmgAoiWkAAQA+As1/x4SqvV/752xJ8LPem9MTJe1Icilapw5pKsr1SXXQZ8EVgrwY1USS5myBPYwmWXNiLxQg7ZqH8kgUoEfzJpXAAP7xCJn92/rKJGbAiRTmCuMeEOiWAOzlnspWjEvN+RxEw73W97gBeaXA0gKtkp1xi8y3/UjKf4f40CmX0Zh11ezv4pTTfmuYWp4J73RhaBmKrAwOaNL8Hqn1LXSMuy99YY5gcsi+LsjDNYCf4sBZsyrmgSVp3Lc0cqlXtKdY7QPnePtsWg6Ntw621d+URoTCZ35T3SibKN56mIIovnN5jtly67kQ0ZfEAVinyE+/AkVBcLRVDIOVtkJ8P5lwBS/5oOhcqDnSb/0PTtIAAAAA",
  "aorta-cta-v1": "data:image/webp;base64,UklGRn4BAABXRUJQVlA4IHIBAADQCwCdASpAAEAAP0WawVswKqakJAtqACiJaQALC0m1CeS6RDnLKZZjr2apK6AH/2LyyA/2+6mHp4CxIimTCQfJeNSNOsXFUGCwaq+or4gtqdYwmdriG9HY38ecU12oSYoQXTe8yoAAAP72geakuPUH3JWbdXJX85irYrQ2KC7GvprbU4jbM7d5LiKoHh4W6fkQJLDx9OZ0lT8saq6GDOUjVKE34rSE3qo0+qir6jWTNxRNyvKrwT1avWN+MndcxMytRtTuP1PlTxNPWPtB+V8rQnbYMnsGFSM3c75q3mQApsBnQUnLFdfoViM0MU95PQVKu8YYhYw2u8tJf4sfD7H4cNrNqUoR+Lov0ef8dIjb3RxBUiBIm98X6fHH4ohsXJnbGrKRiVbP2nyBZsRrcDS+neRM/jTSWZXKvzCCLOt5iRMggCApA+7yw2qAaIxhHneASktqFVRacRvq+4QMpDGzSTs1RUi5JjLddVaMph6q5UAA",
  "adult-head-motion-v1": "data:image/webp;base64,UklGRhABAABXRUJQVlA4IAQBAADwBwCdASpAAEAAP0GQulSvqqWjLB1dmfAoCWkAATFUwGsaUcvy43EvzGFwXmhTbaxMqG/PrNKvt0aUZbxWs6XBwIu0faudoAAA/vFFEqb+79esZ6zQM1jnTBYxEzIwtHwm7Z9lhI8QfDsvUp2lO1AxYTaU3SzzgkwJv92b2wt49FZjh7XREgClvLyzibyA5bNsWnKbYzRZDOP0//g65nWFtzH+0guY5X2gu6m9hSPe/a4PAvoOj7N0X6JHVb44/i7mW4t3R+omQPv3uSqhvp/rn6Nqi8T1U9vA4amNLj57bDbmNz0l+AuE7a5cnnvvDTKFTPznJ47I9Gtc3zu1Ya5FIAAAAA==",
  "abdomen-plain-v1": "data:image/webp;base64,UklGRkYBAABXRUJQVlA4IDoBAACwCgCdASpAAEAAP0WMvVYwKSYjrBgMygAoiWkAAWLpsxoTQ03WRRqOslAyxsUVVYULgKyq1Y7Dn+TJQ0xbruj1eDZWBP/qsINX0xmqIYbULdCEZ285D+wXzqM8/2vgAP72TYSJc539x59npGNOnLFLhvJwoRGbcYNTHRqUeSeKYOPnIROg9BPukGYgCU8OLSV9unL414cNKcexPglP7sl0FZj9H8nBZGuF7bTbKar8TvvxIw+YXAtQSWeSyuTKplFaoPa0ZN/jdPxt4+A83yjKh2gPTXdUJi3jKZbJdeYV6wi1ycCMeqYInRq22t14qPu8YMRy54UEwpfHQiCdzbbbvoMiLjWLofORRZ9uHysIKjjwA7Bb/olwi2nnKWj9VgedHNP4jb39vRdL/gbJzOmMqwMPq8W1O8AAAA=="
}

// Entries are admitted after the real source volume and derived frames are reviewed.
function atlas(id: string, file: string, frameCount: number, columns: number, label: string, size = 192): Ch2SliceSequence {
  return { id, asset: `assets/ct-sequences/${file}.webp`, frameCount, columns,
    rows: Math.ceil(frameCount / columns), frameWidth: size, frameHeight: size, label, preview: PREVIEWS[file] }
}

export const CH2_SLICE_SEQUENCES: Record<string, Ch2SliceSequence> = {
  c2n1_m7: atlas('c2n1_m7', 'adult-head-plain-v1', 24, 4, '头颅 · 断层序列'),
  c2n1_p_scan: atlas('c2n1_p_scan', 'urinary-plain-v1', 24, 6, '肾区 · 断层序列'),
  c2d2_lung_scan: atlas('c2d2_lung_scan', 'chest-plain-v1', 24, 6, '胸部 · 肺窗序列'),
  c2d2_trauma_scan: atlas('c2d2_trauma_scan', 'lumbar-pelvis-plain-v1', 24, 6, '腰椎骨盆 · 骨窗序列'),
  c2d2_wrist_scan: atlas('c2d2_wrist_scan', 'wrist-bone-v1', 20, 5, '腕部 · 骨结构教学序列'),
  c2n3_m5: atlas('c2n3_m5', 'adult-head-motion-v1', 24, 4, '头颅 · 本次采集'),
  c2n3_repeat_scan: atlas('c2n3_repeat_scan', 'adult-head-plain-v1', 24, 4, '头颅 · 补充采集'),
  c2n3_cta_scan: atlas('c2n3_cta_scan', 'adult-neck-cta-v1', 24, 6, '头颈 CTA · 颅底断层'),
  c2n3_coronary_scan: atlas('c2n3_coronary_scan', 'coronary-cta-v1', 24, 6, '冠脉 CTA · 断层序列'),
  c2n3_mystery_scan: atlas('c2n3_mystery_scan', 'adult-head-plain-v1', 24, 4, '头颅 · 断层序列'),
  c2d4_aorta_scan: atlas('c2d4_aorta_scan', 'aorta-cta-v1', 24, 6, '主动脉 CTA · 胸部断层'),
  c2d4_metal_scan: atlas('c2d4_metal_scan', 'adult-head-dental-v1', 16, 4, '头部 · 本次采集'),
  c2d4_m1: atlas('c2d4_m1', 'adult-head-dental-repeat-v1', 16, 4, '头部 · 补充采集'),
}

export function getCh2SliceSequence(id: string | undefined): Ch2SliceSequence | undefined {
  return id ? CH2_SLICE_SEQUENCES[id] : undefined
}

/** One elapsed-time input for the table, sound and image; never an independent loop. */
export function ch2SliceFrameIndex(sequence: Ch2SliceSequence, progress: number): number {
  const p = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 1
  return Math.min(sequence.frameCount - 1, Math.floor(p * sequence.frameCount))
}

const prefetched = new Set<string>()

/** Optional local decode warmup only; admission has already fetched the full chapter. */
export function preloadCh2SliceSequence(id: string | undefined): void {
  const sequence = getCh2SliceSequence(id)
  if (!sequence || typeof Image === 'undefined' || prefetched.has(sequence.asset)) return
  prefetched.add(sequence.asset)
  const image = new Image()
  image.decoding = 'async'
  // A failed optional request must not be retried for every typewriter update.
  image.onerror = () => undefined
  const url = assetUrl(sequence.asset)
  // Legacy previews may run without admission; never restart lazy network loading.
  if (!url.startsWith('blob:')) return
  image.src = url
}
