import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const DEFAULT_CENTER = [106.8456, -6.2088]
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

export default function AddressPicker({ value, onChange }) {
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const timerRef = useRef(null)
  const onChangeRef = useRef(onChange)
  const [results, setResults] = useState([])
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  const setMarker = (lng, lat, zoom = 16) => {
    const map = mapRef.current
    if (!map) return
    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ color: '#0e9f8a' }).setLngLat([lng, lat]).addTo(map)
    } else {
      markerRef.current.setLngLat([lng, lat])
    }
    map.flyTo({ center: [lng, lat], zoom })
  }

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: 'address-map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: DEFAULT_CENTER,
      zoom: 11,
      scrollZoom: true,
    })
    mapRef.current = map
    map.on('click', async (event) => {
      const { lng, lat } = event.lngLat
      setMarker(lng, lat, 17)
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=id`)
        const data = await res.json()
        if (data?.display_name) onChangeRef.current(data.display_name, `${lat.toFixed(6)}, ${lng.toFixed(6)}`)
      } catch {
        onChangeRef.current(`${lat.toFixed(6)}, ${lng.toFixed(6)}`, `${lat.toFixed(6)}, ${lng.toFixed(6)}`)
      }
    })
    return () => map.remove()
  }, [])

  useEffect(() => {
    clearTimeout(timerRef.current)
    const q = value.trim()
    if (!q) { setResults([]); return }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=id&countrycodes=id&q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setResults(Array.isArray(data) ? data : [])
      } catch {
        // ponytail: geocode gagal, tetap biarkan user klik map
      }
    }, 700)
    return () => clearTimeout(timerRef.current)
  }, [value])

  const pick = (item) => {
    setResults([])
    onChangeRef.current(item.display_name, `${Number(item.lat).toFixed(6)}, ${Number(item.lon).toFixed(6)}`)
    setMarker(Number(item.lon), Number(item.lat))
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <div id="address-map" className="h-64 rounded-lg border border-border" />
        <div className="absolute right-2 top-2 flex flex-col gap-1">
          <button type="button" onClick={() => mapRef.current?.zoomIn()} className="rounded bg-background/90 px-2 py-1 text-sm shadow border border-border">+</button>
          <button type="button" onClick={() => mapRef.current?.zoomOut()} className="rounded bg-background/90 px-2 py-1 text-sm shadow border border-border">−</button>
        </div>
      </div>
      {results.length > 0 && (
        <ul className="max-h-48 overflow-auto rounded-lg border border-border bg-popover text-sm shadow">
          {results.map((r) => (
            <li key={r.place_id}>
              <button type="button" onClick={() => pick(r)} className="w-full px-3 py-2 text-left hover:bg-accent">
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
