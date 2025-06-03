// --- Configuration ---
const WORK_DURATION = 25 * 60; // 25 minutes in seconds
const BREAK_DURATION = 5 * 60; // 5 minutes in seconds
const STRETCH_INTERVAL = 45; // minutes
const EXERCISE_INTERVAL = 120; // minutes (2 hours)
const WATER_REMINDER_INTERVAL = 60; // minutes
const MAX_WATER_GLASSES = 8;

// --- State (will be loaded from/saved to storage) ---
let pomodoroState = {
    timerId: null, // Stores setInterval ID if running, otherwise null
    timeLeft: WORK_DURATION,
    isRunning: false,
    isWorkMode: true, // true for work, false for break
    pomodorosCompleted: 0
};

let waterIntake = {
    count: 0,
    lastResetDate: new Date().toDateString() // To reset daily
};

// --- Stretching & Exercise GIF Names ---
// (Ensure these files exist in your gifs/stretching and gifs/exercise folders)
const stretchGifs = ["stretch1.gif", "stretch2.gif", "stretch3.gif", "stretch4.gif", "stretch5.gif"];
const exerciseGifs = ["pushup.gif", "squats.gif", "plank.gif"]; // Or descriptions

// --- Initialization ---
chrome.runtime.onInstalled.addListener(() => {
    console.log("WellnessMax installed/updated.");
    chrome.storage.local.get(["pomodoroState", "waterIntake"], (result) => {
        if (result.pomodoroState) {
            pomodoroState = result.pomodoroState;
            // If timer was running, it's lost. Reset to sensible default or last saved state.
            if (pomodoroState.isRunning) { // If it was running, better to reset it
                pomodoroState.isRunning = false;
                pomodoroState.timeLeft = pomodoroState.isWorkMode ? WORK_DURATION : BREAK_DURATION;
            }
        } else {
            chrome.storage.local.set({ pomodoroState });
        }

        if (result.waterIntake) {
            waterIntake = result.waterIntake;
            checkAndResetWaterIntake(); // Check if it needs daily reset
        } else {
            chrome.storage.local.set({ waterIntake });
        }
        setupAlarms();
    });
});

chrome.runtime.onStartup.addListener(() => {
    console.log("Browser started. WellnessMax checking state.");
    // Load state on browser startup
    chrome.storage.local.get(["pomodoroState", "waterIntake"], (result) => {
        if (result.pomodoroState) pomodoroState = result.pomodoroState;
        if (result.waterIntake) waterIntake = result.waterIntake;
        checkAndResetWaterIntake();
        updatePomodoroTimerDisplay(); // If the popup is open, it'll get updated
        // Alarms should persist, but let's ensure they are set up if not
        setupAlarms();
    });
});


function checkAndResetWaterIntake() {
    const today = new Date().toDateString();
    if (waterIntake.lastResetDate !== today) {
        waterIntake.count = 0;
        waterIntake.lastResetDate = today;
        chrome.storage.local.set({ waterIntake });
        console.log("Water intake reset for the new day.");
    }
}

function setupAlarms() {
    // Clear existing alarms to avoid duplicates, then set them
    chrome.alarms.clearAll(() => {
        console.log("Cleared existing alarms.");
        chrome.alarms.create("stretchAlarm", { delayInMinutes: STRETCH_INTERVAL, periodInMinutes: STRETCH_INTERVAL });
        chrome.alarms.create("exerciseAlarm", { delayInMinutes: EXERCISE_INTERVAL, periodInMinutes: EXERCISE_INTERVAL });
        if (waterIntake.count < MAX_WATER_GLASSES) {
            chrome.alarms.create("waterAlarm", { delayInMinutes: WATER_REMINDER_INTERVAL, periodInMinutes: WATER_REMINDER_INTERVAL });
        }
        chrome.alarms.create("pomodoroAlarm", { periodInMinutes: 1 }); // Runs every minute for pomodoro
        console.log("WellnessMax alarms set up.");
    });
}


// --- Alarm Listener ---
chrome.alarms.onAlarm.addListener((alarm) => {
    console.log("Alarm fired:", alarm.name);
    checkAndResetWaterIntake(); // Good place to check daily reset

    if (alarm.name === "pomodoroAlarm") {
        if (pomodoroState.isRunning) {
            pomodoroState.timeLeft--;
            if (pomodoroState.timeLeft <= 0) {
                handlePomodoroCycleEnd();
            }
            chrome.storage.local.set({ pomodoroState });
            updatePomodoroTimerDisplay(); // Send message to popup if open
        }
    } else if (alarm.name === "stretchAlarm") {
        triggerStretchNotification();
    } else if (alarm.name === "exerciseAlarm") {
        triggerExerciseNotification();
    } else if (alarm.name === "waterAlarm") {
        if (waterIntake.count < MAX_WATER_GLASSES) {
            triggerWaterNotification();
        } else {
            // If 8 glasses reached, clear the water alarm for the day
            chrome.alarms.clear("waterAlarm", (wasCleared) => {
                if(wasCleared) console.log("Water alarm cleared for the day.");
            });
        }
    }
});

// --- Pomodoro Logic ---
function handlePomodoroCycleEnd() {
    pomodoroState.isRunning = false;
    const notificationSound = 'sounds/notification.mp3'; // You'd need to add this

    if (pomodoroState.isWorkMode) {
        pomodoroState.pomodorosCompleted++;
        pomodoroState.isWorkMode = false;
        pomodoroState.timeLeft = BREAK_DURATION;
        createNotification("pomodoroEndWork", "Pomodoro: Work Complete!", "Time for a short break!", "icons/icon128.png");
    } else {
        pomodoroState.isWorkMode = true;
        pomodoroState.timeLeft = WORK_DURATION;
        createNotification("pomodoroEndBreak", "Pomodoro: Break Over!", "Time to get back to work!", "icons/icon128.png");
    }
    chrome.storage.local.set({ pomodoroState });
    updatePomodoroTimerDisplay();
}

function updatePomodoroTimerDisplay() {
    // Send a message to the popup if it's open
    chrome.runtime.sendMessage({
        type: "POMODORO_UPDATE",
        state: pomodoroState
    }).catch(err => {/* console.log("Popup not open or error sending message", err) */});
}


// --- Notification Triggers ---
function triggerStretchNotification() {
    createNotification(
        "stretchTime",
        "Stretch Time!",
        "Time for a quick stretch. Click here to start.",
        "icons/icon128.png",
        [{ title: "Start Stretching" }]
    );
}

function triggerExerciseNotification() {
    createNotification(
        "exerciseTime",
        "Exercise Break!",
        "Time for a quick exercise. Click here!",
        "icons/icon128.png",
        [{ title: "Start Exercise" }]
    );
}

function triggerWaterNotification() {
    createNotification(
        "waterReminder",
        "Stay Hydrated!",
        `Remember to drink water. You've had ${waterIntake.count}/${MAX_WATER_GLASSES}.`,
        "icons/icon128.png",
        [{ title: "Log Water" }]
    );
}

// --- Generic Notification Creator ---
function createNotification(id, title, message, iconUrl, buttons) {
    const notificationOptions = {
        type: "basic",
        iconUrl: iconUrl,
        title: title,
        message: message,
        priority: 2, // High priority
        requireInteraction: true // Keeps notification until dismissed by user
    };
    if (buttons) {
        notificationOptions.buttons = buttons; // e.g., [{ title: "Action Button" }]
    }

    chrome.notifications.create(id, notificationOptions, (notificationId) => {
        if (chrome.runtime.lastError) {
            console.error("Notification error:", chrome.runtime.lastError);
            return;
        }
        console.log("Notification shown:", notificationId);

        // Set a timer to auto-clear the notification after 30 seconds
        // Note: `requireInteraction: true` might override this on some OS.
        // This is more of a "if user doesn't interact in 30s, it might go away"
        setTimeout(() => {
            chrome.notifications.clear(id, (wasCleared) => {
                // console.log(`Notification ${id} auto-cleared: ${wasCleared}`);
            });
        }, 30 * 1000); // 30 seconds
    });
}


// --- Notification Click Handlers ---
chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId === "stretchTime") {
        openStretchPage();
    } else if (notificationId === "exerciseTime") {
        openExercisePage();
    } else if (notificationId === "waterReminder") {
        // Maybe open popup or just log water directly if we add a button
        chrome.action.openPopup(); // Opens the popup
    }
    chrome.notifications.clear(notificationId); // Clear after click
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (notificationId === "stretchTime" && buttonIndex === 0) {
        openStretchPage();
    } else if (notificationId === "exerciseTime" && buttonIndex === 0) {
        openExercisePage();
    } else if (notificationId === "waterReminder" && buttonIndex === 0) {
        logWaterIntake();
        // Update notification if needed or clear it
        chrome.notifications.clear(notificationId);
        if (waterIntake.count < MAX_WATER_GLASSES) {
            triggerWaterNotification(); // Re-trigger with updated count
        }
    }
    chrome.notifications.clear(notificationId); // Clear after button click
});

function openStretchPage() {
    chrome.tabs.create({ url: chrome.runtime.getURL("stretch_display.html") });
}

function openExercisePage() {
    chrome.tabs.create({ url: chrome.runtime.getURL("exercise_display.html") });
}

// --- Water Logging ---
function logWaterIntake() {
    if (waterIntake.count < MAX_WATER_GLASSES) {
        waterIntake.count++;
        chrome.storage.local.set({ waterIntake });
        console.log("Water logged. Count:", waterIntake.count);
        if (waterIntake.count >= MAX_WATER_GLASSES) {
            chrome.alarms.clear("waterAlarm"); // Stop reminders if goal met
            createNotification("waterGoalReached", "Goal Reached!", "You've drunk 8 glasses of water today!", "icons/icon128.png");
        }
    }
     // Send message to popup if open
    chrome.runtime.sendMessage({ type: "WATER_UPDATE", waterCount: waterIntake.count })
        .catch(err => {});
}

// --- Message Listener (from popup.js or other content scripts) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_POMODORO_STATE") {
        sendResponse(pomodoroState);
    } else if (request.type === "START_POMODORO") {
        if (!pomodoroState.isRunning) {
            pomodoroState.isRunning = true;
            if(pomodoroState.timeLeft === 0) { // If timer was at 0, reset to current mode duration
                 pomodoroState.timeLeft = pomodoroState.isWorkMode ? WORK_DURATION : BREAK_DURATION;
            }
            // No need to start a new setInterval here; the 'pomodoroAlarm' handles ticking
            chrome.storage.local.set({ pomodoroState });
            updatePomodoroTimerDisplay();
        }
        sendResponse(pomodoroState);
    } else if (request.type === "PAUSE_POMODORO") {
        if (pomodoroState.isRunning) {
            pomodoroState.isRunning = false;
            chrome.storage.local.set({ pomodoroState });
            updatePomodoroTimerDisplay();
        }
        sendResponse(pomodoroState);
    } else if (request.type === "RESET_POMODORO") {
        pomodoroState.isRunning = false;
        pomodoroState.isWorkMode = true;
        pomodoroState.timeLeft = WORK_DURATION;
        pomodoroState.pomodorosCompleted = 0;
        chrome.storage.local.set({ pomodoroState });
        updatePomodoroTimerDisplay();
        sendResponse(pomodoroState);
    } else if (request.type === "LOG_WATER") {
        logWaterIntake();
        sendResponse({ count: waterIntake.count });
    } else if (request.type === "GET_WATER_COUNT") {
        checkAndResetWaterIntake(); // Ensure it's current
        sendResponse({ count: waterIntake.count });
    } else if (request.type === "GET_NEXT_ALARM_TIMES") {
        Promise.all([
            chrome.alarms.get("stretchAlarm"),
            chrome.alarms.get("exerciseAlarm")
        ]).then(([stretchAlarm, exerciseAlarm]) => {
            sendResponse({
                nextStretch: stretchAlarm ? new Date(stretchAlarm.scheduledTime).toLocaleTimeString() : "N/A",
                nextExercise: exerciseAlarm ? new Date(exerciseAlarm.scheduledTime).toLocaleTimeString() : "N/A"
            });
        });
        return true; // Indicates asynchronous response
    } else if (request.type === "GET_STRETCH_GIFS") {
        // Select 4 random, unique stretch GIFs
        let selectedGifs = [];
        let availableGifs = [...stretchGifs];
        for (let i = 0; i < 4 && availableGifs.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * availableGifs.length);
            selectedGifs.push(availableGifs.splice(randomIndex, 1)[0]);
        }
        sendResponse({ gifs: selectedGifs });
    } else if (request.type === "GET_EXERCISE") {
        const randomExercise = exerciseGifs[Math.floor(Math.random() * exerciseGifs.length)];
        sendResponse({ exercise: randomExercise });
    }
    return true; // Keep message channel open for async response if needed
});

console.log("Background script loaded and running.");
// Initial setup on load (especially for unpacked extension reload)
chrome.storage.local.get(["pomodoroState", "waterIntake"], (result) => {
    if (result.pomodoroState) pomodoroState = result.pomodoroState;
    if (result.waterIntake) waterIntake = result.waterIntake;
    checkAndResetWaterIntake();
    setupAlarms();
});