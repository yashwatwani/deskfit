// --- Configuration (Define durations in minutes for clarity) ---
const WORK_MINUTES = 25;
const BREAK_MINUTES = 5;
const STRETCH_INTERVAL_MINUTES = 5; // Your test value (e.g., 45)
const EXERCISE_INTERVAL_MINUTES = 1; // Your test value (e.g., 120)
const WATER_REMINDER_INTERVAL_MINUTES = 5; // Your test value (e.g., 60)
const MAX_WATER_GLASSES = 8;

// --- Derived constants in seconds for internal timer logic ---
const WORK_DURATION_SECONDS = WORK_MINUTES * 60;
const BREAK_DURATION_SECONDS = BREAK_MINUTES * 60;

// --- State ---
let pomodoroState = {
    timeLeft: WORK_DURATION_SECONDS,
    isRunning: false,
    isWorkMode: true,
    pomodorosCompleted: 0,
    lastPomodoroResetDate: new Date().toDateString() // For daily reset of count
};

let waterIntake = {
    count: 0,
    lastResetDate: new Date().toDateString()
};

const stretchGifs = ["stretch1.gif", "stretch2.gif", "stretch3.gif", "stretch4.gif", "stretch5.gif", "stretch6.gif", "stretch7.gif", "stretch8.gif"];
const exerciseGifs = ["pushups.gif", "squats.gif", "High-knees.gif", "jumping-jack.gif", "lunges.gif", "mountain-climber.gif"];

// --- Initialization ---
chrome.runtime.onInstalled.addListener(() => {
    console.log("DeskFit Background: Extension installed/updated.");
    chrome.storage.local.get(["pomodoroState", "waterIntake"], (result) => {
        const todayString = new Date().toDateString();
        const defaultPomodoroState = { 
            timeLeft: WORK_DURATION_SECONDS, 
            isRunning: false, 
            isWorkMode: true, 
            pomodorosCompleted: 0,
            lastPomodoroResetDate: todayString
        };
        pomodoroState = result.pomodoroState || defaultPomodoroState;
        
        if (!pomodoroState.lastPomodoroResetDate) {
            pomodoroState.lastPomodoroResetDate = todayString;
        }
        // Ensure pomodorosCompleted is reset if loaded from storage on a new day
        if (pomodoroState.lastPomodoroResetDate !== todayString) { 
            pomodoroState.pomodorosCompleted = 0;
            pomodoroState.lastPomodoroResetDate = todayString;
        }

        // Handle potentially old timeLeft values (stored in minutes)
        if (typeof pomodoroState.timeLeft !== 'number' || isNaN(pomodoroState.timeLeft) || 
            pomodoroState.timeLeft < 0 || 
            pomodoroState.timeLeft === WORK_MINUTES || // Check if it's the old minute value
            pomodoroState.timeLeft === BREAK_MINUTES) { // Check if it's the old minute value
            pomodoroState.timeLeft = pomodoroState.isWorkMode ? WORK_DURATION_SECONDS : BREAK_DURATION_SECONDS;
        }
        
        if (pomodoroState.isRunning) { // If extension reloaded while timer was running, set to paused
            pomodoroState.isRunning = false;
        }


        waterIntake = result.waterIntake || { count: 0, lastResetDate: todayString };
        if(waterIntake.lastResetDate !== todayString) {
            waterIntake.count = 0;
            waterIntake.lastResetDate = todayString;
        }
        
        chrome.storage.local.set({ pomodoroState, waterIntake }, () => {
            setupAlarms(); 
        });
    });
});

chrome.runtime.onStartup.addListener(() => {
    console.log("DeskFit Background: Browser started. Checking state.");
    chrome.storage.local.get(["pomodoroState", "waterIntake"], (result) => {
        const todayString = new Date().toDateString();
        if (result.pomodoroState) {
            pomodoroState = result.pomodoroState;
            if (!pomodoroState.lastPomodoroResetDate) {
                pomodoroState.lastPomodoroResetDate = todayString;
            }
            if (typeof pomodoroState.timeLeft !== 'number' || isNaN(pomodoroState.timeLeft) || 
                pomodoroState.timeLeft < 0 || pomodoroState.timeLeft === WORK_MINUTES || pomodoroState.timeLeft === BREAK_MINUTES) {
                pomodoroState.timeLeft = pomodoroState.isWorkMode ? WORK_DURATION_SECONDS : BREAK_DURATION_SECONDS;
            }
        } else {
            pomodoroState = { timeLeft: WORK_DURATION_SECONDS, isRunning: false, isWorkMode: true, pomodorosCompleted: 0, lastPomodoroResetDate: todayString };
        }

        if (pomodoroState.isRunning) { 
            pomodoroState.isRunning = false;
        }
        
        if (result.waterIntake) waterIntake = result.waterIntake;
        else waterIntake = { count: 0, lastResetDate: todayString };

        checkAndResetDailyData(); 
        updatePomodoroTimerDisplay();
        setupAlarms();
    });
});

function checkAndResetDailyData() {
    const today = new Date().toDateString();
    let needsPomodoroUpdate = false;
    let needsWaterUpdate = false;

    if (waterIntake.lastResetDate !== today) {
        // console.log("DeskFit Background: New day for water. Resetting count.");
        waterIntake.count = 0;
        waterIntake.lastResetDate = today;
        needsWaterUpdate = true;
        chrome.alarms.get("waterAlarm", (alarm) => { 
            if (!alarm && waterIntake.count < MAX_WATER_GLASSES) {
                chrome.alarms.create("waterAlarm", { delayInMinutes: WATER_REMINDER_INTERVAL_MINUTES, periodInMinutes: WATER_REMINDER_INTERVAL_MINUTES });
            }
        });
    }

    if (pomodoroState.lastPomodoroResetDate !== today) {
        // console.log("DeskFit Background: New day for Pomodoros. Resetting completed count.");
        pomodoroState.pomodorosCompleted = 0;
        pomodoroState.lastPomodoroResetDate = today;
        needsPomodoroUpdate = true;
    }

    if (needsPomodoroUpdate || needsWaterUpdate) {
        chrome.storage.local.set({ pomodoroState, waterIntake }); 
        if (needsPomodoroUpdate) {
            updatePomodoroTimerDisplay(); 
        }
    }
}

function setupAlarms() {
    console.log("DeskFit Background: Setting up alarms...");
    chrome.alarms.clearAll(() => {
        console.log("DeskFit Background: All existing alarms cleared.");
        checkAndResetDailyData(); 
        chrome.alarms.create("stretchAlarm", { delayInMinutes: STRETCH_INTERVAL_MINUTES, periodInMinutes: STRETCH_INTERVAL_MINUTES });
        chrome.alarms.create("exerciseAlarm", { delayInMinutes: EXERCISE_INTERVAL_MINUTES, periodInMinutes: EXERCISE_INTERVAL_MINUTES });
        if (waterIntake.count < MAX_WATER_GLASSES) {
            chrome.alarms.create("waterAlarm", { delayInMinutes: WATER_REMINDER_INTERVAL_MINUTES, periodInMinutes: WATER_REMINDER_INTERVAL_MINUTES });
        }
        chrome.alarms.create("pomodoroAlarm", { periodInMinutes: 1 }); 
        console.log("DeskFit Background: Alarms setup complete.");
        // chrome.alarms.getAll(alarms => console.log("DeskFit Background: Current alarms:", alarms));
    });
}

chrome.alarms.onAlarm.addListener((alarm) => {
    // console.log(`DeskFit Background: ALARM FIRED! Name: ${alarm.name}`);
    checkAndResetDailyData(); 
    
    if (alarm.name === "pomodoroAlarm") {
        if (pomodoroState.isRunning) { 
            if (pomodoroState.timeLeft > 0) {
                pomodoroState.timeLeft -= 60; 
                if (pomodoroState.timeLeft < 0) pomodoroState.timeLeft = 0; 
                // console.log("BG Pomodoro Tick (1 min): isRunning=true, timeLeft =", pomodoroState.timeLeft);
            }
            // Check if timeLeft hit 0 *after* decrementing
            if (pomodoroState.timeLeft <= 0) { 
                handlePomodoroCycleEnd();
            }
            chrome.storage.local.set({ pomodoroState }); 
            updatePomodoroTimerDisplay(); 
        }
    } else if (alarm.name === "stretchAlarm") triggerStretchNotification();
    else if (alarm.name === "exerciseAlarm") triggerExerciseNotification();
    else if (alarm.name === "waterAlarm") {
        if (waterIntake.count < MAX_WATER_GLASSES) triggerWaterNotification();
        else chrome.alarms.clear("waterAlarm", c => {});
    }
});

function handlePomodoroCycleEnd() {
    console.log("BG: handlePomodoroCycleEnd. Mode was:", pomodoroState.isWorkMode ? "Work" : "Break");
    pomodoroState.isRunning = false;
    const iconPath = "icons/icon128.png";
    const timestamp = Date.now();

    if (pomodoroState.isWorkMode) { 
        pomodoroState.pomodorosCompleted++; 
        pomodoroState.isWorkMode = false; 
        pomodoroState.timeLeft = BREAK_DURATION_SECONDS; 
        createNotification("pomodoroEndWork_" + timestamp, "Pomodoro: Work Complete!", `Pomodoros today: ${pomodoroState.pomodorosCompleted}. Time for a break!`, iconPath);
        console.log("DeskFit Background: Work session ended. Triggering a stretch session.");
        triggerStretchNotification();
    } else { 
        pomodoroState.isWorkMode = true; 
        pomodoroState.timeLeft = WORK_DURATION_SECONDS; 
        createNotification("pomodoroEndBreak_" + timestamp, "Pomodoro: Break Over!", "Time to get back to work!", iconPath);
    }
    // console.log("BG: After cycle end, new state:", JSON.stringify(pomodoroState));
    chrome.storage.local.set({ pomodoroState });
    updatePomodoroTimerDisplay();
}

function updatePomodoroTimerDisplay() {
    chrome.runtime.sendMessage({ type: "POMODORO_UPDATE", state: pomodoroState }).catch(() => {});
}

function triggerStretchNotification() {
    const uniqueId = "stretchTimeNotification_" + Date.now();
    createNotification( uniqueId, "Stretch Time!", "Click to start your stretches.", "icons/icon128.png", [{ title: "Start Stretching" }]);
}

function triggerExerciseNotification() {
    const uniqueId = "exerciseTimeNotification_" + Date.now();
    createNotification( uniqueId, "Exercise Break!", "Time for a quick exercise.", "icons/icon128.png", [{ title: "Start Exercise" }]);
}

function triggerWaterNotification() {
    const uniqueId = "waterReminderNotification_" + Date.now();
    createNotification( uniqueId, "Stay Hydrated!", `Drank: ${waterIntake.count}/${MAX_WATER_GLASSES}. Log more?`, "icons/icon128.png", [{ title: "Log Water" }]);
}

function createNotification(id, title, message, iconRelativePath, buttons) {
    const iconFullPath = chrome.runtime.getURL(iconRelativePath);
    const notificationOptions = { type: "basic", iconUrl: iconFullPath, title, message, priority: 2, requireInteraction: true };
    if (buttons) notificationOptions.buttons = buttons;
    chrome.notifications.create(id, notificationOptions, (notificationId) => {
        if (chrome.runtime.lastError) console.error(`DeskFit Background: ERROR creating notification '${id}':`, chrome.runtime.lastError.message);
    });
}

chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId.startsWith("stretchTimeNotification")) openStretchPage();
    else if (notificationId.startsWith("exerciseTimeNotification")) openExercisePage();
    else if (notificationId.startsWith("waterReminderNotification") || notificationId.startsWith("pomodoroEndWork") || notificationId.startsWith("pomodoroEndBreak")) {
        chrome.action.openPopup().catch(e => {});
    }
    chrome.notifications.clear(notificationId);
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (notificationId.startsWith("stretchTimeNotification") && buttonIndex === 0) openStretchPage();
    else if (notificationId.startsWith("exerciseTimeNotification") && buttonIndex === 0) openExercisePage();
    else if (notificationId.startsWith("waterReminderNotification") && buttonIndex === 0) logWaterIntake();
    chrome.notifications.clear(notificationId);
});

function openStretchPage() { chrome.tabs.create({ url: chrome.runtime.getURL("stretch_display.html") }); }
function openExercisePage() { chrome.tabs.create({ url: chrome.runtime.getURL("exercise_display.html") }); }

function logWaterIntake() {
    if (waterIntake.count < MAX_WATER_GLASSES) {
        waterIntake.count++;
        if (waterIntake.count >= MAX_WATER_GLASSES) {
            const uniqueId = "waterGoalReached_" + Date.now();
            createNotification(uniqueId, "Hydration Goal!", `Awesome! ${MAX_WATER_GLASSES} glasses!`, "icons/icon128.png");
            chrome.alarms.clear("waterAlarm");
        }
    }
    chrome.storage.local.set({ waterIntake });
    chrome.runtime.sendMessage({ type: "WATER_UPDATE", waterCount: waterIntake.count }).catch(() => {});
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // console.log("BG RX:", request.type, "Data:", JSON.stringify(request.state || request)); 
    let stateBeforeAction = JSON.parse(JSON.stringify(pomodoroState)); 

    switch (request.type) {
        case "GET_POMODORO_STATE": 
            checkAndResetDailyData(); 
            sendResponse(pomodoroState); 
            break;

        // In background.js --> onMessage listener

        case "START_POMODORO": 
            console.log("%cBG: START_POMODORO received.", "color: blue; font-weight: bold;");
            console.log("BG START_POMODORO - State BEFORE any changes:", JSON.stringify(pomodoroState));

            if (!pomodoroState.isRunning) { // Only if not already running
                pomodoroState.isRunning = true; // Tentatively set to running

                // Now, determine if timeLeft needs adjustment or if it's a pure resume
                if (pomodoroState.timeLeft <= 0) {
                    // Scenario: Timer was at 0 (a cycle just ended, or was reset and then 0 somehow)
                    console.log("BG START_POMODORO - Scenario: timeLeft was <= 0. Starting NEW WORK session.");
                    pomodoroState.isWorkMode = true; 
                    pomodoroState.timeLeft = WORK_DURATION_SECONDS;
                } else if (pomodoroState.isWorkMode && pomodoroState.timeLeft === WORK_DURATION_SECONDS) {
                    // Scenario: Starting a fresh work session (e.g., after reset, or first ever start)
                    console.log("BG START_POMODORO - Scenario: Starting/Resuming a fresh WORK session (timeLeft is full).");
                    // No change needed to timeLeft or isWorkMode if they are already set for a full work session
                } else if (!pomodoroState.isWorkMode && pomodoroState.timeLeft === BREAK_DURATION_SECONDS) {
                    // Scenario: Starting a fresh break session (e.g., user clicked "Start Break" when it was idle)
                    console.log("BG START_POMODORO - Scenario: Starting/Resuming a fresh BREAK session (timeLeft is full).");
                    // No change needed to timeLeft or isWorkMode if they are already set for a full break session
                }
                // If none of the above, it means we are RESUMING a session that was PAUSED MID-WAY.
                // In this RESUME case, timeLeft and isWorkMode should already be correct from the paused state.
                // The only action needed was setting isRunning = true.
                else {
                     console.log("BG START_POMODORO - Scenario: RESUMING a partially completed session. timeLeft and isWorkMode remain as they were.");
                }
                
            } else { // Already running
                 console.log("BG START_POMODORO: Received, but timer is ALREADY RUNNING. No change to state variables other than isRunning if it was somehow false.");
                 pomodoroState.isRunning = true; // Ensure it's true if this path is hit unexpectedly
            }
            
            console.log("BG START_POMODORO - State AFTER all logic:", JSON.stringify(pomodoroState));
            chrome.storage.local.set({ pomodoroState });
            updatePomodoroTimerDisplay(); 
            sendResponse(pomodoroState); 
            break;

        case "PAUSE_POMODORO": // This one should be simpler
            console.log("%cBG: PAUSE_POMODORO received.", "color: orange; font-weight: bold;");
            console.log("BG PAUSE_POMODORO - State BEFORE action:", JSON.stringify(pomodoroState));
            if (pomodoroState.isRunning) {
                pomodoroState.isRunning = false; 
                console.log("BG PAUSE_POMODORO - Pomodoro paused. State AFTER action:", JSON.stringify(pomodoroState));
            } else {
                 console.log("BG PAUSE_POMODORO - Received, but timer was already paused. No change.");
            }
            chrome.storage.local.set({ pomodoroState });
            updatePomodoroTimerDisplay(); 
            sendResponse(pomodoroState); 
            break;

        case "RESET_POMODORO":
            console.log("BG: RESET_POMODORO. State BEFORE:", JSON.stringify(stateBeforeAction));
            pomodoroState.isRunning = false;
            pomodoroState.isWorkMode = true;
            pomodoroState.timeLeft = WORK_DURATION_SECONDS; 
            // pomodorosCompleted is reset daily by checkAndResetDailyData
            console.log("BG: Pomodoro reset. State AFTER:", JSON.stringify(pomodoroState));
            chrome.storage.local.set({ pomodoroState });
            updatePomodoroTimerDisplay(); 
            sendResponse(pomodoroState); 
            break;
        
        case "LOG_WATER": logWaterIntake(); sendResponse({ count: waterIntake.count }); break;
        case "GET_WATER_COUNT": checkAndResetDailyData(); sendResponse({ count: waterIntake.count }); break;
        case "GET_NEXT_ALARM_TIMES":
            Promise.all([chrome.alarms.get("stretchAlarm"), chrome.alarms.get("exerciseAlarm")])
                .then(([s, e]) => sendResponse({
                    nextStretch: s ? new Date(s.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Pending...",
                    nextExercise: e ? new Date(e.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Pending..."
                })).catch(err => sendResponse({ nextStretch: "Err", nextExercise: "Err" }));
            return true; 
        case "GET_STRETCH_GIFS":
            let selectedGifs = []; let availableGifs = [...stretchGifs];
            for (let i = 0; i < 4 && availableGifs.length > 0; i++) {
                selectedGifs.push(availableGifs.splice(Math.floor(Math.random() * availableGifs.length), 1)[0]);
            } sendResponse({ gifs: selectedGifs }); break;
        case "GET_EXERCISE": sendResponse({ exercise: exerciseGifs[Math.floor(Math.random() * exerciseGifs.length)] }); break;
        default: console.warn("DeskFit BG: Unknown message type:", request.type);
    }
    return true; 
});

console.log("DeskFit Background: Script fully loaded and running.");