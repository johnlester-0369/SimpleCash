import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
} from 'react'
import { cn } from '@/infra/core/utils/cn.util'
import { useOptionalFieldsetContext } from '@/app/components/ui/forms/Fieldset'

type RadioSize = 'sm' | 'md' | 'lg'
type RadioColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'error'
  | 'success'
  | 'warning'
  | 'info'
type RadioOrientation = 'horizontal' | 'vertical'

// ============================================================================
// RadioGroup Context
// ============================================================================

interface RadioGroupContextValue {
  /** Current selected value */
  value: string | undefined
  /** Callback when selection changes */
  onChange: (value: string) => void
  /** Group name for form submission */
  name: string
  /** Whether the group is disabled */
  disabled: boolean
  /** Size for all radios in the group */
  size: RadioSize
  /** Color for all radios in the group */
  color: RadioColor
}

const RadioGroupContext = createContext<RadioGroupContextValue | undefined>(
  undefined,
)

/**
 * Hook to access RadioGroup context
 * @throws Error if used outside of RadioGroup
 */
const useRadioGroupContext = () => {
  const context = useContext(RadioGroupContext)
  if (!context) {
    throw new Error('Radio must be used within a RadioGroup')
  }
  return context
}

// ============================================================================
// RadioGroup Component
// ============================================================================

export interface RadioGroupProps {
  /** RadioGroup content (Radio components) */
  children: React.ReactNode
  /** Controlled value */
  value?: string
  /** Default value for uncontrolled usage */
  defaultValue?: string
  /** Callback when selection changes */
  onChange?: (value: string) => void
  /** Form input name (required for form submission) */
  name?: string
  /** Whether all radios in the group are disabled */
  disabled?: boolean
  /** Size for all radios in the group */
  size?: RadioSize
  /** Color for all radios in the group */
  color?: RadioColor
  /** Layout orientation */
  orientation?: RadioOrientation
  /** Additional CSS classes */
  className?: string
}

/**
 * RadioGroup component - Container for Radio buttons
 *
 * Provides context for Radio children and manages selection state.
 * Use with Fieldset for proper form grouping with legend.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <RadioGroup value={selected} onChange={setSelected} name="plan">
 *   <Radio value="free" label="Free Plan" />
 *   <Radio value="pro" label="Pro Plan" />
 *   <Radio value="enterprise" label="Enterprise Plan" />
 * </RadioGroup>
 *
 * // With Fieldset
 * <Fieldset.Root>
 *   <Fieldset.Legend>Select your plan</Fieldset.Legend>
 *   <Fieldset.Content>
 *     <RadioGroup value={plan} onChange={setPlan} name="plan">
 *       <Radio value="free" label="Free" />
 *       <Radio value="pro" label="Pro" />
 *     </RadioGroup>
 *   </Fieldset.Content>
 * </Fieldset.Root>
 * ```
 */
function RadioGroup({
  children,
  value: controlledValue,
  defaultValue = '',
  onChange,
  name: nameProp,
  disabled: disabledProp = false,
  size = 'md',
  color = 'primary',
  orientation = 'vertical',
  className,
}: RadioGroupProps) {
  const [internalValue, setInternalValue] = useState(defaultValue)

  // Get Fieldset context if available
  const fieldsetContext = useOptionalFieldsetContext()

  // Use Fieldset disabled state if available
  const disabled = fieldsetContext?.disabled ?? disabledProp

  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : internalValue

  const generatedName = React.useId()
  const name = nameProp || `radio-group-${generatedName}`

  const handleChange = useCallback(
    (newValue: string) => {
      if (disabled) return

      if (!isControlled) {
        setInternalValue(newValue)
      }

      onChange?.(newValue)
    },
    [disabled, isControlled, onChange],
  )

  const contextValue = useMemo<RadioGroupContextValue>(
    () => ({
      value,
      onChange: handleChange,
      name,
      disabled,
      size,
      color,
    }),
    [value, handleChange, name, disabled, size, color],
  )

  return (
    <RadioGroupContext.Provider value={contextValue}>
      <div
        role="radiogroup"
        aria-disabled={disabled || undefined}
        className={cn(
          'flex',
          orientation === 'vertical'
            ? 'flex-col gap-3'
            : 'flex-row flex-wrap gap-4',
          disabled && 'pointer-events-none',
          className,
        )}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  )
}

// ============================================================================
// Radio Component
// ============================================================================

export interface RadioProps {
  /** Value of the radio option (required) */
  value: string
  /** Label text displayed next to the radio */
  label?: string
  /** Whether this specific radio is disabled */
  disabled?: boolean
  /** Size override (defaults to group size) */
  size?: RadioSize
  /** Color override (defaults to group color) */
  color?: RadioColor
  /** Additional CSS classes */
  className?: string
}

/**
 * Size configurations for the radio
 */
const sizeConfig = {
  sm: {
    container: 'w-4 h-4',
    dot: 'w-1.5 h-1.5',
    label: 'text-label-md',
    gap: 'gap-2',
  },
  md: {
    container: 'w-5 h-5',
    dot: 'w-2 h-2',
    label: 'text-body-md',
    gap: 'gap-2.5',
  },
  lg: {
    container: 'w-6 h-6',
    dot: 'w-2.5 h-2.5',
    label: 'text-body-lg',
    gap: 'gap-3',
  },
}

/**
 * Color classes for selected state (border color)
 */
const colorClasses: Record<RadioColor, string> = {
  primary: 'border-primary',
  secondary: 'border-secondary',
  tertiary: 'border-tertiary',
  error: 'border-error',
  success: 'border-success',
  warning: 'border-warning',
  info: 'border-info',
}

/**
 * Dot color classes
 */
const dotColorClasses: Record<RadioColor, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  tertiary: 'bg-tertiary',
  error: 'bg-error',
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-info',
}

/**
 * Focus ring color classes
 */
const focusRingClasses: Record<RadioColor, string> = {
  primary: 'peer-focus-visible:ring-primary',
  secondary: 'peer-focus-visible:ring-secondary',
  tertiary: 'peer-focus-visible:ring-tertiary',
  error: 'peer-focus-visible:ring-error',
  success: 'peer-focus-visible:ring-success',
  warning: 'peer-focus-visible:ring-warning',
  info: 'peer-focus-visible:ring-info',
}

/**
 * Radio component - Individual radio button
 *
 * Must be used within a RadioGroup. The group manages selection state.
 *
 * Features:
 * - Three sizes: sm, md, lg
 * - Seven color variants
 * - Inherits state from RadioGroup
 * - Optional individual disabled state
 * - Full keyboard accessibility
 * - M3-compliant styling
 *
 * @example
 * ```tsx
 * <RadioGroup value={selected} onChange={setSelected}>
 *   <Radio value="option1" label="Option 1" />
 *   <Radio value="option2" label="Option 2" />
 *   <Radio value="option3" label="Option 3" disabled />
 * </RadioGroup>
 * ```
 */
function Radio({
  value,
  label,
  disabled: disabledProp,
  size: sizeProp,
  color: colorProp,
  className,
}: RadioProps) {
  const groupContext = useRadioGroupContext()

  const isSelected = groupContext.value === value
  const disabled = disabledProp || groupContext.disabled
  const size = sizeProp || groupContext.size
  const color = colorProp || groupContext.color

  const generatedId = React.useId()
  const radioId = `radio-${generatedId}`

  const config = sizeConfig[size]

  const handleChange = () => {
    if (!disabled) {
      groupContext.onChange(value)
    }
  }

  const radioElement = (
    <span className="relative inline-flex items-center justify-center">
      {/* Hidden native input for form compatibility and accessibility */}
      <input
        type="radio"
        id={radioId}
        name={groupContext.name}
        value={value}
        checked={isSelected}
        disabled={disabled}
        onChange={handleChange}
        className="sr-only peer"
      />

      {/* Custom radio visual */}
      <span
        className={cn(
          // Base styles
          'inline-flex items-center justify-center rounded-full border-2 transition-all duration-fast ease-standard',
          config.container,
          // Unselected state
          !isSelected && 'border-outline bg-transparent',
          // Selected state
          isSelected && colorClasses[color],
          // Focus ring (triggered by peer focus)
          'peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface',
          focusRingClasses[color],
          // Hover state
          !disabled && 'cursor-pointer hover:border-on-surface/60',
          !disabled && isSelected && 'hover:opacity-90',
          // Disabled state
          disabled && 'opacity-state-disabled cursor-not-allowed',
        )}
        aria-hidden="true"
      >
        {/* Inner dot when selected */}
        {isSelected && (
          <span
            className={cn(
              'rounded-full transition-transform duration-fast ease-standard',
              config.dot,
              dotColorClasses[color],
            )}
          />
        )}
      </span>
    </span>
  )

  // If no label, return just the radio
  if (!label) {
    return <span className={cn('inline-flex', className)}>{radioElement}</span>
  }

  // With label, wrap in a label element for better UX
  return (
    <label
      htmlFor={radioId}
      className={cn(
        'inline-flex items-center',
        config.gap,
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        className,
      )}
    >
      {radioElement}
      <span
        className={cn('font-medium text-on-surface select-none', config.label)}
      >
        {label}
      </span>
    </label>
  )
}

// ============================================================================
// Exports
// ============================================================================

Radio.displayName = 'Radio'
RadioGroup.displayName = 'RadioGroup'

export { Radio, RadioGroup }
export default Radio
