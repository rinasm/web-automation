# Text to Flow Feature Guide

## Overview

**Text to Flow** is a natural language interface that allows you to describe test flows in plain English, and AI will automatically execute them step by step. This feature makes test creation as easy as writing a sentence!

## How It Works

```
┌──────────────────────────────────────────────────────────┐
│  User writes flow description in natural language       │
│  "Login with username 'admin' and password 'test123'"   │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│  AI parses description into discrete steps              │
│  1. Enter 'admin' in username field                     │
│  2. Enter 'test123' in password field                   │
│  3. Click login button                                  │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│  AI executes each step:                                  │
│  • Scans page for elements                              │
│  • Finds matching element                               │
│  • Performs action (click, type, wait)                  │
│  • Waits for page load                                  │
│  • Moves to next step                                   │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│  Journey created and ready for confirmation              │
│  Same workflow as AI Exploration                         │
│  Can be saved as manual flow or test                    │
└──────────────────────────────────────────────────────────┘
```

## Features

### ✅ Natural Language Input
Write test flows in plain English, no coding required:
- "Login with username 'admin' and password 'test123'"
- "Search for 'laptop' and filter by price"
- "Navigate to settings and change theme to dark mode"

### ✅ AI-Powered Parsing
Claude AI automatically:
- Breaks down your description into discrete steps
- Identifies the correct order of actions
- Understands context and intent

### ✅ Intelligent Execution
For each step, AI:
- Scans the current page
- Finds the correct element (input, button, link)
- Determines the right action (click, type, wait)
- Executes the action
- Handles navigation and page loads

### ✅ Real-Time Progress Tracking
- See each step as it executes
- Visual status indicators (pending, executing, completed, failed)
- Progress bar showing completion percentage
- Detailed logs for debugging

### ✅ Seamless Integration
After execution:
- Creates an `ExploredJourney` object (same as AI Exploration)
- Shows journey confirmation dialog
- Can save as manual flow
- Can export as Playwright code

## Using Text to Flow

### Step 1: Navigate to Text to Flow Tab
1. Open the application
2. Go to "AI Explore" tab in sidebar
3. Click "Text to Flow" tab (first tab)

### Step 2: Write Your Flow Description
Enter your test flow in natural language in the textarea. Be specific about:
- **Actions**: Click, type, navigate, wait
- **Elements**: Buttons, inputs, links, dropdowns
- **Values**: Exact text to enter (use quotes for clarity)
- **Order**: Describe steps in sequence

**Good Examples**:
```
Login with username 'admin@example.com' and password 'SecurePass123',
then navigate to the dashboard
```

```
Search for "laptop", filter by price range $500-$1000,
and add the first result to cart
```

```
Go to user settings, change email to 'newemail@test.com',
change theme to dark mode, and save changes
```

```
Click on "Accounts", select the first account from the list,
view transaction history, and click on the latest transaction
```

### Step 3: Execute the Flow
1. Click "Execute Flow" button
2. Watch as AI parses your description
3. See steps appear in the execution progress panel
4. Monitor each step as it executes

### Step 4: Handle Completion
When execution completes:
1. Journey confirmation dialog appears
2. Review the executed steps
3. Choose:
   - **Save & Add to Flow**: Convert to manual flow steps
   - **Continue Exploring**: Dismiss and continue
   - **Discard**: Mark as discarded

## Writing Effective Flow Descriptions

### Best Practices

#### ✅ Be Specific
**Good**:
```
Enter 'john@example.com' in the email field,
enter 'password123' in the password field,
and click the 'Sign In' button
```

**Avoid**:
```
Login to the app
```
(Too vague - which fields? what credentials?)

#### ✅ Use Quotes for Values
**Good**:
```
Search for "gaming laptop" in the search bar
```

**Avoid**:
```
Search for gaming laptop
```
(Ambiguous - is "gaming laptop" one phrase or two?)

#### ✅ Describe Elements Clearly
**Good**:
```
Click the "Add to Cart" button next to the first product
```

**Avoid**:
```
Click the button
```
(Which button? There may be many!)

#### ✅ Include Wait Steps When Needed
**Good**:
```
Click "Submit", wait for success message to appear,
then click "Continue"
```

**Avoid**:
```
Click "Submit" and click "Continue"
```
(Second click might happen before page loads!)

#### ✅ Break Down Complex Flows
**Good**:
```
Navigate to profile page, click "Edit Profile",
change username to 'newuser123', change bio to 'Test bio',
click "Save Changes"
```

**Avoid**:
```
Update profile with new username and bio
```
(Missing specific values and steps!)

### Common Patterns

#### Login Flow
```
Enter 'testuser@example.com' in the email field,
enter 'TestPass123!' in the password field,
click the "Login" button,
wait for dashboard to load
```

#### Search and Filter
```
Enter "wireless headphones" in the search box,
press Enter or click search button,
wait for results to load,
click "Under $50" price filter,
click on the first result
```

#### Form Filling
```
Enter 'John' in first name field,
enter 'Doe' in last name field,
enter 'john.doe@example.com' in email field,
select "United States" from country dropdown,
check the "Terms and Conditions" checkbox,
click "Submit" button
```

#### Multi-Page Navigation
```
Click "Products" in main navigation,
click "Electronics" category,
click "Laptops" subcategory,
click on the laptop with "Gaming" in the title,
scroll to reviews section
```

## Architecture

### Components

#### 1. TextToFlowPanel.tsx
- **Purpose**: User interface for text to flow
- **Features**:
  - Textarea for flow description
  - Example flows (click to use)
  - Execute button
  - Real-time step execution progress
  - Status indicators

#### 2. textToFlowController.ts
- **Purpose**: Orchestrates text to flow execution
- **Methods**:
  - `executeFlow(description)` - Main execution method
  - `executeSingleStep(step)` - Execute one step
  - `clickElement(selector)` - Click interaction
  - `typeInElement(selector, value)` - Type interaction
- **Events**: parsing_flow, parsed_flow, executing_step, step_completed, step_failed, completed, error

#### 3. aiDecisionService.ts (New Methods)
- **parseTextToFlowSteps()**:
  - Parses natural language into structured steps
  - Returns: Array of { description, order }

- **executeTextFlowStep()**:
  - Analyzes current page elements
  - Decides which element to interact with
  - Returns: { action, elementSelector, inputValue, reasoning, success }

### Execution Flow

```typescript
// 1. Parse flow description
const parseResult = await aiDecisionService.parseTextToFlowSteps(
  flowDescription,
  currentUrl
)

// 2. For each step
for (const step of parseResult.steps) {
  // Get page elements
  const elements = await flowExtractor.extractInteractableElements()

  // Ask AI to execute step
  const execution = await aiDecisionService.executeTextFlowStep(
    step.description,
    pageUrl,
    pageTitle,
    visibleText,
    elements
  )

  // Perform action
  if (execution.action === 'click') {
    await clickElement(execution.elementSelector)
  } else if (execution.action === 'type') {
    await typeInElement(execution.elementSelector, execution.inputValue)
  }

  // Wait for page to stabilize
  await waitForPageLoad()
}

// 3. Create journey
const journey: ExploredJourney = {
  id: crypto.randomUUID(),
  name: `Text to Flow: ${flowDescription}`,
  steps: executedSteps,
  confidence: 100,
  status: 'pending'
}
```

## API Calls

Text to Flow makes 2 API calls per flow:

1. **Parse**: `parseTextToFlowSteps()`
   - Input: Flow description
   - Output: Structured steps
   - Cost: ~$0.01-0.03 per flow

2. **Execute (per step)**: `executeTextFlowStep()`
   - Input: Step description + page elements
   - Output: Action decision
   - Cost: ~$0.01-0.02 per step
   - **Total for 5 steps**: ~$0.05-0.10

**Example: Login flow with 4 steps**
- 1 parse call: ~$0.02
- 4 execute calls: ~$0.08
- **Total**: ~$0.10 per execution

## Troubleshooting

### Issue: "Element not found"
**Cause**: AI couldn't find matching element on page

**Solutions**:
- Be more specific in description
- Use exact button/link text
- Ensure page has loaded before step
- Add "wait for page to load" steps

### Issue: "Step failed to execute"
**Cause**: Element exists but interaction failed

**Solutions**:
- Check if element is visible
- Check if element is enabled
- Add wait time before action
- Try different element description

### Issue: "Wrong element clicked"
**Cause**: Multiple similar elements on page

**Solutions**:
- Be more specific (e.g., "first button" vs "button")
- Use unique element text
- Describe element location ("in header", "in footer")
- Mention surrounding context

### Issue: Steps parsed incorrectly
**Cause**: Ambiguous description

**Solutions**:
- Write clearer, step-by-step description
- Use explicit action verbs (click, type, select)
- Put values in quotes
- Number steps if needed

## Limitations

### ❌ Not Supported
- **Complex conditional logic**: "If X then Y else Z"
- **Loops**: "Click all products"
- **Assertions**: "Verify that X is Y"
- **File uploads**: "Upload file from disk"
- **Browser actions**: "Open new tab", "Refresh page"
- **Dynamic waits**: "Wait until element appears"

### ✅ Workarounds
- **Conditionals**: Break into separate flows
- **Loops**: Explicitly list items ("Click product 1, click product 2")
- **Assertions**: Use manual flow for verification
- **File uploads**: Use manual flow
- **Browser actions**: Use manual controls
- **Dynamic waits**: Use generic "wait 3 seconds" descriptions

## Examples

### Example 1: E-commerce Checkout
```
Search for "wireless mouse" in the search bar,
click on the first product in results,
click "Add to Cart" button,
click "Proceed to Checkout" button,
enter "John Doe" in full name field,
enter "123 Main St" in address field,
enter "john@example.com" in email field,
select "Credit Card" as payment method,
click "Place Order" button
```

### Example 2: User Profile Update
```
Click "Profile" link in navigation menu,
click "Edit Profile" button,
clear and enter "NewUsername123" in username field,
clear and enter "New bio text" in bio field,
select "Public" from privacy dropdown,
check "Receive notifications" checkbox,
click "Save Changes" button,
wait for success message
```

### Example 3: Multi-Level Navigation
```
Hover over "Products" in main menu,
click "Electronics" from dropdown,
click "Computers" category,
click "Laptops" subcategory,
scroll down to "Filter by Brand",
check "Dell" brand checkbox,
check "Lenovo" brand checkbox,
click "Apply Filters" button
```

### Example 4: Account Registration
```
Click "Sign Up" button in header,
enter "john.doe@example.com" in email field,
enter "SecurePass123!" in password field,
enter "SecurePass123!" in confirm password field,
enter "John" in first name field,
enter "Doe" in last name field,
select "United States" from country dropdown,
check "I agree to Terms" checkbox,
click "Create Account" button,
wait for confirmation email message
```

## Comparison with AI Exploration

| Feature | Text to Flow | AI Exploration |
|---------|--------------|----------------|
| **Input** | Natural language description | None (automatic) |
| **Control** | Full user control | AI decides path |
| **Purpose** | Execute specific flow | Discover all paths |
| **Coverage** | Single flow | Multiple journeys |
| **Speed** | Fast (1 flow) | Slow (explores deeply) |
| **Caching** | No caching | Full caching |
| **Best For** | Known test scenarios | Exploratory testing |

## When to Use Text to Flow

### ✅ Use Text to Flow When:
- You know exactly what flow you want to test
- You need quick validation of a specific scenario
- You want to replicate a bug report
- You have user stories to convert to tests
- You need to test edge cases

### ❌ Use AI Exploration When:
- You want to discover all possible paths
- You don't know what flows exist
- You want comprehensive coverage
- You're new to the application
- You want to build application map

### 💡 Use Both:
1. **AI Exploration first**: Discover all journeys
2. **Text to Flow second**: Fill gaps with specific scenarios
3. **Result**: Complete test coverage!

## Future Enhancements

### Planned Features
- [ ] Support for assertions: "Verify that page title is 'Dashboard'"
- [ ] Conditional steps: "If modal appears, click close"
- [ ] Data-driven flows: "Login with {username} and {password}"
- [ ] Loop support: "Click all products with price < $50"
- [ ] Custom wait conditions: "Wait until loading spinner disappears"
- [ ] Screenshot capture: "Take screenshot after each step"
- [ ] Multi-page flows: "Open new tab and navigate to..."

### Possible Improvements
- Voice input for flow descriptions
- Flow templates library
- Flow sharing between team members
- Flow versioning and history
- Visual flow builder (drag-and-drop)
- Integration with test management tools

## Conclusion

**Text to Flow** brings the power of natural language to test automation. Simply describe what you want to test, and AI does the rest!

**Key Benefits**:
- ✅ No coding required
- ✅ Fast test creation
- ✅ Natural language interface
- ✅ AI-powered execution
- ✅ Seamless integration with existing features

Ready to try it? Open the app and navigate to **AI Explore → Text to Flow**!
