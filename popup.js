document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        timerDisplay: document.getElementById('pomodoro-timer-display'),
        startBtn: document.getElementById('start-pomodoro'),
        pauseBtn: document.getElementById('pause-pomodoro'),
        resetBtn: document.getElementById('reset-pomodoro'),
        statusDisplay: document.getElementById('pomodoro-status'),
        pomodorosCompletedDisplay: document.getElementById('pomodoros-completed-count'),
        waterCount: document.getElementById('water-count'),
        logWaterBtn: document.getElementById('log-water'),
        nextStretch: document.getElementById('next-stretch-time'),
        nextExercise: document.getElementById('next-exercise-time')
    };

    // Define these in seconds to match background logic for comparisons
    const WORK_DURATION_SECONDS_POPUP = 25 * 60; 
    const BREAK_DURATION_SECONDS_POPUP = 5 * 60;

    let popupTimerInterval = null; 
    let currentDisplayedTime = WORK_DURATION_SECONDS_POPUP; // Initialize to work duration

    function formatTime(seconds) {
        if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) seconds = 0;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function stopPopupTimer() {
        if (popupTimerInterval) {
            clearInterval(popupTimerInterval);
            popupTimerInterval = null;
            // console.log("Popup: Internal timer STOPPED.");
        }
    }

    function startPopupTimer() {
        stopPopupTimer(); 
        // console.log("Popup: startPopupTimer() called. currentDisplayedTime BEFORE check:", currentDisplayedTime);

        if (currentDisplayedTime <= 0) {
            // console.log("Popup: startPopupTimer() - currentDisplayedTime is <= 0, NOT starting interval.");
            if(elements.timerDisplay) elements.timerDisplay.textContent = formatTime(currentDisplayedTime);
            return; 
        }
        // console.log("Popup: startPopupTimer() - Starting internal timer with currentDisplayedTime:", currentDisplayedTime);
        if(elements.timerDisplay) elements.timerDisplay.textContent = formatTime(currentDisplayedTime);

        popupTimerInterval = setInterval(() => {
            if (currentDisplayedTime > 0) {
                currentDisplayedTime--;
                if(elements.timerDisplay) elements.timerDisplay.textContent = formatTime(currentDisplayedTime);
            } else {
                // console.log("Popup Timer Tick: currentDisplayedTime hit 0. Stopping popup timer.");
                stopPopupTimer();
                // Fetch authoritative state from background to resync
                chrome.runtime.sendMessage({ type: "GET_POMODORO_STATE" }, response => {
                    if (chrome.runtime.lastError) { return; }
                    if (response) updatePomodoroUI(response);
                });
            }
        }, 1000); 
    }

    function updatePomodoroUI(state) {
        // console.log("Popup: updatePomodoroUI called with state:", JSON.stringify(state)); 
        if (!state || !elements.timerDisplay || !elements.statusDisplay || !elements.startBtn || !elements.pauseBtn || !elements.pomodorosCompletedDisplay) {
            console.error("DeskFit Popup: Pomodoro state or critical UI elements missing for update.");
            return;
        }

        currentDisplayedTime = state.timeLeft; 
        elements.timerDisplay.textContent = formatTime(state.timeLeft); 
        elements.statusDisplay.textContent = state.isWorkMode ? 'Work' : 'Break';
        elements.pomodorosCompletedDisplay.textContent = state.pomodorosCompleted === undefined ? 0 : state.pomodorosCompleted;
        
        elements.startBtn.disabled = state.isRunning;
        elements.pauseBtn.disabled = !state.isRunning;

        if (state.isRunning) {
            elements.startBtn.textContent = state.isWorkMode ? 'Work in Progress' : 'Break in Progress'; 
            startPopupTimer(); 
        } else { 
            stopPopupTimer(); 
            if (state.timeLeft === 0) { 
                elements.startBtn.textContent = state.isWorkMode ? 'Start Work' : 'Start Break';
            } else if (state.isWorkMode && state.timeLeft === WORK_DURATION_SECONDS_POPUP) { 
                 elements.startBtn.textContent = 'Start Work';
            } else if (!state.isWorkMode && state.timeLeft === BREAK_DURATION_SECONDS_POPUP) { 
                elements.startBtn.textContent = 'Start Break';
            } else { 
                elements.startBtn.textContent = 'Resume';
            }
        }
    }

    function updateWaterUI(count) {
        if (!elements.waterCount || !elements.logWaterBtn) return;
        elements.waterCount.textContent = count;
        elements.logWaterBtn.disabled = count >= 8;
        elements.logWaterBtn.textContent = count >= 8 ? "Goal Reached!" : "Log Water";
    }

    function fetchInitialData() {
        // console.log("Popup: fetchInitialData called");
        chrome.runtime.sendMessage({ type: "GET_POMODORO_STATE" }, response => {
            if (chrome.runtime.lastError) { console.error("Popup GET_POMODORO_STATE Error:", chrome.runtime.lastError.message); return; }
            // console.log("Popup: GET_POMODORO_STATE response:", response);
            if (response) updatePomodoroUI(response);
        });
        chrome.runtime.sendMessage({ type: "GET_WATER_COUNT" }, response => {
            if (chrome.runtime.lastError) { console.error("Popup GET_WATER_COUNT Error:", chrome.runtime.lastError.message); return; }
            // console.log("Popup: GET_WATER_COUNT response:", response);
            if (response && typeof response.count !== 'undefined') updateWaterUI(response.count);
        });
        fetchNextAlarmTimes();
    }

    function fetchNextAlarmTimes() {
        if (!elements.nextStretch || !elements.nextExercise) return;
        chrome.runtime.sendMessage({ type: "GET_NEXT_ALARM_TIMES" }, response => {
            if (chrome.runtime.lastError) {
                elements.nextStretch.textContent = 'Error'; elements.nextExercise.textContent = 'Error'; return;
            }
            if (response) {
                elements.nextStretch.textContent = response.nextStretch || 'Pending...';
                elements.nextExercise.textContent = response.nextExercise || 'Pending...';
            }
        });
    }

    elements.startBtn?.addEventListener('click', () => {
        // console.log("Popup: Start button clicked");
        chrome.runtime.sendMessage({ type: "START_POMODORO" }, r => { 
            if (chrome.runtime.lastError) { console.error("Popup Start Error:", chrome.runtime.lastError.message); return;} 
            if (r) updatePomodoroUI(r); 
        });
    });
    elements.pauseBtn?.addEventListener('click', () => {
        // console.log("Popup: Pause button clicked");
        stopPopupTimer(); 
        chrome.runtime.sendMessage({ type: "PAUSE_POMODORO" }, r => { 
            if (chrome.runtime.lastError) { console.error("Popup Pause Error:", chrome.runtime.lastError.message); return;} 
            if (r) updatePomodoroUI(r); 
        });
    });
    elements.resetBtn?.addEventListener('click', () => {
        // console.log("Popup: Reset button clicked");
        stopPopupTimer();
        chrome.runtime.sendMessage({ type: "RESET_POMODORO" }, r => { 
            if (chrome.runtime.lastError) { console.error("Popup Reset Error:", chrome.runtime.lastError.message); return;} 
            if (r) updatePomodoroUI(r); 
        });
    });
    elements.logWaterBtn?.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: "LOG_WATER" }, r => { if (chrome.runtime.lastError) { console.error("Popup Log Water Error:", chrome.runtime.lastError.message); return;} if (r && typeof r.count !== 'undefined') updateWaterUI(r.count); });
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // console.log("Popup RX:", request.type, "Data:", JSON.stringify(request.state || request.waterCount));
        if (request.type === "POMODORO_UPDATE") {
            // console.log("Popup: Received POMODORO_UPDATE from background. State:", JSON.stringify(request.state)); 
            updatePomodoroUI(request.state); 
        } else if (request.type === "WATER_UPDATE" && typeof request.waterCount !== 'undefined') {
            updateWaterUI(request.waterCount);
            fetchNextAlarmTimes(); 
        }
    });

    window.addEventListener('unload', () => {
        // console.log("Popup: Unloading, calling stopPopupTimer().");
        stopPopupTimer();
    });

    fetchInitialData();
    setInterval(fetchNextAlarmTimes, 30 * 1000); 
});