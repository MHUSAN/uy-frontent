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
await send('Page.enable')

// All responses are from the isolated NestJS test server. Only explicit
// network-failure cases below intercept transport, never user identity.
const base = 'http://127.0.0.1:5175'
const propertyId = process.env.I18N_PROPERTY_ID
const ownId = process.env.I18N_OWN_PROPERTY_ID
const languages = ['uz', 'ru', 'en']
const locales = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' }
const widths = [320, 390, 768, 1024, 1440]
const results = []
async function until(expression, label) {
  for (let i = 0; i < 150; i++) {
    if (await evaluate(expression)) return
    await pause(60)
  }
  throw new Error(
    `Timed out: ${label}; ` +
      (await evaluate(`document.querySelector('main')?.innerText`)),
  )
}
async function attach() {
  await evaluate(
    `(async()=>{window.__i18n=(await import('/src/locales/index.ts')).default; window.__missing=[]; window.__i18n.options.saveMissing=true; window.__i18n.on('missingKey',(_languages,_namespace,key)=>window.__missing.push(key)); window.__noReload=true})()`,
  )
}
async function load(path, waitReady = true) {
  const marker = String(Date.now()) + Math.random()
  await evaluate(`window.__navigationMarker=${JSON.stringify(marker)}`)
  await send('Page.navigate', { url: base + path })
  await until(
    `window.__navigationMarker!==${JSON.stringify(marker)} && document.readyState==='complete' && location.pathname===${JSON.stringify(path.split('?')[0])} && !!document.querySelector('main')?.textContent.trim()`,
    'load ' + path,
  )
  await attach()
  if (!waitReady) return
  await until(
    `!document.querySelector('header [role="status"]') && ![...document.querySelectorAll('main [role="status"]')].some(node=>node.textContent===window.__i18n.t('common.loading'))`,
    'ready ' + path,
  )
}
async function setLang(lang, mobile = false) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: mobile ? 320 : 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile,
  })
  if (mobile) {
    await evaluate(
      `document.querySelector('header button[aria-controls="mobile-navigation"]').click()`,
    )
    await until(
      `!!document.querySelector('#mobile-navigation')`,
      'mobile drawer',
    )
  }
  await evaluate(
    `[...document.querySelectorAll('${mobile ? '#mobile-navigation' : 'header'} button')].find(button=>button.textContent.trim()===${JSON.stringify(lang.toUpperCase())}).click()`,
  )
  await until(
    `document.documentElement.lang===${JSON.stringify(lang)}`,
    'language ' + lang,
  )
  if (mobile)
    await evaluate(
      `document.querySelector('header button[aria-controls="mobile-navigation"]').click()`,
    )
  assert.equal(
    await evaluate(`window.__noReload`),
    true,
    'language switching must not reload',
  )
  assert.equal(await evaluate(`localStorage.getItem('tezuy.language')`), lang)
}
async function fill(values) {
  await evaluate(
    `(()=>{for(const [id,value] of Object.entries(${JSON.stringify(values)})){const input=document.getElementById(id);if(!input)throw new Error(id);const prototype=input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:input.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(input,value);input.dispatchEvent(new Event(input.tagName==='SELECT'?'change':'input',{bubbles:true}));}})()`,
  )
}
const formSnapshot = () =>
  evaluate(
    `JSON.stringify([...document.querySelectorAll('main input,main textarea,main select')].map(input=>[input.id,input.value]))`,
  )
async function verifyView(
  label,
  heading,
  { errorKey, successKey, preserve = false, content = [], dialog = false } = {},
) {
  const snapshot = preserve ? await formSnapshot() : null
  for (const language of languages) {
    await setLang(language)
    if (preserve)
      assert.equal(await formSnapshot(), snapshot, `${label}: form values lost`)
    if (heading)
      assert.equal(
        await evaluate(`document.querySelector('main h1').textContent`),
        await evaluate(`window.__i18n.t(${JSON.stringify(heading)})`),
        label,
      )
    if (errorKey)
      assert.ok(
        (
          await evaluate(
            `document.querySelector('main [role="alert"]')?.textContent`,
          )
        ).includes(
          await evaluate(`window.__i18n.t(${JSON.stringify(errorKey)})`),
        ),
        `${label} error language`,
      )
    if (successKey)
      assert.ok(
        (await evaluate(`document.querySelector('main').textContent`)).includes(
          await evaluate(`window.__i18n.t(${JSON.stringify(successKey)})`),
        ),
        label + ' success language',
      )
    for (const text of content)
      assert.ok(
        (await evaluate(`document.querySelector('main').textContent`)).includes(
          text,
        ),
        `${label}: original content changed`,
      )
    assert.deepEqual(
      await evaluate(`window.__missing`),
      [],
      label + ' missing keys',
    )
    // Detect exact English resource values leaked into another language.
    const leaked = await evaluate(
      `(()=>{const resource=window.__i18n.getResourceBundle('en','translation');const paths=[];const walk=(value,path='')=>Object.entries(value).forEach(([key,item])=>typeof item==='string'?paths.push([path?path+'.'+key:key,item]):walk(item,path?path+'.'+key:key));walk(resource);const english=new Set(paths.filter(([key,text])=>!text.includes('{{')&&text!==window.__i18n.t(key)&&text.length>2).map(([,text])=>text));const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const leaked=[];let node;while(node=walker.nextNode()){if(node.parentElement?.closest('script,style'))continue;const text=node.textContent.trim();if(english.has(text)&&node.parentElement?.getBoundingClientRect().width>0)leaked.push(text);}return leaked;})()`,
    )
    assert.deepEqual(leaked, [], `${label}/${language} English leakage`)
    assert.equal(
      await evaluate(
        `/\b(PENDING|APPROVED|REJECTED|SALE|RENT)\b/.test(document.querySelector('main').innerText)`,
      ),
      false,
      `${label} raw enums`,
    )
    for (const width of widths) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height: 1000,
        deviceScaleFactor: 1,
        mobile: width < 768,
      })
      await pause(20)
      const layout = await evaluate(
        `(()=>{const panel=document.querySelector('[role="dialog"] > div, [role="alertdialog"] > div');const bounds=panel?.getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,clipped:!!bounds&&(bounds.left<0||bounds.right>innerWidth||bounds.bottom>innerHeight)}})()`,
      )
      assert.equal(
        layout.overflow,
        false,
        `${label}/${language}/${width} overflow`,
      )
      assert.equal(
        layout.clipped,
        false,
        `${label}/${language}/${width} clipped dialog`,
      )
      results.push({ label, language, width, passed: true })
      if (
        language === 'ru' &&
        width === 320 &&
        [
          'property-create',
          'admin-categories',
          'admin-properties',
          'admin-dialog',
        ].includes(label)
      ) {
        const shot = await send('Page.captureScreenshot', { format: 'png' })
        await writeFile(
          `/tmp/tezuy-i18n-${label}-320-ru.png`,
          Buffer.from(shot.data, 'base64'),
        )
      }
    }
  }
  if (dialog) return
}
async function login(email, password, destination) {
  await load('/login')
  await fill({ email, password })
  await evaluate(`document.querySelector('form').requestSubmit()`)
  await until(
    `location.pathname===${JSON.stringify(destination)} && !!document.querySelector('header button[aria-haspopup="menu"]')`,
    'login',
  )
  await attach()
}
async function logout() {
  await evaluate(
    `document.querySelector('header button[aria-haspopup="menu"]').click()`,
  )
  await until(`!!document.querySelector('[role="menu"]')`, 'account menu')
  await evaluate(
    `document.querySelector('[role="menu"] button[role="menuitem"]').click()`,
  )
  await until(
    `location.pathname==='/login' && !localStorage.getItem('tezuy.token')`,
    'logout',
  )
  await attach()
}
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
})
await load('/')
await evaluate(
  `localStorage.removeItem('tezuy.token');localStorage.removeItem('tezuy.language')`,
)
await load('/')
assert.equal(
  await evaluate(`document.documentElement.lang`),
  'uz',
  'Uzbek must be the default even with an English browser',
)
await setLang('ru', true)
await send('Page.reload')
await pause(250)
await attach()
assert.equal(
  await evaluate(`document.documentElement.lang`),
  'ru',
  'language survives reload',
)
await verifyView('guest-home', 'home.title')
await fill({ 'region-search': 'Original unmatched region' })
await verifyView('region-search-preservation', 'home.title', { preserve: true })
await fill({ 'region-search': '' })
// Search results use real approved fixtures; canonical and custom categories differ.
await load('/?type=SALE')
await until(
  `document.querySelector('main').textContent.includes('Original receiving title')`,
  'public results',
)
await verifyView('public-results', 'home.title', {
  content: ['Original receiving title', 'Original custom category'],
})
await load(`/elonlar/${propertyId}`)
await verifyView('public-detail', null, {
  content: [
    'Original public title',
    'Original description written by the seller.',
  ],
})
for (const language of languages) {
  await setLang(language)
  const expected = await evaluate(
    `new Intl.NumberFormat(${JSON.stringify(locales[language])},{style:'currency',currency:'UZS',maximumFractionDigits:2,minimumFractionDigits:0}).format(7654321.89)`,
  )
  assert.ok(
    (await evaluate(`document.querySelector('main').textContent`)).includes(
      expected,
    ),
    'currency must preserve value and locale',
  )
  const body = await evaluate(`document.querySelector('main').textContent`)
  const expectedDate = await evaluate(
    `new Intl.DateTimeFormat(${JSON.stringify(locales[language])},{dateStyle:'medium',timeStyle:'short'}).format(new Date('2026-11-06T12:34:00Z'))`,
  )
  const expectedArea = await evaluate(
    `new Intl.NumberFormat(${JSON.stringify(locales[language])},{maximumFractionDigits:2}).format(82.25)`,
  )
  assert.ok(body.includes(expectedDate), 'date must follow selected locale')
  assert.ok(body.includes(expectedArea), 'area must retain fractional value')
}
await load('/not-a-real-route')
await verifyView('not-found', 'notFound.title')
for (const [path, mode] of [
  ['/login', 'login'],
  ['/register', 'register'],
  ['/verify-email', 'verify'],
  ['/forgot-password', 'forgot'],
  ['/reset-password', 'reset'],
]) {
  await load(path)
  if (mode === 'register') {
    await fill({
      fullName: 'Original unsaved name',
      email: 'i18n-register@example.com',
      password: 'Password123',
      confirmPassword: 'Different123',
    })
    await evaluate(`document.querySelector('form').requestSubmit()`)
  } else if (mode === 'login') {
    await fill({ email: 'invalid-email', password: 'Password123' })
    await evaluate(`document.querySelector('form').requestSubmit()`)
  } else if (mode === 'reset') {
    await fill({
      email: 'i18n-reset@example.com',
      code: '123456',
      password: 'Password123',
      confirmPassword: 'Different123',
    })
    await evaluate(`document.querySelector('form').requestSubmit()`)
  } else if (mode === 'forgot') {
    await fill({ email: 'invalid-email' })
    await evaluate(`document.querySelector('form').requestSubmit()`)
  } else {
    await fill({ email: 'i18n-verify@example.com', code: '123456' })
    await evaluate(`document.querySelector('form').requestSubmit()`)
    await until(`!!document.querySelector('main [role="alert"]')`, 'OTP error')
  }
  const errorKey =
    mode === 'register' || mode === 'reset'
      ? 'authFlow.mismatch'
      : mode === 'verify'
        ? 'authFlow.invalidCode'
        : 'authFlow.invalidEmail'
  await verifyView('auth-' + mode, `authFlow.${mode}Title`, {
    errorKey,
    preserve: true,
  })
}
await setLang('ru')
await login(process.env.AUTH_TEST_EMAIL, 'Replacement-123', '/dashboard')
assert.equal(
  await evaluate(`document.documentElement.lang`),
  'ru',
  'language survives login',
)
await setLang('uz', true)
await load('/profile')
await verifyView('profile', 'account.profile')
await load('/dashboard')
await verifyView('seller', 'account.listings', {
  content: ['Original pending title'],
})
for (const path of ['/elon-berish', `/elonlar/${ownId}/tahrir`]) {
  await load(path)
  const edit = path.includes('tahrir')
  if (!edit)
    await fill({
      title: 'Original unsaved title',
      description: 'Original unsaved description',
      price: '12345.67',
      region: 'tashkentCity',
      category: String(process.env.I18N_CATEGORY_ID),
    })
  await evaluate(
    `(()=>{const data=new DataTransfer();data.items.add(new File([new Uint8Array([137,80,78,71])],'Original photo.png',{type:'image/png'}));const input=document.querySelector('#images');input.files=data.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  )
  const originalTitle = await evaluate(`document.querySelector('#title').value`)
  await fill({ title: 'x' })
  await evaluate(`document.querySelector('form').requestSubmit()`)
  await verifyView(
    edit ? 'property-edit' : 'property-create',
    edit ? 'form.edit' : 'form.create',
    { errorKey: 'validation.title', preserve: true },
  )
  await fill({ title: originalTitle })
  if (!edit) {
    await fill({ area: '82.25', price: '12345.6700' })
    await evaluate(
      `(()=>{const data=new DataTransfer();data.items.add(new File(['invalid'],'Original attachment.pdf',{type:'application/pdf'}));const input=document.querySelector('#images');input.files=data.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
    )
    await evaluate(`document.querySelector('form').requestSubmit()`)
    await verifyView('upload-validation', 'form.create', {
      errorKey: 'errors.upload',
      preserve: true,
    })
  }
}
// App-owned confirmations translate their messages and both action buttons live.
await load('/dashboard')
await evaluate(
  `[...document.querySelectorAll('main article')].find(article=>article.textContent.includes('Original pending title')).querySelector('button').click()`,
)
await until(
  `!!document.querySelector('[role="alertdialog"]')`,
  'seller confirmation',
)
await verifyView('seller-confirmation', 'account.listings', {
  content: ['Original pending title'],
})
assert.equal(
  await evaluate(
    `document.querySelector('[role="alertdialog"] button').textContent`,
  ),
  await evaluate(`window.__i18n.t('common.cancel')`),
)
await send('Input.dispatchKeyEvent', {
  type: 'keyDown',
  key: 'Tab',
  code: 'Tab',
  windowsVirtualKeyCode: 9,
})
await send('Input.dispatchKeyEvent', {
  type: 'keyDown',
  key: 'Tab',
  code: 'Tab',
  windowsVirtualKeyCode: 9,
})
assert.equal(
  await evaluate(
    `document.activeElement===document.querySelector('[role="alertdialog"] button')`,
  ),
  true,
  'confirmation traps keyboard focus',
)
await send('Input.dispatchKeyEvent', {
  type: 'keyDown',
  key: 'Escape',
  code: 'Escape',
  windowsVirtualKeyCode: 27,
})
await until(
  `!document.querySelector('[role="alertdialog"]')`,
  'Escape cancels confirmation',
)
await load('/sevimlilar')
await verifyView('favorites', 'account.favorites', {
  content: ['Original public title'],
})
await evaluate(`document.querySelector('main article button').click()`)
await until(
  `document.querySelector('main').textContent.includes(window.__i18n.t('favorites.empty'))`,
  'real empty favorites',
)
await verifyView('favorites-empty', 'account.favorites')
// Hold a real request while switching languages through the loading state.
const paused = []
events.set('Fetch.requestPaused', async (params) => {
  if (params.request.method === 'OPTIONS')
    await send('Fetch.continueRequest', { requestId: params.requestId })
  else paused.push(params.requestId)
})
await send('Fetch.enable', {
  patterns: [{ urlPattern: '*/favorites', requestStage: 'Request' }],
})
await load('/sevimlilar', false)
await until(
  `!!document.querySelector('main [role="status"]') && !document.querySelector('header [role="status"]')`,
  'loading state',
)
await verifyView('loading-state', null, { successKey: 'common.loading' })
for (const requestId of paused) {
  try {
    await send('Fetch.continueRequest', { requestId })
  } catch {
    /* Strict Mode may cancel its first request. */
  }
}
await send('Fetch.disable')
events.delete('Fetch.requestPaused')
await until(`!!document.querySelector('main h1')`, 'request resumes')
await load("/so'rovlar")
await verifyView('inquiries-sent', 'inquiries.title', {
  content: ['Original inquiry message sent by the user.'],
})
await evaluate(
  `document.querySelector('main button[aria-pressed="false"]').click()`,
)
await verifyView('inquiries-received', 'inquiries.title', {
  content: ['Original inquiry message received by the user.'],
})
await load(`/elonlar/${propertyId}`)
await fill({ 'inquiry-message': 'x', 'inquiry-phone': '+998901234567' })
await evaluate(`document.querySelector('main form').requestSubmit()`)
await verifyView('inquiry-validation', null, {
  errorKey: 'validation.message',
  preserve: true,
})
await fill({
  'inquiry-message': 'Original inquiry submitted by the browser.',
  'inquiry-phone': '+998901234567',
})
await evaluate(`document.querySelector('main form').requestSubmit()`)
await until(
  `document.querySelector('main').textContent.includes(window.__i18n.t('details.sent'))`,
  'real inquiry success',
)
await verifyView('inquiry-success', null, {
  successKey: 'details.sent',
  preserve: true,
})
// Explicit transport failure: never render backend/technical strings.
events.set('Fetch.requestPaused', async (params) => {
  if (params.request.method === 'OPTIONS') {
    await send('Fetch.continueRequest', { requestId: params.requestId })
    return
  }
  await send('Fetch.fulfillRequest', {
    requestId: params.requestId,
    responseCode: 500,
    responseHeaders: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Access-Control-Allow-Origin', value: base },
    ],
    body: Buffer.from(
      JSON.stringify({ message: 'SQL connection secret technical details' }),
    ).toString('base64'),
  })
})
await send('Fetch.enable', {
  patterns: [{ urlPattern: '*/favorites', requestStage: 'Request' }],
})
await load('/sevimlilar')
await verifyView('safe-api-error', 'account.favorites', {
  errorKey: 'errors.unexpected',
})
assert.equal(
  await evaluate(
    `document.querySelector('main').textContent.includes('SQL connection')`,
  ),
  false,
)
await send('Fetch.disable')
events.delete('Fetch.requestPaused')
events.set('Fetch.requestPaused', async (params) => {
  if (params.request.method === 'OPTIONS')
    await send('Fetch.continueRequest', { requestId: params.requestId })
  else
    await send('Fetch.failRequest', {
      requestId: params.requestId,
      errorReason: 'ConnectionFailed',
    })
})
await send('Fetch.enable', {
  patterns: [{ urlPattern: '*/favorites', requestStage: 'Request' }],
})
await load('/sevimlilar')
await verifyView('network-error', 'account.favorites', {
  errorKey: 'errors.network',
})
await send('Fetch.disable')
events.delete('Fetch.requestPaused')
await setLang('ru')
await logout()
assert.equal(
  await evaluate(`document.documentElement.lang`),
  'ru',
  'language survives logout',
)
await login('auth-admin@example.com', 'Initial-password-123', '/admin')
await setLang('uz', true)
for (const status of ['PENDING', 'APPROVED', 'REJECTED']) {
  await load(`/admin?tab=properties&status=${status}`)
  await verifyView(
    status === 'PENDING' ? 'admin-properties' : 'admin-' + status.toLowerCase(),
    'admin.title',
  )
}
await load('/admin?tab=properties&status=PENDING')
await evaluate(`document.querySelector('main article button').click()`)
await verifyView('admin-dialog', 'admin.title', {
  content: ['Original pending title'],
  dialog: true,
})
await evaluate(`document.querySelector('[role="dialog"] button').click()`)
await evaluate(
  `[...document.querySelectorAll('main article button')].find(button=>button.textContent===window.__i18n.t('admin.approve')).click()`,
)
await until(
  `!!document.querySelector('[role="alertdialog"]')`,
  'moderation confirmation',
)
await verifyView('moderation-confirmation', 'admin.title')
assert.ok(
  (
    await evaluate(
      `document.querySelector('[role="alertdialog"] p').textContent`,
    )
  ).includes(await evaluate(`window.__i18n.t('status.APPROVED')`)),
)
await evaluate(
  `document.querySelectorAll('[role="alertdialog"] button')[1].click()`,
)
await until(
  `document.querySelector('main').textContent.includes(window.__i18n.t('admin.statusChanged')) && !document.querySelector('[role="alertdialog"]')`,
  'real moderation success',
)
await verifyView('moderation-success', 'admin.title', {
  successKey: 'admin.statusChanged',
})
await load('/admin?tab=users')
await verifyView('admin-users', 'admin.title')
await load('/admin?tab=categories')
await fill({
  'category-name': process.env.I18N_CATEGORY_NAME,
  'category-slug': 'i18n-test-duplicate',
})
await evaluate(`document.querySelector('main form').requestSubmit()`)
await until(
  `!!document.querySelector('main [role="alert"]')`,
  'backend duplicate category error',
)
await verifyView('admin-categories', 'admin.title', {
  errorKey: 'errors.categoryName',
  preserve: true,
  content: ['Original custom category'],
})
await evaluate(`document.querySelector('main article button').click()`)
await until(
  `!!document.querySelector('[role="alertdialog"]')`,
  'category confirmation',
)
await verifyView('category-confirmation', 'admin.title')
assert.equal(
  await evaluate(
    `document.querySelector('[role="alertdialog"] p').textContent`,
  ),
  await evaluate(
    `window.__i18n.t('admin.deleteCategoryConfirm',{name:window.__i18n.t('categoryLabels.apartments')})`,
  ),
)
await evaluate(`document.querySelector('[role="alertdialog"] button').click()`)
await until(
  `!document.querySelector('[role="alertdialog"]')`,
  'category cancellation',
)
await fill({
  'category-name': 'Original browser category',
  'category-slug': 'i18n-test--browser-category',
})
await evaluate(`document.querySelector('main form').requestSubmit()`)
await until(
  `document.querySelector('main').textContent.includes(window.__i18n.t('common.saved')) && document.querySelector('main').textContent.includes('Original browser category')`,
  'real category success',
)
await verifyView('category-success', 'admin.title', {
  successKey: 'common.saved',
  preserve: true,
  content: ['Original browser category'],
})
await logout()
await writeFile(
  '/tmp/tezuy-i18n-browser-results.json',
  JSON.stringify(results, null, 2),
)
console.log(
  `Multilingual API/browser checks passed: ${results.length} route/language/viewport combinations; Uzbek default; mobile switching; persistence; form/error state; original user content; localized enums, categories, money/dates; safe API errors and confirmations.`,
)
ws.close()
