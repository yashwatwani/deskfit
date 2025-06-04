document.addEventListener('DOMContentLoaded', () => {
    console.log("Exercise Display: DOMContentLoaded");
    const gifElement = document.getElementById('exercise-gif');
    const nameElement = document.getElementById('exercise-name');
    const instructionElement = document.getElementById('exercise-instruction');
    const finishButton = document.getElementById('finish-exercise-btn');

    if (!gifElement) console.error("Exercise Display: gifElement NOT FOUND!");
    if (!nameElement) console.error("Exercise Display: nameElement NOT FOUND!");


    console.log("Exercise Display: Requesting exercise from background script.");
    chrome.runtime.sendMessage({ type: "GET_EXERCISE" }, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Exercise Display: Error receiving exercise from background:", chrome.runtime.lastError.message);
            if(nameElement) nameElement.textContent = "Error loading exercise.";
            return;
        }
        console.log("Exercise Display: Received response from background:", response);

        if (response && response.exercise) {
            const exerciseFileName = response.exercise; // e.g., "High-knees.gif"
            console.log("Exercise Display: Exercise Filename from background:", exerciseFileName);

            // Attempt to create a more readable name for display
            let displayName = exerciseFileName.split('.')[0]; // Remove .gif -> "High-knees"
            displayName = displayName.replace(/-/g, ' ');    // Replace hyphens with spaces -> "High knees"
            displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1); // Capitalize -> "High knees"
            
            if(nameElement) nameElement.textContent = displayName;
            console.log("Exercise Display: Display Name set to:", displayName);

            // Check if it's supposed to be a GIF
            if (exerciseFileName.toLowerCase().endsWith('.gif')) {
                const gifPath = `gifs/exercise/${exerciseFileName}`;
                const fullGifUrl = chrome.runtime.getURL(gifPath);
                
                console.log(`Exercise Display: Attempting to load GIF. Name: ${exerciseFileName}, Path: ${gifPath}, Full URL: ${fullGifUrl}`);

                if (gifElement) {
                    gifElement.src = fullGifUrl;
                    gifElement.alt = displayName;
                    gifElement.style.display = 'block'; // Make sure it's visible
                    gifElement.onerror = function() {
                        console.error(`Exercise Display: ERROR LOADING IMAGE for ${fullGifUrl}. Check path, filename, and web_accessible_resources.`);
                        if(nameElement) nameElement.textContent = `Error loading GIF: ${exerciseFileName}`;
                        gifElement.style.display = 'none'; // Hide broken image placeholder
                    };
                } else {
                     console.error("Exercise Display: gifElement is null, cannot set src.");
                }
            } else {
                console.log("Exercise Display: File is not a GIF, not displaying image element.");
                if(gifElement) gifElement.style.display = 'none';
            }
        } else {
            console.warn("Exercise Display: No exercise data received from background.");
            if(nameElement) nameElement.textContent = "No exercise available.";
            if(gifElement) gifElement.style.display = 'none';
        }
    });

    finishButton?.addEventListener('click', () => {
        if(instructionElement) instructionElement.textContent = "Awesome! Exercise complete. You can close this tab.";
        if(finishButton) finishButton.style.display = 'none';
        if(gifElement) gifElement.style.display = 'none';
        if(nameElement) nameElement.style.display = 'none'; // Also hide the name
    });
});