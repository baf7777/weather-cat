// js/sound.js
const bgMusic = new Audio('sound/bg.mp3');
bgMusic.loop = true;
const windSound = new Audio('sound/wind.mp3');
windSound.loop = true;
const heliSound = new Audio('sound/helicopter.mp3');
heliSound.loop = true;
const barkSound = new Audio('sound/bark.mp3');

let isSoundEnabled = false;

function initSound() {
    const soundToggle = document.getElementById('sound-toggle');
    if (!soundToggle) return;

    soundToggle.addEventListener('click', () => {
        isSoundEnabled = !isSoundEnabled;
        if (isSoundEnabled) {
            bgMusic.play().catch(e => console.warn("Auto-play prevented:", e));
            windSound.play().catch(e => console.warn("Auto-play prevented:", e));
            // Heli sound will only play when it has volume
            heliSound.volume = 0;
            heliSound.play().catch(e => console.warn("Auto-play prevented:", e));
            
            soundToggle.innerText = '🔇 Выкл. звук';
            soundToggle.classList.add('active');
        } else {
            bgMusic.pause();
            windSound.pause();
            heliSound.pause();
            barkSound.pause();
            soundToggle.innerText = '🔊 Вкл. звук';
            soundToggle.classList.remove('active');
        }
    });
}

function updateWindSound(windSpeed) {
    if (!isSoundEnabled) return;

    if (windSpeed > 10) {
        windSound.volume = 1.0;
        if (windSound.paused) windSound.play();
    } else if (windSpeed > 5) {
        windSound.volume = 0.5;
        if (windSound.paused) windSound.play();
    } else {
        windSound.pause();
    }
}

function updateHeliSound(rpm) {
    if (!isSoundEnabled) return;
    
    if (rpm > 0.01) {
        // Volume maps from 0.1 to 1.0 based on rpm (which goes 0 to 1)
        heliSound.volume = Math.max(0.1, Math.min(1.0, rpm));
        if (heliSound.paused) heliSound.play().catch(e => {});
    } else {
        heliSound.volume = 0;
        heliSound.pause();
    }
}

function playBark() {
    if (!isSoundEnabled) return;
    barkSound.currentTime = 0;
    barkSound.play().catch(e => console.warn("Sound play failed:", e));
}

document.addEventListener('DOMContentLoaded', initSound);

// Export for other modules if needed
window.updateWindSound = updateWindSound;
window.updateHeliSound = updateHeliSound;
window.playBark = playBark;
