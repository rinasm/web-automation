# Testing the Re-engineered AI Exploration Architecture

## What Was Changed

The AI exploration system has been completely re-engineered with:

1. **Persistent AIJourneys Map**: All page scans are cached in localStorage
2. **3-Phase Exploration Process**:
   - Phase 1: Check if page scanned (cache lookup)
   - Phase 2: AI filters meaningful elements (reduces redundancy)
   - Phase 3: AI decides next action (from meaningful elements only)
3. **Parent-Child Tree Structure**: Complete application map
4. **Visited Tracking**: Elements marked as visited to prevent re-exploration

## Key Files Changed

- `src/types/journey.ts` - Added MeaningfulElement, AIJourneyNode, AIJourneysMap
- `src/store/aiJourneysStore.ts` - NEW persistent store for AIJourneys map
- `src/services/aiDecisionService.ts` - Added filterMeaningfulElements() and decideNextActionFromMeaningful()
- `src/services/newExplorationController.ts` - NEW controller with 3-phase process
- `src/components/AIExplorationPanel.tsx` - Updated to use NewExplorationController

## Testing Checklist

### Test 1: First Run - Page Scanning and Caching

**Steps**:
1. Open the app
2. Navigate to "AI Explore" tab
3. Enter a test URL (e.g., https://demo.playwright.dev/todomvc/)
4. Click "Start AI Exploration"

**Expected Behavior**:
- Console logs should show:
  - `🚀 [NEW EXPLORATION] Starting intelligent exploration...`
  - `🔍 [PHASE 1] Page not scanned yet, scanning...`
  - `✅ [PHASE 1] Found X interactable elements`
  - `🤖 [PHASE 2] Filtering meaningful elements with AI...`
  - `✅ [PHASE 2] Filtered to X meaningful elements`
  - `🤖 [PHASE 3] Deciding next action...`
  - `👆 [ACTION] Clicking: [element name]`

- UI should show:
  - "Pages Scanned" incrementing
  - "Total Nodes" incrementing
  - "Journeys" showing discovered journeys

**Verify**: Check browser DevTools → Application → Local Storage → `snaptest-ai-journeys-storage`
- Should see JSON with keys like: `https://example.com_default`

### Test 2: Second Run - Cache Hit

**Steps**:
1. Stop exploration if running
2. Clear discovered journeys (if UI allows)
3. Click "Start AI Exploration" again on the SAME URL

**Expected Behavior**:
- Console logs should show:
  - `✅ [PHASE 1] Page already scanned, using cached data`
  - Should NOT show "Page not scanned yet" for pages visited in Test 1
  - AI filtering (Phase 2) should NOT run for cached pages
  - Should proceed directly to Phase 3 (decision making)

**Verify**:
- No duplicate API calls to Claude for filtering
- Exploration continues from where it left off
- No redundant journeys created

### Test 3: Element Visited Tracking

**Steps**:
1. During exploration, watch console logs for:
   - `✅ [AI JOURNEYS] Marking element visited: [key] [selector]`
   - `⬅️ [BACKTRACK] Returned to: [key]`

**Expected Behavior**:
- After clicking an element and exploring that path, element should be marked `visited: true`
- When backtracking to parent, AI should choose a different unvisited element
- When all elements visited, should complete journey or backtrack further

**Verify**: Check localStorage after exploration:
- MeaningfulElements should have `visited: true` for explored elements
- Unexplored elements should have `visited: false`

### Test 4: AI Filtering Effectiveness

**Steps**:
1. Navigate to a page with MANY similar elements (e.g., transaction list, product grid)
2. Start exploration

**Expected Behavior**:
- Console should show:
  - `🔍 [AI FILTER] Filtering X elements` (large number like 50-100)
  - `✅ [AI FILTER] Filtered to Y meaningful elements` (small number like 3-8)
- AI should reduce redundant elements to representatives
- Should NOT explore every single transaction/product

**Verify**:
- Check meaningfulElements in localStorage - should be much smaller than interactableElements
- Exploration should be efficient, not clicking every similar item

### Test 5: Parent-Child Relationships

**Steps**:
1. After exploration completes, check localStorage
2. Find root node (key ending with `_default`)
3. Check its `children` array

**Expected Behavior**:
- Root node should have children array with keys like: `https://example.com/page_actionlabel`
- Each child should have `parent` pointing back to parent key
- Tree structure should be complete and navigable

**Verify**: Use this console command in DevTools:
```javascript
JSON.parse(localStorage.getItem('snaptest-ai-journeys-storage')).state.journeys
```

### Test 6: No Re-exploration

**Steps**:
1. Run exploration to completion
2. Note the journeys found (e.g., "View Account Details")
3. Run exploration again
4. Check if SAME journey is discovered with different name

**Expected Behavior**:
- Should NOT create duplicate journeys with different names
- Should recognize already-explored paths
- Should explore NEW paths if available, or complete quickly if all paths explored

**Verify**:
- Journey count should not double on second run
- No "View Account Details v2" or similar duplicates

## Known Issues to Watch For

1. **CORS Issues**: If webview cannot inject scripts, exploration will fail
2. **API Rate Limits**: Claude API has rate limits, may need to slow down exploration
3. **Dynamic Content**: SPAs with lazy-loaded content may need longer wait times
4. **Infinite Loops**: If key generation fails, may revisit same pages

## Success Criteria

✅ First run scans pages and caches them
✅ Second run uses cached data (no re-scanning)
✅ AI filtering reduces 100s of elements to <10 meaningful ones
✅ Elements marked as visited after exploration
✅ Parent-child tree structure built correctly
✅ No duplicate journeys created on second run
✅ Exploration is intelligent, not brute-force

## Debugging Tips

**Enable verbose logging**:
```javascript
// In browser console
localStorage.setItem('debug', '*')
```

**Clear cache to test fresh**:
```javascript
// In browser console
localStorage.removeItem('snaptest-ai-journeys-storage')
```

**Inspect AIJourneys map**:
```javascript
// In browser console
const store = JSON.parse(localStorage.getItem('snaptest-ai-journeys-storage'))
console.log('Total nodes:', Object.keys(store.state.journeys).length)
console.log('All nodes:', store.state.journeys)
```

## Next Steps After Testing

1. **Document architecture** - Create guide for developers
2. **Create visualization component** - Build interactive tree view of AIJourneys map
3. **Add manual cache management** - UI to view/clear cached pages
4. **Add statistics** - Show cache hit rate, API calls saved, etc.
