document.addEventListener('DOMContentLoaded', () => {
    const gifElement = document.getElementById('stretch-gif');
    const timerElement = document.getElementById('stretch-timer');
    const infoElement = document.getElementById('stretch-info');
    const nextButton = document.getElementById('next-stretch-btn');
    const finishButton = document.getElementById('finish-stretching-btn');

    let stretchGifs = [];
    let currentStretchIndex = 0;
    let timerInterval;
    const STRETCH_DURATION = 15;

    function loadStretch() {
        if (currentStretchIndex < stretchGifs.length) {
            const gifPath = `gifs/stretching/${stretchGifs[currentStretchIndex]}`;
            gifElement.src = chrome.runtime.getURL(gifPath); // Crucial for accessing extension resources
            gifElement.alt = stretchGifs[currentStretchIndex];
            infoElement.textContent = `Stretch ${currentStretchIndex + 1} of ${stretchGifs.length}`;
            startStretchTimer();
            nextButton.style.display = 'none';
            finishButton.style.display = 'none';
        } else {
            allStretchesDone();
        }
    }

    function startStretchTimer() {
        let timeLeft = STRETCH_DURATION;
        timerElement.textContent = `Time Left: ${timeLeft}s`;
        clearInterval(timerInterval);

        timerInterval = setInterval(() => {
            timeLeft--;
            timerElement.textContent = `Time Left: ${timeLeft}s`;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerElement.textContent = "Time's up!";
                if (currentStretchIndex < stretchGifs.length - 1) {
                    nextButton.style.display = 'inline-block';
                } else {
                    finishButton.style.display = 'inline-block';
                }
            }
        }, 1000);
    }

    function allStretchesDone() {
        gifElement.style.display = 'none';
        timerElement.textContent = "Great job! Stretching complete.";
        infoElement.textContent = "You can close this tab now.";
        nextButton.style.display = 'none';
        finishButton.style.display = 'none';
        // setTimeout(() => { window.close(); }, 5000); // Optional auto-close
    }

    nextButton.addEventListener('click', () => {
        currentStretchIndex++;
        loadStretch();
    });

    finishButton.addEventListener('click', () => {
        allStretchesDone();
    });

    chrome.runtime.sendMessage({ type: "GET_STRETCH_GIFS" }, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Stretch Display Error:", chrome.runtime.lastError.message);
            infoElement.textContent = "Error loading stretches."; return;
        }
        if (response && response.gifs && response.gifs.length > 0) {
            stretchGifs = response.gifs;
            loadStretch();
        } else {
            infoElement.textContent = "No stretches available. Add GIFs to 'gifs/stretching/'.";
        }
    });
});