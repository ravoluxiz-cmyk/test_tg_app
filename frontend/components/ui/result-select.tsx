"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"

type ResultOption = {
  value: string
  label: string
  dotClass: string
  labelClass?: string
}

const RESULT_OPTIONS: ResultOption[] = [
  { value: "not_played", label: "Не сыграно", dotClass: "bg-slate-400", labelClass: "text-white/90" },
  { value: "white", label: "Победа белых", dotClass: "bg-emerald-500", labelClass: "text-emerald-300" },
  { value: "black", label: "Победа чёрных", dotClass: "bg-rose-500", labelClass: "text-rose-300" },
  { value: "draw", label: "Ничья", dotClass: "bg-amber-500", labelClass: "text-amber-300" },
  { value: "bye", label: "Бай", dotClass: "bg-fuchsia-500", labelClass: "text-fuchsia-300" },
]

export function ResultSelect({
  value,
  onChange,
  disabled,
  className,
  allowBye = true,
}: {
  value: string
  onChange: (val: string) => void
  disabled?: boolean
  className?: string
  allowBye?: boolean
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const current = useMemo(() => RESULT_OPTIONS.find((o) => o.value === value) || RESULT_OPTIONS[0], [value])
  const options = useMemo(() => RESULT_OPTIONS.filter((o) => allowBye || o.value !== "bye"), [allowBye])

  // Позиционирование портала относительно кнопки
  const [position, setPosition] = useState<{
    left: number
    top: number
    width: number
    openUp: boolean
    maxHeight: number
  } | null>(null)

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current) return
      const target = e.target as Node
      // Не закрываем, если клик внутри кнопки или внутри портального дропдауна
      if (rootRef.current.contains(target)) return
      if (dropdownRef.current && dropdownRef.current.contains(target)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  useEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }

    const compute = () => {
      const rect = rootRef.current?.getBoundingClientRect()
      if (!rect) return
      const estimatedHeight = options.length * 36 + 8 // ~item height + margin
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      let openUp = false
      // Выбираем сторону с большим свободным местом, если вниз не хватает
      if (spaceBelow < estimatedHeight) openUp = spaceAbove > spaceBelow
      // Максимальная высота в выбранной стороне, чтобы не выходить за окно
      const maxHeight = Math.max(0, (openUp ? spaceAbove : spaceBelow) - 8)
      setPosition({ left: rect.left, top: openUp ? rect.top : rect.bottom, width: rect.width, openUp, maxHeight })
    }

    compute()
    const onScrollOrResize = () => compute()
    window.addEventListener("scroll", onScrollOrResize, true)
    window.addEventListener("resize", onScrollOrResize)
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true)
      window.removeEventListener("resize", onScrollOrResize)
    }
    // options.length влияет на оценку высоты
  }, [open, options.length])

  return (
    <div ref={rootRef} className={`relative ${className || ""}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={
          "w-full bg-white/10 text-white px-3 py-2 rounded border border-white/10 hover:bg-white/20 flex items-center justify-between gap-2 disabled:opacity-60"
        }
      >
        <span className="flex items-center gap-2">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${current.dotClass}`} />
          <span className={current.labelClass}>{current.label}</span>
        </span>
        <span className="text-white/60">▼</span>
      </button>
      {open && position && createPortal(
        <div
          role="listbox"
          ref={dropdownRef}
          className={`fixed z-50 rounded-lg border border-white/10 bg-slate-900 shadow-lg overflow-auto`}
          style={{
            left: position.left,
            width: position.width,
            top: position.openUp ? position.top - 8 : position.top + 8,
            transform: position.openUp ? 'translateY(-100%)' : 'none',
            maxHeight: position.maxHeight,
          }}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-white/10 ${
                o.value === value ? "bg-white/5" : ""
              }`}
            >
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${o.dotClass}`} />
              <span className={o.labelClass}>{o.label}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

export default ResultSelect