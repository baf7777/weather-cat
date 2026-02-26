// js/sound.js
const bgMusic = new Audio('sound/bg.mp3');
bgMusic.loop = true;
const windSound = new Audio('sound/wind.mp3');
windSound.loop = true;

let isSoundEnabled = false;

function initSound() {
    const soundToggle = document.getElementById('sound-toggle');
    if (!soundToggle) return;

    soundToggle.addEventListener('click', () => {
        isSoundEnabled = !isSoundEnabled;
        if (isSoundEnabled) {
            bgMusic.play().catch(e => console.warn("Auto-play prevented:", e));
            windSound.play().catch(e => console.warn("Auto-play prevented:", e));
            soundToggle.innerText = '🔇 Выкл. звук';
            soundToggle.classList.add('active');
        } else {
            bgMusic.pause();
            windSound.pause();
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

document.addEventListener('DOMContentLoaded', initSound);

// Export for other modules if needed
window.updateWindSound = updateWindSound;
