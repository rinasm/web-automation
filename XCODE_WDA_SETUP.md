# WebDriverAgent Setup in Xcode - Simple Steps

## Step 1: Open Xcode Project
Xcode should already be open with WebDriverAgent. If not, run:
```bash
open ~/works/ui-test-automation/node_modules/appium-xcuitest-driver/node_modules/appium-webdriveragent/WebDriverAgent.xcodeproj
```

## Step 2: Select WebDriverAgentLib Target
1. In the left sidebar (Project Navigator), click on **WebDriverAgent** (the blue project icon at the top)
2. In the center panel under "TARGETS", click **WebDriverAgentLib**
3. Click the **Signing & Capabilities** tab at the top

## Step 3: Configure WebDriverAgentLib Signing
1. Check the box: **"Automatically manage signing"**
2. In the "Team" dropdown, select: **Rinas Musthafa (7MFG6W6M8G)**
3. You should see "Signing Certificate: Apple Development" appear

## Step 4: Select WebDriverAgentRunner Target
1. In the "TARGETS" list (center panel), click **WebDriverAgentRunner**
2. Make sure you're still on the **Signing & Capabilities** tab

## Step 5: Configure WebDriverAgentRunner Signing
1. Check the box: **"Automatically manage signing"**
2. In the "Team" dropdown, select: **Rinas Musthafa (7MFG6W6M8G)**
3. **IMPORTANT**: Change the **Bundle Identifier** field from:
   - `com.facebook.WebDriverAgentRunner`
   - TO: `com.rinasmusthafa.WebDriverAgentRunner`

## Step 6: Select Device
1. At the top of Xcode window, click the device dropdown (next to the scheme)
2. Select **Rinas's iPhone** (not a simulator)

## Step 7: Run Tests
1. Press **⌘ + U** (Command + U)
2. OR go to menu: **Product → Test**
3. Wait for the build to complete (30-60 seconds)
4. You should see "Test Succeeded" or WebDriverAgent will start running on your iPhone

## Step 8: Verify Success
Look for these signs of success:
- No red errors in Xcode
- Your iPhone screen might show a black screen briefly (that's WebDriverAgent running)
- In the desktop app, try recording again - you should now see accessibility identifiers instead of XPath!

## Troubleshooting
If you see "Unlock iPhone to continue" - unlock your iPhone and the build will continue automatically.

---

**That's it!** Once this is done, WebDriverAgent will work forever. You'll never need to do this again.
