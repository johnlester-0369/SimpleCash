import { useRef } from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/infra/core/utils/cn.util'

interface DatePickerProps {
  id?: string
  label: string
  value: string
  onChange: (value: string) => void
  minDate?: string
  maxDate?: string
  className?: string
}

/**
 * DatePicker — thin wrapper around the native <input type="date">.
 *
 * 2026 research on native vs. custom date pickers confirms the native
 * input is keyboard-accessible, locale-aware, and mobile-friendly at 0 KB
 * (vs. react-day-picker's bundle + portal/click-outside/scroll-listener
 * code this file used to carry), and — critically for this component's
 * contract — input.value always normalizes to 'yyyy-MM-dd' regardless of
 * the visible locale format, so no date-fns conversion is needed here;
 * callers (expenses.tsx, income.tsx) keep working with the same ISO
 * string they already passed through the old parseISO/format round-trip.
 *
 * INTENTIONAL SPLIT BEHAVIOR: typing directly into the box (e.g.
 * '05/15/2026') is native <input type="date"> segment-editing and always
 * stays available — the calendar itself only opens via the dedicated
 * icon button below, never from a click on the text portion. This is why
 * the native picker-indicator is hidden AND made pointer-events-none
 * rather than stretched over the input: a full-width transparent
 * indicator would intercept every click and force the calendar open
 * before the user could place a cursor to type.
 *
 * KNOWN LIMITATION (confirmed by the same research): the *visible* text
 * in the box follows the user's OS/browser locale, not a fixed
 * 'MM/DD/YYYY' — e.g. a German OS renders '15.05.2026' for the exact
 * same stored value an American OS renders as '05/15/2026'. Browsers do
 * not expose a standards-based way to override this via HTML/CSS, so
 * this cannot be forced to always read MM/DD/YYYY without reintroducing
 * a JS-driven picker — the very dependency this change removes.
 */
export default function DatePicker({
  id,
  label,
  value,
  onChange,
  minDate,
  maxDate,
  className,
}: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // showPicker() is supported in current Chrome/Edge/Firefox and is the
  // ONLY way this component opens the calendar — the native indicator is
  // neutralized below, so this button is the sole trigger, keeping the
  // rest of the box free for manual MM/DD/YYYY typing.
  function openPicker() {
    inputRef.current?.showPicker?.()
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label className="text-label-md text-on-surface-variant" htmlFor={id}>
        {label}
      </label>
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="date"
          id={id}
          value={value}
          min={minDate}
          max={maxDate}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            // Base/variant/size classes mirror Input.tsx's 'default'
            // variant so this control sits visually identical to every
            // other form field in the app (same border, radius, focus).
            'w-full text-on-surface focus:outline-none disabled:opacity-state-disabled disabled:cursor-not-allowed transition-all duration-fast',
            'bg-transparent border-2 border-outline-variant focus:border-primary',
            'rounded-lg px-4 py-2.5 pr-10 text-body-md',
            // WebKit/Blink (Chrome, Edge, Safari) render a native calendar
            // glyph via this pseudo-element at its default small size/
            // position. Hiding it AND disabling its pointer events (rather
            // than stretching it full-width as an earlier version of this
            // component did) means a click there falls through to plain
            // text editing instead of force-opening the calendar — only
            // the explicit icon button below calls showPicker(). Firefox
            // has no equivalent selector for this pseudo-element, so it
            // keeps its own small native glyph at the same corner; since
            // that glyph isn't stretched either, it doesn't intercept
            // text-area clicks there, so typing still works the same way.
            '[&::-webkit-calendar-picker-indicator]:pointer-events-none [&::-webkit-calendar-picker-indicator]:opacity-0',
          )}
        />
        <button
          type="button"
          onClick={openPicker}
          tabIndex={-1}
          className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-on-surface-variant pointer-events-auto"
          aria-hidden="true"
        >
          <CalendarIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
