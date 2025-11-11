/**
 * AI-Guided Selector Capture Service
 *
 * Takes AI-generated steps (from text/voice) with empty selectors
 * and enriches them with real XPath selectors by simulating the flow
 * with AI intelligently finding the right elements.
 */

import { aiDecisionService } from './aiDecisionService'
import { FlowExtractor } from '../utils/flowExtractor'
import { Step, Action } from '../store/stepStore'
import { PlatformType } from '../types/feature'

export interface SelectorCaptureProgress {
  currentStepIndex: number
  totalSteps: number
  status: 'running' | 'completed' | 'error'
  message: string
}

export type SelectorCaptureListener = (progress: SelectorCaptureProgress) => void

/**
 * Service for capturing selectors using AI-guided simulation
 */
class AISelectorCaptureService {
  private flowExtractor: FlowExtractor | null = null
  private listeners: SelectorCaptureListener[] = []
  private isCapturing: boolean = false

  /**
   * Initialize the service with a webview reference
   */
  initialize(webview: any) {
    this.flowExtractor = new FlowExtractor(webview)
  }

  /**
   * Enrich steps with selectors by simulating the flow
   */
  async enrichStepsWithSelectors(
    steps: Step[],
    platform: PlatformType,
    webview: any
  ): Promise<Step[]> {
    if (platform !== 'web') {
      throw new Error('AI selector capture is currently only supported for web platform')
    }

    if (!this.flowExtractor) {
      this.flowExtractor = new FlowExtractor(webview)
    }

    console.log('🎯 [AI SELECTOR CAPTURE] Starting enrichment for', steps.length, 'steps')

    this.isCapturing = true
    const enrichedSteps: Step[] = []

    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]

        this.emitProgress({
          currentStepIndex: i,
          totalSteps: steps.length,
          status: 'running',
          message: `Processing step ${i + 1}/${steps.length}: ${step.name}`
        })

        console.log(`\n🔍 [STEP ${i + 1}/${steps.length}] ${step.name}`)

        try {
          const enrichedStep = await this.enrichSingleStep(step, webview)
          enrichedSteps.push(enrichedStep)

          console.log(`✅ [STEP ${i + 1}] Enriched successfully`)

          // Wait between steps for page to stabilize
          await this.wait(2000)
        } catch (stepError: any) {
          console.error(`❌ [STEP ${i + 1}] Failed:`, stepError)

          // Keep the original step if enrichment fails
          enrichedSteps.push(step)

          // Continue with next step
        }
      }

      this.emitProgress({
        currentStepIndex: steps.length,
        totalSteps: steps.length,
        status: 'completed',
        message: 'All steps processed successfully!'
      })

      this.isCapturing = false
      return enrichedSteps
    } catch (error: any) {
      console.error('❌ [AI SELECTOR CAPTURE] Error:', error)
      this.isCapturing = false

      this.emitProgress({
        currentStepIndex: 0,
        totalSteps: steps.length,
        status: 'error',
        message: `Error: ${error.message}`
      })

      throw error
    }
  }

  /**
   * Enrich a single step with selectors
   */
  private async enrichSingleStep(step: Step, webview: any): Promise<Step> {
    // Get current page context
    const pageContext = await this.capturePageContext(webview)

    // Extract available elements
    const availableElements = await this.flowExtractor!.extractInteractableElements()
    console.log(`   Found ${availableElements.length} interactable elements`)

    // Process each action in the step
    const enrichedActions: Action[] = []

    for (const action of step.actions) {
      try {
        const enrichedAction = await this.enrichSingleAction(
          action,
          step.name,
          pageContext,
          availableElements,
          webview
        )
        enrichedActions.push(enrichedAction)
      } catch (actionError: any) {
        console.warn(`   ⚠️ Could not enrich action ${action.type}:`, actionError.message)
        // Keep original action if enrichment fails
        enrichedActions.push(action)
      }
    }

    return {
      ...step,
      actions: enrichedActions
    }
  }

  /**
   * Enrich a single action with selector
   */
  private async enrichSingleAction(
    action: Action,
    stepName: string,
    pageContext: any,
    availableElements: any[],
    webview: any
  ): Promise<Action> {
    // If action already has a selector, keep it
    if (action.selector && action.selector.trim() !== '') {
      console.log(`   ℹ️ Action already has selector, skipping`)
      return action
    }

    // Use AI to find the element (works for all element types)
    const actionDescription = this.buildActionDescription(action, stepName)
    console.log(`   🤖 Finding element for: "${actionDescription}"`)
    console.log(`   📋 Step name: "${stepName}"`)
    console.log(`   🎯 Action type: "${action.type}"`)

    // Ask AI to find the right element
    const execution = await aiDecisionService.executeTextFlowStep(
      actionDescription,
      pageContext.url,
      pageContext.title,
      pageContext.visibleText,
      availableElements
    )

    console.log(`   ✅ AI decision:`, {
      action: execution.action,
      selector: execution.elementSelector,
      selectValue: execution.selectValue,
      inputValue: execution.inputValue,
      reasoning: execution.reasoning
    })

    if (!execution.success || !execution.elementSelector) {
      throw new Error(`AI could not find element: ${execution.reasoning}`)
    }

    // Check if the found element is a SELECT dropdown
    // If AI returned 'select' action, it means it's a SELECT element
    if (execution.action === 'select' && execution.selectValue) {
      console.log(`   🎯 AI found a SELECT element, using direct option selection`)

      // Check if this is a Material UI select (mat-select)
      const isMaterialSelect = await this.isMaterialUISelect(execution.elementSelector, webview)

      if (isMaterialSelect) {
        console.log(`   🎨 Detected Material UI select, using click-option strategy`)
        await this.selectMaterialUIOption(execution.elementSelector, execution.selectValue, webview)
      } else {
        // Native HTML select
        await this.selectOption(execution.elementSelector, execution.selectValue, webview)
      }

      await this.wait(500) // Wait for any onChange handlers

      return {
        ...action,
        selector: execution.elementSelector,
        value: execution.selectValue
      }
    }

    // Execute the action to advance the flow
    if (execution.action === 'click') {
      await this.clickElement(execution.elementSelector, webview)
      await this.waitForPageLoad(webview)
    } else if (execution.action === 'type' && execution.inputValue) {
      await this.typeInElement(execution.elementSelector, execution.inputValue, webview)
      await this.wait(500)
    }

    // Return enriched action with selector
    return {
      ...action,
      selector: execution.elementSelector,
      value: execution.inputValue || action.value
    }
  }

  /**
   * Build action description for AI
   */
  private buildActionDescription(action: Action, stepName: string): string {
    const actionType = action.type
    const value = action.value
    const lowerStep = stepName.toLowerCase()

    // Try to infer what this action does based on type and context
    switch (actionType) {
      case 'click':
      case 'tap':
        return `Click on the element for: ${stepName}`

      case 'type':
        if (value) {
          // Try to guess field type from value or step name
          if (lowerStep.includes('email')) {
            return `Enter '${value}' in the email field`
          } else if (lowerStep.includes('password')) {
            return `Enter '${value}' in the password field`
          } else if (lowerStep.includes('username') || lowerStep.includes('user')) {
            return `Enter '${value}' in the username field`
          } else if (lowerStep.includes('search')) {
            return `Enter '${value}' in the search field`
          } else {
            return `Enter '${value}' in the appropriate input field`
          }
        }
        return `Type in the input field for: ${stepName}`

      case 'navigate':
        return `Navigate to the page (no element needed)`

      case 'wait':
        return `Wait (no element needed)`

      default:
        return `Perform ${actionType} action for: ${stepName}`
    }
  }

  /**
   * Check if element is a Material UI select
   */
  private async isMaterialUISelect(selector: string, webview: any): Promise<boolean> {
    const script = `
      (function() {
        try {
          const result = document.evaluate('${selector.replace(/'/g, "\\'")}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          const el = result.singleNodeValue;
          if (!el) return false;

          // Check if it's a Material UI select
          return el.tagName === 'MAT-SELECT' ||
                 el.hasAttribute('mat-select') ||
                 (el.className && el.className.includes && el.className.includes('mat-select'));
        } catch (e) {
          return false;
        }
      })();
    `
    return await webview.executeJavaScript(script)
  }

  /**
   * Select an option from Material UI dropdown
   * Material UI selects work by:
   * 1. Click the mat-select to open overlay
   * 2. Wait for mat-options to render
   * 3. Click the matching mat-option
   */
  private async selectMaterialUIOption(selector: string, value: string, webview: any): Promise<void> {
    // Step 1: Click to open the dropdown
    console.log(`   📂 Opening Material UI dropdown...`)
    await this.clickElement(selector, webview)
    await this.wait(500) // Wait for overlay to render

    // Step 2: Find and click the matching mat-option
    const script = `
      (function() {
        try {
          const targetValue = '${value.replace(/'/g, "\\'")}';
          console.log('🔍 Looking for mat-option with value:', targetValue);

          // Material UI renders options in a CDK overlay (usually at document root)
          const options = document.querySelectorAll('mat-option');
          console.log('📋 Found mat-options:', options.length);

          for (let i = 0; i < options.length; i++) {
            const option = options[i];
            const optionText = option.textContent?.trim() || '';
            const optionValue = option.getAttribute('value') || '';

            console.log(\`  Option \${i}: text="\${optionText}", value="\${optionValue}"\`);

            // Match by text or value (case-insensitive)
            if (optionText.toLowerCase() === targetValue.toLowerCase() ||
                optionValue.toLowerCase() === targetValue.toLowerCase() ||
                optionText.toLowerCase().includes(targetValue.toLowerCase())) {
              console.log('✅ Found matching option, clicking:', optionText);
              option.scrollIntoView({ behavior: 'smooth', block: 'center' });
              setTimeout(() => option.click(), 100);
              return true;
            }
          }

          console.error('❌ No matching mat-option found for:', targetValue);
          return false;
        } catch (e) {
          console.error('❌ Material UI select error:', e);
          return false;
        }
      })();
    `

    const success = await webview.executeJavaScript(script)

    if (!success) {
      throw new Error(`Could not find Material UI option: ${value}`)
    }

    console.log(`   ✅ Material UI option selected: ${value}`)
  }

  /**
   * Click an element using XPath
   */
  private async clickElement(selector: string, webview: any): Promise<void> {
    const script = `
      (function() {
        try {
          const result = document.evaluate('${selector.replace(/'/g, "\\'")}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          const el = result.singleNodeValue;
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => el.click(), 100);
            console.log('✅ Clicked element');
          } else {
            throw new Error('Element not found');
          }
        } catch (e) {
          console.error('❌ Click error:', e);
          throw e;
        }
      })();
    `

    await webview.executeJavaScript(script)
  }

  /**
   * Type in an element using XPath
   */
  private async typeInElement(selector: string, value: string, webview: any): Promise<void> {
    const script = `
      (function() {
        try {
          const result = document.evaluate('${selector.replace(/'/g, "\\'")}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          const el = result.singleNodeValue;
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus();
            el.value = '${value.replace(/'/g, "\\'")}';
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('✅ Typed text');
          } else {
            throw new Error('Element not found');
          }
        } catch (e) {
          console.error('❌ Type error:', e);
          throw e;
        }
      })();
    `

    await webview.executeJavaScript(script)
  }

  /**
   * Select an option from a SELECT dropdown using XPath
   */
  private async selectOption(selector: string, value: string, webview: any): Promise<void> {
    const script = `
      (function() {
        try {
          const result = document.evaluate('${selector.replace(/'/g, "\\'")}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          const el = result.singleNodeValue;
          if (el && el.tagName === 'SELECT') {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus();

            // Find matching option by text or value
            const targetValue = '${value.replace(/'/g, "\\'")}';
            let optionFound = false;

            for (let i = 0; i < el.options.length; i++) {
              const option = el.options[i];
              // Match by text (case-insensitive) or value
              if (option.text.trim() === targetValue ||
                  option.text.trim().toLowerCase() === targetValue.toLowerCase() ||
                  option.value === targetValue) {
                el.selectedIndex = i;
                optionFound = true;
                console.log('✅ Selected option:', option.text);
                break;
              }
            }

            if (!optionFound) {
              throw new Error('Option "' + targetValue + '" not found in dropdown');
            }

            // Trigger change events
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('input', { bubbles: true }));
            console.log('✅ Dropdown selection complete');
          } else {
            throw new Error('SELECT element not found or wrong element type');
          }
        } catch (e) {
          console.error('❌ Select error:', e);
          throw e;
        }
      })();
    `

    await webview.executeJavaScript(script)
  }

  /**
   * Wait for page to load
   */
  private async waitForPageLoad(webview: any): Promise<void> {
    await this.wait(2000)

    const checkReady = `
      (function() {
        return document.readyState === 'complete';
      })();
    `

    let attempts = 0
    while (attempts < 10) {
      const ready = await webview.executeJavaScript(checkReady)
      if (ready) break
      await this.wait(500)
      attempts++
    }
  }

  /**
   * Capture current page context
   */
  private async capturePageContext(webview: any): Promise<any> {
    const script = `
      (function() {
        return {
          url: window.location.href,
          title: document.title,
          mainHeading: document.querySelector('h1')?.textContent?.trim() || null,
          visibleText: document.body.innerText
        };
      })();
    `

    const context = await webview.executeJavaScript(script)

    const summarizedText = aiDecisionService.summarizePageText(context.visibleText, 500)

    return {
      url: context.url,
      title: context.title,
      mainHeading: context.mainHeading,
      visibleText: summarizedText
    }
  }

  /**
   * Wait utility
   */
  private async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Register progress listener
   */
  onProgress(listener: SelectorCaptureListener): void {
    this.listeners.push(listener)
  }

  /**
   * Remove progress listener
   */
  offProgress(listener: SelectorCaptureListener): void {
    this.listeners = this.listeners.filter((l) => l !== listener)
  }

  /**
   * Emit progress event
   */
  private emitProgress(progress: SelectorCaptureProgress): void {
    this.listeners.forEach((listener) => {
      try {
        listener(progress)
      } catch (error) {
        console.error('Error in progress listener:', error)
      }
    })
  }

  /**
   * Check if currently capturing
   */
  isActive(): boolean {
    return this.isCapturing
  }
}

export const aiSelectorCaptureService = new AISelectorCaptureService()
