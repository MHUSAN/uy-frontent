import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatNumber } from '@/utils/format'

interface YandexMapProps {
  latitude?: number | null
  longitude?: number | null
  height?: number
  selectable?: boolean
  onSelect?: (lat: number, lng: number) => void
}
// Provider toponyms support RU/EN, not Uzbek. App controls remain translated.
// Separate provider namespaces allow RU/EN switching without a page reload.
const sdkRequests = new Map<string, Promise<any>>()
function loadSdk(key: string, locale: string): Promise<any> {
  const cacheKey = `${locale}:${key}`
  const cached = sdkRequests.get(cacheKey)
  if (cached) return cached
  const promise = new Promise((resolve, reject) => {
    const namespace = `tezuyMaps_${locale}`
    const script = document.createElement('script')
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(key)}&lang=${locale}&ns=${namespace}`
    script.async = true
    script.onload = () => {
      const sdk = (window as unknown as Record<string, any>)[namespace]
      if (!sdk) {
        reject(new Error())
        return
      }
      sdk.ready(() => resolve(sdk))
    }
    script.onerror = () => {
      sdkRequests.delete(cacheKey)
      script.remove()
      reject(new Error())
    }
    document.head.appendChild(script)
  })
  sdkRequests.set(cacheKey, promise)
  return promise
}

export function YandexMap({
  latitude,
  longitude,
  height = 260,
  selectable = false,
  onSelect,
}: YandexMapProps) {
  const { t, i18n } = useTranslation()
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const select = useRef(onSelect)
  const key = import.meta.env.VITE_YANDEX_MAPS_API_KEY?.trim()
  const providerLocale = i18n.language === 'ru' ? 'ru_RU' : 'en_RU'
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>(
    key ? 'loading' : 'unavailable',
  )
  useEffect(() => {
    select.current = onSelect
  }, [onSelect])
  const placemark = useRef<any>(null)
  const sdkRef = useRef<any>(null)
  const coordsRef = useRef({ latitude, longitude })
  useEffect(() => {
    coordsRef.current = { latitude, longitude }
  }, [latitude, longitude])
  useEffect(() => {
    if (!key) return
    let cancelled = false
    loadSdk(key, providerLocale)
      .then((sdk) => {
        if (cancelled || !container.current) return
        sdkRef.current = sdk
        const { latitude: lat0, longitude: lng0 } = coordsRef.current
        const located = lat0 != null && lng0 != null
        const instance = new sdk.Map(container.current, {
          center: located ? [lat0, lng0] : [41.3, 69.28],
          zoom: located ? 15 : 11,
          controls: [],
        })
        map.current = instance
        if (selectable)
          instance.events.add('click', (event: any) => {
            const [lat, lng] = event.get('coords')
            select.current?.(lat, lng)
          })
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable')
      })
    return () => {
      cancelled = true
      map.current?.destroy()
      map.current = null
      placemark.current = null
    }
  }, [key, providerLocale, selectable])
  useEffect(() => {
    const instance = map.current
    const sdk = sdkRef.current
    if (status !== 'ready' || !instance || !sdk) return
    if (latitude == null || longitude == null) {
      if (placemark.current) instance.geoObjects.remove(placemark.current)
      placemark.current = null
      return
    }
    const point = [latitude, longitude]
    if (!placemark.current) {
      placemark.current = new sdk.Placemark(point, {}, { draggable: selectable })
      if (selectable)
        placemark.current.events.add('dragend', () => {
          const [lat, lng] = placemark.current.geometry.getCoordinates()
          select.current?.(lat, lng)
        })
      instance.geoObjects.add(placemark.current)
    } else placemark.current.geometry.setCoordinates(point)
    instance.setCenter(point, Math.max(instance.getZoom(), 14))
  }, [status, latitude, longitude, selectable])
  if (status === 'unavailable')
    return (
      <div className="rounded-md border border-dashed border-line bg-canvas px-4 py-6 text-sm text-muted">
        <p>{t('map.unavailable')}</p>
        {latitude != null && longitude != null && (
          <p className="mt-1 text-xs text-ink">
            {formatNumber(latitude, i18n.language, 5)},{' '}
            {formatNumber(longitude, i18n.language, 5)}
          </p>
        )}
        {selectable && <p className="mt-1 text-xs">{t('map.manual')}</p>}
      </div>
    )
  return (
    <div className="relative">
      <div
        ref={container}
        style={{ height }}
        className="overflow-hidden rounded-md border border-line bg-canvas"
        aria-label={t('map.label')}
        aria-busy={status === 'loading'}
      />
      {status === 'loading' && (
        <p role="status" className="mt-2 text-xs text-muted">
          {t('common.loading')}
        </p>
      )}
      {status === 'ready' && selectable && (
        <div className="absolute right-2 top-2 flex gap-1">
          <button
            type="button"
            aria-label={t('map.zoomIn')}
            onClick={() => map.current?.setZoom(map.current.getZoom() + 1)}
            className="size-10 rounded border border-line bg-surface text-ink"
          >
            +
          </button>
          <button
            type="button"
            aria-label={t('map.zoomOut')}
            onClick={() => map.current?.setZoom(map.current.getZoom() - 1)}
            className="size-10 rounded border border-line bg-surface text-ink"
          >
            −
          </button>
        </div>
      )}
    </div>
  )
}
