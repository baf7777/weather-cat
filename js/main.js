// Инициализация элементов DOM
const els = {
    body: document.body,
    box: document.getElementById('the-box'),
    frost: document.querySelector('.frost-overlay'),
    catSign: document.getElementById('cat-sign'),
    tempDisplay: document.getElementById('temp-display'),
    feelDisplay: document.getElementById('feel-display'),
    mouse: document.getElementById('mouse'),
    mouseMsg: document.getElementById('mouse-msg'),
    propeller: document.getElementById('propeller'),
    snowContainer: document.getElementById('snow-container'),
    rain: document.getElementById('rain-layer'),
    loader: document.getElementById('loader'),
    pupils: document.querySelectorAll('.pupil'),
    stars: document.getElementById('stars-container'),
    catBreath: document.getElementById('cat-breath')
};

// Глобальное состояние погоды
let weatherState = { temp: 0, feel: 0, wind: 0, code: 0, isDay: 1 };
let catBreathTimer = null;

function triggerCatBreath() {
    if (!els.catBreath) return;
    if (!els.box.classList.contains('box-open')) return;
    if (weatherState.temp >= 0) return;

    els.catBreath.classList.remove('show');
    setTimeout(() => {
        els.catBreath.classList.add('show');
    }, 10);
}

function startCatBreathLoop() {
    if (catBreathTimer) return;
    triggerCatBreath();
    catBreathTimer = setInterval(triggerCatBreath, 6000);
}

function stopCatBreathLoop() {
    if (catBreathTimer) {
        clearInterval(catBreathTimer);
        catBreathTimer = null;
    }
    if (els.catBreath) {
        els.catBreath.classList.remove('show');
    }
}

// Инициализация приложения
async function init() {
    createStars();
    if (typeof window.PlaneSystem !== 'undefined') {
        window.PlaneSystem.init();
    } else {
        console.error("PlaneSystem not found!");
    }
    if (typeof loadWeatherCSV === 'function') {
        await loadWeatherCSV();
    }
    await fetchWeather();
    els.box.addEventListener('click', toggleBox);
    trackMouse(); // Запуск слежения глаз
    startCatBreathLoop(); // Запуск дыхания кота
    if (typeof setMouseToSpawnState === 'function') {
        setMouseToSpawnState();
    }
}

// Запуск приложения
init();
setInterval(fetchWeather, CONFIG.updateInterval);

