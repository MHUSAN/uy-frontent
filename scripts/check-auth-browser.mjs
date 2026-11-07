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
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
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
const results = []
for (const route of [
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
]) {
  await navigate(route)
  for (const lang of ['UZ', 'RU', 'EN']) {
    await evaluate(
      `[...document.querySelectorAll('button')].find(b => b.textContent.trim() === '${lang}').click()`,
    )
    await pause(30)
    for (const [themeIndex, theme] of ['light', 'dark', 'system'].entries()) {
      await evaluate(
        `[...document.querySelectorAll('[role="group"]')].find(g => g.querySelector('svg')).querySelectorAll('button')[${themeIndex}].click()`,
      )
      await pause(20)
      for (const width of [320, 390, 768, 1024, 1440]) {
        await send('Emulation.setDeviceMetricsOverride', {
          width,
          height: 1000,
          deviceScaleFactor: 1,
          mobile: width < 768,
        })
        await pause(20)
        const check = await evaluate(`(() => {
          const form = document.querySelector('form');
          const fields = [...form.querySelectorAll('input')];
          return { width: innerWidth, scroll: document.documentElement.scrollWidth, title: document.querySelector('h1').textContent, lang: document.documentElement.lang, theme: localStorage.getItem('tezuy.theme'), missingLabels: fields.filter(f => !document.querySelector('label[for="' + f.id + '"]')).length, clipped: fields.filter(f => { const r=f.getBoundingClientRect(); return r.left<0 || r.right>innerWidth }).length, adminLink: !!document.querySelector('a[href="/admin/login"]') }
        })()`)
        assert.ok(
          check.scroll <= width,
          `${route} overflow ${lang}/${theme}/${width}`,
        )
        assert.equal(check.clipped, 0)
        assert.equal(check.missingLabels, 0)
        assert.equal(check.adminLink, false)
        assert.equal(check.lang, lang.toLowerCase())
        assert.equal(check.theme, theme)
        assert.ok(check.title && !check.title.includes('authFlow.'))
        results.push({ route, lang, theme, width, passed: true })
        if (lang === 'EN' && theme === 'light' && width === 1440) {
          const screenshot = await send('Page.captureScreenshot', {
            format: 'png',
          })
          await writeFile(
            `/tmp/tezuy-auth-${route.slice(1)}.png`,
            Buffer.from(screenshot.data, 'base64'),
          )
        }
      }
    }
  }
}
await navigate('/register')
assert.equal(
  await evaluate(`document.querySelector('input[name="phone"]')`),
  null,
)
assert.equal(
  await evaluate(`document.querySelectorAll('form input').length`),
  4,
)
// Set values through the native setter so React receives actual input events.
await evaluate(`(() => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  for (const [id,value] of [['fullName','Test User'],['email','test@example.com'],['password','Password123'],['confirmPassword','Different123']]) { const input=document.getElementById(id); setter.call(input,value); input.dispatchEvent(new Event('input',{bubbles:true})); }
})()`)
await evaluate(`document.querySelector('form').requestSubmit()`)
await pause(100)
assert.ok(
  (
    await evaluate(`document.querySelector('[role="alert"]')?.textContent`)
  ).includes('match'),
)
// Every password toggle is independently accessible and changes the input type.
await evaluate(
  `document.querySelector('button[aria-label="Show password"]').click()`,
)
assert.equal(await evaluate(`document.querySelector('#password').type`), 'text')
// Numeric input accepts a pasted six-digit code through the native input event.
await navigate('/verify-email')
await evaluate(
  `(() => { const data=new DataTransfer(); data.setData('text','123 456'); document.getElementById('code').dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true})); })()`,
)
assert.equal(await evaluate(`document.querySelector('#code').value`), '123456')
await navigate('/login')
await evaluate(`document.querySelector('#email').focus()`)
await send('Input.dispatchKeyEvent', {
  type: 'keyDown',
  key: 'Tab',
  code: 'Tab',
  windowsVirtualKeyCode: 9,
})
await send('Input.dispatchKeyEvent', {
  type: 'keyUp',
  key: 'Tab',
  code: 'Tab',
  windowsVirtualKeyCode: 9,
})
assert.equal(await evaluate(`document.activeElement.id`), 'password')
// Custom validation stays in the selected language instead of browser locale.
await evaluate(
  `(() => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; for (const [id,value] of [['email','invalid-email'],['password','Password123']]) { const input=document.getElementById(id); setter.call(input,value); input.dispatchEvent(new Event('input',{bubbles:true})); } })()`,
)
await evaluate(`document.querySelector('form').requestSubmit()`)
await pause(50)
assert.ok(
  (
    await evaluate(`document.querySelector('[role="alert"]')?.textContent`)
  ).includes('valid email'),
)
// System follows an OS dark preference.
await send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-color-scheme', value: 'dark' }],
})
await evaluate(
  `[...document.querySelectorAll('[role="group"]')].find(g => g.querySelector('svg')).querySelectorAll('button')[2].click()`,
)
await pause(50)
assert.equal(
  await evaluate(`document.documentElement.classList.contains('dark')`),
  true,
)
await writeFile(
  '/tmp/tezuy-auth-browser-results.json',
  JSON.stringify(results, null, 2),
)
console.log(
  `${results.length} responsive/language/theme combinations passed; registration fields, mismatch, password visibility, OTP input and System theme passed.`,
)
ws.close()
