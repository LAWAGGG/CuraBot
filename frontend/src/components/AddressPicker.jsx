import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const DEFAULT_CENTER = [-6.2088, 106.8456]

export default function AddressPicker({ value, onChange }) {
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const timerRef = useRef(null)
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  const setMarker = (lat, lng, zoom = 16) => {
    const map = mapRef.current
    if (!map) return
    if (!markerRef.current) {
      markerRef.current = L.circleMarker([lat, lng], { radius: 8, color: '#0e9f8a', fillOpacity: 0.9 }).addTo(map)
    } else {
      markerRef.current.setLatLng([lat, lng])
    }
    map.setView([lat, lng], zoom)
  }

  useEffect(() => {
    const map = L.map('address-map', { scrollWheelZoom: false }).setView(DEFAULT_CENTER, 11)
    mapRef.current = map
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)
    map.on('click', async (event) => {
      const { lat, lng } = event.latlng
      setMarker(lat, lng, 17)
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=id`)
        const data = await res.json()
        if (data?.display_name) onChangeRef.current(data.display_name)
      } catch {
        onChangeRef.current(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)
      }
    })
    return () => map.remove()
  }, [])

  useEffect(() => {
    clearTimeout(timerRef.current)
    const q = value.trim()
    if (!q) return
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=id&q=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (data?.[0]) setMarker(Number(data[0].lat), Number(data[0].lon))
      } catch {
        // ponytail: geocode gagal, tetap biarkan user klik map
      }
    }, 700)
    return () => clearTimeout(timerRef.current)
  }, [value])

  return <div id="address-map" className="h-64 rounded-lg border border-border" />
}
