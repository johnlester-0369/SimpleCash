import { cn } from '@/infra/core/utils/cn.util'
import { forwardRefWithAs } from '@/infra/core/utils/polymorphic.util'

// ============================================================================
// Types
// ============================================================================

export type GroupOwnProps = {
  /** Attach children visually (removes gap, connects borders) */
  attached?: boolean
  /** Make children grow to fill available space */
  grow?: boolean
  /** Orientation of the group */
  orientation?: 'horizontal' | 'vertical'
  /** Gap between items (when not attached) */
  gap?: '0' | '1' | '2' | '3' | '4'
}

// ============================================================================
// Style Maps
// ============================================================================

const gapClasses: Record<string, string> = {
  '0': 'gap-0',
  '1': 'gap-1',
  '2': 'gap-2',
  '3': 'gap-3',
  '4': 'gap-4',
}

// ============================================================================
// Component
// ============================================================================

const Group = forwardRefWithAs<'div', GroupOwnProps>((props, ref) => {
  const {
    as,
    attached = false,
    grow = false,
    orientation = 'horizontal',
    gap = '2',
    className,
    children,
    ...rest
  } = props

  const Component = as || 'div'

  return (
    <Component
      ref={ref}
      className={cn(
        'inline-flex',
        orientation === 'vertical' ? 'flex-col' : 'flex-row',
        attached
          ? cn(
              'gap-0',
              orientation === 'horizontal'
                ? '[&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none [&>*:not(:last-child)]:border-r-0'
                : '[&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none [&>*:not(:last-child)]:border-b-0',
            )
          : gapClasses[gap],
        grow && '[&>*]:flex-1',
        className,
      )}
      role="group"
      {...rest}
    >
      {children}
    </Component>
  )
})

Group.displayName = 'Group'

export default Group
