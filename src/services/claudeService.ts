import Anthropic from '@anthropic-ai/sdk'

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ClaudeResponse {
  content: string
  stopReason: string
}

class ClaudeService {
  private client: Anthropic | null = null
  private apiKey: string | null = null

  /**
   * Initialize the Claude client with API key
   */
  initialize(apiKey: string): void {
    this.apiKey = apiKey
    this.client = new Anthropic({
      apiKey: apiKey,
      // For Electron, we need to handle CORS
      dangerouslyAllowBrowser: true
    })
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.client !== null && this.apiKey !== null
  }

  /**
   * Get API key from localStorage or environment
   */
  getStoredApiKey(): string | null {
    // Try localStorage first (for user-configured keys)
    const stored = localStorage.getItem('anthropic_api_key')
    if (stored) return stored

    // Fallback to environment variable (for development)
    return import.meta.env.VITE_ANTHROPIC_API_KEY || null
  }

  /**
   * Save API key to localStorage
   */
  saveApiKey(apiKey: string): void {
    localStorage.setItem('anthropic_api_key', apiKey)
    this.initialize(apiKey)
  }

  /**
   * Send a message to Claude and get a response
   */
  async sendMessage(
    messages: ClaudeMessage[],
    systemPrompt?: string,
    maxTokens: number = 2048
  ): Promise<ClaudeResponse> {
    if (!this.client) {
      throw new Error('Claude service not initialized. Please provide an API key.')
    }

    // Try different model names in order of preference
    // Using the exact model names from Anthropic API
    const modelOptions = [
      'claude-sonnet-4-5',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-sonnet-20240620',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ]

    let lastError: any = null

    for (const model of modelOptions) {
      try {
        console.log(`🤖 [CLAUDE] Trying model: ${model}`)
        const response = await this.client.messages.create({
          model: model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        })

        console.log(`✅ [CLAUDE] Successfully used model: ${model}`)

        const content = response.content[0]
        if (content.type !== 'text') {
          throw new Error('Unexpected response type from Claude')
        }

        return {
          content: content.text,
          stopReason: response.stop_reason || 'unknown'
        }
      } catch (error: any) {
        lastError = error
        console.log(`⚠️ [CLAUDE] Model ${model} failed:`, error.message)
        continue
      }
    }

    // If all models failed, throw the last error
    console.error('❌ [CLAUDE] All models failed')
    throw new Error(`Failed to get response from Claude: ${lastError.message}`)
  }

  /**
   * Legacy sendMessage for backward compatibility (removed duplicate code)
   */
  private async _legacySendMessage(
    messages: ClaudeMessage[],
    systemPrompt?: string,
    maxTokens: number = 2048
  ): Promise<ClaudeResponse> {
    if (!this.client) {
      throw new Error('Claude service not initialized. Please provide an API key.')
    }

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      })

      const content = response.content[0]
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude')
      }

      return {
        content: content.text,
        stopReason: response.stop_reason || 'unknown'
      }
    } catch (error: any) {
      console.error('Claude API error:', error)
      throw new Error(`Failed to get response from Claude: ${error.message}`)
    }
  }

  /**
   * Send a simple prompt and get a response
   */
  async askClaude(prompt: string, systemPrompt?: string): Promise<string> {
    const response = await this.sendMessage(
      [{ role: 'user', content: prompt }],
      systemPrompt
    )
    return response.content
  }

  /**
   * Auto-initialize with stored key if available
   */
  autoInitialize(): boolean {
    const apiKey = this.getStoredApiKey()
    if (apiKey) {
      this.initialize(apiKey)
      return true
    }
    return false
  }
}

// Export singleton instance
export const claudeService = new ClaudeService()

// Auto-initialize on import if key is available
claudeService.autoInitialize()
