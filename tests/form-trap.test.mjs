// The four site forms' hidden bot trap must never lose a real person's message, and spam or a
// failed send must never be counted as a lead in GA4.
//
// 2026-10-02: a real lead on HindLight Media never arrived. Its trap was a field named "company"
// with a "Company" label, which Chrome and Edge autofill from the visitor's own saved address.
// These forms had the same trap. Separately, the generator-managed GA4 block in every page's
// <head> fires generate_lead on EVERY submit event (attempt, failure and spam alike).
//
// Eric, same day: label it, never squash it. The trap is `website` labeled "Leave this blank".
// A filled one STILL SENDS, its value riding as `company` (what forge-lead-worker reads to label
// the lead "[Possible spam]"); the trap field itself is not sent. generate_lead fires once, after
// a real 2xx, only when the trap was empty; a filled trap fires form_possible_spam instead.
//
// This runs the REAL managed GA4 block from contact/index.html together with js/main.js in a
// fake DOM, dispatching a submit the way a browser does (document capture listeners first, then
// the form's own), so a regenerated GA4 block cannot slip an attempt-level lead past the guard.
//
// Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const root = new URL('../', import.meta.url)
const read = (p) => readFileSync(new URL(p, root), 'utf8')
const mainJs = read('js/main.js')
const contactHtml = read('contact/index.html')

const FORM_PAGES = {
  'contact/index.html': 'contact-form',
  'get-involved/volunteer/index.html': 'volunteer-form',
  'get-involved/church-partners/index.html': 'church-form',
  'index.html': 'newsletter-form',
}
for (const [page, formId] of Object.entries(FORM_PAGES)) {
  test(`${page}: the trap is not an autofill target`, () => {
    const html = read(page)
    const form = html.match(new RegExp(`<form[^>]*id="${formId}"[\\s\\S]*?</form>`))[0]
    assert.ok(!/\b(name|id|for)="[^"]*\b(company|organization)\b/i.test(form), 'no field named or id\'d for an autofill company slot')
    assert.ok(!/>\s*Company\s*</i.test(form), 'no "Company" label for autofill to match')
    assert.match(form, /<label for="[\w-]+-website">Leave this blank<\/label>/, 'trap labeled Leave this blank')
    assert.match(form, /<input type="text" id="[\w-]+-website" name="website" tabindex="-1" autocomplete="off">/, 'trap is out of the tab order, autocomplete off')
    assert.match(form, /class="hp-field" aria-hidden="true"/, 'trap sits in the off-screen wrapper')
  })
}

const managedGa4 = (() => {
  const m = contactHtml.match(/<!-- ga4:begin[^>]*-->\s*<script async[^>]*><\/script>\s*<script>([\s\S]*?)<\/script>\s*<!-- ga4:end -->/)
  assert.ok(m, 'found the generator-managed GA4 block in contact/index.html')
  return m[1]
})()

function runPage({ trap, reply, withMainJs = true }) {
  const posts = []
  const docListeners = []
  const formListeners = []
  let release
  const gate = new Promise((r) => { release = r })
  const dataLayer = []
  const status = { innerHTML: '', classList: { toggle() {} } }
  const button = { disabled: false, textContent: 'Send Message' }
  const values = { name: 'Check Only', email: 'check@example.com', message: 'headless', website: trap }
  const form = {
    id: 'contact-form', tagName: 'FORM', action: 'https://brothersplace.org/contact/',
    dataset: { form: 'contact', successMessage: 'Thank you.' },
    getAttribute: () => null,
    querySelector(sel) {
      if (sel === 'button[type="submit"]') return button
      if (sel === '[data-form-status]') return status
      return null
    },
    addEventListener(type, fn) { if (type === 'submit') formListeners.push(fn) },
    reset() {},
  }
  class FakeFormData {
    keys() { return Object.keys(values)[Symbol.iterator]() }
    getAll(k) { return [values[k]] }
  }
  const ctx = {
    dataLayer,
    document: {
      referrer: '', documentElement: { classList: { add() {} }, scrollHeight: 0 },
      addEventListener: (type, fn, capture) => docListeners.push({ type, fn, capture }),
      querySelectorAll: (sel) => (sel === 'form[data-form]' ? [form] : []),
      querySelector: () => null,
    },
    location: { pathname: '/contact/', search: '', href: 'https://brothersplace.org/contact/', hostname: 'brothersplace.org' },
    sessionStorage: { getItem: () => null, setItem() {} },
    addEventListener() {}, innerHeight: 800, scrollY: 0,
    FormData: FakeFormData, URL, URLSearchParams,
    fetch: (url, init) => { posts.push(JSON.parse(init.body)); return gate.then(() => { if (reply instanceof Error) throw reply; return reply }) },
  }
  ctx.window = ctx
  vm.createContext(ctx)
  // Page order: the managed GA4 block in <head>, then main.js (deferred), then DOMContentLoaded.
  vm.runInContext(managedGa4, ctx)
  if (withMainJs) {
    vm.runInContext(mainJs, ctx)
    for (const l of docListeners.filter((l) => l.type === 'DOMContentLoaded')) l.fn()
  }
  // A browser's submit event: document capture listeners first, then the form's own.
  const event = { target: form, preventDefault() {} }
  for (const l of docListeners.filter((l) => l.type === 'submit' && l.capture)) l.fn(event)
  for (const fn of formListeners) fn(event)
  const names = () => dataLayer.map((a) => Array.from(a)).filter((a) => a[0] === 'event').map((a) => a[1])
  return {
    posts, names, status,
    async settle() { release(); await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r)) },
  }
}
const ok = { ok: true, status: 200 }
const res = (status) => ({ ok: status >= 200 && status < 300, status })

test('control: the managed GA4 block alone counts every submit attempt as generate_lead (the bug)', () => {
  const run = runPage({ trap: '', reply: ok, withMainJs: false })
  assert.deepEqual(run.names(), ['generate_lead'])
})

test('a filled trap sends once as company, is not sent as itself, and fires form_possible_spam after the 2xx', async () => {
  const run = runPage({ trap: '  123 Main St  ', reply: ok })
  assert.equal(run.posts.length, 1, 'one POST, not thanks-and-return')
  assert.equal(run.posts[0].company, '123 Main St', 'trap value rides as company, trimmed')
  assert.ok(!('website' in run.posts[0]), 'the trap field is deleted from the payload')
  assert.equal(run.posts[0].form, 'contact')
  assert.equal(run.posts[0].email, 'check@example.com', 'real fields still go')
  assert.deepEqual(run.names(), [], 'nothing fires on the attempt, not even the managed block\'s generate_lead')
  await run.settle()
  assert.deepEqual(run.names(), ['form_possible_spam'])
  assert.match(run.status.innerHTML, /Thank you/, 'the visitor still sees thanks, the message was delivered')
})

test('an empty or whitespace trap sends company "" and fires generate_lead exactly once, after the 2xx', async () => {
  for (const trap of ['', '   ']) {
    const run = runPage({ trap, reply: ok })
    assert.equal(run.posts.length, 1)
    assert.equal(run.posts[0].company, '', 'company is present and empty')
    assert.ok(!('website' in run.posts[0]))
    assert.deepEqual(run.names(), [], 'no lead on the attempt')
    await run.settle()
    assert.deepEqual(run.names(), ['generate_lead'])
  }
})

test('a 503, 422, 404 or dead network fires no lead and no spam event, and never shows thanks', async () => {
  for (const trap of ['', 'Acme']) {
    for (const reply of [res(503), res(422), res(404), new Error('network down')]) {
      const run = runPage({ trap, reply })
      assert.equal(run.posts.length, 1)
      await run.settle()
      assert.deepEqual(run.names(), [], `no event for ${reply.status ?? reply.message}`)
      assert.doesNotMatch(run.status.innerHTML, /Thank you/)
    }
  }
})
