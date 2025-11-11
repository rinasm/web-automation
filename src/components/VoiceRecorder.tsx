import { useEffect, useState, useRef } from 'react'
import { Mic, MicOff, Loader } from 'lucide-react'
import { useGroqSpeechRecognition } from '../hooks/useGroqSpeechRecognition'

interface VoiceRecorderProps {
  onTranscript: (text: string) => void
  disabled?: boolean
  mode?: 'append' | 'replace'
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onTranscript,
  disabled = false,
  mode = 'replace'
}) => {
  const {
    isListening,
    isProcessing,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript
  } = useGroqSpeechRecognition()

  // Track if we've already sent this transcript to prevent infinite loops
  const lastSentTranscript = useRef<string>('')

  // Send transcript to parent when processing completes
  useEffect(() => {
    if (transcript && !isListening && !isProcessing && transcript !== lastSentTranscript.current) {
      console.log('🎤 [VOICE] Sending transcript to parent:', transcript)
      lastSentTranscript.current = transcript
      onTranscript(transcript)
      // Reset after sending
      setTimeout(() => {
        resetTranscript()
        lastSentTranscript.current = ''
      }, 500)
    }
  }, [transcript, isListening, isProcessing])

  const handleClick = () => {
    if (isListening) {
      stopListening()
    } else {
      resetTranscript()
      startListening()
    }
  }

  // Voice input is now always available

  return (
    <>

      <div className="space-y-2">
        {/* Voice Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleClick}
            disabled={disabled}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
              ${isListening
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-md hover:shadow-lg
            `}
            title={isListening ? 'Stop recording' : 'Start voice input'}
          >
            {isListening ? (
              <>
                <MicOff size={18} />
                <span>Stop Recording</span>
                <div className="w-2 h-2 bg-white rounded-full animate-ping" />
              </>
            ) : (
              <>
                <Mic size={18} />
                <span>Voice Input</span>
              </>
            )}
          </button>

          {/* Mode Toggle */}
          <div className="text-xs text-gray-600">
            Mode: <span className="font-medium">{mode === 'append' ? 'Append' : 'Replace'}</span>
          </div>
        </div>

        {/* Recording Status */}
        {isListening && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 animate-fadeIn">
          <div className="flex items-start gap-2">
            <Loader size={16} className="text-blue-600 animate-spin mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-medium text-blue-800 mb-1">Recording audio...</div>
              <p className="text-sm text-blue-900 italic">Speak clearly into your microphone</p>
            </div>
          </div>
        </div>
      )}

        {/* Processing Status */}
        {isProcessing && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 animate-fadeIn">
          <div className="flex items-start gap-2">
            <Loader size={16} className="text-purple-600 animate-spin mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-medium text-purple-800 mb-1">Processing speech...</div>
              <p className="text-sm text-purple-900 italic">Converting your audio to text</p>
            </div>
          </div>
        </div>
      )}

        {/* Final Transcript Preview */}
        {transcript && !isListening && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 animate-fadeIn">
          <div className="text-xs font-medium text-green-800 mb-1">Transcript:</div>
          <p className="text-sm text-green-900">{transcript}</p>
        </div>
      )}

        {/* Error Message */}
        {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 animate-fadeIn">
          <div className="flex items-start gap-2">
            <MicOff size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-xs font-medium text-red-800 mb-1">Error</div>
              <p className="text-sm text-red-900">{error}</p>
            </div>
          </div>
        </div>
      )}

        {/* Instructions */}
        {!isListening && !isProcessing && !error && !transcript && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-700 space-y-1">
            <p className="font-medium">How to use voice input:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Click "Voice Input" button and allow microphone access</li>
              <li>Speak your test flow clearly in English</li>
              <li>Click "Stop Recording" when finished</li>
              <li>Your audio will be processed and converted to text</li>
              <li>The transcribed text will appear in the box above</li>
            </ul>
          </div>
        </div>
        )}
      </div>
    </>
  )
}
