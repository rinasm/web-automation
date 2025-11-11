import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import Groq from 'groq-sdk'

// Initialize Groq client (provides free Whisper API access)
let groq: Groq | null = null

function initializeGroq(apiKey: string) {
  groq = new Groq({
    apiKey: apiKey
  })
}

export function setupSpeechRecognitionIPC() {
  console.log('🎤 [IPC] Setting up speech recognition handlers')

  // Set API key
  ipcMain.handle('set-groq-key', async (_event, apiKey: string) => {
    console.log('🎤 [IPC] Setting Groq API key')
    try {
      initializeGroq(apiKey)
      return { success: true }
    } catch (error: any) {
      console.error('🎤 [IPC] Error setting API key:', error)
      return { success: false, error: error.message }
    }
  })

  // Transcribe audio using Groq's free Whisper API
  ipcMain.handle('transcribe-audio', async (_event, audioData: ArrayBuffer) => {
    console.log('🎤 [IPC] Received audio for transcription, size:', audioData.byteLength, 'bytes')

    try {
      if (!groq) {
        throw new Error('Groq API key not set. Please set your API key first.')
      }

      // Save audio to temporary file
      const tempDir = os.tmpdir()
      const tempFilePath = path.join(tempDir, `audio-${Date.now()}.webm`)

      console.log('🎤 [IPC] Saving audio to temp file:', tempFilePath)
      const buffer = Buffer.from(audioData)
      fs.writeFileSync(tempFilePath, buffer)

      console.log('🎤 [IPC] Calling Groq Whisper API...')

      // Use Groq's Whisper API (free and fast)
      const transcription = await groq.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: 'whisper-large-v3',
        language: 'en',
        response_format: 'text'
      })

      // Clean up temp file
      fs.unlinkSync(tempFilePath)

      console.log('🎤 [IPC] Transcription successful:', transcription)
      return { success: true, text: transcription }
    } catch (error: any) {
      console.error('🎤 [IPC] Transcription error:', error)
      return { success: false, error: error.message || 'Failed to transcribe audio' }
    }
  })

  console.log('🎤 [IPC] Speech recognition handlers registered')
}
