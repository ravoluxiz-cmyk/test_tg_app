"use client"

import { useEffect, useMemo, useRef, useState } from "react"

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
  const [openUp, setOpenUp] = useState(false)

  const current = useMemo(() => RESULT_OPTIONS.find((o) => o.value === value) || RESULT_OPTIONS[0], [value])
  const options = useMemo(() => RESULT_OPTIONS.filter((o) => allowBye || o.value !== "bye"), [allowBye])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current) return
      if (e.target instanceof Node && rootRef.current.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  // Decide whether to open the dropdown above or below based on viewport space
  useEffect(() => {
    if (!open) return
    const measure = () => {
      const rect = rootRef.current?.getBoundingClientRect()
      if (!rect) return
      const actualHeight = dropdownRef.current?.offsetHeight
      const estimatedHeight = options.length * 36 + 8 // ~item height + margin
      const height = actualHeight || estimatedHeight
      const spaceBelow = window.innerHeight - rect.bottom
      setOpenUp(spaceBelow < height)
    }
    const id = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(id)
    // options.length impacts estimated height
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
      {open && (
        <div
          role="listbox"
          ref={dropdownRef}
          className={`absolute left-0 right-0 z-20 rounded-lg border border-white/10 bg-slate-900 shadow-lg overflow-hidden ${
            openUp ? "bottom-full mb-1" : "top-full mt-1"
          }`}
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
        </div>
      )}
    </div>
  )
}

export default ResultSelect