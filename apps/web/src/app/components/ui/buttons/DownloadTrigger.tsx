import React, { useCallback } from 'react'

// ============================================================================
// Types
// ============================================================================

export type DownloadTriggerProps = {
  data: string | Blob
  fileName: string
  mimeType: string
  children: React.ReactNode
}

// ============================================================================
// Component
// ============================================================================

/**
 * DownloadTrigger - Wraps children and triggers a file download on click
 *
 * @example
 * ```tsx
 * <DownloadTrigger data="Hello, World!" fileName="hello.txt" mimeType="text/plain">
 *   <Button>Download</Button>
 * </DownloadTrigger>
 * ```
 */
export default function DownloadTrigger({
  data,
  fileName,
  mimeType,
  children,
}: DownloadTriggerProps) {
  const handleDownload = useCallback(() => {
    const blob =
      data instanceof Blob ? data : new Blob([data], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }, [data, fileName, mimeType])

  return (
    <span
      onClick={handleDownload}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleDownload()
        }
      }}
      style={{ display: 'inline-flex' }}
    >
      {children}
    </span>
  )
}
