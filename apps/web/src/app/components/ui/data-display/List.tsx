import React from 'react'
import { cn } from '@/infra/core/utils/cn.util'
import { forwardRefWithAs } from '@/infra/core/utils/polymorphic.util'

// ============================================================================
// Types
// ============================================================================

export type ListVariant = 'unordered' | 'ordered' | 'plain'
export type ListSize = 'sm' | 'md' | 'lg'
export type ListAlign = 'start' | 'center'

// ============================================================================
// Style Maps
// ============================================================================

const sizeClasses: Record<ListSize, string> = {
  sm: 'text-body-sm gap-1.5',
  md: 'text-body-md gap-2',
  lg: 'text-body-lg gap-3',
}

const markerSizeClasses: Record<ListSize, string> = {
  sm: 'ml-4',
  md: 'ml-5',
  lg: 'ml-6',
}

// ============================================================================
// Root Component
// ============================================================================

export type ListRootOwnProps = {
  /** List type
   * @default 'unordered'
   */
  variant?: ListVariant
  /** Size of the list text and spacing
   * @default 'md'
   */
  size?: ListSize
  /** Vertical alignment of items with indicators
   * @default 'start'
   */
  align?: ListAlign
}

/**
 * List.Root - Container for list items
 *
 * Renders `<ul>` for unordered/plain or `<ol>` for ordered lists.
 * Pass `variant="plain"` to remove default markers.
 *
 * @example
 * ```tsx
 * <List.Root>
 *   <List.Item>First item</List.Item>
 *   <List.Item>Second item</List.Item>
 * </List.Root>
 * ```
 */
const ListRoot = forwardRefWithAs<'ul', ListRootOwnProps>((props, ref) => {
  const {
    as,
    variant = 'unordered',
    size = 'md',
    align = 'start',
    className,
    children,
    ...rest
  } = props

  const defaultElement = variant === 'ordered' ? 'ol' : 'ul'
  const Component = as || defaultElement

  return (
    <Component
      ref={ref}
      className={cn(
        'flex flex-col text-on-surface',
        sizeClasses[size],
        variant === 'unordered' && `list-disc ${markerSizeClasses[size]}`,
        variant === 'ordered' && `list-decimal ${markerSizeClasses[size]}`,
        variant === 'plain' && 'list-none',
        className,
      )}
      data-size={size}
      data-variant={variant}
      data-align={align}
      {...rest}
    >
      {children}
    </Component>
  )
})

ListRoot.displayName = 'List.Root'

// ============================================================================
// Item Component
// ============================================================================

export type ListItemOwnProps = object

/**
 * List.Item - Individual list item
 *
 * Renders a `<li>` element. When used with `List.Indicator`, the indicator
 * replaces the default marker.
 *
 * @example
 * ```tsx
 * <List.Item>Simple text item</List.Item>
 *
 * <List.Item>
 *   <List.Indicator>
 *     <CheckIcon />
 *   </List.Indicator>
 *   Item with custom icon
 * </List.Item>
 * ```
 */
const ListItem = forwardRefWithAs<'li', ListItemOwnProps>((props, ref) => {
  const { as, className, children, ...rest } = props
  const Component = as || 'li'

  // Detect if children includes a List.Indicator to remove default marker
  let hasIndicator = false
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === ListIndicator) {
      hasIndicator = true
    }
  })

  return (
    <Component
      ref={ref}
      className={cn(
        hasIndicator && 'list-none flex items-start',
        // Only counteract parent indentation for unordered/ordered — plain lists have no ml-* to cancel
        hasIndicator &&
          '[ul[data-variant="unordered"][data-size="sm"]_&]:-ml-4 [ul[data-variant="unordered"][data-size="md"]_&]:-ml-5 [ul[data-variant="unordered"][data-size="lg"]_&]:-ml-6',
        hasIndicator &&
          '[ol[data-variant="ordered"][data-size="sm"]_&]:-ml-4 [ol[data-variant="ordered"][data-size="md"]_&]:-ml-5 [ol[data-variant="ordered"][data-size="lg"]_&]:-ml-6',
        hasIndicator &&
          '[ul[data-align="center"]_&]:items-center [ol[data-align="center"]_&]:items-center',
        hasIndicator &&
          '[ul[data-size="sm"]_&]:gap-2 [ul[data-size="md"]_&]:gap-2.5 [ul[data-size="lg"]_&]:gap-3',
        hasIndicator &&
          '[ol[data-size="sm"]_&]:gap-2 [ol[data-size="md"]_&]:gap-2.5 [ol[data-size="lg"]_&]:gap-3',
        !hasIndicator && 'pl-1',
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  )
})

ListItem.displayName = 'List.Item'

// ============================================================================
// Indicator Component
// ============================================================================

export type ListIndicatorOwnProps = {
  /** Color of the indicator icon
   * @default 'primary'
   */
  color?:
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'success'
    | 'error'
    | 'warning'
    | 'info'
    | 'muted'
}

const indicatorColorClasses: Record<string, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  tertiary: 'text-tertiary',
  success: 'text-success',
  error: 'text-error',
  warning: 'text-warning',
  info: 'text-info',
  muted: 'text-on-surface-variant',
}

/**
 * List.Indicator - Custom icon/marker for a list item
 *
 * Replaces the default bullet or number marker with a custom icon.
 * Place as the first child of List.Item.
 *
 * @example
 * ```tsx
 * <List.Item>
 *   <List.Indicator color="success">
 *     <Check size={16} />
 *   </List.Indicator>
 *   Task completed
 * </List.Item>
 * ```
 */
const ListIndicator = forwardRefWithAs<'span', ListIndicatorOwnProps>(
  (props, ref) => {
    const { as, color = 'primary', className, children, ...rest } = props

    const Component = as || 'span'

    return (
      <Component
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center shrink-0 mt-0.5',
          indicatorColorClasses[color],
          // Inherit icon sizing from parent list size via data attribute
          '[ul[data-size="sm"]_&]:[&>svg]:w-3.5 [ul[data-size="sm"]_&]:[&>svg]:h-3.5',
          '[ul[data-size="md"]_&]:[&>svg]:w-4 [ul[data-size="md"]_&]:[&>svg]:h-4',
          '[ul[data-size="lg"]_&]:[&>svg]:w-5 [ul[data-size="lg"]_&]:[&>svg]:h-5',
          '[ol[data-size="sm"]_&]:[&>svg]:w-3.5 [ol[data-size="sm"]_&]:[&>svg]:h-3.5',
          '[ol[data-size="md"]_&]:[&>svg]:w-4 [ol[data-size="md"]_&]:[&>svg]:h-4',
          '[ol[data-size="lg"]_&]:[&>svg]:w-5 [ol[data-size="lg"]_&]:[&>svg]:h-5',
          className,
        )}
        aria-hidden="true"
        {...rest}
      >
        {children}
      </Component>
    )
  },
)

ListIndicator.displayName = 'List.Indicator'

// ============================================================================
// Compound Component Export
// ============================================================================

/**
 * List compound component for displaying items
 *
 * A flexible list component following the Chakra UI List pattern, adapted
 * to this codebase's compound component and design token conventions.
 *
 * Features:
 * - 3 variants: unordered (bullet), ordered (numbered), plain (no markers)
 * - 3 sizes: sm, md, lg
 * - Custom indicators/icons via List.Indicator
 * - Indicator color options (8 colors)
 * - Polymorphic sub-components
 * - Semantic HTML (ul/ol/li)
 * - Nested list support
 * - Dark mode compatible
 *
 * @example
 * ```tsx
 * // Unordered list (default)
 * <List.Root>
 *   <List.Item>First item</List.Item>
 *   <List.Item>Second item</List.Item>
 *   <List.Item>Third item</List.Item>
 * </List.Root>
 *
 * // Ordered list
 * <List.Root variant="ordered">
 *   <List.Item>Step one</List.Item>
 *   <List.Item>Step two</List.Item>
 *   <List.Item>Step three</List.Item>
 * </List.Root>
 *
 * // With custom icons
 * <List.Root variant="plain">
 *   <List.Item>
 *     <List.Indicator color="success"><Check /></List.Indicator>
 *     Completed task
 *   </List.Item>
 *   <List.Item>
 *     <List.Indicator color="warning"><Clock /></List.Indicator>
 *     Pending task
 *   </List.Item>
 * </List.Root>
 * ```
 */
const List = {
  Root: ListRoot,
  Item: ListItem,
  Indicator: ListIndicator,
}

export default List
