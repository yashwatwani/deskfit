# DeskFit: Your Personal Wellness Companion Chrome Extension

DeskFit is a Chrome extension designed to promote a healthier and more productive workday for users who spend extended periods at their desks. It integrates essential well-being practices directly into the browser experience.

## Features Implemented (What We Have Achieved)

1.  **🍅 Pomodoro Timer:**
    *   Utilizes the Pomodoro Technique with 25-minute work intervals and 5-minute breaks.
    *   Clear visual display of the current timer (mm:ss) and status (Work/Break) in the popup.
    *   Second-by-second countdown visible when the popup is open.
    *   Buttons to Start, Pause, Resume, and Reset the Pomodoro timer.
    *   Tracks and displays the number of Pomodoro sessions completed today.
    *   Daily reset of completed Pomodoro count at midnight.
    *   Notifications for the end of work and break cycles.

2.  🤸 **Stretch Reminders & Guided Sessions:**
    *   **Scheduled Reminders:** Notifies the user every X minutes (currently set to a short interval like 5 minutes for testing, configurable to e.g., 45 minutes for production) to take a stretch break.
    *   **Post-Pomodoro Stretch:** Triggers a stretch session notification automatically after each 25-minute Pomodoro work cycle is completed.
    *   **Guided Session:** When a stretch notification is clicked, a new tab opens displaying:
        *   A sequence of 4 randomly selected stretching GIFs.
        *   Each GIF is displayed one by one with a 30-second timer.
        *   "Next Stretch" and "Finish Stretching" controls.

3.  💪 **Exercise Prompts & Guided Sessions:**
    *   **Scheduled Reminders:** Notifies the user every Y minutes (currently set to a short interval like 1-2 minutes for testing, configurable to e.g., 120 minutes for production) for a mini exercise break.
    *   **Guided Exercise:** When an exercise notification is clicked, a new tab opens displaying:
        *   A randomly selected exercise (e.g., push-ups, squats).
        *   Instruction to perform 10 repetitions.
        *   A visual GIF for the selected exercise.
        *   A "Done!" button.

4.  💧 **Hydration Tracking & Reminders:**
    *   Hourly notifications (configurable, currently short for testing) to remind the user to drink water.
    *   Ability to log water intake directly from the popup.
    *   Tracks progress towards a daily goal of 8 glasses.
    *   "Goal Reached!" indication.
    *   Daily reset of water intake count at midnight.

5.  🔔 **User Interface & Notifications:**
    *   A central popup to manage Pomodoro, log water, and view upcoming reminder times.
    *   Chrome notifications for all reminders and Pomodoro cycle changes. Notifications are configured to require user interaction (stay on screen until dismissed or acted upon).

6.  **State Persistence & Daily Resets:**
    *   User progress (Pomodoro state, water count, completed Pomodoros) is saved locally using `chrome.storage.local`.
    *   Water count and completed Pomodoros count automatically reset at midnight.

## How to Run the Extension Locally (Development)

1.  **Clone/Download the Repository:**
    *   If this project is on GitHub, clone the repository:
        ```bash
        git clone https://github.com/YOUR_USERNAME/YOUR_DESKFIT_REPONAME.git
        ```
    *   Alternatively, download the project files as a ZIP and extract them.

2.  **Open Google Chrome.**

3.  **Navigate to the Extensions Page:**
    *   Type `chrome://extensions` in the address bar and press Enter.

4.  **Enable Developer Mode:**
    *   In the top-right corner of the `chrome://extensions` page, toggle the "Developer mode" switch to ON.

5.  **Load Unpacked Extension:**
    *   Click the "Load unpacked" button that appears (usually top-left).
    *   In the file dialog, navigate to and select the **root folder** of the DeskFit extension (the folder that directly contains the `manifest.json` file).
    *   Click "Select Folder" or "Open".

6.  **Verify:**
    *   DeskFit should now appear as a card on the `chrome://extensions` page.
    *   Its icon should appear in your Chrome toolbar (you might need to click the puzzle piece icon to see all extensions and pin DeskFit).

7.  **Using the Extension:**
    *   Click the DeskFit icon in the toolbar to open the popup.
    *   Test all features.

8.  **Debugging:**
    *   **Popup Console:** Right-click inside the DeskFit popup and select "Inspect". Go to the "Console" tab in the DevTools window that opens.
    *   **Service Worker Console:** On the `chrome://extensions` page, find the DeskFit card and click the "service worker" link. Go to the "Console" tab.
    *   **Stretch/Exercise Page Console:** When a stretch or exercise page opens in a new tab, right-click on that page and select "Inspect" to see its console.

9.  **Reloading Changes:**
    *   After making any changes to the code (HTML, CSS, JS, Manifest), save the files.
    *   Go back to `chrome://extensions`.
    *   Find the DeskFit card and click the reload icon (a circular arrow).

## Approach for Starting Notifications

Notifications in DeskFit are primarily triggered by **Chrome Alarms**. This is the standard and recommended approach for scheduling timed events and notifications in Manifest V3 extensions.

1.  **`chrome.alarms` API:**
    *   The `background.js` script uses `chrome.alarms.create()` to schedule alarms for:
        *   Pomodoro Ticker (`pomodoroAlarm`): Fires every 1 minute to update the Pomodoro timer's `timeLeft` in the background.
        *   Stretch Reminders (`stretchAlarm`): Fires periodically based on `STRETCH_INTERVAL_MINUTES`.
        *   Exercise Reminders (`exerciseAlarm`): Fires periodically based on `EXERCISE_INTERVAL_MINUTES`.
        *   Water Reminders (`waterAlarm`): Fires periodically based on `WATER_REMINDER_INTERVAL_MINUTES`.
    *   These alarms are set up during `onInstalled` and `onStartup` events, and also re-evaluated by `checkAndResetDailyData()` for the water alarm.

2.  **`chrome.alarms.onAlarm` Listener:**
    *   An event listener in `background.js` (`chrome.alarms.onAlarm.addListener(...)`) waits for these alarms to fire.
    *   When a specific alarm (e.g., `stretchAlarm`) fires, its corresponding function (e.g., `triggerStretchNotification()`) is called.

3.  **`chrome.notifications` API:**
    *   Functions like `triggerStretchNotification()` then use `chrome.notifications.create()` to generate and display the actual on-screen notification to the user.
    *   Notifications are configured with `requireInteraction: true` to keep them visible until the user acts on them.

4.  **Additional Notification Trigger (Post-Pomodoro Stretch):**
    *   A stretch notification is also triggered programmatically (not by a direct alarm for this specific instance) at the end of each Pomodoro work cycle, from within the `handlePomodoroCycleEnd()` function in `background.js`.

This alarm-based system ensures that reminders and timer updates occur reliably even if the extension popup is closed or the user is not actively interacting with Chrome (as long as Chrome is running).

## Steps for Icons

For a Chrome extension, you need several icon sizes for different display contexts:

1.  **Core Icon Sizes (Required in `manifest.json`):**
    *   **16x16 pixels (`icons/icon16.png`):** Used as the favicon for extension pages and sometimes in context menus.
    *   **48x48 pixels (`icons/icon48.png`):** Used on the `chrome://extensions` management page.
    *   **128x128 pixels (`icons/icon128.png`):** Required for the Chrome Web Store listing. This is your primary store icon.

2.  **Action Icon (Toolbar Icon):**
    *   This is the icon that appears in the Chrome toolbar for your extension.
    *   It's good practice to provide multiple sizes here as well, so Chrome can pick the best fit. Common sizes include 16x16, 19x19, 32x32, 38x38.
    *   Specified in `manifest.json` under `action.default_icon`:
        ```json
        "action": {
          "default_popup": "popup.html",
          "default_icon": {
            "16": "icons/icon16.png",
            "19": "icons/icon19.png", // Optional, good to have
            "32": "icons/icon32.png", // Optional, good to have
            "38": "icons/icon38.png"  // Optional, good to have
            // Chrome will pick the best size it can find
          }
        },
        ```
    *   If you only provide one size (e.g., 16x16), Chrome will scale it, which might result in a blurry icon. It's better to provide a few crisp versions.

3.  **Notification Icon:**
    *   The `iconUrl` property in `chrome.notifications.create()` should point to an icon. We are currently using `icons/icon128.png` for this.
    *   This icon should be listed in `web_accessible_resources` in `manifest.json` so that the notification system can access it.

4.  **File Format:**
    *   All icons **must be in PNG format**. Other formats like ICO, JPG, or SVG (for manifest icons directly) are generally not supported or recommended for manifest declarations.

5.  **Creation Process:**
    *   Design a clear, recognizable main logo/icon for DeskFit (e.g., for the 128x128 version).
    *   Create scaled-down, pixel-perfect versions for the smaller sizes (48x48, 38x38, 32x32, 19x19, 16x16). Simply resizing a large icon often leads to poor quality at small sizes.
    *   Ensure all icons have transparent backgrounds if your design calls for it.

6.  **Folder Structure:**
    *   Keep all your icon files in an `icons` subfolder within your extension's root directory (e.g., `DeskFit/icons/icon16.png`).

7.  **Manifest Configuration:**
    *   Update your `manifest.json` under the top-level `icons` field and the `action.default_icon` field with the correct paths to your created icon files.

## Future Enhancements / To-Do

*   Allow users to customize Pomodoro work/break durations.
*   Allow users to customize stretch/exercise/water reminder intervals.
*   Add sound options for notifications.
*   Persist user settings across devices using `chrome.storage.sync` (would require adding "identity" permission for user sign-in status or handling it carefully).
*   Improve UI/UX design.
*   Add more variety to stretches and exercises.

---