import { useState, useRef, useCallback } from 'react'

interface ClaudeSpeechRecognitionHook {
  isListening: boolean
  isProcessing: boolean
  transcript: string
  error: string | null
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
}

export const useClaudeSpeechRecognition = (): ClaudeSpeechRecognitionHook => {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const processAudioWithClaude = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true)
      setError(null)
      console.log('🎤 Processing audio with Claude API...')

      // Convert Blob to ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer()
      console.log('🎤 Audio size:', arrayBuffer.byteLength, 'bytes')

      // Check if API key is stored
      const apiKey = localStorage.getItem('anthropic_api_key')
      if (!apiKey) {
        throw new Error('Anthropic API key not set. Please configure your API key in settings.')
      }

      // Set API key in Electron main process
      await window.electronAPI.invoke('set-anthropic-key', apiKey)

      // Send audio to Electron main process for transcription
      console.log('🎤 Sending audio to Electron for transcription...')
      const result = await window.electronAPI.invoke('transcribe-audio', arrayBuffer)

      if (result.success) {
        setTranscript(result.text)
        console.log('✅ Transcription successful:', result.text)
      } else {
        throw new Error(result.error || 'Transcription failed')
      }
    } catch (err: any) {
      console.error('❌ Transcription error:', err)
      setError(err.message || 'Failed to transcribe audio')
    } finally {
      setIsProcessing(false)
    }
  }

  const startListening = useCallback(async () => {
    try {
      setError(null)
      setTranscript('')
      console.log('🎤 Starting audio recording...')

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
          console.log('🎤 Audio chunk received:', event.data.size, 'bytes')
        }
      }

      mediaRecorder.onstop = async () => {
        console.log('🎤 Recording stopped, processing audio...')
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        console.log('🎤 Audio blob created:', audioBlob.size, 'bytes')

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
        }

        await processAudioWithClaude(audioBlob)
      }

      mediaRecorder.start()
      setIsListening(true)
      console.log('🎤 Recording started successfully')
    } catch (err: any) {
      console.error('🎤 Failed to start recording:', err)
      setError(`Microphone access denied: ${err.message}. Please allow microphone permissions.`)
    }
  }, [])

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && isListening) {
      console.log('🎤 Stopping recording...')
      mediaRecorderRef.current.stop()
      setIsListening(false)
    }
  }, [isListening])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setError(null)
  }, [])

  return {
    isListening,
    isProcessing,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript
  }
}
