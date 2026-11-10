import { useEffect, useRef, useState } from 'react'

// Shrinks a fixed-size printable (8.5in sheet, card sheet) to fit narrow screens.
// `width` is the content's natural width in CSS px (1in = 96px). Printing always
// uses full size: the print rule below overrides the inline zoom.
export default function FitToWidth({ width, children }) {
  const ref = useRef(null)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => setZoom(Math.min(1, el.clientWidth / width))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [width])

  return (
    <div ref={ref} className="w-full">
      <style>{`@media print { .fit-to-width { zoom: 1 !important; } }`}</style>
      <div className="fit-to-width" style={{ zoom }}>{children}</div>
    </div>
  )
}
