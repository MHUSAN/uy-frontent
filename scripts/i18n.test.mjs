import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatArea,
  formatDate,
  formatNumber,
  formatPrice,
  getIntlLocale,
} from '../src/utils/format.ts'
import { getErrorKey } from '../src/api/errors.ts'

const spaces = (text) => text.replace(/[\u00a0\u202f]/g, ' ')
test('prices preserve fractional amounts and the original currency', () => {
  assert.equal(formatPrice(12345.67, 'USD', 'en'), '$12,345.67')
  const sum = spaces(formatPrice(7654321.89, 'UZS', 'ru'))
  assert.ok(sum.includes('7 654 321,89'))
  assert.ok(!sum.includes('$'))
  assert.ok(formatPrice(123.45, 'EUR', 'en').includes('123.45'))
})
test('area, counts and coordinates retain precision in each locale', () => {
  assert.equal(formatArea(82.25, 'en'), '82.25')
  assert.equal(formatArea(82.25, 'ru'), '82,25')
  assert.equal(formatArea(82.25, 'uz'), '82,25')
  assert.equal(spaces(formatNumber(12345, 'ru')), '12 345')
  assert.equal(formatNumber(41.31234, 'uz', 5), '41,31234')
})
test('locale selection handles variants and defaults to Uzbek', () => {
  assert.equal(getIntlLocale('ru-RU'), 'ru-RU')
  assert.equal(getIntlLocale('en-US'), 'en-US')
  assert.equal(getIntlLocale('unexpected'), 'uz-UZ')
  assert.equal(formatDate('not-a-date', 'uz'), '—')
  assert.ok(formatDate('2026-11-06T12:34:00Z', 'ru').includes('2026'))
  assert.ok(!formatDate('2026-11-06T12:34:00Z', 'ru').includes('Nov'))
})
test('stable API codes and legacy validation messages map to translation keys', () => {
  assert.equal(
    getErrorKey({ code: 'EMAIL_EXISTS', status: 409 }),
    'authFlow.duplicate',
  )
  assert.equal(
    getErrorKey({ status: 409, message: 'Bunday nomli kategoriya mavjud' }),
    'errors.categoryName',
  )
  assert.equal(
    getErrorKey({ status: 400, message: 'phone must be a valid phone number' }),
    'validation.phone',
  )
  assert.equal(getErrorKey({ status: 403 }), 'errors.forbidden')
  assert.equal(getErrorKey({ status: 413 }), 'errors.upload')
})
test('unknown technical messages never become rendered feedback', () => {
  assert.equal(
    getErrorKey({ status: 500, message: 'SQL password secret stack trace' }),
    'errors.unexpected',
  )
  assert.equal(
    getErrorKey(new Error('ECONNREFUSED internal-host')),
    'errors.network',
  )
})
