import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { useStepStore } from '../store/stepStore'
import { getXPathForElement } from '../utils/xpath'
import { FlowExtractor } from '../utils/flowExtractor'
import { aiDecisionService } from '../services/aiDecisionService'

interface RecordedEvent {
  type: 'click' | 'type' | 'navigate' | 'scroll'
  selector?: string
  value?: string
  url?: string
  timestamp: number
  elementText?: string
}

interface WebViewProps {
  url: string
  recordingMode?: boolean
  onRecordEvent?: (event: RecordedEvent) => void
}

const WebView = forwardRef<any, WebViewProps>(({ url, recordingMode = false, onRecordEvent }, ref) => {
  const webviewRef = useRef<any>(null)

  // Expose webview ref to parent
  useImperativeHandle(ref, () => webviewRef.current)
  const {
    isCapturingSelector,
    capturingActionId,
    currentStepId,
    setActionSelector,
    hoveringActionId,
    steps,
    setExecuteStepCallback,
    selfHealingStatusCallback,
    isRecording,
    addRecordedEvent
  } = useStepStore()

  const currentStep = steps.find(f => f.id === currentStepId)
  const hoveringAction = currentStep?.actions.find(s => s.id === hoveringActionId)

  const [isWebviewReady, setIsWebviewReady] = useState(false)
  const flowExtractorRef = useRef<FlowExtractor | null>(null)

  // Initialize FlowExtractor when webview is ready
  useEffect(() => {
    if (isWebviewReady && webviewRef.current) {
      flowExtractorRef.current = new FlowExtractor(webviewRef.current)
    }
  }, [isWebviewReady])

  // AI-powered self-healing: Try to find element using AI when XPath fails
  const tryAISelfHealing = useCallback(async (
    stepName: string,
    actionType: string,
    originalSelector: string,
    actionValue?: string
  ): Promise<string | null> => {
    const webview = webviewRef.current
    if (!webview || !flowExtractorRef.current) {
      console.log('❌ [SELF-HEAL] FlowExtractor not available')
      return null
    }

    try {
      console.log('🔧 [SELF-HEAL] Starting AI-powered self-healing...')
      console.log(`   📝 Step: "${stepName}"`)
      console.log(`   🎯 Action: ${actionType}`)
      console.log(`   ❌ Failed selector: ${originalSelector}`)

      // Get current page context
      const pageContext = await webview.executeJavaScript(`
        (function() {
          return {
            url: window.location.href,
            title: document.title,
            visibleText: document.body.innerText.substring(0, 1000)
          };
        })();
      `)

      // Extract available elements
      const availableElements = await flowExtractorRef.current.extractInteractableElements()
      console.log(`   📋 [SELF-HEAL] Found ${availableElements.length} interactable elements`)

      // Build description for AI
      const actionDescription = actionType === 'click'
        ? `Click on the element for: ${stepName}`
        : actionType === 'type'
        ? `Enter '${actionValue}' in the input field for: ${stepName}`
        : `Perform ${actionType} action for: ${stepName}`

      // Ask AI to find the right element
      const execution = await aiDecisionService.executeTextFlowStep(
        actionDescription,
        pageContext.url,
        pageContext.title,
        pageContext.visibleText,
        availableElements
      )

      if (execution.success && execution.elementSelector) {
        console.log(`   ✅ [SELF-HEAL] AI found new selector: ${execution.elementSelector}`)
        console.log(`   📝 [SELF-HEAL] Reasoning: ${execution.reasoning}`)
        return execution.elementSelector
      } else {
        console.log(`   ❌ [SELF-HEAL] AI could not find element: ${execution.reasoning}`)
        return null
      }
    } catch (error) {
      console.error('❌ [SELF-HEAL] Error during self-healing:', error)
      return null
    }
  }, [])

  // Execute actions in webview
  const executeActions = useCallback(async (actions: any[], stepName?: string) => {
    const webview = webviewRef.current
    if (!webview) {
      console.log('❌ [EXECUTE] Webview ref not available')
      throw new Error('Webview not ready')
    }

    // Check if webview is actually ready by trying to execute a simple script
    try {
      await webview.executeJavaScript('true')
    } catch (error) {
      console.log('❌ [EXECUTE] Webview not ready for JavaScript execution')
      throw new Error('Webview not ready')
    }

    console.log(`🎬 [EXECUTE] Starting execution of ${actions.length} actions`)
    console.log(`   📝 [EXECUTE] Step name: "${stepName || 'Unknown'}"`)

    // Clean up any leftover overlays from previous runs
    try {
      console.log('🧹 [CLEANUP] Removing any leftover overlays...')
      await webview.executeJavaScript(`
        (function() {
          // First, press Escape to close any open dropdowns
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
          document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));

          // Remove ALL Material UI/Angular CDK overlay-related elements
          const selectors = [
            '.cdk-overlay-container',
            '.cdk-overlay-backdrop',
            '.cdk-overlay-backdrop-showing',
            '.cdk-overlay-pane',
            '.mat-select-panel',
            '.mat-select-panel-wrap',
            '.cdk-overlay-connected-position-bounding-box',
            'div[class*="cdk-overlay"]',
            'div[class*="mat-select-panel"]'
          ];

          let totalRemoved = 0;
          selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            console.log(\`🧹 Removing \${elements.length} elements matching "\${selector}"\`);
            elements.forEach(el => {
              el.remove();
              totalRemoved++;
            });
          });

          console.log(\`🧹 Total elements removed: \${totalRemoved}\`);

          // Reset all mat-select elements to closed state
          const allSelects = document.querySelectorAll('mat-select');
          console.log(\`🧹 Resetting \${allSelects.length} mat-select elements\`);
          allSelects.forEach(el => {
            el.setAttribute('aria-expanded', 'false');
            el.classList.remove('mat-select-open', 'mat-select-focused');
            if (el.blur) el.blur();
          });

          console.log('✅ Cleanup complete');
        })();
      `)

      // Wait a bit for cleanup to take effect
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (cleanupError) {
      console.warn('⚠️ [CLEANUP] Could not clean up overlays:', cleanupError)
      // Continue anyway - this is not critical
    }

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i]
      console.log(`🎯 [EXECUTE] Action ${i + 1}/${actions.length}: ${action.type}`)
      console.log(`   📋 [EXECUTE] Selector: ${action.selector}`)
      console.log(`   📋 [EXECUTE] Value: ${action.value || '(none)'}`)

      try {
        let script = ''

        switch (action.type) {
          case 'click': {
            // Log the original selector for debugging
            console.log(`🎯 [EXECUTE] Original selector: "${action.selector}"`)

            // Detect if selector is XPath or CSS
            const isXPath = action.selector.startsWith('/') || action.selector.startsWith('(')
            // Properly escape the selector for use in JavaScript string
            const escapedSelector = action.selector
              .replace(/\\/g, '\\\\')  // Escape backslashes first
              .replace(/'/g, "\\'")     // Escape single quotes
              .replace(/"/g, '\\"')     // Escape double quotes
              .replace(/\n/g, '\\n')    // Escape newlines
              .replace(/\r/g, '\\r')    // Escape carriage returns
              .replace(/`/g, '\\`')     // Escape backticks
              .replace(/\$/g, '\\$')    // Escape dollar signs (for template literals)

            // Escape the value if it exists (for Material UI selects)
            const escapedValue = action.value
              ? action.value
                  .replace(/\\/g, '\\\\')
                  .replace(/'/g, "\\'")
                  .replace(/"/g, '\\"')
                  .replace(/\n/g, '\\n')
                  .replace(/\r/g, '\\r')
                  .replace(/`/g, '\\`')
                  .replace(/\$/g, '\\$')
              : ''

            script = `
              new Promise(async (resolve, reject) => {
                try {
                  let el = null;
                  let foundWith = null;

                  // Retry mechanism with exponential backoff
                  const maxRetries = 5;
                  const baseDelay = 500; // Start with 500ms

                  for (let attempt = 0; attempt <= maxRetries; attempt++) {
                    if (attempt > 0) {
                      const delay = baseDelay * Math.pow(1.5, attempt - 1);
                      console.log(\`⏳ Retry attempt \${attempt}/\${maxRetries} after \${Math.round(delay)}ms...\`);
                      await new Promise(r => setTimeout(r, delay));
                    }

                    ${isXPath ? `
                      console.log('Trying XPath selector...');
                      const result = document.evaluate('${escapedSelector}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                      el = result.singleNodeValue;
                      if (el) foundWith = 'XPath';
                    ` : `
                      // Handle comma-separated selectors (try each one)
                      const originalSelector = '${escapedSelector}';
                      console.log('Original selector:', originalSelector);
                      const selectors = originalSelector.split(',').map(s => s.trim());
                      console.log('Split into', selectors.length, 'selectors:', selectors);

                      for (let i = 0; i < selectors.length; i++) {
                        const sel = selectors[i];
                        console.log('Trying selector', i + 1, ':', sel);

                        // Skip Playwright-specific pseudo-selectors
                        if (sel.includes(':has-text(') || sel.includes(':text(') || sel.includes('>>')) {
                          console.warn('❌ Skipping Playwright-specific selector:', sel);
                          continue;
                        }

                        // Skip empty selectors
                        if (!sel || sel.trim() === '') {
                          console.warn('❌ Skipping empty selector');
                          continue;
                        }

                        try {
                          el = document.querySelector(sel);
                          if (el) {
                            console.log('✅ Found element with selector:', sel);
                            foundWith = sel;
                            break;
                          } else {
                            console.log('⚠️ Selector valid but no match:', sel);
                          }
                        } catch (e) {
                          console.warn('❌ Invalid selector:', sel, '-', e.message);
                          continue;
                        }
                      }
                    `}

                    // If element found, break out of retry loop
                    if (el) {
                      if (attempt > 0) {
                        console.log(\`✅ Element found on retry attempt \${attempt}\`);
                      }
                      break;
                    }

                    // If this was the last attempt, give up
                    if (attempt === maxRetries) {
                      console.error('❌ Element not found after', maxRetries, 'retries. Tried:', '${escapedSelector}');
                      throw new Error('Element not found after ' + maxRetries + ' retries. The element may not exist or may take longer to load.');
                    }
                  }

                  if (!el) {
                    console.error('❌ Element not found with any selector. Tried:', '${escapedSelector}');
                    throw new Error('Element not found. None of the selectors matched any element on the page.');
                  }

                  console.log('✅ Element found with:', foundWith);
                  console.log('Element tag:', el.tagName, 'classes:', el.className);

                  // Verify it's actually an element
                  if (!(el instanceof Element)) {
                    console.error('❌ Found node is not an Element:', el);
                    throw new Error('Selector matched a non-element node');
                  }

                  // Check if this is a Material UI select (mat-select) with a value to select
                  const hasValueToSelect = '${escapedValue}'.trim() !== '';
                  console.log('🔍 Checking for Material UI select...');
                  console.log('  - tagName:', el.tagName);
                  console.log('  - has mat-select attribute:', el.hasAttribute('mat-select'));
                  console.log('  - className type:', typeof el.className);
                  console.log('  - className:', el.className);
                  console.log('  - has value to select:', hasValueToSelect, '("${escapedValue}")');

                  const isMaterialSelect = el.tagName === 'MAT-SELECT' ||
                                          el.hasAttribute('mat-select') ||
                                          (typeof el.className === 'string' && el.className.includes('mat-select')) ||
                                          (el.classList && el.classList.contains('mat-select'));

                  console.log('  - isMaterialSelect:', isMaterialSelect);
                  console.log('  - Will use Material UI select logic:', isMaterialSelect && hasValueToSelect);

                  if (isMaterialSelect && hasValueToSelect) {
                    console.log('🎨 Detected Material UI select with value to select:', '${escapedValue}');

                    // Step 1: Click to open dropdown
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    // Check if already open
                    const isOpen = el.getAttribute('aria-expanded') === 'true';
                    console.log('📊 Mat-select aria-expanded before click:', el.getAttribute('aria-expanded'));

                    if (isOpen) {
                      console.log('⚠️ Mat-select already open, closing first...');
                      el.click(); // Close it
                      await new Promise(r => setTimeout(r, 300)); // Wait for close
                    }

                    el.click();
                    console.log('✅ Clicked Material UI select to open dropdown');

                    // Step 2: Wait for overlay to render and click option with retries
                    await new Promise((resolveSelect, rejectSelect) => {
                      const targetValue = '${escapedValue}';
                      let attempts = 0;
                      const maxAttempts = 10; // Try up to 10 times

                      const tryFindOption = () => {
                        attempts++;
                        console.log(\`🔍 [Attempt \${attempts}/\${maxAttempts}] Looking for mat-option with value: \${targetValue}\`);

                        // Check all possible selectors for Material UI options
                        const options = document.querySelectorAll('mat-option, .mat-option, [role="option"]');
                        console.log(\`📋 Found \${options.length} option elements\`);

                        // Also check if panel is visible
                        const panels = document.querySelectorAll('.mat-select-panel, .cdk-overlay-pane');
                        console.log(\`📋 Found \${panels.length} overlay panels\`);
                        panels.forEach((panel, idx) => {
                          console.log(\`  Panel \${idx}: visible=\${panel.offsetParent !== null}, options inside=\${panel.querySelectorAll('mat-option').length}\`);
                        });

                        if (options.length === 0) {
                          if (attempts < maxAttempts) {
                            console.log(\`⏳ No options found yet, waiting 200ms and retrying...\`);
                            setTimeout(tryFindOption, 200);
                            return;
                          } else {
                            console.error('❌ No mat-options found after', maxAttempts, 'attempts');
                            rejectSelect(new Error('No mat-options found after ' + maxAttempts + ' attempts. Dropdown may not have opened.'));
                            return;
                          }
                        }

                        let found = false;
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

                            // Click after a short delay and resolve
                            setTimeout(() => {
                              option.click();
                              console.log('✅ Option clicked successfully');
                              resolveSelect(true);
                            }, 100);
                            found = true;
                            return;
                          }
                        }

                        if (!found) {
                          if (attempts < maxAttempts) {
                            console.log(\`⏳ Target option not found yet, waiting 200ms and retrying...\`);
                            setTimeout(tryFindOption, 200);
                          } else {
                            console.error('❌ No matching mat-option found for:', targetValue, 'after', maxAttempts, 'attempts');
                            rejectSelect(new Error('No matching mat-option found for: ' + targetValue));
                          }
                        }
                      };

                      // Start trying after initial delay
                      setTimeout(tryFindOption, 300);
                    });
                  } else {
                    // Regular click (not a Material UI select)
                    console.log('📌 Regular click (not Material UI select)');
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    // Try native click first, fallback to event dispatch
                    if (typeof el.click === 'function') {
                      el.click();
                    } else {
                      // For elements without native click (like SVG, div, span), dispatch click event
                      const clickEvent = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                      });
                      el.dispatchEvent(clickEvent);
                    }
                    console.log('✅ Clicked element:', el.tagName);
                  }

                  resolve(true);
                } catch (e) {
                  console.error('❌ Click error:', e);
                  reject(e);
                }
              });
            `
            break
          }

          case 'type': {
            const isXPathType = action.selector.startsWith('/') || action.selector.startsWith('(')
            const escapedSelectorType = action.selector
              .replace(/\\/g, '\\\\')
              .replace(/'/g, "\\'")
              .replace(/"/g, '\\"')
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\r')
              .replace(/`/g, '\\`')
              .replace(/\$/g, '\\$')
            const escapedValue = (action.value || '')
              .replace(/\\/g, '\\\\')
              .replace(/'/g, "\\'")
              .replace(/"/g, '\\"')
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\r')
              .replace(/`/g, '\\`')
              .replace(/\$/g, '\\$')

            script = `
              new Promise(async (resolve, reject) => {
                try {
                  let el = null;

                  // Retry mechanism with exponential backoff
                  const maxRetries = 5;
                  const baseDelay = 500;

                  for (let attempt = 0; attempt <= maxRetries; attempt++) {
                    if (attempt > 0) {
                      const delay = baseDelay * Math.pow(1.5, attempt - 1);
                      console.log(\`⏳ Retry attempt \${attempt}/\${maxRetries} for type action...\`);
                      await new Promise(r => setTimeout(r, delay));
                    }

                    ${isXPathType ? `
                      const result = document.evaluate('${escapedSelectorType}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                      el = result.singleNodeValue;
                    ` : `
                      el = document.querySelector('${escapedSelectorType}');
                    `}

                    if (el) {
                      if (attempt > 0) {
                        console.log(\`✅ Element found on retry attempt \${attempt}\`);
                      }
                      break;
                    }

                    if (attempt === maxRetries) {
                      console.error('❌ Element not found after', maxRetries, 'retries');
                      throw new Error('Element not found after ' + maxRetries + ' retries');
                    }
                  }

                  if (!el) {
                    console.error('Element not found');
                    throw new Error('Element not found');
                  }

                  // Verify it's actually an element
                  if (!(el instanceof Element)) {
                    console.error('Found node is not an Element:', el);
                    throw new Error('Selector matched a non-element node');
                  }

                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el.focus();
                  el.value = '${escapedValue}';
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                  console.log('Typed text:', el.tagName);

                  resolve(true);
                } catch (e) {
                  console.error('Type error:', e);
                  reject(e);
                }
              });
            `
            break
          }

          case 'hover': {
            const isXPathHover = action.selector.startsWith('/') || action.selector.startsWith('(')
            const escapedSelectorHover = action.selector
              .replace(/\\/g, '\\\\')
              .replace(/'/g, "\\'")
              .replace(/"/g, '\\"')
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\r')
              .replace(/`/g, '\\`')
              .replace(/\$/g, '\\$')

            script = `
              (function() {
                try {
                  let el;
                  ${isXPathHover ? `
                    const result = document.evaluate('${escapedSelectorHover}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                    el = result.singleNodeValue;
                  ` : `
                    el = document.querySelector('${escapedSelectorHover}');
                  `}

                  if (!el) {
                    console.error('Element not found');
                    throw new Error('Element not found');
                  }

                  // Verify it's actually an element
                  if (!(el instanceof Element)) {
                    console.error('Found node is not an Element:', el);
                    throw new Error('Selector matched a non-element node');
                  }

                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  const event = new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window });
                  el.dispatchEvent(event);
                  console.log('Hovered element:', el.tagName);
                } catch (e) {
                  console.error('Hover error:', e);
                  throw e;
                }
              })();
            `
            break
          }

          case 'wait':
            const waitTime = parseInt(action.value || '1000', 10)
            console.log(`⏳ [EXECUTE] Waiting ${waitTime}ms`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
            console.log('✅ [EXECUTE] Wait completed')
            // Skip executeJavaScript for wait
            if (i < actions.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 500))
            }
            continue

          case 'assert': {
            const isXPathAssert = action.selector.startsWith('/') || action.selector.startsWith('(')
            const escapedSelectorAssert = action.selector
              .replace(/\\/g, '\\\\')
              .replace(/'/g, "\\'")
              .replace(/"/g, '\\"')
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\r')
              .replace(/`/g, '\\`')
              .replace(/\$/g, '\\$')

            script = `
              (function() {
                try {
                  let el;
                  ${isXPathAssert ? `
                    const result = document.evaluate('${escapedSelectorAssert}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                    el = result.singleNodeValue;
                  ` : `
                    el = document.querySelector('${escapedSelectorAssert}');
                  `}

                  if (!el) {
                    console.error('Element not found');
                    throw new Error('Element not found');
                  }

                  // Verify it's actually an element
                  if (!(el instanceof Element)) {
                    console.error('Found node is not an Element:', el);
                    throw new Error('Selector matched a non-element node');
                  }

                  // Check if element is visible
                  if (el.offsetParent !== null) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    console.log('Element is visible:', el.tagName);
                  } else {
                    console.error('Element not visible');
                    throw new Error('Element not visible');
                  }
                } catch (e) {
                  console.error('Assert error:', e);
                  throw e;
                }
              })();
            `
            break
          }

          default:
            console.log(`⚠️ [EXECUTE] Unknown action type: ${action.type}`)
            continue
        }

        if (script) {
          try {
            await webview.executeJavaScript(script)
            console.log(`✅ [EXECUTE] Action ${i + 1} completed successfully`)
          } catch (executeError: any) {
            console.error(`❌ [EXECUTE] Error executing script:`, executeError)
            console.error(`   Error message:`, executeError.message)
            console.error(`   Error type:`, typeof executeError)

            // If element not found and we have step name, try AI self-healing
            const errorMsg = executeError.message || executeError.toString() || ''
            const isElementNotFound = errorMsg.includes('Element not found') ||
                                      errorMsg.includes('retries') ||
                                      errorMsg.includes('not found') ||
                                      errorMsg.includes('Script failed to execute')

            console.log(`   🔍 [DEBUG] Is element not found: ${isElementNotFound}`)
            console.log(`   🔍 [DEBUG] Has step name: ${!!stepName}`)
            console.log(`   🔍 [DEBUG] Has selector: ${!!action.selector}`)

            if (isElementNotFound && stepName && action.selector) {
              console.log(`🔧 [EXECUTE] Element not found, attempting AI self-healing...`)
              console.log(`   📝 Step name: "${stepName}"`)
              console.log(`   🎯 Action type: "${action.type}"`)
              console.log(`   🔍 Original selector: "${action.selector}"`)

              // Notify that self-healing has started
              if (selfHealingStatusCallback) {
                selfHealingStatusCallback(true)
              }

              // Try to find element using AI
              const newSelector = await tryAISelfHealing(
                stepName,
                action.type,
                action.selector,
                action.value
              )

              // Notify that self-healing has ended
              if (selfHealingStatusCallback) {
                selfHealingStatusCallback(false)
              }

              if (newSelector) {
                console.log(`✅ [SELF-HEAL] Found new selector, retrying action...`)

                // Update the action with new selector
                action.selector = newSelector

                // Regenerate script with new selector
                const isXPath = newSelector.startsWith('/') || newSelector.startsWith('(')
                const escapedSelector = newSelector
                  .replace(/\\/g, '\\\\')
                  .replace(/'/g, "\\'")
                  .replace(/"/g, '\\"')
                  .replace(/\n/g, '\\n')
                  .replace(/\r/g, '\\r')
                  .replace(/`/g, '\\`')
                  .replace(/\$/g, '\\$')

                // Build simple script for retry (no retry loop needed now)
                let retryScript = ''
                if (action.type === 'click') {
                  retryScript = `
                    (function() {
                      try {
                        ${isXPath ? `
                          const result = document.evaluate('${escapedSelector}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                          const el = result.singleNodeValue;
                        ` : `
                          const el = document.querySelector('${escapedSelector}');
                        `}
                        if (!el) throw new Error('Element still not found');
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.click();
                        console.log('✅ Self-healed click successful');
                      } catch (e) {
                        console.error('❌ Self-heal retry failed:', e);
                        throw e;
                      }
                    })();
                  `
                } else if (action.type === 'type') {
                  const escapedValue = (action.value || '').replace(/'/g, "\\'")
                  retryScript = `
                    (function() {
                      try {
                        ${isXPath ? `
                          const result = document.evaluate('${escapedSelector}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                          const el = result.singleNodeValue;
                        ` : `
                          const el = document.querySelector('${escapedSelector}');
                        `}
                        if (!el) throw new Error('Element still not found');
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.focus();
                        el.value = '${escapedValue}';
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                        console.log('✅ Self-healed type successful');
                      } catch (e) {
                        console.error('❌ Self-heal retry failed:', e);
                        throw e;
                      }
                    })();
                  `
                }

                // Retry with new selector
                await webview.executeJavaScript(retryScript)
                console.log(`✅ [SELF-HEAL] Action ${i + 1} completed successfully with AI-healed selector`)
              } else {
                // Self-healing failed, skip this action
                console.warn(`⚠️ [EXECUTE] Self-healing failed, skipping action ${i + 1}`)
                throw executeError
              }
            } else {
              // Not an element not found error, or no step name, rethrow
              throw executeError
            }
          }
        }

        // Small delay between actions for visual feedback
        if (i < actions.length - 1) {
          console.log('⏳ [EXECUTE] Waiting 300ms before next action...')
          await new Promise(resolve => setTimeout(resolve, 300))
        }

      } catch (error) {
        console.error(`❌ [EXECUTE] Action ${i + 1} failed:`, error)
        console.warn(`⚠️ [EXECUTE] Skipping failed action and continuing with next action...`)
        // Don't throw - continue with next action
      }
    }

    console.log('🎉 [EXECUTE] Simulation completed (some actions may have been skipped)')
  }, [tryAISelfHealing])

  // Setup webview and handle console messages - poll for webview to be ready
  useEffect(() => {
    console.log('📌 [EFFECT 1] Setting up webview listeners')

    // Poll for webview element to be ready
    let attempts = 0
    const maxAttempts = 50 // 5 seconds max
    let attachedHandlers: { domReady: any; consoleMessage: any } | null = null

    const checkAndAttach = () => {
      const webview = webviewRef.current
      attempts++

      if (!webview) {
        console.log(`⏳ [EFFECT 1] Attempt ${attempts}: Webview not ready yet...`)
        if (attempts < maxAttempts) {
          setTimeout(checkAndAttach, 100)
        } else {
          console.log('❌ [EFFECT 1] Webview never became ready')
        }
        return
      }

      console.log('✅ [EFFECT 1] Webview element found!')

      const handleDomReady = () => {
        console.log('🎉 [EVENT] WebView DOM ready fired!')
        setIsWebviewReady(true)
        console.log('✅ [STATE] isWebviewReady set to true')
      }

      const handleConsoleMessage = (e: any) => {
        console.log('📢 [EVENT] Console message:', e.message)
        if (e.message && e.message.startsWith('XPATH_CAPTURED:')) {
          const xpath = e.message.replace('XPATH_CAPTURED:', '')
          console.log('✅ [XPATH] Captured:', xpath)
          console.log('🔍 [STATE] currentStepId:', currentStepId, 'capturingActionId:', capturingActionId)
          if (currentStepId && capturingActionId) {
            console.log('💾 [ACTION] Saving selector to store...')
            setActionSelector(currentStepId, capturingActionId, xpath)
            console.log('✅ [ACTION] Selector saved!')
          } else {
            console.log('❌ [ERROR] Missing stepId or actionId')
          }
        }

        // Handle recorded events
        if (e.message && e.message.startsWith('RECORDED_EVENT:')) {
          try {
            const eventData = JSON.parse(e.message.replace('RECORDED_EVENT:', ''))
            console.log('🎥 [RECORD] Event captured:', eventData)
            addRecordedEvent(eventData)
          } catch (error) {
            console.error('❌ [RECORD] Failed to parse event:', error)
          }
        }
      }

      // Store handlers so we can remove them later
      attachedHandlers = { domReady: handleDomReady, consoleMessage: handleConsoleMessage }

      console.log('👂 [EFFECT 1] Adding event listeners...')
      webview.addEventListener('dom-ready', handleDomReady)
      webview.addEventListener('console-message', handleConsoleMessage)
      console.log('✅ [EFFECT 1] Event listeners attached successfully')

      // If the page is already loaded when we attach, manually set ready
      // Check if webview has content loaded
      setTimeout(() => {
        try {
          if (webview && !isWebviewReady) {
            console.log('🔍 [CHECK] Checking if webview already loaded...')
            // Trigger ready state manually if dom-ready already fired
            setIsWebviewReady(true)
            console.log('✅ [MANUAL] Set isWebviewReady to true')
          }
        } catch (e) {
          console.log('⚠️ [CHECK] Could not check webview state:', e)
        }
      }, 500)
    }

    checkAndAttach()

    return () => {
      const webview = webviewRef.current
      if (webview && attachedHandlers) {
        console.log('🧹 [CLEANUP 1] Removing webview listeners')
        webview.removeEventListener('dom-ready', attachedHandlers.domReady)
        webview.removeEventListener('console-message', attachedHandlers.consoleMessage)
      }
    }
  }, [url, currentStepId, capturingActionId, setActionSelector])

  // Inject selector capture when mode is active
  useEffect(() => {
    console.log('📌 [EFFECT 2] Injection effect triggered')
    console.log('🔍 [STATE] isCapturingSelector:', isCapturingSelector, 'isWebviewReady:', isWebviewReady)

    const webview = webviewRef.current
    if (!webview) {
      console.log('❌ [EFFECT 2] No webview ref')
      return
    }
    if (!isWebviewReady) {
      console.log('⏳ [EFFECT 2] Webview not ready yet')
      return
    }

    console.log('✅ [EFFECT 2] Webview is ready, proceeding...')

    const xpathFunction = getXPathForElement.toString()

    if (isCapturingSelector) {
      console.log('🔵 [INJECT] Starting injection...')

      const script = `
        (function() {
          // Clean up any previous instance first
          if (window.__capturing) {
            const oldHandlers = window.__handlers;
            if (oldHandlers) {
              document.removeEventListener('mouseover', oldHandlers.onMouseOver, true);
              document.removeEventListener('click', oldHandlers.onClick, true);
              document.removeEventListener('mousedown', oldHandlers.onMouseDown, true);
            }
            const oldStyle = document.getElementById('capture-style');
            if (oldStyle) oldStyle.remove();
            document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));

            // Restore all disabled attributes from previous session
            if (window.__disabledElements) {
              window.__disabledElements.forEach((value, element) => {
                if (element && element.setAttribute) {
                  element.setAttribute('disabled', '');
                }
              });
              window.__disabledElements.clear();
            }
          }

          window.__capturing = true;

          ${xpathFunction}

          let highlighted = null;
          let disabledElements = new Map(); // Track elements with disabled attribute

          const style = document.createElement('style');
          style.id = 'capture-style';
          style.textContent = \`.highlight { outline: 2px solid #ef4444 !important; outline-offset: 2px; background: rgba(239,68,68,0.1) !important; cursor: crosshair !important; } * { cursor: crosshair !important; }\`;
          document.head.appendChild(style);

          const onMouseOver = (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Remove highlight from previous element and restore its disabled state
            if (highlighted) {
              highlighted.classList.remove('highlight');
              // Restore disabled attribute if it was previously disabled
              if (disabledElements.has(highlighted)) {
                highlighted.setAttribute('disabled', '');
                disabledElements.delete(highlighted);
              }
            }

            if (e.target && e.target !== document.body && e.target !== document.documentElement) {
              e.target.classList.add('highlight');
              highlighted = e.target;

              // If element is disabled, temporarily remove the disabled attribute
              if (e.target.hasAttribute('disabled')) {
                disabledElements.set(e.target, true);
                e.target.removeAttribute('disabled');
              }
            }
            return false;
          };

          const onClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Capture XPath on click
            if (e.target) {
              const xpath = getXPathForElement(e.target);
              console.log('XPATH_CAPTURED:' + xpath);

              // Restore disabled attribute immediately after capture
              if (disabledElements.has(e.target)) {
                e.target.setAttribute('disabled', '');
                disabledElements.delete(e.target);
              }
            }
            return false;
          };

          const onMouseDown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
          };

          window.__handlers = { onMouseOver, onClick, onMouseDown };
          window.__disabledElements = disabledElements;

          document.addEventListener('mouseover', onMouseOver, true);
          document.addEventListener('mousedown', onMouseDown, true);
          document.addEventListener('click', onClick, true);

          console.log('✅ Selector capture activated');
        })();
      `

      console.log('📤 [INJECT] Executing JavaScript in webview...')
      webview.executeJavaScript(script)
        .then(() => console.log('✅ [INJECT] Script executed successfully'))
        .catch((err: any) => console.error('❌ [INJECT] Execution failed:', err))
    } else if (isWebviewReady && webview) {
      console.log('🔴 [CLEANUP] Deactivating selector capture...')

      const cleanup = `
        (function() {
          if (!window.__capturing) return;

          const h = window.__handlers;
          if (h) {
            document.removeEventListener('mouseover', h.onMouseOver, true);
            document.removeEventListener('click', h.onClick, true);
            document.removeEventListener('mousedown', h.onMouseDown, true);
          }

          const s = document.getElementById('capture-style');
          if (s) s.remove();

          document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));

          // Restore all disabled attributes
          if (window.__disabledElements) {
            window.__disabledElements.forEach((value, element) => {
              if (element && element.setAttribute) {
                element.setAttribute('disabled', '');
              }
            });
            window.__disabledElements.clear();
            window.__disabledElements = null;
          }

          window.__capturing = false;
          window.__handlers = null;

          console.log('✅ Selector capture deactivated');
        })();
      `

      console.log('📤 [CLEANUP] Executing cleanup script...')
      // Verify webview can execute JavaScript before attempting cleanup
      try {
        webview.executeJavaScript('true')
          .then(() => {
            return webview.executeJavaScript(cleanup)
          })
          .then(() => console.log('✅ [CLEANUP] Cleanup successful'))
          .catch((err: any) => {
            console.error('❌ [CLEANUP] Cleanup failed:', err)
            console.log('⚠️ [CLEANUP] Webview may not be ready yet')
          })
      } catch (err) {
        console.log('⚠️ [CLEANUP] Webview detached, skipping cleanup')
      }
    }
  }, [isCapturingSelector, isWebviewReady])

  // Inject recording mode script - WITH GUARD TO PREVENT DUPLICATE INJECTION
  useEffect(() => {
    if (!recordingMode || !isWebviewReady) return

    const webview = webviewRef.current
    if (!webview) return

    // Only inject if we have the callback
    if (!onRecordEvent) {
      console.log('⚠️ [RECORDING] No onRecordEvent callback provided')
      return
    }

    console.log('🎬 [RECORDING] Injecting recording mode script')

    const recordingScript = `
      (function() {
        // GUARD: Prevent duplicate injection
        if (window.__recordingModeActive) {
          console.log('⚠️ Recording mode already active, skipping injection');
          return;
        }
        window.__recordingModeActive = true;

        console.log('🎥 Recording mode activated');

        // Prevent duplicate events
        let lastEvent = { type: '', selector: '', timestamp: 0 };
        const MIN_EVENT_INTERVAL = 300; // ms between same events

        const getSelector = (element) => {
          if (element.id) return '#' + element.id;
          if (element.className && typeof element.className === 'string') {
            const classes = element.className.split(' ').filter(c => c && c.trim()).join('.');
            if (classes) return element.tagName.toLowerCase() + '.' + classes;
          }
          return element.tagName.toLowerCase();
        };

        const getElementText = (element) => {
          return element.textContent?.trim().substring(0, 50) || '';
        };

        const shouldRecordEvent = (type, selector) => {
          const now = Date.now();
          if (lastEvent.type === type &&
              lastEvent.selector === selector &&
              (now - lastEvent.timestamp) < MIN_EVENT_INTERVAL) {
            return false; // Too soon, skip duplicate
          }
          lastEvent = { type, selector, timestamp: now };
          return true;
        };

        // Record clicks - passive listener that doesn't interfere
        const clickHandler = (e) => {
          // DO NOT use e.stopPropagation() - it breaks website functionality!
          // Just observe and log, don't interfere
          const selector = getSelector(e.target);
          const elementText = getElementText(e.target);

          if (shouldRecordEvent('click', selector)) {
            console.log('RECORD_EVENT:CLICK:' + JSON.stringify({
              type: 'click',
              selector,
              elementText,
              timestamp: Date.now()
            }));
          }
        };
        // Use passive: true to indicate we won't call preventDefault
        document.addEventListener('click', clickHandler, { capture: true, passive: true });

        // Record typing - debounced, passive observation
        let typingTimeout;
        let lastTypedValue = {};
        const inputHandler = (e) => {
          // DO NOT use e.stopPropagation() - it breaks website functionality!
          // Just observe and log, don't interfere
          const selector = getSelector(e.target);
          const value = e.target.value || '';

          // Only record if value actually changed
          if (lastTypedValue[selector] === value) {
            return;
          }
          lastTypedValue[selector] = value;

          clearTimeout(typingTimeout);
          typingTimeout = setTimeout(() => {
            console.log('RECORD_EVENT:TYPE:' + JSON.stringify({
              type: 'type',
              selector,
              value,
              timestamp: Date.now()
            }));
          }, 800); // Longer delay to capture full input
        };
        // Use passive: true to indicate we won't call preventDefault
        document.addEventListener('input', inputHandler, { capture: true, passive: true });

        // Store cleanup function
        window.__cleanupRecording = () => {
          document.removeEventListener('click', clickHandler, { capture: true, passive: true });
          document.removeEventListener('input', inputHandler, { capture: true, passive: true });
          window.__recordingModeActive = false;
          console.log('🧹 Recording mode cleaned up');
        };

        console.log('✅ Recording listeners attached');
      })();
    `

    webview.executeJavaScript(recordingScript).catch((err: Error) => {
      console.error('Failed to inject recording script:', err)
    })

    // Listen for recorded events via console messages
    const handleRecordMessage = (e: any) => {
      const message = e.message
      if (message && message.startsWith('RECORD_EVENT:')) {
        const parts = message.split(':')
        const eventType = parts[1]
        const eventData = JSON.parse(parts.slice(2).join(':'))
        onRecordEvent(eventData)
      }
    }

    webview.addEventListener('console-message', handleRecordMessage)

    return () => {
      // Cleanup: remove listener and cleanup injected script
      webview.removeEventListener('console-message', handleRecordMessage)

      // Cleanup recording script in webview
      if (webview && isWebviewReady) {
        webview.executeJavaScript(`
          if (window.__cleanupRecording) {
            window.__cleanupRecording();
          }
        `).catch(() => {
          console.log('⚠️ Could not cleanup recording script')
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingMode, isWebviewReady])

  // Register execution callback with store
  useEffect(() => {
    console.log('🔗 [REGISTER] Registering executeActions callback with store')
    setExecuteStepCallback(executeActions)
    return () => {
      console.log('🧹 [CLEANUP] Unregistering executeActions callback')
      setExecuteStepCallback(null)
    }
  }, [executeActions, setExecuteStepCallback])

  // Log state changes
  useEffect(() => {
    console.log('🎯 [STATE CHANGE] isCapturingSelector changed to:', isCapturingSelector)
  }, [isCapturingSelector])

  useEffect(() => {
    console.log('🌐 [STATE CHANGE] isWebviewReady changed to:', isWebviewReady)
  }, [isWebviewReady])

  // Inject recording event listeners when recording is active
  useEffect(() => {
    console.log('📌 [EFFECT RECORD] Recording injection effect triggered')
    console.log('🔍 [STATE] isRecording:', isRecording, 'isWebviewReady:', isWebviewReady)

    const webview = webviewRef.current
    if (!webview) {
      console.log('❌ [EFFECT RECORD] No webview ref')
      return
    }
    if (!isWebviewReady) {
      console.log('⏳ [EFFECT RECORD] Webview not ready yet')
      return
    }

    console.log('✅ [EFFECT RECORD] Webview is ready, proceeding...')

    const xpathFunction = getXPathForElement.toString()

    if (isRecording) {
      console.log('🔴 [RECORD INJECT] Starting recording injection...')

      const script = `
        (function() {
          // Clean up any previous recording instance
          if (window.__recording) {
            const oldHandlers = window.__recordHandlers;
            if (oldHandlers) {
              document.removeEventListener('click', oldHandlers.onClick, true);
              document.removeEventListener('input', oldHandlers.onInput, true);
              document.removeEventListener('change', oldHandlers.onChange, true);
            }
            const oldStyle = document.getElementById('recording-style');
            if (oldStyle) oldStyle.remove();
          }

          window.__recording = true;

          ${xpathFunction}

          // Add recording indicator style
          const style = document.createElement('style');
          style.id = 'recording-style';
          style.textContent = \`
            body::before {
              content: '⏺ RECORDING';
              position: fixed;
              top: 10px;
              right: 10px;
              background: #ef4444;
              color: white;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: bold;
              z-index: 999999;
              box-shadow: 0 2px 8px rgba(0,0,0,0.2);
              animation: pulse 2s infinite;
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.7; }
            }
          \`;
          document.head.appendChild(style);

          const recordEvent = (type, element, value) => {
            const xpath = getXPathForElement(element);
            const eventData = {
              type: type,
              selector: xpath,
              value: value,
              tagName: element.tagName,
              inputType: element.type || undefined
            };
            console.log('RECORDED_EVENT:' + JSON.stringify(eventData));
          };

          const onClick = (e) => {
            // Don't prevent default or stop propagation - let the action happen naturally
            if (e.target && e.target !== document.body && e.target !== document.documentElement) {
              recordEvent('click', e.target);
            }
          };

          const onInput = (e) => {
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
              recordEvent('input', e.target, e.target.value);
            }
          };

          const onChange = (e) => {
            if (e.target && (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT')) {
              recordEvent('change', e.target, e.target.value);
            }
          };

          window.__recordHandlers = { onClick, onInput, onChange };

          document.addEventListener('click', onClick, true);
          document.addEventListener('input', onInput, true);
          document.addEventListener('change', onChange, true);

          console.log('✅ Recording activated');
        })();
      `

      console.log('📤 [RECORD INJECT] Executing JavaScript in webview...')
      webview.executeJavaScript(script)
        .then(() => console.log('✅ [RECORD INJECT] Recording script executed successfully'))
        .catch((err: any) => console.error('❌ [RECORD INJECT] Execution failed:', err))
    } else if (isWebviewReady && webview) {
      console.log('⚫ [RECORD CLEANUP] Deactivating recording...')

      const cleanup = `
        (function() {
          if (!window.__recording) return;

          const h = window.__recordHandlers;
          if (h) {
            document.removeEventListener('click', h.onClick, true);
            document.removeEventListener('input', h.onInput, true);
            document.removeEventListener('change', h.onChange, true);
          }

          const s = document.getElementById('recording-style');
          if (s) s.remove();

          window.__recording = false;
          window.__recordHandlers = null;

          console.log('✅ Recording deactivated');
        })();
      `

      console.log('📤 [RECORD CLEANUP] Executing cleanup script...')
      // Verify webview can execute JavaScript before attempting cleanup
      try {
        webview.executeJavaScript('true')
          .then(() => {
            return webview.executeJavaScript(cleanup)
          })
          .then(() => console.log('✅ [RECORD CLEANUP] Cleanup successful'))
          .catch((err: any) => {
            console.error('❌ [RECORD CLEANUP] Cleanup failed:', err)
            console.log('⚠️ [RECORD CLEANUP] Webview may not be ready yet')
          })
      } catch (err) {
        console.log('⚠️ [RECORD CLEANUP] Webview detached, skipping cleanup')
      }
    }
  }, [isRecording, isWebviewReady])

  // Preview highlight on hover
  useEffect(() => {
    const webview = webviewRef.current
    if (!webview || !isWebviewReady) return

    if (hoveringAction?.selector) {
      const script = `
        (function() {
          document.querySelectorAll('.preview-highlight').forEach(el => el.classList.remove('preview-highlight'));

          if (!document.getElementById('preview-style')) {
            const s = document.createElement('style');
            s.id = 'preview-style';
            s.textContent = \`.preview-highlight { outline: 3px solid #10b981 !important; outline-offset: 2px; background: rgba(16,185,129,0.15) !important; }\`;
            document.head.appendChild(s);
          }

          try {
            const result = document.evaluate('${hoveringAction.selector.replace(/'/g, "\\'")}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            const el = result.singleNodeValue;
            if (el) {
              el.classList.add('preview-highlight');
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          } catch (e) {
            console.error('Preview error:', e);
          }
        })();
      `

      webview.executeJavaScript(script).catch((err: any) => console.error('Preview error:', err))
    } else {
      const cleanup = `document.querySelectorAll('.preview-highlight').forEach(el => el.classList.remove('preview-highlight'));`
      webview.executeJavaScript(cleanup).catch(() => {})
    }
  }, [hoveringAction])

  return (
    <div className="w-full h-full relative bg-gray-50">
      {isCapturingSelector && (
        <div className="absolute top-0 left-0 right-0 bg-blue-500 text-white px-4 py-2 text-sm font-medium z-10">
          Click on an element to capture its selector
        </div>
      )}
      {isRecording && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white px-4 py-2 text-sm font-medium z-10 flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span>Recording in progress - Interact with the page</span>
        </div>
      )}
      <webview
        ref={webviewRef}
        src={url}
        className="w-full h-full border-0"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
})

WebView.displayName = 'WebView'

export default WebView
