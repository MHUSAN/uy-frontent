// Start Vite on 5175 and headless Chromium with --remote-debugging-port=9337.
// No browser libraries required; uses Node's native CDP WebSocket client.
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
const pages = await (await fetch('http://127.0.0.1:9337/json/list')).json()
const ws = new WebSocket(
  pages.find((p) => p.type === 'page').webSocketDebuggerUrl,
)
let id = 0
const pending = new Map()
const events = new Map()
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  if (!msg.id) events.get(msg.method)?.(msg.params)
  if (msg.id) {
    pending.get(msg.id)?.(msg)
    pending.delete(msg.id)
  }
}
await new Promise((resolve, reject) => {
  ws.onopen = resolve
  ws.onerror = reject
})
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const current = ++id
    const timer = setTimeout(
      () => reject(new Error(`CDP timed out: ${method}`)),
      15000,
    )
    pending.set(current, (msg) => {
      clearTimeout(timer)
      if (msg.error) reject(new Error(JSON.stringify(msg.error)))
      else resolve(msg.result)
    })
    ws.send(JSON.stringify({ id: current, method, params }))
  })
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })
  if (result.exceptionDetails)
    throw new Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
async function navigate(path) {
  await send('Page.navigate', { url: `http://127.0.0.1:5175${path}` })
  for (let i = 0; i < 100; i++) {
    if (
      await evaluate(
        `location.pathname === ${JSON.stringify(path)} && !!document.querySelector('form')`,
      )
    )
      return
    await pause(100)
  }
  throw new Error(`Page did not load: ${path}`)
}
await send('Page.enable')

await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
})
await navigate('/login')
await evaluate(
  `localStorage.removeItem('tezuy.token'); localStorage.setItem('tezuy.language','en')`,
)
await send('Page.reload')
await pause(300)
const fill = async (values) => {
  await evaluate(
    `(() => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; for (const [id,value] of Object.entries(${JSON.stringify(values)})) { const input=document.getElementById(id); setter.call(input,value); input.dispatchEvent(new Event('input',{bubbles:true})); } })()`,
  )
}
async function waitPath(path) {
  for (let i = 0; i < 100; i++) {
    if (
      await evaluate(
        `location.pathname === ${JSON.stringify(path)} && !!document.querySelector('main')?.textContent.trim()`,
      )
    )
      return
    await pause(100)
  }
  throw new Error(
    `Expected ${path}; current: ` +
      (await evaluate(`location.pathname + ' ' + document.body.innerText`)),
  )
}

const account = 'header button[aria-haspopup="menu"]'
async function until(expression, label) {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(expression)) return
    await pause(75)
  }
  throw new Error(`Timed out: ${label}`)
}
async function openAccount() {
  if (!(await evaluate(`!!document.querySelector('[role="menu"]')`)))
    await evaluate(`document.querySelector('${account}').click()`)
  await until(`!!document.querySelector('[role="menu"]')`, 'account opens')
}
async function closeAccount() {
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  })
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  })
  await until(`!document.querySelector('[role="menu"]')`, 'escape closes')
}
async function logout() {
  await openAccount()
  await evaluate(
    `document.querySelector('[role="menu"] button[role="menuitem"]').click()`,
  )
  await waitPath('/login')
  assert.equal(await evaluate(`localStorage.getItem('tezuy.token')`), null)
  assert.equal(await evaluate(`!!document.querySelector('${account}')`), false)
}
async function login(email, password, destination) {
  await navigate('/login')
  await fill({ email, password })
  await evaluate(`document.querySelector('form').requestSubmit()`)
  await waitPath(destination)
  await until(
    `!!document.querySelector('${account}')`,
    'header updates after login',
  )
  assert.equal(
    await evaluate(
      `document.querySelectorAll('header a[href="/login"], header a[href="/register"]').length`,
    ),
    0,
  )
}
async function reloadSession(name) {
  let pausedRequest
  events.set('Fetch.requestPaused', (params) => {
    pausedRequest = params.requestId
  })
  await send('Fetch.enable', {
    patterns: [{ urlPattern: '*auth/me', requestStage: 'Request' }],
  })
  await send('Page.reload')
  for (let i = 0; i < 100 && !pausedRequest; i++) await pause(50)
  assert.ok(pausedRequest, 'real GET /auth/me intercepted during restoration')
  assert.equal(
    await evaluate(`!!document.querySelector('header [role="status"]')`),
    true,
  )
  assert.equal(
    await evaluate(
      `document.querySelectorAll('header a[href="/login"],header a[href="/register"],${account}').length`,
    ),
    0,
  )
  await send('Fetch.continueRequest', { requestId: pausedRequest })
  await send('Fetch.disable')
  events.delete('Fetch.requestPaused')
  await until(
    `!!document.querySelector('${account}')`,
    'verified identity restored',
  )
  assert.ok(
    (
      await evaluate(`document.querySelector('${account}').textContent`)
    ).includes(name),
  )
}
const results = []
async function checkLayouts(role) {
  for (const language of ['UZ', 'RU', 'EN']) {
    // Controls exist in the closed mobile drawer; open it when needed.
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await evaluate(
      `[...document.querySelectorAll('header button')].find(b => b.textContent.trim() === '${language}').click()`,
    )
    for (const [themeIndex, theme] of ['light', 'dark', 'system'].entries()) {
      await evaluate(
        `[...document.querySelectorAll('header [role="group"]')].find(g => g.querySelector('svg')).querySelectorAll('button')[${themeIndex}].click()`,
      )
      for (const width of [320, 390, 640, 768, 1024, 1440]) {
        await send('Emulation.setDeviceMetricsOverride', {
          width,
          height: 1000,
          deviceScaleFactor: 1,
          mobile: width < 768,
        })
        await pause(25)
        if (role !== 'GUEST') await openAccount()
        const check = await evaluate(`(() => {
          const menu = document.querySelector('[role="menu"]');
          const box = menu?.getBoundingClientRect();
          return { overflow:document.documentElement.scrollWidth>innerWidth,
            clipped:!!box && (box.left<0 || box.right>innerWidth || box.bottom>innerHeight),
            links: [...document.querySelectorAll('[role="menu"] a')].map(a=>a.getAttribute('href')),
            guest: [...document.querySelectorAll('header a[href="/login"],header a[href="/register"]')].filter(a=>a.getBoundingClientRect().width>0).length,
            create: [...document.querySelectorAll('header a[href="/elon-berish"]')].length }
        })()`)
        assert.equal(
          check.overflow,
          false,
          `${role}/${language}/${theme}/${width} overflow`,
        )
        assert.equal(
          check.clipped,
          false,
          `${role}/${language}/${theme}/${width} clipped`,
        )
        if (role === 'GUEST') {
          assert.equal(check.guest, 2)
          assert.equal(check.create, 0)
        } else if (role === 'ADMIN') {
          assert.equal(check.links.length, 2)
          assert.equal(check.create, 0)
          assert.ok(check.links.every((href) => href.startsWith('/admin')))
        } else
          assert.deepEqual(check.links, [
            '/profile',
            '/dashboard',
            '/elon-berish',
            '/sevimlilar',
            "/so'rovlar",
          ])
        if (
          language === 'EN' &&
          theme === 'light' &&
          [320, 1440].includes(width)
        ) {
          const screenshot = await send('Page.captureScreenshot', {
            format: 'png',
          })
          await writeFile(
            `/tmp/tezuy-header-${role.toLowerCase()}-${width}.png`,
            Buffer.from(screenshot.data, 'base64'),
          )
        }
        results.push({ role, language, theme, width, passed: true })
        if (role !== 'GUEST') await closeAccount()
      }
    }
  }
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  })
}
await send('Page.navigate', { url: 'http://127.0.0.1:5175/' })
await until(
  `!!document.querySelector('header a[href="/register"]')`,
  'guest homepage',
)
await checkLayouts('GUEST')
await login(process.env.AUTH_TEST_EMAIL, 'Replacement-123', '/dashboard')
const userName = process.env.AUTH_TEST_NAME || 'Test User'
assert.ok(
  (await evaluate(`document.querySelector('${account}').textContent`)).includes(
    userName,
  ),
)
assert.equal(
  await evaluate(
    `document.querySelector('${account} span[aria-hidden="true"]').textContent`,
  ),
  'AU',
)
// Stored identity and role are ignored; only the token is restored through the API.
await evaluate(
  `localStorage.setItem('tezuy.user', JSON.stringify({fullName:'Forged Administrator',role:'ADMIN'}))`,
)
await send('Page.navigate', { url: 'http://127.0.0.1:5175/' })
await until(`!!document.querySelector('${account}')`, 'home identity')
await reloadSession(userName)
await openAccount()
assert.ok(
  (
    await evaluate(`document.querySelector('[role="menu"]').textContent`)
  ).includes(process.env.AUTH_TEST_EMAIL),
)
assert.equal(
  await evaluate(
    `document.querySelector('[role="menu"]').textContent.includes('Forged Administrator')`,
  ),
  false,
)
// Arrow navigation wraps; Home, End, Escape and Tab retain normal focus behavior.
assert.equal(
  await evaluate(`document.activeElement.getAttribute('href')`),
  '/profile',
)
for (const key of ['End', 'Home', 'ArrowDown', 'ArrowUp']) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key })
  await pause(10)
}
assert.equal(
  await evaluate(`document.activeElement.getAttribute('href')`),
  '/profile',
)
await closeAccount()
assert.equal(
  await evaluate(`document.activeElement.matches('${account}')`),
  true,
)
await send('Input.dispatchKeyEvent', {
  type: 'keyDown',
  key: 'ArrowUp',
  code: 'ArrowUp',
})
await until(`!!document.querySelector('[role="menu"]')`, 'keyboard opens menu')
assert.equal(await evaluate(`document.activeElement.tagName`), 'BUTTON')
await send('Input.dispatchKeyEvent', {
  type: 'keyDown',
  key: 'Tab',
  code: 'Tab',
  windowsVirtualKeyCode: 9,
})
await until(`!document.querySelector('[role="menu"]')`, 'Tab leaves menu')
await openAccount()
await send('Input.dispatchMouseEvent', {
  type: 'mousePressed',
  x: 20,
  y: 240,
  button: 'left',
  clickCount: 1,
})
await send('Input.dispatchMouseEvent', {
  type: 'mouseReleased',
  x: 20,
  y: 240,
  button: 'left',
  clickCount: 1,
})
await until(`!document.querySelector('[role="menu"]')`, 'outside click closes')
await checkLayouts('USER')
await send('Emulation.setDeviceMetricsOverride', {
  width: 320,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: true,
})
await evaluate(
  `document.querySelector('header button[aria-controls="mobile-navigation"]').click()`,
)
await until(
  `!!document.querySelector('#mobile-navigation')`,
  'mobile navigation opens',
)
await openAccount()
assert.equal(
  await evaluate(`!!document.querySelector('#mobile-navigation')`),
  false,
)
await closeAccount()
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
})
// Exercise every user link against actual working routes and real API responses.
for (const route of [
  '/profile',
  '/dashboard',
  '/elon-berish',
  '/sevimlilar',
  "/so'rovlar",
]) {
  await openAccount()
  await evaluate(
    `[...document.querySelectorAll('[role="menu"] a')].find(a=>a.getAttribute('href')===${JSON.stringify(route)}).click()`,
  )
  await waitPath(route)
  assert.equal(
    await evaluate(`!!document.querySelector('[role="menu"]')`),
    false,
  )
  if (route === '/profile') {
    assert.ok(
      (await evaluate(`document.querySelector('main').textContent`)).includes(
        process.env.AUTH_TEST_EMAIL,
      ),
    )
    assert.ok(
      (await evaluate(`document.querySelector('main').textContent`)).includes(
        userName,
      ),
    )
  }
}
await send('Page.navigate', { url: 'http://127.0.0.1:5175/admin' })
await waitPath('/')
await logout()
// Invalid and expired JWTs restore guest controls, never stored fake identity.
for (const token of ['invalid-token', process.env.AUTH_EXPIRED_TOKEN]) {
  assert.ok(token)
  await evaluate(`localStorage.setItem('tezuy.token',${JSON.stringify(token)})`)
  await send('Page.reload')
  await until(
    `localStorage.getItem('tezuy.token') === null && !!document.querySelector('header a[href="/register"]') && !document.querySelector('header [role="status"]')`,
    'invalid session cleared',
  )
  assert.equal(await evaluate(`localStorage.getItem('tezuy.token')`), null)
  assert.equal(await evaluate(`!!document.querySelector('${account}')`), false)
}
await login('auth-admin@example.com', 'Initial-password-123', '/admin')
await reloadSession('Test Admin')
await send('Page.navigate', { url: 'http://127.0.0.1:5175/' })
await until(`!!document.querySelector('${account}')`, 'administrator homepage')
await checkLayouts('ADMIN')
await openAccount()
await evaluate(
  `document.querySelector('[role="menu"] a[href="/admin"]').click()`,
)
await waitPath('/admin')
await evaluate(
  `[...document.querySelectorAll('main button')].find(b=>b.textContent==='Users').click()`,
)
await openAccount()
await evaluate(
  `document.querySelector('[role="menu"] a[href*="status=PENDING"]').click()`,
)
await until(
  `location.search.includes('tab=properties') && location.search.includes('status=PENDING')`,
  'moderation link selects pending listings',
)
assert.equal(
  await evaluate(
    `document.querySelectorAll('header a[href="/elon-berish"],header a[href="/dashboard"],header a[href="/sevimlilar"]').length`,
  ),
  0,
)
await logout()
await evaluate(`localStorage.removeItem('tezuy.user')`)
await writeFile(
  '/tmp/tezuy-account-header-results.json',
  JSON.stringify(results, null, 2),
)
console.log(
  `Real API browser checks passed: identity from /auth/me, USER/ADMIN menus, all account links, restoration without guest flash, ignored forged identity, logout, invalid/expired tokens, keyboard/outside/Escape behavior, ${results.length} responsive/language/theme combinations.`,
)
ws.close()
