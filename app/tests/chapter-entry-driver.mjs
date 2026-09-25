/** Follow the production loading UI; never bypass the real asset gate in tests. */
export async function awaitChapterEntry(page) {
  await page.waitForFunction(() => {
    const loader = document.querySelector('[data-chapter-loader]')
    if (loader) return ['ready', 'error'].includes(loader.getAttribute('data-status'))
    return !!document.querySelector('[data-ch1-step], [data-ch2-step], [data-ch2-settlement], [data-ch2-quiz]') ||
      [...document.querySelectorAll('h1,h2,p')].some(node => node.textContent === '白天 · 科室经营') ||
      [...document.querySelectorAll('button')].some(node => /^(出发，上夜班|回到夜班现场) →$/.test(node.textContent.trim()))
  }, undefined, { timeout: 120000 })
  const loader = page.locator('[data-chapter-loader]')
  if (!await loader.count()) return
  if (await loader.getAttribute('data-status') === 'error') throw new Error(`Chapter assets failed: ${await loader.textContent()}`)
  await page.locator('[data-chapter-enter]').click()
  await loader.waitFor({ state: 'detached' })
}
