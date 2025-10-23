import { useState, useEffect } from 'react'
import { X, Copy, CheckCircle } from 'lucide-react'
import { Step } from '../store/stepStore'
import { generatePlaywrightCode } from '../utils/codeGenerator'

interface CodeModalProps {
  step: Step & { url: string }
  onClose: () => void
}

function CodeModal({ step, onClose }: CodeModalProps) {
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const generatedCode = generatePlaywrightCode(step)
    setCode(generatedCode)
  }, [step])

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            Generated Playwright Code
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
            <code>{code}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Copy this code to your Playwright test file
          </p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle size={18} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={18} />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CodeModal
