import { useState } from 'react'
import { Globe } from 'lucide-react'

interface UrlInputProps {
  onSubmit: (url: string) => void
}

function UrlInput({ onSubmit }: UrlInputProps) {
  const [url, setUrl] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) {
      // Ensure URL has protocol
      const formattedUrl = url.startsWith('http') ? url : `https://${url}`
      onSubmit(formattedUrl)
    }
  }

  return (
    <div className="w-full max-w-2xl p-8 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-center mb-6">
        <Globe className="w-12 h-12 text-blue-500" />
      </div>
      <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
        Playwright Test Generator
      </h1>
      <p className="text-center text-gray-600 mb-8">
        Enter a website URL to start creating your test flow
      </p>
      <form onSubmit={handleSubmit}>
        <div className="flex gap-4">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          <button
            type="submit"
            className="px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            disabled={!url.trim()}
          >
            Load Website
          </button>
        </div>
      </form>
    </div>
  )
}

export default UrlInput
