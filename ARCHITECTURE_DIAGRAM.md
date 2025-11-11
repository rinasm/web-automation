# AI Exploration Architecture Diagram

## System Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE LAYER                            │
│                    (AIExplorationPanel Component)                       │
│                                                                          │
│  ┌──────────────────┐                  ┌──────────────────┐           │
│  │  Journey History │  ◄─── Tabs ───►  │ Application Map  │           │
│  │      View        │                  │   (Tree View)    │           │
│  └──────────────────┘                  └──────────────────┘           │
│         │                                        │                      │
│         │                                        │                      │
│         ▼                                        ▼                      │
│  ┌─────────────────────────────────────────────────────────┐          │
│  │          Exploration Statistics Dashboard                │          │
│  │  Pages Scanned | Total Nodes | Journeys | API Calls     │          │
│  └─────────────────────────────────────────────────────────┘          │
└────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      EXPLORATION CONTROLLER LAYER                       │
│                   (NewExplorationController.ts)                         │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  Main Exploration Loop: exploreFromNode()                       │   │
│  │                                                                  │   │
│  │  1. Get current page context                                    │   │
│  │  2. Check cache (Phase 1)                                       │   │
│  │  3. Decide next action (Phase 3)                                │   │
│  │  4. Execute action (click element)                              │   │
│  │  5. Navigate to new page                                        │   │
│  │  6. Mark element as visited                                     │   │
│  │  7. Recurse on new page                                         │   │
│  │  8. Backtrack and try other elements                            │   │
│  └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼              ▼
        ┌─────────────────┐ ┌─────────────┐ ┌──────────────┐
        │   PHASE 1:      │ │  PHASE 2:   │ │  PHASE 3:    │
        │  Cache Check    │ │AI Filtering │ │AI Decision   │
        └─────────────────┘ └─────────────┘ └──────────────┘
                    │             │              │
                    ▼             ▼              ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       SERVICE & STORE LAYER                             │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │              aiJourneysStore (Zustand + localStorage)         │      │
│  │                                                                │      │
│  │  {                                                             │      │
│  │    "https://app.com_default": {                               │      │
│  │      parent: null,                                             │      │
│  │      meaningfulElements: [...],     ◄─── Cached!              │      │
│  │      interactableElements: [...],                             │      │
│  │      pageContext: "...",                                       │      │
│  │      children: [                                               │      │
│  │        "https://app.com/page_clickbutton"                     │      │
│  │      ],                                                        │      │
│  │      url: "https://app.com",                                   │      │
│  │      scannedAt: 1234567890                                     │      │
│  │    },                                                          │      │
│  │    "https://app.com/page_clickbutton": { ... }                │      │
│  │  }                                                             │      │
│  └─────────────────────────────────────────────────────────────┘      │
│                                  │                                      │
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │         aiDecisionService (Claude AI Integration)             │      │
│  │                                                                │      │
│  │  • filterMeaningfulElements()                                 │      │
│  │    Input: 100+ interactable elements                           │      │
│  │    Output: 5-15 meaningful elements + page context            │      │
│  │                                                                │      │
│  │  • decideNextActionFromMeaningful()                           │      │
│  │    Input: Meaningful elements + current journey                │      │
│  │    Output: Click element OR Complete journey                  │      │
│  └─────────────────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES LAYER                            │
│                                                                          │
│  ┌──────────────────┐         ┌──────────────────┐                    │
│  │  Anthropic       │         │   localStorage   │                    │
│  │  Claude API      │         │   Browser Storage│                    │
│  │  (AI Filtering & │         │   (Persistence)  │                    │
│  │   Decision Making)│         │                  │                    │
│  └──────────────────┘         └──────────────────┘                    │
└────────────────────────────────────────────────────────────────────────┘
```

## 3-Phase Process Flow

### Phase 1: Cache Check
```
┌─────────────────────────────────────────┐
│  exploreFromNode(currentKey)            │
│                                          │
│  1. Get current page URL                │
│  2. Generate key: {URL}_{ACTIONLABEL}   │
│  3. Check aiJourneysStore:               │
│                                          │
│     node = store.getNode(currentKey)    │
│                                          │
│     ┌────────────────┐                  │
│     │ Node exists?   │                  │
│     └────────────────┘                  │
│          │                               │
│    ┌─────┴─────┐                        │
│    ▼           ▼                        │
│   YES         NO                        │
│    │           │                        │
│    │           └──► Go to Phase 2      │
│    │                (scanAndStoreNode)  │
│    │                                    │
│    └──► Use cached data                │
│         Skip Phase 2!                   │
│         Go to Phase 3                   │
└─────────────────────────────────────────┘
```

### Phase 2: AI Filtering (Only on Cache Miss)
```
┌──────────────────────────────────────────────────┐
│  scanAndStoreNode()                               │
│                                                   │
│  1. Extract ALL interactable elements:            │
│     flowExtractor.extractInteractableElements()   │
│     ► Result: 50-200 elements                     │
│                                                   │
│  2. Get page context:                             │
│     • URL, title, visible text                    │
│                                                   │
│  3. Send to Claude AI for filtering:              │
│     aiDecisionService.filterMeaningfulElements()  │
│                                                   │
│     Prompt: "Filter out redundant elements"       │
│     Example: 100 transaction rows → 1             │
│                                                   │
│     ► Result:                                      │
│       - 5-15 meaningful elements                  │
│       - Page context summary                      │
│                                                   │
│  4. Store in aiJourneysStore:                     │
│     store.addNode(key, {                          │
│       parent,                                     │
│       meaningfulElements,        ◄─── Cached!    │
│       interactableElements,                       │
│       pageContext,                                │
│       children: [],                               │
│       url,                                        │
│       scannedAt: Date.now()                       │
│     })                                            │
│                                                   │
│  5. Persist to localStorage automatically         │
│     (Zustand middleware handles this)             │
└──────────────────────────────────────────────────┘
```

### Phase 3: AI Decision Making
```
┌───────────────────────────────────────────────────┐
│  Phase 3: Decide Next Action                      │
│                                                    │
│  1. Get meaningful elements from node:             │
│     node.meaningfulElements                        │
│                                                    │
│  2. Filter out visited elements:                   │
│     unvisited = elements.filter(el => !el.visited)│
│                                                    │
│  3. If no unvisited elements:                      │
│     ► Return: Complete journey                     │
│                                                    │
│  4. Send to Claude AI for decision:                │
│     aiDecisionService.decideNextActionFromMeaningful()│
│                                                    │
│     Prompt: "Decide: click element OR complete"   │
│     Context: Current journey path, page context    │
│                                                    │
│     ► Claude responds:                             │
│       {                                            │
│         action: "click",                           │
│         elementIndex: 2,                           │
│         reasoning: "...",                          │
│         confidence: 85,                            │
│         isComplete: false                          │
│       }                                            │
│                                                    │
│  5. If action = "click":                           │
│     a. Mark element as visited                     │
│     b. Add to current journey                      │
│     c. Execute click                               │
│     d. Wait for page load                          │
│     e. Generate new key for new page               │
│     f. Add child relationship                      │
│     g. Recurse: exploreFromNode(newKey)           │
│     h. Backtrack: pop from journey, go back       │
│     i. Continue exploring other elements           │
│                                                    │
│  6. If action = "complete":                        │
│     ► Save journey                                 │
│     ► Return (backtrack)                           │
└───────────────────────────────────────────────────┘
```

## Data Flow: First Run vs Second Run

### First Run (No Cache)
```
User clicks "Start Exploration"
    │
    ▼
exploreFromNode("https://app.com_default")
    │
    ▼
PHASE 1: Cache check
    │
    └─► Node NOT found ► Go to Phase 2
                              │
                              ▼
                    PHASE 2: AI Filtering
                              │
                              ├─► Extract 150 elements
                              ├─► Send to Claude API ► $$$
                              ├─► Get 8 meaningful elements
                              └─► Store in cache ✓
                                      │
                                      ▼
                            PHASE 3: AI Decision
                                      │
                                      ├─► Send context to Claude ► $$$
                                      ├─► Decide: Click "Accounts"
                                      └─► Execute action
                                              │
                                              ▼
                                    Click "Accounts" button
                                              │
                                              ▼
                                    Navigate to /accounts
                                              │
                                              ▼
                    Recurse: exploreFromNode("https://app.com/accounts_accounts")
                                              │
                                              └─► Repeat process...

Total API Calls: 2 per page (filter + decide)
```

### Second Run (With Cache)
```
User clicks "Start Exploration" again
    │
    ▼
exploreFromNode("https://app.com_default")
    │
    ▼
PHASE 1: Cache check
    │
    └─► Node FOUND! ✓
            │
            └─► Use cached data
                    │
                    ├─► meaningfulElements: [8 elements]
                    ├─► pageContext: "..."
                    └─► Skip Phase 2 completely! No API call!
                            │
                            ▼
                  PHASE 3: AI Decision
                            │
                            ├─► Send context to Claude ► $$$
                            ├─► Decide: Click unvisited element
                            └─► Execute action
                                    │
                                    ▼
                          Click different element
                                    │
                                    ▼
                          Navigate to new page
                                    │
                                    └─► Repeat process...

Total API Calls: 1 per page (decide only, no filter!)
API Calls Saved: 50%+ on explored pages
```

## Key Algorithms

### Recursive Exploration with Backtracking
```python
def exploreFromNode(currentKey, previousAction):
    # Base cases
    if isPaused:
        return
    if currentJourney.length >= maxDepth:
        return

    # Phase 1: Get or scan node
    node = store.getNode(currentKey)
    if not node:
        node = scanAndStoreNode(currentKey, previousAction)  # Phase 2 inside

    # Phase 3: Decide next action
    decision = aiDecisionService.decideNextActionFromMeaningful(
        node.meaningfulElements,
        node.pageContext,
        currentJourney,
        node.url
    )

    # Handle completion
    if decision.isComplete:
        saveJourney(currentJourney, decision)
        return  # Backtrack

    # Handle click action
    if decision.action == "click":
        element = findElement(decision.elementSelector)

        # Mark visited
        store.markElementVisited(currentKey, element.selector)

        # Add to journey
        currentJourney.push(element)

        # Execute and navigate
        clickElement(element.selector)
        waitForPageLoad()

        # Get new page
        newContext = capturePageContext()
        newKey = generateKey(newContext.url, element.label)

        # Track relationship
        store.addChildToNode(currentKey, newKey)

        # RECURSE on new page
        exploreFromNode(newKey, element.label)

        # BACKTRACK
        currentJourney.pop()
        navigateBack()
        waitForPageLoad()

        # Try other unvisited elements from this page
        exploreFromNode(currentKey, previousAction)
```

### Key Generation Algorithm
```python
def generateKey(url, actionLabel):
    # Clean URL (remove query params and trailing slash)
    cleanUrl = url.split('?')[0].rstrip('/')

    if not actionLabel:
        return f"{cleanUrl}_default"

    # Clean action label
    cleanLabel = actionLabel.lower().replace(' ', '')

    return f"{cleanUrl}_{cleanLabel}"

# Examples:
generateKey("https://app.com/", None)
  → "https://app.com_default"

generateKey("https://app.com/accounts", "View Transactions")
  → "https://app.com/accounts_viewtransactions"

generateKey("https://app.com/accounts?tab=1", "View Transactions")
  → "https://app.com/accounts_viewtransactions"
```

## Performance Characteristics

### Time Complexity
- **First exploration**: O(N * M) where N = pages, M = elements per page
- **Second exploration**: O(N) where N = pages (caching eliminates M factor)
- **Cache lookup**: O(1) constant time
- **Tree traversal**: O(N) where N = nodes in tree

### Space Complexity
- **localStorage**: ~1-5MB per 100 pages scanned
- **Memory**: ~10-50MB for active exploration state
- **Per node**: ~5-20KB depending on element count

### API Call Optimization
```
Without caching:
  100 pages * 2 calls/page = 200 API calls
  Cost: ~$2-5 depending on token usage

With caching (2nd run):
  100 pages * 1 call/page = 100 API calls
  50% reduction!
  Cost: ~$1-2.50

With caching (3rd run, revisiting same paths):
  0 pages * 1 call/page = 0 API calls
  100% reduction for cached paths!
  Cost: $0 for cached pages
```

## Tree Structure Example

```
Root: https://app.com_default
├── Child: https://app.com/login_clicklogin
│   └── Child: https://app.com/dashboard_afterlogin
│       ├── Child: https://app.com/accounts_viewaccounts
│       │   └── Child: https://app.com/accounts/123_selectaccount
│       │       └── Child: https://app.com/transactions_viewtransactions
│       └── Child: https://app.com/settings_opensettings
└── Child: https://app.com/about_clickabout

Each node stores:
- parent: Key of parent node
- meaningfulElements: [5-15 filtered elements]
- interactableElements: [50-200 all elements]
- pageContext: AI-generated summary
- children: [array of child keys]
- visited flags: Which elements have been clicked
```

## Conclusion

This architecture provides:
- ✅ **Efficiency**: Caching eliminates redundant work
- ✅ **Intelligence**: AI makes smart decisions
- ✅ **Scalability**: Tree structure grows efficiently
- ✅ **Persistence**: Data survives sessions
- ✅ **Visibility**: Complete application map
