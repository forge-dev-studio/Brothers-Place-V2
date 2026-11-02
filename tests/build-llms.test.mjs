// llms.txt is generated from sitemap.xml by tools/build-llms.mjs in the publish step. It must list every
// sitemap webpage exactly once, except the Privacy and Terms webpage and anything marked noindex, and it
// must hold no dollar figure, no em or en dash and no carriage return.
//
// Run: npm test
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const locs = [...readFileSync(join(root, 'sitemap.xml'), 'utf8').matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1])
const pathOf = (loc) => new URL(loc).pathname.replace(/^\/+|\/+$/g, '')
const fileOf = (loc) => join(root, pathOf(loc) ? pathOf(loc) + '/index.html' : 'index.html')
const noindex = (loc) => {
  const head = readFileSync(fileOf(loc), 'utf8').split(/<\/head>/i)[0]
  return /<meta[^>]+name=["'](robots|googlebot)["'][^>]*content=["'][^"']*\b(noindex|none)\b/i.test(head)
}
const leftOut = (loc) => /(^|\/)(404|privacy|terms|thank-?you|thanks)(\/|$)/i.test(pathOf(loc)) || /^legal(\/|$)/.test(pathOf(loc)) || noindex(loc)

const outDir = mkdtempSync(join(tmpdir(), 'bp-llms-test-'))
after(() => rmSync(outDir, { recursive: true, force: true }))
const gen = spawnSync(process.execPath, [join(root, 'tools', 'build-llms.mjs'), outDir], { cwd: root, encoding: 'utf8' })
const file = join(outDir, 'llms.txt')
const txt = existsSync(file) ? readFileSync(file, 'utf8') : ''

test('the generator runs clean and writes llms.txt', () => {
  assert.equal(gen.status, 0, `exit ${gen.status}\n${gen.stdout}${gen.stderr}`)
  assert.ok(existsSync(file) && statSync(file).size > 0)
  assert.match(txt, /^# \S/)
})

test('every sitemap webpage that is not left out is listed exactly once', () => {
  const expected = locs.filter((loc) => !leftOut(loc))
  for (const loc of expected) assert.equal(txt.split('](' + loc + ')').length - 1, 1, `${loc} should be listed once`)
  assert.equal(txt.split('\n').filter((l) => l.startsWith('- [')).length, expected.length)
})

test('the Privacy and Terms webpage is left out', () => {
  const skipped = locs.filter(leftOut)
  assert.ok(skipped.some((loc) => pathOf(loc) === 'legal'), 'expected /legal/ to be left out')
  for (const loc of skipped) assert.ok(!txt.includes('](' + loc + ')'), `${loc} should be left out`)
})

test('the word "dollar" without a figure is not a price: Donate and Financials keep their descriptions', () => {
  for (const path of ['get-involved/donate', 'about/financials']) {
    const line = txt.split('\n').find((l) => l.includes('/' + path + '/)'))
    assert.ok(line, `${path} should be listed`)
    assert.match(line, /\): \S/, `${path} should keep its description`)
  }
})

test('no dollar figure, no em or en dash, LF line endings, one newline at the end', () => {
  assert.ok(!txt.includes('$'))
  assert.ok(!/[–—]/.test(txt))
  assert.ok(!txt.includes('\r'))
  assert.ok(txt.endsWith('\n') && !txt.endsWith('\n\n'))
})
