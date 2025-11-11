/**
 * Code Generation Modal
 *
 * Displays generated test code with syntax highlighting and export options
 */

import { X, Copy, Download, Check } from 'lucide-react'
import { useState } from 'react'
import { GeneratedCode } from '../services/codeGenerationService'

interface CodeGenerationModalProps {
  isOpen: boolean
  generatedCode: GeneratedCode | null
  onClose: () => void
  onExport: () => void
}

export function CodeGenerationModal({
  isOpen,
  generatedCode,
  onClose,
  onExport
}: CodeGenerationModalProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen || !generatedCode) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const getFrameworkLabel = () => {
    if (generatedCode.framework === 'playwright') {
      return 'Playwright (Web)'
    } else {
      return 'WebDriverIO (Mobile)'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Generated Test Code</h2>
            <p className="text-sm text-gray-600 mt-1">
              {getFrameworkLabel()} • {generatedCode.fileName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Code Display */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="h-full bg-gray-900 rounded-lg overflow-auto">
            <pre className="p-4 text-sm text-gray-100 font-mono leading-relaxed">
              <code>{generatedCode.code}</code>
            </pre>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            Ready to export or copy to clipboard
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check size={16} className="text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy
                </>
              )}
            </button>
            <button
              onClick={onExport}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Download size={16} />
              Export File
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
