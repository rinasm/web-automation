# Electron Desktop App for Playwright Test Code Generation

## Overview
This application enables users to visually generate Playwright test code by interacting with a live website loaded inside the app. It simplifies test creation by allowing users to define steps through a point-and-click interface.

## User Flow

1. **Launch App**  
   - User opens the Electron desktop application.

2. **Enter Website URL**  
   - An input box is displayed to paste a target website URL.
   - Once pasted, the website loads in **80% of the app's window (left side)**.

3. **Toolbar & Flow Panel**  
   - The remaining **20% space (right side)** contains a **tool panel**:
     - Button to **create a new Flow** (similar to Playwright "Feature").
     - List of **Steps** under each Flow.

4. **Creating a Flow**  
   - User clicks **“Create Flow”** button.
   - A flow is created with space to add multiple steps.

5. **Defining a Step**  
   - Each step has:
     - A **Selector** button for capturing DOM element.
     - A **Step Type** dropdown: `click`, `type`, `hover`, `wait`, etc.
     - Input fields change depending on the Step Type:
       - `click` – only needs the selector.
       - `type` – needs selector and text to input.
       - `hover` – needs selector.
       - `wait` – needs wait time in ms.

6. **Capturing Selectors**  
   - When the selector button is clicked:
     - The user hovers over the live website (in the left panel).
     - Elements are **highlighted like DevTools inspector**.
     - Once clicked, the **XPath** of the selected element is captured.

7. **Play & Test Flow**  
   - After defining all steps, the user can click **"Play Flow"** to test the automation in real-time.

8. **Generate Code**  
   - Once the flow is validated, the user can click **"Generate Code"**.
   - The app will produce **Playwright test script** for the defined steps.

## Tech Stack Suggestion
- **Electron** for cross-platform desktop app shell.
- **React + TailwindCSS** for UI.
- **Puppeteer/Playwright Preview** for in-app browser rendering and automation.
- **XPath generator** for capturing unique selectors.
- **Node.js backend** for logic and Playwright code generation.

## UI Design Suggestions
- Minimalistic, modern layout.
- Tailwind-powered responsive components.
- Smooth highlighting animation for selector capture.
- Step-by-step form validation.

