// Keyboard control for a type-to-search field's list of matches:
// ↓ / ↑ move through the list, Enter picks the highlighted match, Esc closes it.
// The list resets to "nothing highlighted" whenever resetKey (usually the
// search text) changes. Put listRef on the element whose children are the
// rows so the highlighted row scrolls into view.
import { useState, useEffect, useRef } from 'react'

export default function useListNav({ items, onPick, open = true, onClose, resetKey }) {
  const [active, setActive] = useState(-1)
  const listRef = useRef(null)
  const count = items.length

  useEffect(() => { setActive(-1) }, [resetKey, open])
  useEffect(() => { if (active >= count) setActive(count - 1) }, [count, active])
  useEffect(() => {
    if (active >= 0) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function onKeyDown(e) {
    if (!open || count === 0) {
      if (e.key === 'Escape' && open) onClose?.()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(i => Math.min(i + 1, count - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      // Only take over Enter when a match is highlighted (or it's the only one),
      // so Enter still submits the form otherwise
      const pick = active >= 0 ? items[active] : count === 1 ? items[0] : null
      if (pick) { e.preventDefault(); onPick(pick) }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose?.()
    }
  }

  return {
    active,
    listRef,
    onKeyDown,
    // Spread onto each row: keeps the mouse and keyboard highlight together
    rowProps: (i) => ({ onMouseEnter: () => setActive(i), 'aria-selected': active === i }),
    isActive: (i) => active === i,
  }
}
