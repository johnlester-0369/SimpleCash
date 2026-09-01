import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react'
import { ToastContainer } from '@/app/components/ui/feedback/Toast'
import type {
  ToastProps,
  ToastPosition,
  ToastVariant,
  ToastColor,
  ToastSize,
  ToastAction,
} from '@/app/components/ui/feedback/Toast'

// ============================================================================
// Types
// ============================================================================

export interface ToastOptions {
  /** Visual variant style */
  variant?: ToastVariant
  /** Color scheme */
  color?: ToastColor
  /** Size of the toast */
  size?: ToastSize
  /** Toast title (required) */
  title: string
  /** Optional description message */
  message?: string
  /** Custom icon */
  icon?: React.ReactNode
  /** Hide the icon */
  hideIcon?: boolean
  /** Duration in milliseconds (0 = no auto-dismiss) */
  duration?: number
  /** Show progress bar */
  showProgress?: boolean
  /** Action buttons */
  actions?: ToastAction[]
}

interface ToastContextType {
  /** Current toast position */
  position: ToastPosition
  /** Update toast container position */
  setPosition: (position: ToastPosition) => void
  /** Show a toast notification */
  toast: (options: ToastOptions) => string
  /** Show a success toast */
  success: (
    title: string,
    message?: string,
    options?: Partial<ToastOptions>,
  ) => string
  /** Show an error toast */
  error: (
    title: string,
    message?: string,
    options?: Partial<ToastOptions>,
  ) => string
  /** Show a warning toast */
  warning: (
    title: string,
    message?: string,
    options?: Partial<ToastOptions>,
  ) => string
  /** Show an info toast */
  info: (
    title: string,
    message?: string,
    options?: Partial<ToastOptions>,
  ) => string
  /** Dismiss a specific toast by ID */
  dismiss: (id: string) => void
  /** Dismiss all toasts */
  dismissAll: () => void
}

// ============================================================================
// Context
// ============================================================================

const ToastContext = createContext<ToastContextType | undefined>(undefined)

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access toast functionality
 *
 * @throws Error if used outside of ToastProvider
 *
 * @example
 * ```tsx
 * const { toast, success, error, position, setPosition } = useToast()
 *
 * // Basic toast
 * toast({ title: 'Hello', message: 'World' })
 *
 * // Convenience methods
 * success('Saved!', 'Your changes have been saved.')
 * error('Error', 'Something went wrong.')
 * warning('Warning', 'Please review your input.')
 * info('Info', 'New updates available.')
 *
 * // Change position dynamically
 * setPosition('bottom-right')
 * ```
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// ============================================================================
// Provider Props
// ============================================================================

export interface ToastProviderProps {
  /** Child components */
  children: React.ReactNode
  /** Default position for all toasts */
  position?: ToastPosition
  /** Maximum number of toasts to show at once */
  maxToasts?: number
  /** Default duration for toasts (ms) */
  defaultDuration?: number
  /** Default variant for toasts */
  defaultVariant?: ToastVariant
}

// ============================================================================
// Provider Component
// ============================================================================

/**
 * ToastProvider - Context provider for toast notifications
 *
 * Wrap your app with this provider to enable toast functionality.
 * Position can be changed dynamically via setPosition from useToast hook.
 *
 * @example
 * ```tsx
 * <ToastProvider position="top-right" maxToasts={5}>
 *   <App />
 * </ToastProvider>
 *
 * // Inside any component:
 * const { setPosition } = useToast()
 * setPosition('bottom-left') // Changes position dynamically
 * ```
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  position: initialPosition = 'top-right',
  maxToasts = 5,
  defaultDuration = 5000,
  defaultVariant = 'tonal',
}) => {
  const [toasts, setToasts] = useState<ToastProps[]>([])
  const [position, setPositionState] = useState<ToastPosition>(initialPosition)

  /**
   * Update toast container position
   * Validates position value before setting
   */
  const setPosition = useCallback((newPosition: ToastPosition) => {
    const validPositions: ToastPosition[] = [
      'top-left',
      'top-center',
      'top-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
    ]
    if (validPositions.includes(newPosition)) {
      setPositionState(newPosition)
    } else {
      console.error(
        `Invalid toast position: ${newPosition}. Valid positions are: ${validPositions.join(', ')}`,
      )
    }
  }, [])

  /**
   * Generate unique ID for toast
   */
  const generateId = useCallback((): string => {
    return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }, [])

  /**
   * Add a new toast
   */
  const addToast = useCallback(
    (options: ToastOptions): string => {
      const id = generateId()

      const newToast: ToastProps = {
        id,
        variant: options.variant ?? defaultVariant,
        color: options.color ?? 'info',
        size: options.size ?? 'md',
        title: options.title,
        message: options.message,
        icon: options.icon,
        hideIcon: options.hideIcon ?? false,
        duration: options.duration ?? defaultDuration,
        showProgress: options.showProgress ?? true,
        actions: options.actions,
      }

      setToasts((prev) => {
        const updated = [newToast, ...prev]
        // Limit to maxToasts
        return updated.slice(0, maxToasts)
      })

      return id
    },
    [generateId, defaultVariant, defaultDuration, maxToasts],
  )

  /**
   * Remove a toast by ID
   */
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  /**
   * Remove all toasts
   */
  const removeAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  /**
   * Convenience method for success toast
   */
  const showSuccess = useCallback(
    (
      title: string,
      message?: string,
      options?: Partial<ToastOptions>,
    ): string => {
      return addToast({
        ...options,
        title,
        message,
        color: 'success',
      })
    },
    [addToast],
  )

  /**
   * Convenience method for error toast
   */
  const showError = useCallback(
    (
      title: string,
      message?: string,
      options?: Partial<ToastOptions>,
    ): string => {
      return addToast({
        ...options,
        title,
        message,
        color: 'error',
      })
    },
    [addToast],
  )

  /**
   * Convenience method for warning toast
   */
  const showWarning = useCallback(
    (
      title: string,
      message?: string,
      options?: Partial<ToastOptions>,
    ): string => {
      return addToast({
        ...options,
        title,
        message,
        color: 'warning',
      })
    },
    [addToast],
  )

  /**
   * Convenience method for info toast
   */
  const showInfo = useCallback(
    (
      title: string,
      message?: string,
      options?: Partial<ToastOptions>,
    ): string => {
      return addToast({
        ...options,
        title,
        message,
        color: 'info',
      })
    },
    [addToast],
  )

  /**
   * Context value - memoized to prevent unnecessary re-renders
   */
  const value = useMemo<ToastContextType>(
    () => ({
      position,
      setPosition,
      toast: addToast,
      success: showSuccess,
      error: showError,
      warning: showWarning,
      info: showInfo,
      dismiss: removeToast,
      dismissAll: removeAllToasts,
    }),
    [
      position,
      setPosition,
      addToast,
      showSuccess,
      showError,
      showWarning,
      showInfo,
      removeToast,
      removeAllToasts,
    ],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer
        position={position}
        toasts={toasts}
        onDismiss={removeToast}
      />
    </ToastContext.Provider>
  )
}
