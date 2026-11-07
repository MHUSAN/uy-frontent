export class ApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** Store this key in React state and translate at render time. Never render
 * provider messages, Prisma errors or unrecognized backend strings. */
export function getErrorKey(error: unknown): string {
  const api = error as {
    status?: number
    code?: string
    message?: string
  } | null
  const codeKeys: Record<string, string> = {
    INVALID_CREDENTIALS: 'authFlow.credentials',
    EMAIL_EXISTS: 'authFlow.duplicate',
    EMAIL_NOT_VERIFIED: 'authFlow.needsVerification',
    INVALID_CODE: 'authFlow.invalidCode',
    RATE_LIMITED: 'errors.rate',
    EMAIL_UNAVAILABLE: 'authFlow.unavailable',
  }
  if (api?.code && codeKeys[api.code]) return codeKeys[api.code]
  const message = api?.message ?? ''
  if (/already in favorites/i.test(message)) return 'errors.favoriteExists'
  if (/Bunday nomli kategoriya/i.test(message)) return 'errors.categoryName'
  if (/Bunday slug/i.test(message)) return 'errors.categorySlug'
  if (/Bu kategoriyada/i.test(message)) return 'errors.categoryInUse'
  if (
    /own (listing|property)|own properties/i.test(message) &&
    api?.status === 400
  )
    return 'errors.ownInquiry'
  if (/phone/i.test(message) && api?.status === 400) return 'validation.phone'
  if (/image|file too large|unexpected field|JPEG|PNG|WEBP|AVIF/i.test(message))
    return 'errors.upload'
  switch (api?.status) {
    case 400:
      return 'errors.validation'
    case 401:
      return 'errors.unauthorized'
    case 403:
      return 'errors.forbidden'
    case 404:
      return 'errors.notFound'
    case 409:
      return 'errors.conflict'
    case 413:
      return 'errors.upload'
    case 429:
      return 'errors.rate'
    case undefined:
      return 'errors.network'
    default:
      return 'errors.unexpected'
  }
}
