import React, { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/infra/core/utils/cn.util'

type ListboxSize = 'sm' | 'md' | 'lg'
type ListboxVariant = 'subtle' | 'solid'
type SelectionMode = 'single' | 'multiple'

export interface ListboxOption {
  value: string
  label: string
  icon?: React.ReactNode
  disabled?: boolean
  group?: string
}

export interface ListboxProps {
  /** Array of options */
  options: ListboxOption[]
  /** Controlled value (single selection) */
  value?: string
  /** Controlled values (multiple selection) */
  values?: string[]
  /** Default value for uncontrolled single selection */
  defaultValue?: string
  /** Default values for uncontrolled multiple selection */
  defaultValues?: string[]
  /** Callback for single selection change */
  onChange?: (value: string) => void
  /** Callback for multiple selection change */
  onChangeMultiple?: (values: string[]) => void
  /** Selection mode: 'single' or 'multiple' */
  selectionMode?: SelectionMode
  /** Label for the listbox */
  label?: string
  /** Whether the listbox is disabled */
  disabled?: boolean
  /** Size variant */
  size?: ListboxSize
  /** Visual variant */
  variant?: ListboxVariant
  /** Maximum height of the list container */
  maxHeight?: string
  /** Additional CSS classes */
  className?: string
}

const listboxBase = 'w-full rounded-lg border overflow-auto'

const variantClasses: Record<ListboxVariant, string> = {
  subtle: 'border-outline-variant',
  solid: 'bg-surface-container border-outline-variant',
}

const sizeClasses: Record<ListboxSize, string> = {
  sm: 'text-body-sm',
  md: 'text-body-md',
  lg: 'text-body-lg',
}

const itemSizeClasses: Record<ListboxSize, string> = {
  sm: 'px-3 py-1.5',
  md: 'px-4 py-2',
  lg: 'px-5 py-2.5',
}

/**
 * Listbox component - A static, always-visible list for selection
 *
 * Unlike Select (dropdown), Listbox displays all options in a visible container.
 * This matches the Chakra UI Listbox pattern where the list is always visible,
 * not hidden behind a trigger button.
 *
 * Features:
 * - Always visible (not a dropdown)
 * - Single and multiple selection modes
 * - Option groups support
 * - Keyboard navigation (Arrow keys, Enter, Space, Home, End)
 * - Full accessibility with ARIA attributes
 * - Visual selection indicators
 *
 * When to use:
 * - Use Listbox when options should be immediately visible
 * - Use Select when you need a space-saving dropdown trigger
 *
 * @example
 * ```tsx
 * // Single selection
 * <Listbox
 *   options={countries}
 *   value={country}
 *   onChange={setCountry}
 *   label="Select Country"
 * />
 *
 * // Multiple selection
 * <Listbox
 *   options={tags}
 *   values={selectedTags}
 *   onChangeMultiple={setSelectedTags}
 *   selectionMode="multiple"
 *   label="Select Tags"
 * />
 * ```
 */
const Listbox: React.FC<ListboxProps> = ({
  options,
  value: controlledValue,
  values: controlledValues,
  defaultValue,
  defaultValues,
  onChange,
  onChangeMultiple,
  selectionMode = 'single',
  label,
  disabled = false,
  size = 'md',
  variant = 'subtle',
  maxHeight = '20rem',
  className,
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue || '')
  const [internalValues, setInternalValues] = useState<string[]>(
    defaultValues || [],
  )
  const [focusedIndex, setFocusedIndex] = useState(-1)

  const listRef = useRef<HTMLUListElement>(null)

  // Controlled vs uncontrolled
  const isValueControlled = controlledValue !== undefined
  const isValuesControlled = controlledValues !== undefined

  const currentValue = isValueControlled ? controlledValue : internalValue
  const currentValues = isValuesControlled ? controlledValues : internalValues

  // Get enabled options for keyboard navigation
  const enabledOptions = options.filter((opt) => !opt.disabled)

  // Handle selection
  const handleSelect = (optionValue: string, option: ListboxOption) => {
    if (option.disabled || disabled) return

    if (selectionMode === 'multiple') {
      const newValues = currentValues.includes(optionValue)
        ? currentValues.filter((v) => v !== optionValue)
        : [...currentValues, optionValue]

      if (!isValuesControlled) {
        setInternalValues(newValues)
      }
      onChangeMultiple?.(newValues)
    } else {
      if (!isValueControlled) {
        setInternalValue(optionValue)
      }
      onChange?.(optionValue)
    }
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex((prev) =>
          prev < enabledOptions.length - 1 ? prev + 1 : prev,
        )
        break

      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0))
        break

      case 'Home':
        e.preventDefault()
        setFocusedIndex(0)
        break

      case 'End':
        e.preventDefault()
        setFocusedIndex(enabledOptions.length - 1)
        break

      case 'Enter':
      case ' ':
        e.preventDefault()
        if (focusedIndex >= 0 && enabledOptions[focusedIndex]) {
          handleSelect(
            enabledOptions[focusedIndex].value,
            enabledOptions[focusedIndex],
          )
        }
        break
    }
  }

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[
        focusedIndex
      ] as HTMLElement
      focusedElement?.scrollIntoView({ block: 'nearest' })
    }
  }, [focusedIndex])

  const generatedId = React.useId()
  const listboxId = `listbox-${generatedId}`
  const labelId = label ? `listbox-label-${generatedId}` : undefined

  // Group options if needed
  const groupedOptions = React.useMemo(() => {
    const groups = new Map<string | undefined, ListboxOption[]>()
    options.forEach((opt) => {
      const group = opt.group
      if (!groups.has(group)) {
        groups.set(group, [])
      }
      groups.get(group)!.push(opt)
    })
    return groups
  }, [options])

  const hasGroups = Array.from(groupedOptions.keys()).some(
    (g) => g !== undefined,
  )

  // Render list content
  const renderListContent = () => {
    if (!hasGroups) {
      return options.map((option) => {
        const enabledIndex = enabledOptions.findIndex(
          (opt) => opt.value === option.value,
        )
        const isFocused = enabledIndex === focusedIndex
        const isSelected =
          selectionMode === 'multiple'
            ? currentValues.includes(option.value)
            : option.value === currentValue

        return (
          <li
            key={option.value}
            role="option"
            aria-selected={isSelected}
            aria-disabled={option.disabled || undefined}
            tabIndex={isFocused ? 0 : -1}
            className={cn(
              'flex items-center gap-3 cursor-pointer transition-colors duration-fast',
              itemSizeClasses[size],
              option.disabled
                ? 'opacity-state-disabled cursor-not-allowed'
                : 'hover:bg-on-surface/[var(--state-hover-opacity)] active:bg-on-surface/[var(--state-pressed-opacity)]',
              isFocused &&
                !option.disabled &&
                'bg-on-surface/[var(--state-hover-opacity)]',
              isSelected && 'text-primary font-medium',
            )}
            onClick={() => handleSelect(option.value, option)}
            onMouseEnter={() =>
              !option.disabled && setFocusedIndex(enabledIndex)
            }
          >
            {/* Selection indicator */}
            <span className="flex items-center shrink-0 w-5 h-5">
              {isSelected && <Check className="w-5 h-5" />}
            </span>

            {/* Option icon */}
            {option.icon && (
              <span className="flex items-center shrink-0">{option.icon}</span>
            )}

            {/* Option label */}
            <span className="flex-1 truncate">{option.label}</span>
          </li>
        )
      })
    }

    // Render with groups
    const elements: React.ReactNode[] = []
    let enabledIndexCounter = 0

    groupedOptions.forEach((groupOptions, groupName) => {
      if (groupName) {
        elements.push(
          <li
            key={`group-${groupName}`}
            className="px-4 py-2 text-label-sm font-medium text-on-surface-variant uppercase tracking-wider"
            role="presentation"
          >
            {groupName}
          </li>,
        )
      }

      groupOptions.forEach((option) => {
        const currentEnabledIndex = option.disabled ? -1 : enabledIndexCounter
        if (!option.disabled) enabledIndexCounter++

        const isFocused = currentEnabledIndex === focusedIndex
        const isSelected =
          selectionMode === 'multiple'
            ? currentValues.includes(option.value)
            : option.value === currentValue

        elements.push(
          <li
            key={option.value}
            role="option"
            aria-selected={isSelected}
            aria-disabled={option.disabled || undefined}
            tabIndex={isFocused ? 0 : -1}
            className={cn(
              'flex items-center gap-3 cursor-pointer transition-colors duration-fast',
              itemSizeClasses[size],
              groupName && 'pl-8',
              option.disabled
                ? 'opacity-state-disabled cursor-not-allowed'
                : 'hover:bg-on-surface/[var(--state-hover-opacity)]',
              isFocused &&
                !option.disabled &&
                'bg-on-surface/[var(--state-hover-opacity)]',
              isSelected && 'text-primary font-medium',
            )}
            onClick={() => handleSelect(option.value, option)}
            onMouseEnter={() =>
              !option.disabled && setFocusedIndex(currentEnabledIndex)
            }
          >
            {/* Selection indicator */}
            <span className="flex items-center shrink-0 w-5 h-5">
              {isSelected && <Check className="w-5 h-5" />}
            </span>

            {/* Option icon */}
            {option.icon && (
              <span className="flex items-center shrink-0">{option.icon}</span>
            )}

            {/* Option label */}
            <span className="flex-1 truncate">{option.label}</span>
          </li>,
        )
      })
    })

    return elements
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Label */}
      {label && (
        <label
          id={labelId}
          className={cn(
            'text-label-md font-medium text-on-surface',
            disabled && 'opacity-state-disabled',
          )}
        >
          {label}
        </label>
      )}

      {/* Static visible list container */}
      <ul
        ref={listRef}
        id={listboxId}
        role="listbox"
        aria-labelledby={labelId}
        aria-multiselectable={selectionMode === 'multiple' || undefined}
        aria-disabled={disabled || undefined}
        onKeyDown={handleKeyDown}
        style={{ maxHeight }}
        className={cn(
          listboxBase,
          variantClasses[variant],
          sizeClasses[size],
          disabled && 'opacity-state-disabled pointer-events-none',
        )}
      >
        {renderListContent()}
      </ul>
    </div>
  )
}

Listbox.displayName = 'Listbox'

export default Listbox
