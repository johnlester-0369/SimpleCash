import { cn } from '@/infra/core/utils/cn.util'
import Logo from '@/assets/logo.svg?react'

type BrandSize = 'sm' | 'md' | 'lg'

export interface BrandLogoProps {
  size?: BrandSize
  className?: string
}

const logoSizeClasses: Record<BrandSize, string> = {
  sm: 'h-6 w-6 text-label-sm',
  md: 'h-8 w-8 text-label-lg',
  lg: 'h-10 w-10 text-title-sm',
}

export function BrandLogo({ size = 'md', className }: BrandLogoProps) {
  return (
    <Logo
      className={cn(
        'text-primary flex-shrink-0',
        logoSizeClasses[size],
        className,
      )}
      fill="currentColor"
    />
  )
}

export interface BrandNameProps {
  className?: string
}

/**
 * BrandName — plain text wordmark. Centralized here (not hardcoded in
 * Navbar/Sidebar) so a future rename or real wordmark swap is a
 * one-file change, matching the pattern routes.constants.ts already
 * uses for route strings.
 */
export function BrandName({ className }: BrandNameProps) {
  return <span className={cn('text-on-surface', className)}>SimpleCash</span>
}
