# Material UI Dropdown Second Run Failure - TODO

## Issue Summary

**Problem**: When running simulation twice without page refresh, Material UI `mat-select` dropdowns fail on the second run. The first run works perfectly, but the second run either:
- Cannot find elements
- Thinks click actions are done but they're not actually executed
- Finds 0 options in mat-select dropdowns (should find 2+ options)

## Evidence from Console Logs

### First Run (Success)
```
📋 Found 2 overlay panels (year dropdown)
📋 Found 4 overlay panels (month dropdown)
✅ All interactions work correctly
```

### Second Run (Failure)
```
🧹 [CLEANUP] Found 1 overlay elements to remove
📋 Found 0 option elements (dropdown appears to open but no options rendered)
❌ Elements not found or clicks don't execute
```

**Key Insight**: Cleanup only removed 1 overlay when there should have been 4+ overlays from the first run.

## Root Cause Analysis

Material UI/Angular CDK creates overlay containers that persist in the DOM after dropdown interactions. These leftover overlays accumulate and interfere with subsequent simulation runs:

1. **First run**: Fresh page → CDK creates overlays → interactions work → overlays remain in DOM
2. **Second run**: Leftover overlays confuse Angular Material → new overlays don't render properly → 0 options found

## What Was Implemented

### Enhanced Cleanup Mechanism (WebView.tsx lines 136-188)

Added comprehensive cleanup before each `executeActions()` call:

1. **Escape Key Dispatch**: Close any open dropdowns programmatically
   ```javascript
   document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', ... }));
   ```

2. **9 Selector Patterns**: Remove all CDK overlay variants
   - `.cdk-overlay-container`
   - `.cdk-overlay-backdrop`
   - `.cdk-overlay-backdrop-showing`
   - `.cdk-overlay-pane`
   - `.mat-select-panel`
   - `.mat-select-panel-wrap`
   - `.cdk-overlay-connected-position-bounding-box`
   - `div[class*="cdk-overlay"]` (wildcard)
   - `div[class*="mat-select-panel"]` (wildcard)

3. **State Reset**: Reset all `mat-select` elements
   ```javascript
   el.setAttribute('aria-expanded', 'false');
   el.classList.remove('mat-select-open', 'mat-select-focused');
   el.blur();
   ```

4. **Detailed Logging**: Track exactly what's being removed
5. **200ms Stabilization Wait**: Let DOM settle after cleanup

### File Locations

- **Main Implementation**: `/Users/rinasmusthafa/works/ui-test-automation/src/components/WebView.tsx`
  - Lines 136-188: Cleanup code in `executeActions()` function
  - Lines 335-426: Material UI select detection and option clicking logic

## What Still Needs Investigation

### 1. **Why Cleanup Finds Only 1 Overlay**

The cleanup logs show only 1 element removed when there should be 4+. Possible reasons:
- Overlays might be nested differently than expected
- Angular Material might use different class names in production
- Timing issue - overlays might be hidden but not yet removed
- Shadow DOM or iframe isolation (unlikely but possible)

**Action Items**:
- [ ] Add more detailed logging to see EXACTLY which selector finds the 1 element
- [ ] Log the entire overlay container structure before cleanup
- [ ] Check if overlays are nested inside other containers
- [ ] Verify if the test website uses custom CDK overlay configuration

### 2. **Verify Cleanup Timing**

Current implementation runs cleanup once at the start of `executeActions()`. Consider:
- [ ] Run cleanup before EACH Material UI select interaction (not just at start)
- [ ] Add longer stabilization wait (currently 200ms, try 500ms or 1000ms)
- [ ] Add retry mechanism if cleanup finds 0 elements on first attempt

### 3. **Alternative Cleanup Strategies**

If current approach doesn't work:
- [ ] **Nuclear option**: Remove ALL elements with `position: fixed` or `position: absolute` that aren't part of the original page
- [ ] **Force recreation**: Trigger Angular Material to recreate overlay service by dispatching custom events
- [ ] **Page state reset**: Programmatically trigger any cleanup hooks the Angular app might have
- [ ] **Manual overlay inspection**: Use browser DevTools to manually inspect overlay structure during second run

### 4. **Debugging Steps**

Add more granular logging:

```javascript
// Before cleanup
const allOverlayInfo = document.querySelectorAll('[class*="overlay"], [class*="mat-select"]');
console.log('🔍 [DEBUG] All overlay-related elements:', allOverlayInfo.length);
allOverlayInfo.forEach((el, idx) => {
  console.log(`  ${idx}: tag=${el.tagName}, classes=${el.className}, visible=${el.offsetParent !== null}`);
});

// After each selector in cleanup
selectors.forEach(selector => {
  const elements = document.querySelectorAll(selector);
  elements.forEach((el, idx) => {
    console.log(`  🗑️ Removing: tag=${el.tagName}, classes=${el.className}, parent=${el.parentNode?.tagName}`);
  });
});
```

### 5. **Test with Simple Reproduction**

Create minimal test case:
- [ ] Find or create a simple Angular Material demo page
- [ ] Test if cleanup works on standard Material UI demo
- [ ] If it works on demo but not production app, compare overlay structures
- [ ] Document any differences in CDK overlay implementation

## Quick Wins to Try Next

1. **Cleanup before each select, not just at start**:
   ```javascript
   // In the Material UI select detection block (line 335)
   if (isMaterialSelect && hasValueToSelect) {
     // ADD CLEANUP HERE before clicking
     await runCleanup(); // Extract cleanup to separate function

     el.click(); // Then proceed with interaction
   }
   ```

2. **Increase stabilization wait**:
   ```javascript
   await new Promise(resolve => setTimeout(resolve, 500)) // Change from 200ms to 500ms
   ```

3. **More aggressive selector matching**:
   ```javascript
   // Add these to selectors array:
   '[class*="overlay"]',  // Catch any overlay
   '[class*="panel"]',    // Catch any panel
   'div[role="listbox"]', // Material UI dropdown role
   'div[tabindex="-1"]',  // Hidden overlays
   ```

## Related Files

- `/Users/rinasmusthafa/works/ui-test-automation/src/components/WebView.tsx` - Main execution and cleanup logic
- `/Users/rinasmusthafa/works/ui-test-automation/src/services/simulationService.ts` - Orchestrates step execution
- `/Users/rinasmusthafa/works/ui-test-automation/src/store/stepStore.ts` - State management for steps
- `/Users/rinasmusthafa/works/ui-test-automation/src/services/aiSelectorCaptureService.ts` - AI-guided selector capture (also uses Material UI select logic)

## Expected Behavior After Fix

When running simulation twice without page refresh:

**First Run**:
```
🧹 [CLEANUP] Removing any leftover overlays...
🧹 Removing 0 elements (fresh page)
🧹 Total elements removed: 0
📋 Found 2 overlay panels (year)
✅ Year selected: 2024
📋 Found 4 overlay panels (month)
✅ Month selected: January
```

**Second Run**:
```
🧹 [CLEANUP] Removing any leftover overlays...
🧹 Removing 2 elements matching ".cdk-overlay-container"
🧹 Removing 4 elements matching ".cdk-overlay-pane"
🧹 Removing X elements matching ".mat-select-panel"
🧹 Total elements removed: 10+ (should be 6-10+)
🧹 Resetting 5 mat-select elements
✅ Cleanup complete
📋 Found 2 overlay panels (year)
✅ Year selected: 2024
📋 Found 4 overlay panels (month)
✅ Month selected: January
```

## Notes

- User explicitly requested NO PAGE RELOAD - the solution must work without refreshing
- This is a Material UI/Angular CDK specific issue - regular HTML dropdowns work fine
- The cleanup code is non-blocking - simulation continues even if cleanup fails
- AI self-healing is already implemented and works, but can't help if overlays prevent dropdowns from opening

## Priority

**Medium-High** - Affects user experience when running multiple simulations in a session, but workaround exists (refresh page between runs).

---

*Created: 2025-11-10*
*Last Updated: 2025-11-10*
*Status: Investigation Required*
