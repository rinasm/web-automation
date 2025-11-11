# Voice-to-Text & Record Actions Integration Plan

**Date:** 2025-11-10
**Goal:** Complete the NORMAL MODE feature creation with all 3 input methods
**Time Estimate:** 3-4 hours

---

## 🎯 What We're Building

**NORMAL MODE Features:**
1. Features tab - with 3 creation methods:
   - ✅ Type manually (already works)
   - ❌ 🎙️ Voice-to-text (NOT integrated)
   - ❌ ✨ Record actions (NOT integrated)
2. Settings tab
3. Advanced toggle

**The Feature Creation Dialog should have:**
- Feature Name input
- Web Platform section with 3 input methods
- Mobile Platform section with 3 input methods (optional)
- Generate Steps & Simulate button

---

## 📋 Implementation Steps

### Step 1: Create PlatformDescriptionInput Component (30 min)
**File:** `src/components/PlatformDescriptionInput.tsx` (NEW)

**Component Interface:**
```typescript
interface PlatformDescriptionInputProps {
  platform: 'web' | 'mobile'
  value: string
  onChange: (value: string) => void
  creationMethod: 'manual' | 'voice' | 'record'
  onCreationMethodChange: (method: 'manual' | 'voice' | 'record') => void
  onStartRecording?: () => void
  disabled?: boolean
}
```

**Component Structure:**
```tsx
┌─────────────────────────────────────────────────┐
│ Web Platform                                    │
├─────────────────────────────────────────────────┤
│ Creation Method:                                │
│ (•) Type manually                               │
│ ( ) 🎙️ Voice to text                           │
│ ( ) ✨ Record actions                           │
│                                                 │
│ [Based on selection, show:]                     │
│ - Textarea (manual)                             │
│ - VoiceRecorder (voice)                         │
│ - Recording button (record)                     │
└─────────────────────────────────────────────────┘
```

**Implementation Details:**
1. Radio buttons for 3 methods
2. Conditional rendering based on selected method:
   - `manual`: Show textarea
   - `voice`: Show VoiceRecorder component
   - `record`: Show recording instructions + button
3. All 3 methods populate the same `value` (description)

---

### Step 2: Update FeatureCreationDialog (1 hour)
**File:** `src/components/FeatureCreationDialog.tsx` (MODIFY)

**Changes Required:**

**2.1: Add State for Both Platforms**
```typescript
const [webDescription, setWebDescription] = useState('')
const [webCreationMethod, setWebCreationMethod] = useState<'manual' | 'voice' | 'record'>('manual')
const [mobileDescription, setMobileDescription] = useState('')
const [mobileCreationMethod, setMobileCreationMethod] = useState<'manual' | 'voice' | 'record'>('manual')
const [isRecordingWeb, setIsRecordingWeb] = useState(false)
const [isRecordingMobile, setIsRecordingMobile] = useState(false)
```

**2.2: Replace Current Description Input**
Remove:
```tsx
<textarea value={description} onChange={...} />
```

Add:
```tsx
<PlatformDescriptionInput
  platform="web"
  value={webDescription}
  onChange={setWebDescription}
  creationMethod={webCreationMethod}
  onCreationMethodChange={setWebCreationMethod}
  onStartRecording={() => handleStartRecording('web')}
/>

<PlatformDescriptionInput
  platform="mobile"
  value={mobileDescription}
  onChange={setMobileDescription}
  creationMethod={mobileCreationMethod}
  onCreationMethodChange={setMobileCreationMethod}
  onStartRecording={() => handleStartRecording('mobile')}
/>
```

**2.3: Add Recording Handlers**
```typescript
const handleStartRecording = (platform: 'web' | 'mobile') => {
  if (platform === 'web') {
    setIsRecordingWeb(true)
    // Show WebView in recording mode
    // Use stepStore.startRecording()
  } else {
    setIsRecordingMobile(true)
    // Show MobileWebView in recording mode
    // Use stepStore.startRecording()
  }
}

const handleStopRecording = (platform: 'web' | 'mobile') => {
  // Get recorded events from stepStore
  // Generate description from events
  // Populate description field
  if (platform === 'web') {
    const description = generateDescriptionFromRecording()
    setWebDescription(description)
    setIsRecordingWeb(false)
  } else {
    const description = generateDescriptionFromRecording()
    setMobileDescription(description)
    setIsRecordingMobile(false)
  }
}
```

**2.4: Update Submit Handler**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  // Create feature
  const featureId = createFeature(projectId, name.trim())

  // Generate steps for WEB if description provided
  if (webDescription.trim()) {
    updateFeature(featureId, { descriptionWeb: webDescription.trim() })
    const webSteps = await stepGenerationService.generateStepsFromDescription(
      webDescription.trim(),
      'web',
      { url: project?.webUrl }
    )
    // Add steps to feature.stepsWeb
  }

  // Generate steps for MOBILE if description provided
  if (mobileDescription.trim()) {
    updateFeature(featureId, { descriptionMobile: mobileDescription.trim() })
    const mobileSteps = await stepGenerationService.generateStepsFromDescription(
      mobileDescription.trim(),
      'mobile',
      { appInfo: project?.mobileApps }
    )
    // Add steps to feature.stepsMobile
  }

  // Update status
  if (webSteps.length > 0 || mobileSteps.length > 0) {
    updateFeature(featureId, { status: 'generated' })
  }

  onSuccess(featureId)
}
```

---

### Step 3: Check VoiceRecorder Component (15 min)
**File:** `src/components/VoiceRecorder.tsx` (VERIFY)

**Verify:**
1. Component accepts `onTranscriptionComplete` callback
2. Returns transcribed text
3. Has start/stop recording UI
4. Works with Whisper/Groq/OpenAI APIs

**If needed, modify to ensure:**
```typescript
interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void
  onError?: (error: string) => void
}
```

---

### Step 4: Create Recording Utility (30 min)
**File:** `src/utils/recordingToDescription.ts` (NEW)

**Purpose:** Convert recorded events to natural language description

```typescript
interface RecordedEvent {
  type: 'click' | 'type' | 'navigate' | 'scroll'
  selector?: string
  value?: string
  url?: string
  timestamp: number
}

export function generateDescriptionFromRecording(events: RecordedEvent[]): string {
  // Convert events to natural language
  // Example:
  // Events: [
  //   { type: 'navigate', url: '/login' },
  //   { type: 'type', selector: '#email', value: 'user@example.com' },
  //   { type: 'type', selector: '#password', value: '***' },
  //   { type: 'click', selector: '#submit' }
  // ]
  //
  // Output: "Navigate to /login, enter email into email field, enter password into password field, click submit button"

  const descriptions: string[] = []

  for (const event of events) {
    switch (event.type) {
      case 'navigate':
        descriptions.push(`Navigate to ${event.url}`)
        break
      case 'type':
        descriptions.push(`Enter text into ${event.selector}`)
        break
      case 'click':
        descriptions.push(`Click ${event.selector}`)
        break
      case 'scroll':
        descriptions.push(`Scroll page`)
        break
    }
  }

  return descriptions.join(', ')
}
```

---

### Step 5: Add Recording Modal (45 min)
**File:** `src/components/RecordingModal.tsx` (NEW)

**Purpose:** Show WebView/MobileWebView during recording

```tsx
interface RecordingModalProps {
  isOpen: boolean
  platform: 'web' | 'mobile'
  projectId: string
  onComplete: (events: RecordedEvent[]) => void
  onCancel: () => void
}

export function RecordingModal({ isOpen, platform, projectId, onComplete, onCancel }) {
  // Show WebView or MobileWebView based on platform
  // Enable recording mode
  // Capture all interactions
  // Display recording status
  // Show [Stop Recording] button

  return (
    <Modal isOpen={isOpen}>
      <div className="recording-header">
        🔴 Recording - Interact with the {platform} app
        <button onClick={handleStopRecording}>Stop Recording</button>
      </div>

      {platform === 'web' ? (
        <WebView
          url={project.webUrl}
          recordingMode={true}
          onRecordEvent={handleRecordEvent}
        />
      ) : (
        <MobileWebView
          device={selectedDevice}
          recordingMode={true}
          onRecordEvent={handleRecordEvent}
        />
      )}

      <div className="recorded-actions">
        <h4>Recorded Actions ({events.length}):</h4>
        {events.map((event, i) => (
          <div key={i}>
            {i + 1}. {event.type} {event.selector || event.url}
          </div>
        ))}
      </div>
    </Modal>
  )
}
```

---

### Step 6: Update WebView for Recording Mode (30 min)
**File:** `src/components/WebView.tsx` (MODIFY)

**Add Props:**
```typescript
interface WebViewProps {
  url: string
  recordingMode?: boolean
  onRecordEvent?: (event: RecordedEvent) => void
}
```

**Add Recording Logic:**
```typescript
useEffect(() => {
  if (!recordingMode) return

  // Inject recording script
  const script = `
    document.addEventListener('click', (e) => {
      const selector = getSelector(e.target)
      window.postMessage({
        type: 'record-event',
        event: { type: 'click', selector }
      }, '*')
    })

    document.addEventListener('input', (e) => {
      const selector = getSelector(e.target)
      const value = e.target.value
      window.postMessage({
        type: 'record-event',
        event: { type: 'type', selector, value }
      }, '*')
    })
  `

  webviewRef.current?.executeJavaScript(script)

  // Listen for recorded events
  window.addEventListener('message', (e) => {
    if (e.data.type === 'record-event') {
      onRecordEvent?.(e.data.event)
    }
  })
}, [recordingMode])
```

---

## 🗂️ File Summary

### Files to CREATE:
1. ✅ `src/components/PlatformDescriptionInput.tsx` - Reusable input with 3 methods
2. ✅ `src/utils/recordingToDescription.ts` - Convert events to description
3. ✅ `src/components/RecordingModal.tsx` - Recording UI overlay

### Files to MODIFY:
1. ✅ `src/components/FeatureCreationDialog.tsx` - Major refactor
2. ✅ `src/components/WebView.tsx` - Add recording mode
3. ✅ `src/components/MobileWebView.tsx` - Add recording mode (if needed)
4. ✅ `src/components/VoiceRecorder.tsx` - Verify/adjust interface

### Files to LEVERAGE (already exist):
1. `src/components/VoiceRecorder.tsx` - Voice-to-text
2. `src/store/stepStore.ts` - Recording state management

---

## 🧪 Testing Checklist

After implementation, test:

### Manual Method ✅
- [ ] Type description in textarea
- [ ] Generate steps from typed description
- [ ] Verify steps are created correctly

### Voice Method
- [ ] Click voice recorder
- [ ] Speak description
- [ ] Verify transcription appears in description field
- [ ] Generate steps from voice description
- [ ] Verify steps are created correctly

### Record Method
- [ ] Click "Record actions"
- [ ] Recording modal opens with WebView/MobileWebView
- [ ] Interact with app (click, type, navigate)
- [ ] See recorded actions list update in real-time
- [ ] Click "Stop Recording"
- [ ] Verify description is generated from actions
- [ ] Generate steps from recorded description
- [ ] Verify steps match recorded actions

### Multi-Platform
- [ ] Fill both Web and Mobile descriptions
- [ ] Generate steps for both platforms
- [ ] Verify feature.stepsWeb and feature.stepsMobile are populated
- [ ] Verify platform toggle shows correct steps

---

## 🚀 Implementation Order

1. **Create PlatformDescriptionInput** (foundation)
2. **Update FeatureCreationDialog** (integrate component)
3. **Test manual method** (should still work)
4. **Integrate VoiceRecorder** (voice method)
5. **Test voice method**
6. **Create RecordingModal** (record method)
7. **Update WebView for recording** (record method)
8. **Test record method**
9. **Test multi-platform creation**
10. **Final end-to-end test**

---

## ⚠️ Critical Rules

1. **DO NOT break existing functionality** - Manual typing must still work
2. **All 3 methods populate same field** - They're different inputs, same output
3. **Recording is optional** - User can skip it
4. **Multi-platform is optional** - User can fill just one platform
5. **No errors on empty descriptions** - Allow creating feature without description
6. **Preserve AI step generation** - Should work with all 3 input methods

---

**Ready to implement. No mistakes. Let's do this.**
