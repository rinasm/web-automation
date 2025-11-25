/**
 * Code Generation Modal
 *
 * Displays generated test code with syntax highlighting and export options
 */

import { X, Copy, Download, Check, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { GeneratedCode } from '../services/codeGenerationService'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface CodeGenerationModalProps {
  isOpen: boolean
  generatedCode: GeneratedCode | null
  onClose: () => void
  onExport: () => void
  onRegenerate?: () => Promise<void>
  isRegenerating?: boolean
}

export function CodeGenerationModal({
  isOpen,
  generatedCode,
  onClose,
  onExport,
  onRegenerate,
  isRegenerating = false
}: CodeGenerationModalProps) {
  const [copied, setCopied] = useState(false)
  const [regenerated, setRegenerated] = useState(false)
  const [codeKey, setCodeKey] = useState(0)

  // Reset regenerated flag when code changes
  useEffect(() => {
    if (generatedCode) {
      setCodeKey(prev => prev + 1)
    }
  }, [generatedCode?.code])

  // Show success message when regeneration completes
  useEffect(() => {
    if (!isRegenerating && regenerated) {
      const timer = setTimeout(() => setRegenerated(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isRegenerating, regenerated])

  if (!isOpen || !generatedCode) return null

  const handleCopy = async () => {
    try {
      // Use Electron's clipboard API through IPC
      const result = await window.electronAPI.invoke('clipboard:write', generatedCode.code)

      if (result.success) {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else {
        throw new Error(result.error || 'Failed to copy to clipboard')
      }
    } catch (error) {
      console.error('Failed to copy:', error)
      alert('Failed to copy to clipboard. Please try again.')
    }
  }

  const handleRegenerate = async () => {
    if (onRegenerate) {
      setRegenerated(false)
      await onRegenerate()
      setRegenerated(true)
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
          <div className="flex items-center gap-2">
            {onRegenerate && (
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isRegenerating
                    ? 'bg-blue-100 text-blue-600 cursor-not-allowed'
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
                title={isRegenerating ? 'Regenerating...' : 'Regenerate code with AI'}
              >
                {isRegenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw size={18} />
                    Regenerate
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              disabled={isRegenerating}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {regenerated && (
          <div className="bg-green-50 border-b border-green-200 px-6 py-3 flex items-center gap-2 text-green-700">
            <CheckCircle2 size={18} />
            <span className="text-sm font-medium">Code successfully regenerated with AI improvements!</span>
          </div>
        )}

        {/* Code Display */}
        <div className="flex-1 overflow-auto p-6 min-h-0">
          <SyntaxHighlighter
            key={codeKey}
            language="typescript"
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              lineHeight: '1.5',
              padding: '1rem'
            }}
            showLineNumbers
            wrapLines={false}
            PreTag="div"
          >
            {generatedCode.code}
          </SyntaxHighlighter>
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
