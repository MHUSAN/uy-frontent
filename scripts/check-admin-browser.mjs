// Isolated local admin E2E only. Never deletes remote accounts.
import assert from 'node:assert/strict'
const token = process.env.ADMIN_TEST_TOKEN
const userId = Number(process.env.ADMIN_TEST_USER)
assert.ok(token && userId)
const pages = await (await fetch('http://127.0.0.1:9337/json/list')).json()
const ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl)
await new Promise(resolve => { ws.onopen = resolve })
let id = 0
const pending = new Map()
ws.onmessage = event => { const m = JSON.parse(event.data); if (m.id) { pending.get(m.id)?.(m); pending.delete(m.id) } }
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const n = ++id
  const timer = setTimeout(() => reject(Error(method + ' timeout')), 15000)
  pending.set(n, m => { clearTimeout(timer); m.error ? reject(Error(method)) : resolve(m.result) })
  ws.send(JSON.stringify({ id: n, method, params }))
})
const ev = async expression => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw Error('Browser evaluation failed')
  return r.result.value
}
const wait = async expression => {
  for (let i = 0; i < 120; i++) { if (await ev(expression)) return; await new Promise(r => setTimeout(r, 100)) }
  throw Error('Browser condition timed out: ' + expression)
}
const click = async text => {
  assert.equal(await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b)return false;b.click();return true})()`), true)
}
try {
  await send('Page.navigate', { url: 'http://127.0.0.1:5175/' })
  await wait('!!document.querySelector("header")')
  await ev(`localStorage.setItem('tezuy.token',${JSON.stringify(token)});localStorage.setItem('tezuy.language','en')`)
  await send('Page.navigate', { url: 'http://127.0.0.1:5175/admin?tab=users' })
  await wait("document.body.textContent.includes('Admin Browser Target')")
  await ev("[...document.querySelectorAll('article')].find(e=>e.textContent.includes('Admin Browser Target')).querySelector('button').click()")
  await wait("document.body.textContent.includes('Admin Browser Listing')")
  assert.equal(await ev("new URLSearchParams(location.search).get('ownerId')"), String(userId))
  await click('All listings')
  await wait("document.body.textContent.includes('Admin Browser Listing')")
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  assert.equal(await ev('document.documentElement.scrollWidth <= innerWidth'), true)
  await click('Users')
  await wait("document.body.textContent.includes('Admin Browser Target')")
  const deleteTarget = () => ev("[...document.querySelectorAll('article')].find(e=>e.textContent.includes('Admin Browser Target')).querySelectorAll('button')[1].click()")
  await wait("!![...document.querySelectorAll('article')].find(e=>e.textContent.includes('Admin Browser Target'))?.querySelectorAll('button')[1] && ![...document.querySelectorAll('article')].find(e=>e.textContent.includes('Admin Browser Target')).querySelectorAll('button')[1].disabled")
  await deleteTarget(); await wait("!!document.querySelector('[role=alertdialog]')")
  await click('Cancel')
  assert.equal(await ev("!!document.querySelector('[role=alertdialog]')"), false)
  await deleteTarget(); await wait("!!document.querySelector('[role=alertdialog]')")
  assert.equal(await ev("document.querySelector('[role=alertdialog]').textContent.includes('all their listings')"), true)
  await ev("document.querySelector('[role=alertdialog] button:last-child').click()")
  await wait("!document.querySelector('[role=alertdialog]') && !document.body.textContent.includes('Admin Browser Target')")
  console.log('Admin browser PASS: owner filter, all-status view, 390px layout, deletion cancel/confirm and refreshed user list.')
} finally { await ev("localStorage.removeItem('tezuy.token')"); ws.close() }
