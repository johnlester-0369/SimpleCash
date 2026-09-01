import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/infra/core/utils/cn.util'
import { useOptionalFieldContext } from '@/app/components/ui/forms/Field'

type ComboboxSize = 'sm' | 'md' | 'lg'
type ComboboxVariant = 'default' | 'subtle'

export interface ComboboxOption {
  value: string
  label: string
  icon?: React.ReactNode
  disabled?: boolean
}

export interface ComboboxProps {
  /** Array of options */
  options: ComboboxOption[]
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
  /** Enable multiple selection */
  multiple?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Whether the combobox is disabled */
  disabled?: boolean
  /** Size variant */
  size?: ComboboxSize
  /** Visual variant */
  variant?: ComboboxVariant
  /** Whether combobox takes full width */
  fullWidth?: boolean
  /** Allow creating new options */
  allowCreate?: boolean
  /** Callback when creating new option */
  onCreate?: (value: string) => void
  /** Empty state message */
  emptyMessage?: string
  /** Custom filter function */
  filterFn?: (option: ComboboxOption, query: string) => boolean
  /** Whether to show clear button */
  clearable?: boolean
  /** Additional CSS classes */
  className?: string
  /** Make combobox input pill-shaped (fully rounded) */
  pill?: boolean
}

const inputBase =
  'w-full text-on-surface focus:outline-none disabled:opacity-state-disabled disabled:cursor-not-allowed placeholder:text-on-surface-variant transition-all duration-fast'

const variantClasses: Record<ComboboxVariant, string> = {
  default:
    'bg-transparent border-2 border-outline-variant focus:border-primary',
  subtle:
    'border-2 border-transparent bg-surface-container hover:bg-surface-container-high focus:border-primary',
}

const errorStateClass = 'border-error focus:border-error'

const sizeClasses: Record<ComboboxSize, string> = {
  sm: 'px-3 py-1.5 text-body-sm',
  md: 'px-4 py-2.5 text-body-md',
  lg: 'px-5 py-3 text-body-lg',
}

const menuSizeClasses: Record<ComboboxSize, string> = {
  sm: 'text-body-sm',
  md: 'text-body-md',
  lg: 'text-body-lg',
}

const tagSizeClasses: Record<ComboboxSize, string> = {
  sm: 'text-label-sm px-1.5 py-0.5',
  md: 'text-label-md px-2 py-0.5',
  lg: 'text-label-lg px-2.5 py-1',
}
/**
 * Border radius class based on pill prop
 */
const getBorderRadiusClass = (pill: boolean): string =>
  pill ? 'rounded-full' : 'rounded-lg'

/**
 * Combobox component - A searchable select with autocomplete
 *
 * Unlike Listbox, Combobox has a search input for filtering options.
 * Supports single and multiple selection with tag display.
 *
 * Features:
 * - Search/filter functionality
 * - Single and multiple selection modes
 * - Tag display for multiple selections
 * - Option to create new items
 * - Keyboard navigation
 * - Portal-based menu
 * - Field context integration
 * - Full accessibility
 *
 * @example
 * ```tsx
 * // Single selection with search
 * <Combobox
 *   options={countries}
 *   value={country}
 *   onChange={setCountry}
 *   placeholder="Search countries..."
 * />
 *
 * // Multiple selection with tags
 * <Combobox
 *   options={skills}
 *   values={selectedSkills}
 *   onChangeMultiple={setSelectedSkills}
 *   multiple
 *   placeholder="Select skills"
 * />
 *
 * // With create option
 * <Combobox
 *   options={tags}
 *   values={selectedTags}
 *   onChangeMultiple={setSelectedTags}
 *   multiple
 *   allowCreate
 *   onCreate={(val) => addTag(val)}
 * />
 *
 * // With Field wrapper
 * <Field.Root invalid={!!error} required>
 *   <Field.Label>Skills</Field.Label>
 *   <Combobox options={skills} values={selected} onChangeMultiple={setSelected} multiple />
 *   <Field.ErrorText>{error}</Field.ErrorText>
 * </Field.Root>
 * ```
 */
const Combobox: React.FC<ComboboxProps> = ({
  options,
  value: controlledValue,
  values: controlledValues,
  defaultValue,
  defaultValues,
  onChange,
  onChangeMultiple,
  multiple = false,
  placeholder = 'Select an option',
  disabled: disabledProp = false,
  size = 'md',
  variant = 'default',
  pill = false,
  fullWidth = true,
  allowCreate = false,
  onCreate,
  emptyMessage = 'No results found',
  filterFn,
  clearable = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [internalValue, setInternalValue] = useState(defaultValue || '')
  const [internalValues, setInternalValues] = useState<string[]>(
    defaultValues || [],
  )
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [menuRect, setMenuRect] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)

  // Get Field context
  const fieldContext = useOptionalFieldContext()
  const disabled = fieldContext?.disabled ?? disabledProp
  const hasError = fieldContext?.invalid ?? false
  const descriptionId = fieldContext?.descriptionId
  const inputId = fieldContext?.inputId

  // Controlled vs uncontrolled
  const isValueControlled = controlledValue !== undefined
  const isValuesControlled = controlledValues !== undefined

  const currentValue = isValueControlled ? controlledValue : internalValue
  const currentValues = isValuesControlled ? controlledValues : internalValues

  // Default filter function
  const defaultFilterFn = useCallback(
    (option: ComboboxOption, q: string): boolean => {
      return option.label.toLowerCase().includes(q.toLowerCase())
    },
    [],
  )

  const filterFunction = filterFn || defaultFilterFn

  // Filter options based on query
  const filteredOptions = useMemo(() => {
    if (!query) return options
    return options.filter((opt) => filterFunction(opt, query))
  }, [options, query, filterFunction])

  const enabledOptions = filteredOptions.filter((opt) => !opt.disabled)

  // Check if query matches an existing option exactly
  const queryMatchesOption = useMemo(() => {
    return options.some(
      (opt) => opt.label.toLowerCase() === query.toLowerCase(),
    )
  }, [options, query])

  // Show create option
  const showCreateOption =
    allowCreate && query && !queryMatchesOption && filteredOptions.length === 0

  // Get selected options for display
  const selectedOptions = useMemo(() => {
    return options.filter((opt) => currentValues.includes(opt.value))
  }, [options, currentValues])

  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === currentValue)
  }, [options, currentValue])

  // Calculate menu position
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const updatePosition = () => {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const scrollY = window.scrollY || window.pageYOffset
        const scrollX = window.scrollX || window.pageXOffset

        setMenuRect({
          top: rect.bottom + scrollY + 8,
          left: rect.left + scrollX,
          width: rect.width,
        })
      }

      updatePosition()
      window.addEventListener('resize', updatePosition)
      return () => window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen])

  // Close on scroll outside
  useEffect(() => {
    const handleScroll = (event: Event) => {
      if (!isOpen) return
      const target = event.target as Node | null
      if (target && menuRef.current?.contains(target)) return
      if (target && containerRef.current?.contains(target)) return
      setIsOpen(false)
      setFocusedIndex(-1)
    }

    if (isOpen) {
      window.addEventListener('scroll', handleScroll, true)
      return () => window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setFocusedIndex(-1)
        setQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Handle selection
  const handleSelect = (optionValue: string) => {
    if (multiple) {
      const newValues = currentValues.includes(optionValue)
        ? currentValues.filter((v) => v !== optionValue)
        : [...currentValues, optionValue]

      if (!isValuesControlled) {
        setInternalValues(newValues)
      }
      onChangeMultiple?.(newValues)
      setQuery('')
      inputRef.current?.focus()
    } else {
      if (!isValueControlled) {
        setInternalValue(optionValue)
      }
      onChange?.(optionValue)
      setIsOpen(false)
      setFocusedIndex(-1)
      setQuery('')
    }
  }

  // Handle create
  const handleCreate = () => {
    if (!query || !allowCreate) return
    onCreate?.(query)
    if (multiple) {
      const newValues = [...currentValues, query]
      if (!isValuesControlled) {
        setInternalValues(newValues)
      }
      onChangeMultiple?.(newValues)
    } else {
      if (!isValueControlled) {
        setInternalValue(query)
      }
      onChange?.(query)
      setIsOpen(false)
    }
    setQuery('')
    inputRef.current?.focus()
  }

  // Handle tag removal
  const handleRemoveTag = (valueToRemove: string) => {
    const newValues = currentValues.filter((v) => v !== valueToRemove)
    if (!isValuesControlled) {
      setInternalValues(newValues)
    }
    onChangeMultiple?.(newValues)
  }

  // Handle clear
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (multiple) {
      if (!isValuesControlled) {
        setInternalValues([])
      }
      onChangeMultiple?.([])
    } else {
      if (!isValueControlled) {
        setInternalValue('')
      }
      onChange?.('')
    }
    setQuery('')
    inputRef.current?.focus()
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    const totalOptions = enabledOptions.length + (showCreateOption ? 1 : 0)

    switch (e.key) {
      case 'Enter':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
          setFocusedIndex(0)
        } else if (showCreateOption && focusedIndex === enabledOptions.length) {
          handleCreate()
        } else if (focusedIndex >= 0 && enabledOptions[focusedIndex]) {
          handleSelect(enabledOptions[focusedIndex].value)
        }
        break

      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setFocusedIndex(-1)
        setQuery('')
        break

      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
          setFocusedIndex(0)
        } else {
          setFocusedIndex((prev) => (prev < totalOptions - 1 ? prev + 1 : prev))
        }
        break

      case 'ArrowUp':
        e.preventDefault()
        if (isOpen) {
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0))
        }
        break

      case 'Home':
        if (isOpen) {
          e.preventDefault()
          setFocusedIndex(0)
        }
        break

      case 'End':
        if (isOpen) {
          e.preventDefault()
          setFocusedIndex(totalOptions - 1)
        }
        break

      case 'Backspace':
        if (!query && multiple && currentValues.length > 0) {
          // Remove last tag
          const newValues = currentValues.slice(0, -1)
          if (!isValuesControlled) {
            setInternalValues(newValues)
          }
          onChangeMultiple?.(newValues)
        }
        break

      case 'Tab':
        setIsOpen(false)
        setFocusedIndex(-1)
        break
    }
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    setQuery(newQuery)
    if (!isOpen) setIsOpen(true)
    setFocusedIndex(0)
  }

  // Handle input focus
  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true)
      setFocusedIndex(0)
    }
  }

  // Scroll focused into view
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && menuRef.current) {
      const focusedElement = menuRef.current.children[
        focusedIndex
      ] as HTMLElement
      focusedElement?.scrollIntoView({ block: 'nearest' })
    }
  }, [focusedIndex, isOpen])

  const generatedId = React.useId()
  const menuId = `combobox-menu-${generatedId}`
  const finalInputId = inputId || `combobox-input-${generatedId}`

  // Determine if we should show clear button
  const showClear =
    clearable &&
    !disabled &&
    (multiple ? currentValues.length > 0 : !!currentValue)

  const inputClasses = cn(
    getBorderRadiusClass(pill),
    inputBase,
    variantClasses[variant],
    sizeClasses[size],
    hasError && errorStateClass,
    multiple && selectedOptions.length > 0 && 'pl-2',
    (showClear || !multiple) && 'pr-10',
  )

  // Render dropdown menu
  const dropdownMenu = isOpen && menuRect && (
    <ul
      ref={menuRef}
      id={menuId}
      role="listbox"
      aria-multiselectable={multiple || undefined}
      style={{
        position: 'absolute',
        top: `${menuRect.top}px`,
        left: `${menuRect.left}px`,
        minWidth: `${menuRect.width}px`,
        zIndex: 'var(--z-dropdown)',
      }}
      className={cn(
        'max-h-60 overflow-auto rounded-lg border border-outline-variant bg-surface shadow-elevation-2',
        menuSizeClasses[size],
      )}
    >
      {filteredOptions.length === 0 && !showCreateOption && (
        <li className="px-3 py-2 text-on-surface-variant">{emptyMessage}</li>
      )}

      {filteredOptions.map((option) => {
        const enabledIndex = enabledOptions.findIndex(
          (opt) => opt.value === option.value,
        )
        const isFocused = enabledIndex === focusedIndex
        const isSelected = multiple
          ? currentValues.includes(option.value)
          : option.value === currentValue

        return (
          <li
            key={option.value}
            role="option"
            aria-selected={isSelected}
            aria-disabled={option.disabled || undefined}
            className={cn(
              'flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors duration-fast',
              option.disabled
                ? 'opacity-state-disabled cursor-not-allowed'
                : 'hover:bg-on-surface/[var(--state-hover-opacity)]',
              isFocused &&
                !option.disabled &&
                'bg-on-surface/[var(--state-hover-opacity)]',
              isSelected && 'text-primary font-medium',
            )}
            onClick={() => !option.disabled && handleSelect(option.value)}
            onMouseEnter={() =>
              !option.disabled && setFocusedIndex(enabledIndex)
            }
          >
            <span className="flex items-center shrink-0 w-4 h-4">
              {isSelected && <Check className="w-4 h-4" />}
            </span>
            {option.icon && (
              <span className="flex items-center shrink-0">{option.icon}</span>
            )}
            <span className="flex-1 truncate">{option.label}</span>
          </li>
        )
      })}

      {showCreateOption && (
        <li
          role="option"
          className={cn(
            'flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors duration-fast',
            'hover:bg-on-surface/[var(--state-hover-opacity)]',
            focusedIndex === enabledOptions.length &&
              'bg-on-surface/[var(--state-hover-opacity)]',
          )}
          onClick={handleCreate}
          onMouseEnter={() => setFocusedIndex(enabledOptions.length)}
        >
          <span className="text-primary">Create &quot;{query}&quot;</span>
        </li>
      )}
    </ul>
  )

  return (
    <div
      ref={containerRef}
      className={cn('relative', fullWidth && 'w-full', className)}
    >
      <div className="relative flex items-center flex-wrap gap-1">
        {/* Tags for multiple selection */}
        {multiple && selectedOptions.length > 0 && (
          <div className="flex flex-wrap gap-1 absolute left-2 top-1/2 -translate-y-1/2 max-w-[calc(100%-3rem)] z-raised">
            {selectedOptions.slice(0, 3).map((opt) => (
              <span
                key={opt.value}
                className={cn(
                  'inline-flex items-center gap-1 rounded bg-primary-container text-on-primary-container',
                  tagSizeClasses[size],
                )}
              >
                <span className="truncate max-w-[80px]">{opt.label}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveTag(opt.value)
                  }}
                  className="hover:text-error transition-colors"
                  aria-label={`Remove ${opt.label}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {selectedOptions.length > 3 && (
              <span
                className={cn(
                  'inline-flex items-center rounded bg-surface-container-high text-on-surface-variant',
                  tagSizeClasses[size],
                )}
              >
                +{selectedOptions.length - 3}
              </span>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          id={finalInputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={isOpen ? menuId : undefined}
          aria-describedby={descriptionId}
          aria-invalid={hasError || undefined}
          aria-autocomplete="list"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={
            multiple && selectedOptions.length > 0
              ? ''
              : selectedOption?.label || placeholder
          }
          className={cn(
            inputClasses,
            multiple &&
              selectedOptions.length > 0 &&
              'pl-[calc(100%-3rem)] text-transparent placeholder:text-transparent',
          )}
        />

        {/* Right side icons */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-raised">
          {showClear && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded text-on-surface-variant hover:text-on-surface hover:bg-on-surface/[var(--state-hover-opacity)] transition-colors"
              aria-label="Clear selection"
            >
              <X
                className={cn(
                  size === 'sm' && 'h-3.5 w-3.5',
                  size === 'md' && 'h-4 w-4',
                  size === 'lg' && 'h-5 w-5',
                )}
              />
            </button>
          )}
          <ChevronDown
            className={cn(
              'text-on-surface-variant transition-transform duration-fast',
              isOpen && 'rotate-180',
              size === 'sm' && 'h-4 w-4',
              size === 'md' && 'h-5 w-5',
              size === 'lg' && 'h-6 w-6',
            )}
          />
        </div>
      </div>

      {isOpen && createPortal(dropdownMenu, document.body)}
    </div>
  )
}

Combobox.displayName = 'Combobox'

export default Combobox
