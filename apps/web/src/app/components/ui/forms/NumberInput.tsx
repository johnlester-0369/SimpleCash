import React, {
  useState,
  useCallback,
  useRef,
  useImperativeHandle,
} from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/infra/core/utils/cn.util'
import { useOptionalFieldContext } from '@/app/components/ui/forms/Field'

type NumberInputVariant = 'default' | 'subtle'
type NumberInputSize = 'sm' | 'md' | 'lg'
type NumberInputColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'

export interface NumberInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'size' | 'type' | 'onChange' | 'value' | 'defaultValue'
> {
  /** Visual variant of the input */
  variant?: NumberInputVariant
  /** Accent color for focus border */
  color?: NumberInputColor
  /** Size of the input field */
  inputSize?: NumberInputSize
  /** Controlled value */
  value?: number | ''
  /** Default value for uncontrolled usage */
  defaultValue?: number
  /** Callback when value changes */
  onChange?: (value: number | undefined) => void
  /** Minimum value */
  min?: number
  /** Maximum value */
  max?: number
  /** Step increment */
  step?: number
  /** Precision (decimal places) */
  precision?: number
  /** Whether to show increment/decrement buttons */
  showButtons?: boolean
  /** Whether the input should take full width */
  fullWidth?: boolean
  /** Allow empty value */
  allowEmpty?: boolean
  /** Format function for display */
  format?: (value: number) => string
  /** Parse function for input */
  parse?: (value: string) => number | undefined
}

/**
 * Base input styles
 */
const base =
  'w-full rounded-lg text-on-surface text-center focus:outline-none disabled:opacity-state-disabled disabled:cursor-not-allowed placeholder:text-on-surface-variant transition-all duration-fast'

const variantClasses: Record<NumberInputVariant, string> = {
  default: 'bg-transparent border-2 border-outline-variant',
  subtle:
    'border-2 border-transparent bg-surface-container hover:bg-surface-container-high',
}

const colorClasses: Record<NumberInputColor, string> = {
  primary: 'focus:border-primary',
  secondary: 'focus:border-secondary',
  tertiary: 'focus:border-tertiary',
  info: 'focus:border-info',
  success: 'focus:border-success',
  warning: 'focus:border-warning',
  error: 'focus:border-error',
}

const stateClasses = {
  error: 'focus:border-error text-on-surface bg-error-container/30',
  success: 'focus:border-success text-on-surface bg-success-container/30',
}

const sizeClasses: Record<NumberInputSize, string> = {
  sm: 'px-2 py-1.5 text-body-sm',
  md: 'px-3 py-2.5 text-body-md',
  lg: 'px-4 py-3 text-body-lg',
}

/**
 * Right padding when buttons are shown (space for stacked button container)
 */
const sizeWithButtonsPadding: Record<NumberInputSize, string> = {
  sm: 'pr-8',
  md: 'pr-9',
  lg: 'pr-10',
}

/**
 * Button container width per size
 */
const buttonContainerWidthClasses: Record<NumberInputSize, string> = {
  sm: 'w-7',
  md: 'w-8',
  lg: 'w-9',
}

/**
 * Icon sizes for stacked buttons (slightly smaller for narrower buttons)
 */
const iconSizeClasses: Record<NumberInputSize, string> = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
}

/**
 * Button color classes for each accent color (used on focus)
 */
const buttonColorClasses: Record<
  NumberInputColor,
  { text: string; hover: string; active: string; border: string }
> = {
  primary: {
    text: 'text-primary',
    hover: 'hover:text-primary hover:bg-primary/[var(--state-hover-opacity)]',
    active: 'active:bg-primary/[var(--state-pressed-opacity)]',
    border: 'border-primary',
  },
  secondary: {
    text: 'text-secondary',
    hover:
      'hover:text-secondary hover:bg-secondary/[var(--state-hover-opacity)]',
    active: 'active:bg-secondary/[var(--state-pressed-opacity)]',
    border: 'border-secondary',
  },
  tertiary: {
    text: 'text-tertiary',
    hover: 'hover:text-tertiary hover:bg-tertiary/[var(--state-hover-opacity)]',
    active: 'active:bg-tertiary/[var(--state-pressed-opacity)]',
    border: 'border-tertiary',
  },
  info: {
    text: 'text-info',
    hover: 'hover:text-info hover:bg-info/[var(--state-hover-opacity)]',
    active: 'active:bg-info/[var(--state-pressed-opacity)]',
    border: 'border-info',
  },
  success: {
    text: 'text-success',
    hover: 'hover:text-success hover:bg-success/[var(--state-hover-opacity)]',
    active: 'active:bg-success/[var(--state-pressed-opacity)]',
    border: 'border-success',
  },
  warning: {
    text: 'text-warning',
    hover: 'hover:text-warning hover:bg-warning/[var(--state-hover-opacity)]',
    active: 'active:bg-warning/[var(--state-pressed-opacity)]',
    border: 'border-warning',
  },
  error: {
    text: 'text-error',
    hover: 'hover:text-error hover:bg-error/[var(--state-hover-opacity)]',
    active: 'active:bg-error/[var(--state-pressed-opacity)]',
    border: 'border-error',
  },
}

/**
 * Default button state classes (when not focused and no validation state)
 */
const buttonDefaultClasses = {
  text: 'text-on-surface-variant',
  hover:
    'hover:text-on-surface hover:bg-on-surface/[var(--state-hover-opacity)]',
  active: 'active:bg-on-surface/[var(--state-pressed-opacity)]',
  border: 'border-outline-variant',
}

/**
 * NumberInput component - A numeric input with stacked increment/decrement controls
 *
 * Designed to work with Field wrapper for form integration.
 * Features:
 * - Stacked up/down arrow buttons on the right side
 * - State-aware button colors (focus/error/success states)
 * - Min/max/step constraints
 * - Precision control for decimals
 * - Keyboard support (ArrowUp/Down, Page Up/Down)
 * - Custom format/parse functions
 * - Controlled and uncontrolled modes
 * - Full accessibility
 *
 * @example
 * ```tsx
 * // Basic usage
 * <NumberInput value={count} onChange={setCount} />
 *
 * // With constraints
 * <NumberInput min={0} max={100} step={5} />
 *
 * // With Field wrapper (buttons reflect validation state)
 * <Field.Root invalid={!!error} required>
 *   <Field.Label>Quantity</Field.Label>
 *   <NumberInput min={1} max={99} value={qty} onChange={setQty} />
 *   <Field.HelperText>Enter quantity (1-99)</Field.HelperText>
 *   <Field.ErrorText>{error}</Field.ErrorText>
 * </Field.Root>
 *
 * // With custom color (buttons match on focus)
 * <NumberInput color="secondary" />
 * ```
 */
const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      variant = 'default',
      color = 'primary',
      inputSize = 'md',
      value: controlledValue,
      defaultValue,
      onChange,
      min,
      max,
      step = 1,
      precision,
      showButtons = true,
      fullWidth = true,
      allowEmpty = true,
      format,
      parse,
      className,
      disabled: disabledProp,
      readOnly: readOnlyProp,
      id: idProp,
      onFocus: onFocusProp,
      onBlur: onBlurProp,
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = useState<number | undefined>(
      defaultValue,
    )
    const [inputText, setInputText] = useState<string>(
      defaultValue !== undefined ? String(defaultValue) : '',
    )
    const [isFocused, setIsFocused] = useState(false)

    const inputRef = useRef<HTMLInputElement>(null)

    // Expose the internal ref via useImperativeHandle so parent consumers retain a valid ref
    // while we keep a stable local handle for programmatic focus after button clicks
    useImperativeHandle(ref, () => inputRef.current!)

    // Get Field context if available
    const fieldContext = useOptionalFieldContext()

    const inputId = fieldContext?.inputId ?? idProp
    const disabled = fieldContext?.disabled ?? disabledProp
    const readOnly = fieldContext?.readOnly ?? readOnlyProp
    const hasError = fieldContext?.invalid ?? false
    const hasSuccess = fieldContext?.success ?? false
    const descriptionId = fieldContext?.descriptionId

    // Gate validation colors behind focus — error/success borders should only surface on interaction, not passively
    const getButtonStyles = () => {
      if (isFocused) {
        if (hasError) return buttonColorClasses.error
        if (hasSuccess) return buttonColorClasses.success
        return buttonColorClasses[color]
      }
      return buttonDefaultClasses
    }

    const buttonStyles = getButtonStyles()

    // Controlled vs uncontrolled
    const isControlled = controlledValue !== undefined
    const currentValue = isControlled
      ? controlledValue === ''
        ? undefined
        : controlledValue
      : internalValue

    // Clamp value within min/max bounds
    const clamp = useCallback(
      (val: number): number => {
        let result = val
        if (min !== undefined && result < min) result = min
        if (max !== undefined && result > max) result = max
        return result
      },
      [min, max],
    )

    // Round to precision
    const roundToPrecision = useCallback(
      (val: number): number => {
        if (precision === undefined) return val
        const factor = Math.pow(10, precision)
        return Math.round(val * factor) / factor
      },
      [precision],
    )

    // Format value for display
    const formatValue = useCallback(
      (val: number | undefined): string => {
        if (val === undefined) return ''
        if (format) return format(val)
        if (precision !== undefined) return val.toFixed(precision)
        return String(val)
      },
      [format, precision],
    )

    // Parse input text to number
    const parseValue = useCallback(
      (text: string): number | undefined => {
        if (text === '' || text === '-') return undefined
        if (parse) return parse(text)
        const parsed = parseFloat(text)
        return isNaN(parsed) ? undefined : parsed
      },
      [parse],
    )

    // Update value helper
    const updateValue = useCallback(
      (newValue: number | undefined) => {
        const finalValue =
          newValue !== undefined ? roundToPrecision(clamp(newValue)) : undefined

        if (!isControlled) {
          setInternalValue(finalValue)
        }
        setInputText(formatValue(finalValue))
        onChange?.(finalValue)
      },
      [isControlled, onChange, clamp, roundToPrecision, formatValue],
    )

    // Handle text input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value

      // Allow typing minus sign, digits, and decimal point
      if (!/^-?\d*\.?\d*$/.test(text) && text !== '') {
        return
      }

      setInputText(text)

      // Only parse and update if valid number
      const parsed = parseValue(text)
      if (parsed !== undefined) {
        const clamped = clamp(parsed)
        if (!isControlled) {
          setInternalValue(clamped)
        }
        onChange?.(clamped)
      } else if (text === '' && allowEmpty) {
        if (!isControlled) {
          setInternalValue(undefined)
        }
        onChange?.(undefined)
      }
    }

    // Handle focus
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      onFocusProp?.(e)
    }

    // Handle blur - format the value and update focus state
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      if (currentValue !== undefined) {
        setInputText(formatValue(currentValue))
      } else if (!allowEmpty && min !== undefined) {
        updateValue(min)
      }
      onBlurProp?.(e)
    }

    // Increment/decrement handlers
    const increment = () => {
      if (disabled || readOnly) return
      const base = currentValue ?? min ?? 0
      updateValue(base + step)
    }

    const decrement = () => {
      if (disabled || readOnly) return
      const base = currentValue ?? max ?? 0
      updateValue(base - step)
    }

    // Keyboard handling
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled || readOnly) return

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          increment()
          break
        case 'ArrowDown':
          e.preventDefault()
          decrement()
          break
        case 'PageUp':
          e.preventDefault()
          updateValue((currentValue ?? 0) + step * 10)
          break
        case 'PageDown':
          e.preventDefault()
          updateValue((currentValue ?? 0) - step * 10)
          break
        case 'Home':
          if (min !== undefined) {
            e.preventDefault()
            updateValue(min)
          }
          break
        case 'End':
          if (max !== undefined) {
            e.preventDefault()
            updateValue(max)
          }
          break
      }

      props.onKeyDown?.(e)
    }

    // Check if at min/max
    const isAtMin =
      min !== undefined && currentValue !== undefined && currentValue <= min
    const isAtMax =
      max !== undefined && currentValue !== undefined && currentValue >= max

    const inputClasses = cn(
      base,
      variantClasses[variant],
      hasError
        ? stateClasses.error
        : hasSuccess
          ? stateClasses.success
          : colorClasses[color],
      sizeClasses[inputSize],
      showButtons && sizeWithButtonsPadding[inputSize],
      className,
    )

    /**
     * Base styles for individual stacked buttons with state-aware colors
     */
    const buttonBase = cn(
      'flex flex-1 items-center justify-center transition-all duration-fast',
      buttonStyles.text,
      !disabled && !readOnly && buttonStyles.hover,
      !disabled && !readOnly && buttonStyles.active,
    )

    return (
      <div className={cn('relative', fullWidth && 'w-full')}>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode="decimal"
          role="spinbutton"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={currentValue}
          aria-invalid={hasError || undefined}
          aria-describedby={descriptionId}
          value={inputText}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          readOnly={readOnly}
          className={inputClasses}
          {...props}
        />

        {showButtons && (
          <div
            className={cn(
              'absolute right-0 top-0 h-full flex flex-col overflow-hidden rounded-r-lg border-l transition-colors duration-fast',
              buttonStyles.border,
              buttonContainerWidthClasses[inputSize],
              (disabled || readOnly) && 'opacity-state-disabled',
            )}
          >
            {/* Increment button (top - up arrow) */}
            <button
              type="button"
              onClick={() => {
                increment()
                inputRef.current?.focus()
              }}
              disabled={disabled || readOnly || isAtMax}
              className={cn(
                buttonBase,
                'rounded-tr-lg border-b transition-colors duration-fast',
                buttonStyles.border,
                (disabled || readOnly || isAtMax) &&
                  'cursor-not-allowed opacity-50',
              )}
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              aria-label="Increase value"
              aria-hidden="true"
            >
              <ChevronUp className={iconSizeClasses[inputSize]} />
            </button>

            {/* Decrement button (bottom - down arrow) */}
            <button
              type="button"
              onClick={() => {
                decrement()
                inputRef.current?.focus()
              }}
              disabled={disabled || readOnly || isAtMin}
              className={cn(
                buttonBase,
                'rounded-br-lg',
                (disabled || readOnly || isAtMin) &&
                  'cursor-not-allowed opacity-50',
              )}
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              aria-label="Decrease value"
              aria-hidden="true"
            >
              <ChevronDown className={iconSizeClasses[inputSize]} />
            </button>
          </div>
        )}
      </div>
    )
  },
)

NumberInput.displayName = 'NumberInput'

export default NumberInput
