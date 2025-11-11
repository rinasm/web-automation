# AI-Powered Journey Exploration Guide

## Overview

The **AI Explore** feature uses Claude AI to intelligently discover meaningful user journeys in your web application. Unlike traditional monkey testing that randomly clicks elements, this feature understands context, makes smart decisions about what to explore, and identifies when a journey reaches a meaningful completion point.

## Features

### Intelligent Decision Making
- **Context-Aware**: AI analyzes page titles, headings, and visible text to understand user intent
- **Smart Element Selection**: Prioritizes business-critical elements (accounts, transactions, data views)
- **Noise Filtering**: Automatically ignores utility links (logout, help, settings, footers)
- **Loop Detection**: Prevents infinite loops by tracking visited pages

### Journey Discovery
- **Automatic Exploration**: AI clicks through your application following meaningful paths
- **Completion Detection**: Recognizes when a goal is achieved (data displayed, success states)
- **Journey Naming**: Generates descriptive names like "View Account Balance" or "Submit Contact Form"
- **User Confirmation**: Pauses to let you approve or discard discovered journeys

### Journey Tree Building
- **Path Tracking**: Builds a complete tree of all explored paths
- **Backtracking**: Returns to previous states to explore alternative branches
- **Depth Control**: Configurable maximum exploration depth (default: 10 clicks)
- **Visual Progress**: Real-time display of current depth, paths visited, and journeys found

## Getting Started

### 1. Configure API Key

Before using AI Explore, you need an Anthropic API key:

1. Go to [Anthropic Console](https://console.anthropic.com/settings/keys)
2. Create a new API key
3. In the app, navigate to **AI Explore** tab
4. Click **Configure API Key**
5. Paste your API key and save

**Note**: Your API key is stored locally in your browser and never sent to our servers.

### 2. Start Exploration

1. Open your project and navigate to the target page
2. Ensure you're logged in (if authentication is required)
3. Click **AI Explore** in the left sidebar
4. Click **Start Intelligent Exploration**

### 3. Monitor Progress

Watch as the AI explores your application:
- **Depth**: Current click depth / Maximum depth
- **Paths**: Number of unique paths explored
- **Journeys**: Number of completed journeys found

### 4. Approve Journeys

When the AI detects a complete journey, it will pause and show a confirmation dialog:

**Journey Completion Dialog includes:**
- Journey name (AI-generated)
- Confidence score (0-100%)
- Completion reason (why AI thinks it's complete)
- Full journey path with page titles
- Generated actions preview

**Your options:**
- **Save Journey**: Convert to manual flow and save to your test steps
- **Continue Exploring**: Save and continue discovering more journeys
- **Discard**: Reject this journey and continue exploration

## How It Works

### 1. Page Analysis
For each page, the AI extracts:
- Page URL and title
- Main heading (H1)
- Key visible text (summarized to ~500 characters)
- All interactable elements with their context

### 2. AI Decision
The AI evaluates:
- Current journey context (where we came from)
- Available elements to click
- Business value of each option
- Whether current state represents journey completion

### 3. Action Execution
If AI chooses to click:
- Element is clicked in the webview
- System waits for page to load and stabilize
- New page state is captured
- Process repeats

If AI detects completion:
- Journey is saved with metadata
- User is prompted for confirmation
- Exploration can continue or stop

### 4. Journey Conversion
Confirmed journeys are converted to manual flow format:
- Each click becomes an action step
- Selectors are XPath-based
- Actions are ordered sequentially
- Can be edited, played, or exported to Playwright code

## Best Practices

### Before Exploration
✅ **Log in first**: Ensure you're authenticated before starting
✅ **Navigate to start page**: Begin from a meaningful entry point (dashboard, home page)
✅ **Check page load**: Make sure the initial page is fully loaded

### During Exploration
✅ **Monitor progress**: Watch the depth and journey counters
✅ **Review journeys**: Carefully check each discovered journey before confirming
✅ **Pause if needed**: Use the Pause button to stop and review

### After Exploration
✅ **Test journeys**: Use "Play Step" to verify captured flows work correctly
✅ **Edit if needed**: Adjust selectors or actions in Manual Flow tab
✅ **Generate code**: Export to Playwright test files

## Configuration Options

### Exploration Settings
Located in `ExplorationController` constructor:

```typescript
{
  maxDepth: 10,              // Maximum clicks deep (default: 10)
  waitTimeBetweenActions: 2000, // Wait time in ms (default: 2000ms)
  ignoreElements: [],        // Additional patterns to ignore
  autoSaveJourneys: false,   // Auto-save without confirmation
  explorationStrategy: 'ai-guided' // Strategy type
}
```

### Modifying Settings
Edit values in `src/components/AIExplorationPanel.tsx`:

```typescript
const controller = new ExplorationController(webviewRef.current, {
  maxDepth: 15,  // Explore deeper
  waitTimeBetweenActions: 3000,  // Wait longer between actions
})
```

## AI Prompts

The AI uses carefully crafted prompts to make decisions:

### System Prompt
Establishes the AI as a QA automation expert with goals:
- Discover business-critical flows
- Prioritize common user tasks
- Avoid utility and destructive actions

### Decision Prompt
Provides context for each decision:
- Current journey path
- Page information (URL, title, content)
- Available elements with descriptions
- Request for next action or completion

## Troubleshooting

### "Claude service not initialized"
**Solution**: Configure your Anthropic API key in settings

### "Element not found"
**Cause**: Page structure changed between detection and click
**Solution**: Increase `waitTimeBetweenActions` for slower pages

### "Exploration stuck at same page"
**Cause**: All elements filtered as noise or already visited
**Solution**: Check if page has explorable elements, adjust noise filters

### "Journey completion not detected"
**Cause**: AI doesn't recognize the completion state
**Solution**: Manually stop and review, or continue to see if AI finds it later

### "Too many journeys found"
**Cause**: Low confidence threshold or too many similar paths
**Solution**: Review and discard low-value journeys, adjust exploration depth

## API Usage & Costs

### Token Consumption
Each exploration session uses:
- **Per page analysis**: ~500-1500 tokens
- **Per decision**: ~1000-3000 tokens
- **Average session**: ~5,000-20,000 tokens

### Cost Estimate
With Claude 3.5 Sonnet pricing:
- **Input**: $3 per million tokens
- **Output**: $15 per million tokens
- **Typical session cost**: $0.05 - $0.30

### Optimization Tips
- Reduce `maxDepth` for shorter sessions
- Use specific starting pages (not homepage)
- Discard early to stop unnecessary exploration

## Advanced Usage

### Custom Noise Filters
Add patterns to ignore specific elements:

```typescript
ignoreElements: [
  'advertisement',
  'social-share',
  'newsletter-popup'
]
```

### Programmatic Access
Use the exploration controller directly:

```typescript
import { ExplorationController } from './services/explorationController'

const controller = new ExplorationController(webview, config)

controller.on((event) => {
  if (event.type === 'journey_found') {
    console.log('Found journey:', event.data)
  }
})

await controller.startExploration()
```

## Future Enhancements

Planned features:
- [ ] Screenshot capture for each step
- [ ] Form field value suggestions from AI
- [ ] Multi-tab/window exploration
- [ ] Journey prioritization scoring
- [ ] Custom AI prompt templates
- [ ] Export journey tree visualization
- [ ] Integration with CI/CD pipelines

## Support

For issues or questions:
- Check console logs for detailed error messages
- Review journey path to understand AI decisions
- Adjust configuration parameters
- Report bugs with exploration logs

## Example Session

```
1. Start: Dashboard (example.com/dashboard)
   ↓ AI: "Click Accounts button - high value, likely leads to data view"

2. Click: Accounts (example.com/accounts)
   ↓ AI: "Click first account - explore account details"

3. Click: Account #1234 (example.com/account/1234)
   ↓ AI: "Click Show Balance button - likely displays key data"

4. Click: Show Balance (example.com/account/1234/balance)
   ↓ AI: "Balance displayed - journey complete!"

✅ Journey: "View Account Balance"
   Confidence: 92%
   Steps: 4 actions
   Status: Pending confirmation
```

---

**Happy Testing!** 🚀

For more information, visit the [project documentation](./CLAUDE.md).
