/**
 * Platform Indicator Component
 *
 * Shows which platforms have steps configured for a feature
 * Displays badges like "Web ✓ Mobile ✗"
 */

import { Check, X } from 'lucide-react'

export interface PlatformIndicatorProps {
  hasWebSteps: boolean
  hasMobileSteps: boolean
  size?: 'small' | 'medium' | 'large'
}

export function PlatformIndicator({
  hasWebSteps,
  hasMobileSteps,
  size = 'small'
}: PlatformIndicatorProps) {
  const sizeClasses = {
    small: 'text-xs px-2 py-0.5',
    medium: 'text-sm px-2.5 py-1',
    large: 'text-base px-3 py-1.5'
  }

  const iconSizes = {
    small: 12,
    medium: 14,
    large: 16
  }

  const iconSize = iconSizes[size]
  const className = sizeClasses[size]

  return (
    <div className="flex items-center gap-1.5">
      {/* Web Badge */}
      <div
        className={`${className} rounded-full font-medium flex items-center gap-1 ${
          hasWebSteps
            ? 'bg-blue-100 text-blue-700'
            : 'bg-gray-100 text-gray-400'
        }`}
      >
        <span>Web</span>
        {hasWebSteps ? (
          <Check size={iconSize} className="text-green-600" />
        ) : (
          <X size={iconSize} className="text-gray-400" />
        )}
      </div>

      {/* Mobile Badge */}
      <div
        className={`${className} rounded-full font-medium flex items-center gap-1 ${
          hasMobileSteps
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-400'
        }`}
      >
        <span>Mobile</span>
        {hasMobileSteps ? (
          <Check size={iconSize} className="text-green-600" />
        ) : (
          <X size={iconSize} className="text-gray-400" />
        )}
      </div>
    </div>
  )
}
