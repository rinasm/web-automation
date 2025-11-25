import { useState, useEffect } from 'react'
import { X, Copy, CheckCircle } from 'lucide-react'
import { Step } from '../store/stepStore'
import { generatePlaywrightCode, generateWebDriverIOCode, FrameworkType } from '../utils/codeGenerator'
import { useMobileDeviceStore } from '../store/mobileDeviceStore'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface CodeModalProps {
  step: Step & { url: string }
  onClose: () => void
}

function CodeModal({ step, onClose }: CodeModalProps) {
  const [framework, setFramework] = useState<FrameworkType>('playwright')
  const [playwrightCode, setPlaywrightCode] = useState('')
  const [webdriverioCode, setWebdriverioCode] = useState('')
  const [copied, setCopied] = useState(false)
  const { currentMode, getCurrentDevice } = useMobileDeviceStore()

  const currentDevice = getCurrentDevice()
  const isMobile = currentMode === 'mobile'

  useEffect(() => {
    const pwCode = generatePlaywrightCode(step, {
      isMobile,
      device: currentDevice || undefined
    })
    setPlaywrightCode(pwCode)

    const wdioCode = generateWebDriverIOCode(step, {
      isMobile,
      device: currentDevice || undefined
    })
    setWebdriverioCode(wdioCode)
  }, [step, isMobile, currentDevice])

  const getCurrentCode = () => {
    return framework === 'playwright' ? playwrightCode : webdriverioCode
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(getCurrentCode())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            Generated Test Code
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Framework Tabs */}
        <div className="flex border-b border-gray-200 px-4">
          <button
            onClick={() => setFramework('playwright')}
            className={`px-4 py-3 font-medium text-sm transition-colors relative ${
              framework === 'playwright'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Playwright
          </button>
          <button
            onClick={() => setFramework('webdriverio')}
            className={`px-4 py-3 font-medium text-sm transition-colors relative ${
              framework === 'webdriverio'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            WebdriverIO
          </button>
        </div>

        {/* Code Content - Scrollable */}
        <div className="flex-1 overflow-auto p-4 min-h-0">
          <SyntaxHighlighter
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
            {getCurrentCode()}
          </SyntaxHighlighter>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 flex-shrink-0">
          <p className="text-sm text-gray-600">
            Copy this code to your {framework === 'playwright' ? 'Playwright' : 'WebdriverIO'} test file
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
