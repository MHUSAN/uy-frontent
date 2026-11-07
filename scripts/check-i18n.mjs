import { readFile, readdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const languages = ['uz', 'ru', 'en']
const resources = Object.fromEntries(
  await Promise.all(
    languages.map(async (lang) => [
      lang,
      (await import(`../src/locales/${lang}.ts`)).default,
    ]),
  ),
)
const leaves = (value, prefix = '', output = new Map()) => {
  for (const [key, item] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof item === 'string') output.set(path, item)
    else leaves(item, path, output)
  }
  return output
}
const keys = Object.fromEntries(
  languages.map((lang) => [lang, leaves(resources[lang])]),
)
const errors = []
const reference = keys.en
for (const lang of languages) {
  const missing = [...reference.keys()].filter((key) => !keys[lang].has(key))
  const extra = [...keys[lang].keys()].filter((key) => !reference.has(key))
  console.log(
    `${lang}: ${keys[lang].size} keys; missing: ${missing.length}; extra: ${extra.length}`,
  )
  for (const key of missing) errors.push(`${lang}: missing ${key}`)
  for (const key of extra) errors.push(`${lang}: extra ${key}`)
  for (const [key, value] of keys[lang]) {
    if (!value.trim()) errors.push(`${lang}: empty ${key}`)
    const placeholders = (input) =>
      [...input.matchAll(/{{\s*([^},\s]+)[^}]*}}/g)]
        .map((match) => match[1])
        .sort()
        .join(',')
    if (
      reference.has(key) &&
      placeholders(value) !== placeholders(reference.get(key))
    )
      errors.push(`${lang}: interpolation mismatch ${key}`)
  }
  // Locale files use plain nested objects. Also detect duplicate properties,
  // which a runtime import alone would silently overwrite.
  const text = await readFile(resolve(root, `src/locales/${lang}.ts`), 'utf8')
  const stack = []
  const seen = new Set()
  for (const line of text.split('\n')) {
    const match = line.match(/^(\s*)(?:['"]([^'"]+)['"]|([\w]+)):\s*(.*)/)
    if (!match) continue
    const indent = match[1].length
    while (stack.length && stack.at(-1).indent >= indent) stack.pop()
    const key = [...stack.map((item) => item.key), match[2] || match[3]].join(
      '.',
    )
    if (seen.has(key)) errors.push(`${lang}: duplicate ${key}`)
    seen.add(key)
    if (match[4].startsWith('{'))
      stack.push({ indent, key: match[2] || match[3] })
  }
}
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? files(resolve(dir, entry.name))
          : [resolve(dir, entry.name)],
      ),
    )
  ).flat()
}
const allowed = new Set(['TezUy', 'USD', 'UZS', 'EUR'])
for (const file of await files(resolve(root, 'src'))) {
  if (!file.endsWith('.tsx')) continue
  const source = await readFile(file, 'utf8')
  for (const match of source.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)) {
    const key = match[1]
    if (!reference.has(key) && !reference.has(`${key}_other`))
      errors.push(`${file}: unknown translation ${key}`)
  }
  for (const match of source.matchAll(
    /<[A-Za-z][\w.]*(?:[^>"']|"[^"\n]*"|'[^'\n]*')*>\s*([A-Za-z\u0400-\u04ff][^<>{}]*)\s*<\//g,
  )) {
    const text = match[1].trim()
    if (text && !allowed.has(text))
      errors.push(`${file}: hardcoded JSX text ${text}`)
  }
  for (const match of source.matchAll(
    /\b(?:placeholder|aria-label|title|alt)="([^"\n]+)"/g,
  )) {
    if (!allowed.has(match[1]))
      errors.push(`${file}: hardcoded UI attribute ${match[1]}`)
  }
}
if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else
  console.log(
    'Translation parity, placeholders, duplicate keys, literal translation references and JSX text checks passed.',
  )
