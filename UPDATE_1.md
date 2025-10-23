# 🧭 User Flow & UI Reference

This document outlines the user journey and UI structure for the visual Playwright test automation desktop application.

---

## 🔐 Page 1 – Login  
**Image Reference:** `ref/login.png`

### 📋 Description:
- This is the initial login page.
- User provides their **username/email** and **password** to access the application.
- Simple and clean layout with a centered login card.
- Branding/title at the top: **Testzilla**

---

## 🗂️ Page 2.1 – Dashboard  
**Image Reference:** `ref/dashboard.png`

### 📋 Description:
- Once logged in, the user lands on the **Dashboard** (aka Home).
- Displays a **list of recent projects** as cards (showing `<project_title>` and `<last_edited_date>`).
- A large **“+ create a project”** button allows users to start a new project.
- Top navigation bar:
  - **Left side**: 
    - `HOME` tab (active by default)
    - All opened projects are displayed next to it as tabs (similar to Chrome/Figma style).
  - **Right side**: 
    - User avatar and name with dropdown options (like logout).

---

## ➕ Page 2.2 – Dashboard – Create Project  
**Image Reference:** `ref/dashboard_create_project.png`

### 📋 Description:
- Triggered when the user clicks “Create Project”.
- A modal/popup appears asking for:
  1. **Project Title**
  2. **Website URL**
  3. **About this project**
- Submit button: **Create**
- Once submitted, the project opens in a new tab.

---

## 🧪 Page 3 – Project View Layout  
**Image Reference:** `ref/project_view_layout.png`

### 📋 Description:
- Layout is split into **two major sections**:
  1. **Left (80%)**:
     - Displays the loaded website based on the project URL.
     - This is the working preview area.
  2. **Right (400px fixed panel)**:
     - This is the **Settings Panel** with **3 tabs**:
       - `Flow`: Visual flow builder (step-based interface).
       - `Code`: Auto-generated Playwright code for the current flow.
       - `Run`: Controls to execute/test the flow on the embedded browser.

---

## 🧰 Functional Summary of Settings Panel Tabs

| Tab Name | Purpose |
|----------|---------|
| **Flow** | Allows users to create/edit flows, add steps, capture selectors, define actions (click, type, wait, etc.) |
| **Code** | Shows real-time Playwright test code generated from the visual flow |
| **Run**  | Offers "Play", "Pause", and other controls to test the flow live |

---

## 🔄 Navigation Flow

1. Login with credentials → `ref/login.png`
2. Land on Dashboard → `ref/dashboard.png`
3. Create new project via popup → `ref/dashboard_create_project.png`
4. Enter project workspace → `ref/project_view_layout.png`
5. Start building and testing automation flows

---

## ✅ Notes
- Clean, minimalist design.
- Responsive card-based dashboard.
- Tabbed navigation improves multitasking.
- Ideal for testers and non-developers with a visual-first experience.

