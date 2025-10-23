import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { useStepStore } from '../store/stepStore'
import { getXPathForElement } from '../utils/xpath'

interface WebViewProps {
  url: string
}

const WebView = forwardRef<any, WebViewProps>(({ url }, ref) => {
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
    setExecuteStepCallback
  } = useStepStore()

  const currentStep = steps.find(f => f.id === currentStepId)
  const hoveringAction = currentStep?.actions.find(s => s.id === hoveringActionId)

  const [isWebviewReady, setIsWebviewReady] = useState(false)

  // Execute actions in webview
  const executeActions = useCallback(async (actions: any[]) => {
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

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i]
      console.log(`🎯 [EXECUTE] Action ${i + 1}/${actions.length}: ${action.type}`)

      try {
        let script = ''

        switch (action.type) {
          case 'click':
            script = `
              (function() {
                try {
                  const result = document.evaluate('${action.selector.replace(/'/g, "\\'")}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                  const el = result.singleNodeValue;
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.click();
                    console.log('✅ Clicked element');
                  } else {
                    console.error('❌ Element not found');
                    throw new Error('Element not found');
                  }
                } catch (e) {
                  console.error('❌ Click error:', e);
                  throw e;
                }
              })();
            `
            break

          case 'type':
            script = `
              (function() {
                try {
                  const result = document.evaluate('${action.selector.replace(/'/g, "\\'")}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                  const el = result.singleNodeValue;
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.focus();
                    el.value = '${(action.value || '').replace(/'/g, "\\'")}';
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log('✅ Typed text');
                  } else {
                    console.error('❌ Element not found');
                    throw new Error('Element not found');
                  }
                } catch (e) {
                  console.error('❌ Type error:', e);
                  throw e;
                }
              })();
            `
            break

          case 'hover':
            script = `
              (function() {
                try {
                  const result = document.evaluate('${action.selector.replace(/'/g, "\\'")}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                  const el = result.singleNodeValue;
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    const event = new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window });
                    el.dispatchEvent(event);
                    console.log('✅ Hovered element');
                  } else {
                    console.error('❌ Element not found');
                    throw new Error('Element not found');
                  }
                } catch (e) {
                  console.error('❌ Hover error:', e);
                  throw e;
                }
              })();
            `
            break

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

          case 'assert':
            script = `
              (function() {
                try {
                  const result = document.evaluate('${action.selector.replace(/'/g, "\\'")}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                  const el = result.singleNodeValue;
                  if (el && el.offsetParent !== null) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    console.log('✅ Element is visible');
                  } else {
                    console.error('❌ Element not visible');
                    throw new Error('Element not visible');
                  }
                } catch (e) {
                  console.error('❌ Assert error:', e);
                  throw e;
                }
              })();
            `
            break

          default:
            console.log(`⚠️ [EXECUTE] Unknown action type: ${action.type}`)
            continue
        }

        if (script) {
          await webview.executeJavaScript(script)
          console.log(`✅ [EXECUTE] Action ${i + 1} completed successfully`)
        }

        // Add 500ms delay between actions (except after the last action)
        if (i < actions.length - 1) {
          console.log('⏳ [EXECUTE] Waiting 500ms before next action...')
          await new Promise(resolve => setTimeout(resolve, 500))
        }

      } catch (error) {
        console.error(`❌ [EXECUTE] Action ${i + 1} failed:`, error)
        throw new Error(`Action ${i + 1} failed: ${error}`)
      }
    }

    console.log('🎉 [EXECUTE] All actions completed successfully!')
  }, [])

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
    } else if (isWebviewReady) {
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
      webview.executeJavaScript(cleanup)
        .then(() => console.log('✅ [CLEANUP] Cleanup successful'))
        .catch((err: any) => console.error('❌ [CLEANUP] Cleanup failed:', err))
    }
  }, [isCapturingSelector, isWebviewReady])

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
