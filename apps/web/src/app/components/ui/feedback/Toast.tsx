import React, { useEffect, useState, useCallback } from 'react'
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Circle,
} from 'lucide-react'
import { cn } from '@/infra/core/utils/cn.util'
import {
  forwardRefWithAs,
  type PolymorphicComponentPropsWithRef,
} from '@/infra/core/utils/polymorphic.util'

/**
 * Toast visual style variants
 * - tonal: Soft container backgrounds for subtle feedback
 * - filled: Solid backgrounds for high-emphasis toasts
 * - outlined: Border-only style for minimal look
 * - gradient: Vibrant gradient backgrounds for maximum impact
 * - accent: Left border accent with subtle background
 */
export type ToastVariant =
  'tonal' | 'filled' | 'outlined' | 'gradient' | 'accent'

/**
 * Toast color options (semantic meaning)
 * - neutral: General notifications without specific semantic meaning
 * - success: Positive feedback, confirmations
 * - error: Errors, failures, critical issues
 * - warning: Cautions, important notices
 * - info: Informational messages, tips
 */
export type ToastColor = 'neutral' | 'success' | 'error' | 'warning' | 'info'

export type ToastSize = 'sm' | 'md' | 'lg'

export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export interface ToastAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

/**
 * Base props for Toast component (excluding HTML attributes)
 */
export type ToastOwnProps = {
  /** Unique identifier for the toast */
  id: string
  /** Visual variant style */
  variant?: ToastVariant
  /** Color scheme - determines semantic meaning */
  color?: ToastColor
  /** Size of the toast */
  size?: ToastSize
  /** Toast title (required) */
  title: string
  /** Optional description message */
  message?: string
  /** Custom icon to override default color icon */
  icon?: React.ReactNode
  /** Hide the icon */
  hideIcon?: boolean
  /** Duration in milliseconds before auto-dismiss (0 = no auto-dismiss) */
  duration?: number
  /** Show progress bar for auto-dismiss */
  showProgress?: boolean
  /** Callback when toast is dismissed */
  onDismiss?: (id: string) => void
  /** Action buttons to display */
  actions?: ToastAction[]
}

/**
 * Polymorphic Toast props - supports `as` prop for rendering as different elements
 * @example
 * ```tsx
 * <Toast as="article" id="1" title="Success" />
 * ```
 */
export type ToastProps<T extends React.ElementType = 'div'> =
  PolymorphicComponentPropsWithRef<T, ToastOwnProps>

/**
 * Default icons for each color
 */
const colorIcons: Record<ToastColor, React.ReactNode> = {
  neutral: <Circle className="h-5 w-5 flex-shrink-0" />,
  success: <CheckCircle2 className="h-5 w-5 flex-shrink-0" />,
  error: <AlertCircle className="h-5 w-5 flex-shrink-0" />,
  warning: <AlertTriangle className="h-5 w-5 flex-shrink-0" />,
  info: <Info className="h-5 w-5 flex-shrink-0" />,
}

/**
 * Size-specific icon classes
 */
const sizeIconClasses: Record<ToastSize, string> = {
  sm: '[&>svg]:h-4 [&>svg]:w-4',
  md: '[&>svg]:h-5 [&>svg]:w-5',
  lg: '[&>svg]:h-6 [&>svg]:w-6',
}

/**
 * Size styles for padding and typography
 */
const sizeStyles: Record<ToastSize, string> = {
  sm: 'px-3 py-2 text-body-sm min-w-[280px] max-w-[360px]',
  md: 'px-4 py-3 text-body-md min-w-[320px] max-w-[420px]',
  lg: 'px-5 py-4 text-body-lg min-w-[360px] max-w-[480px]',
}

/**
 * Title size classes
 */
const titleSizeClasses: Record<ToastSize, string> = {
  sm: 'text-label-md',
  md: 'text-label-lg',
  lg: 'text-title-sm',
}

/**
 * Tonal variant - soft container backgrounds
 */
const tonalStyles: Record<ToastColor, string> = {
  neutral:
    'bg-surface-container-high text-on-surface border-outline-variant/20',
  success: 'bg-success-container text-on-success-container border-success/20',
  error: 'bg-error-container text-on-error-container border-error/20',
  warning: 'bg-warning-container text-on-warning-container border-warning/20',
  info: 'bg-info-container text-on-info-container border-info/20',
}

/**
 * Filled variant - solid backgrounds
 * Neutral uses inverse surface for overlay-style appearance
 */
const filledStyles: Record<ToastColor, string> = {
  neutral: 'bg-inverse-surface text-inverse-on-surface border-transparent',
  success: 'bg-success text-on-success border-transparent',
  error: 'bg-error text-on-error border-transparent',
  warning: 'bg-warning text-on-warning border-transparent',
  info: 'bg-info text-on-info border-transparent',
}

/**
 * Outlined variant - border only
 */
const outlinedStyles: Record<ToastColor, string> = {
  neutral: 'bg-surface text-on-surface border-outline border-2',
  success: 'bg-surface text-success border-success border-2',
  error: 'bg-surface text-error border-error border-2',
  warning: 'bg-surface text-warning border-warning border-2',
  info: 'bg-surface text-info border-info border-2',
}

/**
 * Gradient variant - vibrant gradient backgrounds using CSS variables
 */
const gradientStyles: Record<ToastColor, string> = {
  neutral:
    'text-white border-transparent [background:var(--color-gradient-primary)]',
  success:
    'text-white border-transparent [background:var(--color-gradient-success)]',
  error:
    'text-white border-transparent [background:var(--color-gradient-error)]',
  warning:
    'text-white border-transparent [background:var(--color-gradient-warning)]',
  info: 'text-white border-transparent [background:var(--color-gradient-info)]',
}

/**
 * Accent variant - left border accent with tonal background
 */
const accentStyles: Record<ToastColor, string> = {
  neutral:
    'bg-surface-container text-on-surface border-l-4 border-l-outline border-y-0 border-r-0 rounded-l-none',
  success:
    'bg-success-container/50 text-on-success-container border-l-4 border-l-success border-y-0 border-r-0 rounded-l-none',
  error:
    'bg-error-container/50 text-on-error-container border-l-4 border-l-error border-y-0 border-r-0 rounded-l-none',
  warning:
    'bg-warning-container/50 text-on-warning-container border-l-4 border-l-warning border-y-0 border-r-0 rounded-l-none',
  info: 'bg-info-container/50 text-on-info-container border-l-4 border-l-info border-y-0 border-r-0 rounded-l-none',
}

/**
 * Map variant to style record
 */
const variantStyleMap: Record<ToastVariant, Record<ToastColor, string>> = {
  tonal: tonalStyles,
  filled: filledStyles,
  outlined: outlinedStyles,
  gradient: gradientStyles,
  accent: accentStyles,
}

/**
 * Progress bar color classes
 */
const progressColorClasses: Record<ToastVariant, Record<ToastColor, string>> = {
  tonal: {
    neutral: 'bg-on-surface',
    success: 'bg-success',
    error: 'bg-error',
    warning: 'bg-warning',
    info: 'bg-info',
  },
  filled: {
    neutral: 'bg-inverse-on-surface/30',
    success: 'bg-on-success/30',
    error: 'bg-on-error/30',
    warning: 'bg-on-warning/30',
    info: 'bg-on-info/30',
  },
  outlined: {
    neutral: 'bg-on-surface',
    success: 'bg-success',
    error: 'bg-error',
    warning: 'bg-warning',
    info: 'bg-info',
  },
  gradient: {
    neutral: 'bg-white/30',
    success: 'bg-white/30',
    error: 'bg-white/30',
    warning: 'bg-white/30',
    info: 'bg-white/30',
  },
  accent: {
    neutral: 'bg-on-surface',
    success: 'bg-success',
    error: 'bg-error',
    warning: 'bg-warning',
    info: 'bg-info',
  },
}

/**
 * Action button styles based on variant and color
 * Filled neutral uses inverse-primary for proper contrast on inverse surface
 */
const getActionButtonStyles = (
  variant: ToastVariant,
  color: ToastColor,
  actionVariant: 'primary' | 'secondary',
): string => {
  const base =
    'px-3 py-1.5 rounded-md text-label-md font-medium transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1'

  // Filled neutral uses inverse surface, so use inverse-primary for action
  if (variant === 'filled' && color === 'neutral') {
    if (actionVariant === 'primary') {
      return cn(
        base,
        'bg-inverse-on-surface/20 hover:bg-inverse-on-surface/30 text-inverse-primary',
      )
    }
    return cn(base, 'hover:bg-inverse-on-surface/10 text-inverse-primary')
  }

  if (variant === 'filled' || variant === 'gradient') {
    if (actionVariant === 'primary') {
      return cn(base, 'bg-surface/20 hover:bg-surface/30 text-inherit')
    }
    return cn(base, 'hover:bg-surface/10 text-inherit')
  }

  const colorButtonMap: Record<ToastColor, string> = {
    neutral:
      actionVariant === 'primary'
        ? 'bg-on-surface text-surface hover:bg-on-surface/90 focus-visible:ring-on-surface'
        : 'text-on-surface hover:bg-on-surface/10 focus-visible:ring-on-surface',
    success:
      actionVariant === 'primary'
        ? 'bg-success text-on-success hover:bg-success/90 focus-visible:ring-success'
        : 'text-success hover:bg-success/10 focus-visible:ring-success',
    error:
      actionVariant === 'primary'
        ? 'bg-error text-on-error hover:bg-error/90 focus-visible:ring-error'
        : 'text-error hover:bg-error/10 focus-visible:ring-error',
    warning:
      actionVariant === 'primary'
        ? 'bg-warning text-on-warning hover:bg-warning/90 focus-visible:ring-warning'
        : 'text-warning hover:bg-warning/10 focus-visible:ring-warning',
    info:
      actionVariant === 'primary'
        ? 'bg-info text-on-info hover:bg-info/90 focus-visible:ring-info'
        : 'text-info hover:bg-info/10 focus-visible:ring-info',
  }

  return cn(base, colorButtonMap[color])
}

/**
 * Individual Toast component
 *
 * @example
 * ```tsx
 * <Toast
 *   id="1"
 *   variant="tonal"
 *   color="success"
 *   title="Success!"
 *   message="Your changes have been saved."
 *   duration={5000}
 *   onDismiss={(id) => removeToast(id)}
 * />
 *
 * // Polymorphic usage
 * <Toast as="article" id="1" title="Success" />
 * ```
 */
const Toast = forwardRefWithAs<'div', ToastOwnProps>((props, ref) => {
  const {
    as,
    id,
    variant = 'tonal',
    color = 'info',
    size = 'md',
    title,
    message,
    icon,
    hideIcon = false,
    duration = 5000,
    showProgress = true,
    onDismiss,
    actions,
    className,
    ...rest
  } = props

  const Component = as || 'div'
  const [isExiting, setIsExiting] = useState(false)
  const [progress, setProgress] = useState(100)

  const variantStyles = variantStyleMap[variant]
  const colorStyle = variantStyles[color]
  const displayIcon = icon ?? colorIcons[color]

  const handleDismiss = useCallback(() => {
    setIsExiting(true)
    // Wait for exit animation before calling onDismiss
    setTimeout(() => {
      onDismiss?.(id)
    }, 200)
  }, [id, onDismiss])

  // Handle auto-dismiss with progress
  useEffect(() => {
    if (duration <= 0) return

    const startTime = Date.now()
    const endTime = startTime + duration

    const updateProgress = () => {
      const now = Date.now()
      const remaining = Math.max(0, endTime - now)
      const newProgress = (remaining / duration) * 100
      setProgress(newProgress)

      if (remaining > 0) {
        requestAnimationFrame(updateProgress)
      }
    }

    const progressFrame = requestAnimationFrame(updateProgress)

    const timer = setTimeout(() => {
      handleDismiss()
    }, duration)

    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(progressFrame)
    }
  }, [duration, handleDismiss])

  return (
    <Component
      ref={ref}
      className={cn(
        'rounded-lg border shadow-elevation-3 relative overflow-hidden',
        'animate-in fade-in slide-in-from-right-full duration-normal',
        isExiting &&
          'animate-out fade-out slide-out-to-right-full duration-fast',
        sizeStyles[size],
        colorStyle,
        className,
      )}
      role="alert"
      aria-live="polite"
      {...rest}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        {!hideIcon && (
          <div className={cn('flex-shrink-0 mt-0.5', sizeIconClasses[size])}>
            {displayIcon}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={cn('font-semibold', titleSizeClasses[size])}>{title}</p>
          {message && (
            <p
              className={cn(
                'mt-1 opacity-90',
                size === 'sm' ? 'text-body-sm' : 'text-body-sm',
              )}
            >
              {message}
            </p>
          )}

          {/* Actions */}
          {actions && actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={getActionButtonStyles(
                    variant,
                    color,
                    action.variant ?? 'secondary',
                  )}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className={cn(
            'flex-shrink-0 p-1 rounded-md hover:opacity-70 transition-opacity duration-fast',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-1',
          )}
          aria-label="Dismiss toast"
        >
          <X
            className={cn(
              size === 'sm'
                ? 'h-3.5 w-3.5'
                : size === 'lg'
                  ? 'h-5 w-5'
                  : 'h-4 w-4',
            )}
          />
        </button>
      </div>

      {/* Progress bar */}
      {showProgress && duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-current/10">
          <div
            className={cn(
              'h-full transition-none',
              progressColorClasses[variant][color],
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </Component>
  )
})

Toast.displayName = 'Toast'

export default Toast

// ============================================================================
// Toast Container Component
// ============================================================================

export interface ToastContainerProps {
  /** Position of toast container */
  position?: ToastPosition
  /** Toast items to render */
  toasts: ToastProps[]
  /** Callback when a toast is dismissed */
  onDismiss: (id: string) => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Position to Tailwind class mapping
 */
const positionClasses: Record<ToastPosition, string> = {
  'top-left': 'top-4 left-4 items-start',
  'top-center': 'top-4 left-1/2 -translate-x-1/2 items-center',
  'top-right': 'top-4 right-4 items-end',
  'bottom-left': 'bottom-4 left-4 items-start',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 items-center',
  'bottom-right': 'bottom-4 right-4 items-end',
}

/**
 * ToastContainer - Container for positioning and stacking toasts
 *
 * @example
 * ```tsx
 * <ToastContainer
 *   position="top-right"
 *   toasts={toasts}
 *   onDismiss={removeToast}
 * />
 * ```
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({
  position = 'top-right',
  toasts,
  onDismiss,
  className,
}) => {
  if (toasts.length === 0) return null

  return (
    <div
      className={cn(
        'fixed z-notification flex flex-col gap-3 pointer-events-none',
        positionClasses[position],
        className,
      )}
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  )
}
