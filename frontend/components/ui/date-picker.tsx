"use client"

import * as Popover from "@radix-ui/react-popover"
import { DayPicker } from "react-day-picker"
import { useMemo, useRef, useState, useEffect, useId } from "react"
import { format, parse, isValid as isValidDate, isAfter, isBefore } from "date-fns"
import type { Locale } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface DatePickerProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  fromYear?: number
  toYear?: number
  minDate?: Date
  maxDate?: Date
  locale?: Locale
  id?: string
  name?: string
  disabled?: boolean
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  fromYear = 2000,
  toYear = 2035,
  minDate,
  maxDate,
  locale,
  id,
  name,
  disabled = false,
}: DatePickerProps) {
  const selected = useMemo(() => {
    if (!value) return undefined
    const dt = parse(value, "yyyy-MM-dd", new Date(), locale ? { locale } : undefined)
    return isValidDate(dt) ? dt : undefined
  }, [value, locale])

  const [open, setOpen] = useState(false)
  const [display, setDisplay] = useState(value || "")
  const inputRef = useRef<HTMLInputElement | null>(null)
  const contentId = useId()

  useEffect(() => {
    setDisplay(value || "")
  }, [value])

  const commit = (dt: Date) => {
    // clamp to bounds if provided
    let next = dt
    if (minDate && isBefore(next, minDate)) next = minDate
    if (maxDate && isAfter(next, maxDate)) next = maxDate
    const val = format(next, "yyyy-MM-dd", locale ? { locale } : undefined)
    setDisplay(val)
    if (val !== (value || "")) onChange(val)
  }

  const onBlurNormalize = () => {
    if (!display) return
    const tryFormats = ["yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy"]
    for (const f of tryFormats) {
      const dt = parse(display, f, new Date(), locale ? { locale } : undefined)
      if (isValidDate(dt)) {
        commit(dt)
        return
      }
    }
    setDisplay(value || "")
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={display}
          onChange={(e) => setDisplay(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={onBlurNormalize}
          placeholder={placeholder}
          className="pr-10"
          autoComplete="off"
          inputMode="numeric"
          id={id}
          name={name}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              onBlurNormalize()
              setOpen(false)
              inputRef.current?.blur()
            }
            if (e.key === "Escape") {
              e.preventDefault()
              setDisplay(value || "")
              setOpen(false)
              inputRef.current?.blur()
            }
          }}
        />
        {display && (
          <button
            type="button"
            className="absolute right-8 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-100"
            onClick={() => {
              setDisplay("")
              onChange("")
            }}
            >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
        <Popover.Trigger asChild>
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-100"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={contentId}
            >
            <CalendarIcon className="w-4 h-4 text-gray-500" />
          </button>
        </Popover.Trigger>
      </div>

      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          align="start"
          className="z-50 min-w-[280px] rounded-xl border bg-white p-3 shadow-lg"
          id={contentId}
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (date && isValidDate(date)) {
                commit(date)
                setOpen(false)
                inputRef.current?.blur()
              }
            }}
            fromYear={fromYear}
            toYear={toYear}
            {...(minDate ? { fromDate: minDate } : {})}
            {...(maxDate ? { toDate: maxDate } : {})}
            locale={locale}
            weekStartsOn={1}
            showOutsideDays
            captionLayout="label"
            styles={{
              caption: { textAlign: "center" },
              head: { fontWeight: 500 },
              day: { borderRadius: "8px" },
            }}
            modifiersClassNames={{
              selected: "bg-blue-600 text-white hover:bg-blue-700",
              today: "border border-blue-500",
              outside: "text-gray-300",
              disabled: "opacity-50",
            }}
          />

          <div className="mt-2 flex justify-between text-sm">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date()
                commit(now)
                setOpen(false)
              }}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDisplay("")
                onChange("")
                setOpen(false)
              }}
            >
              Clear
            </Button>
          </div>

          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
