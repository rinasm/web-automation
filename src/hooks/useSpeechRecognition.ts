import { useState, useEffect, useRef, useCallback } from 'react'

interface SpeechRecognitionEvent {
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string
      }
      isFinal: boolean
    }
    length: number
  }
  resultIndex: number
}

interface SpeechRecognitionErrorEvent {
  error: string
  message?: string
}

interface SpeechRecognitionHook {
  isListening: boolean
  isSupported: boolean
  transcript: string
  interimTranscript: string
  error: string | null
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export const useSpeechRecognition = (): SpeechRecognitionHook => {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)

  // Check if browser supports Speech Recognition
  const isSupported = typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)

  useEffect(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.')
      return
    }

    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      console.log('🎤 Speech recognition started successfully')
      console.log('🎤 Recognition config:', {
        continuous: recognition.continuous,
        interimResults: recognition.interimResults,
        lang: recognition.lang,
        maxAlternatives: recognition.maxAlternatives
      })
      setIsListening(true)
      setError(null)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcriptPiece + ' '
        } else {
          interim += transcriptPiece
        }
      }

      setInterimTranscript(interim)
      if (final) {
        setTranscript(prev => (prev + final).trim())
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('🎤 Speech recognition error:', event.error, event)

      let errorMessage = 'An error occurred during speech recognition.'

      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again and speak clearly.'
          // Don't stop listening, just warn
          setError(errorMessage)
          return
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your device and ensure a microphone is connected.'
          break
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Please enable microphone access in your browser settings and reload the page.'
          break
        case 'network':
          // Chrome's speech recognition uses Google's servers, which requires internet
          errorMessage = 'Speech recognition requires an internet connection. Chrome uses Google\'s cloud service for speech-to-text. Please check your connection and try again.'
          break
        case 'aborted':
          // User manually stopped or it was interrupted
          errorMessage = null // Don't show error for manual stops
          break
        case 'service-not-allowed':
          errorMessage = 'Speech recognition service is not available. Please check your browser settings.'
          break
        default:
          errorMessage = `Speech recognition error: ${event.error}. ${event.message || ''}`
      }

      if (errorMessage) {
        setError(errorMessage)
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      console.log('🎤 Speech recognition ended')
      setIsListening(false)
      setInterimTranscript('')
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [isSupported])

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser.')
      return
    }

    // Check if online
    if (!navigator.onLine) {
      setError('You are offline. Speech recognition requires an internet connection. Please connect to the internet and try again.')
      return
    }

    if (recognitionRef.current && !isListening) {
      try {
        setError(null)
        setInterimTranscript('')
        console.log('🎤 Attempting to start speech recognition...')
        console.log('🎤 Browser:', navigator.userAgent)
        console.log('🎤 Online status:', navigator.onLine)
        console.log('🎤 Recognition object:', recognitionRef.current)

        // Request microphone permission first
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          console.log('🎤 Requesting microphone permission...')
          navigator.mediaDevices.getUserMedia({ audio: true })
            .then(() => {
              console.log('🎤 Microphone permission granted, starting recognition...')
              recognitionRef.current.start()
            })
            .catch((err) => {
              console.error('🎤 Microphone permission denied:', err)
              setError(`Microphone access denied: ${err.message}. Please allow microphone access and try again.`)
            })
        } else {
          // Fallback: try to start without explicit permission request
          console.log('🎤 getUserMedia not available, trying direct start...')
          recognitionRef.current.start()
        }
      } catch (err: any) {
        console.error('🎤 Error starting recognition:', err)

        // Check if it's already running
        if (err.message && err.message.includes('already started')) {
          setError('Speech recognition is already running. Please wait or refresh the page.')
        } else {
          setError(`Failed to start speech recognition: ${err.message || 'Unknown error'}`)
        }
      }
    }
  }, [isSupported, isListening])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }, [isListening])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setError(null)
  }, [])

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript
  }
}
