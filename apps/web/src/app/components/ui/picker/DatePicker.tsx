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
 * Migrated from SimpleCash-React (src/app/components/ui/picker/DatePicker.tsx)
 * into the Next.js design-system tree. Behavior is unchanged: the native
 * input is keyboard-accessible, locale-aware, and mobile-friendly, and
 * input.value always normalizes to 'yyyy-MM-dd' regardless of the visible
 * locale format, so callers (expenses-view.tsx, income-view.tsx) keep
 * passing the same ISO string through.
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

  // showPicker() is the ONLY way this component opens the calendar — the
  // native indicator is neutralized below, so this button is the sole
  // trigger, keeping the rest of the box free for manual typing.
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
            'bg-transparent border border-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-inset focus:ring-primary',
            'rounded-lg px-4 py-2.5 pr-10 text-body-md',
            // Hide the native calendar glyph and disable its pointer events
            // so a click there falls through to text editing; only the
            // explicit icon button below opens the picker.
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
