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
    catBreath: document.getElementById('cat-breath'),
    auroraDisplay: document.getElementById('aurora-display'),
    sun: document.getElementById('sun-body'),
    moon: document.getElementById('moon-body')
};

// Глобальное состояние погоды
let weatherState = { temp: 0, feel: 0, wind: 0, code: 0, isDay: 1 };
let catBreathTimer = null;

function triggerCatBreath() {
    if (!els.catBreath) return;
    if (!els.box || !els.box.classList.contains('box-open')) return;
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

function toggleBox() {
    if (!els.box) return;
    els.box.classList.toggle('box-open');
    if (els.box.classList.contains('box-open')) {
        if (weatherState.temp < 0) startCatBreathLoop();
    } else {
        stopCatBreathLoop();
    }
}

// Инициализация приложения
async function init() {
    // 1. Привязываем клики СРАЗУ, чтобы они работали даже если API тормозит
    if (els.box) {
        els.box.addEventListener('click', toggleBox);
    }

    // Клик по чуму - олень убегает
    const chum = document.querySelector('.chum-bg img');
    if (chum) {
        chum.style.cursor = 'pointer';
        chum.style.pointerEvents = 'auto';
        chum.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.DeerSystem) window.DeerSystem.triggerEscape();
        });
    }

    if (typeof initCelestialClicks === 'function') {
        initCelestialClicks();
    }

    // Initialize Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.expand();
        tg.ready();
    }

    // 2. Инициализируем визуальные системы
    createStars();
    if (typeof window.PlaneSystem !== 'undefined') {
        window.PlaneSystem.init();
    }
    
    if (window.HeliSystem) {
        window.HeliSystem.init();
    }

    if (typeof initAurora === 'function') {
        initAurora();
    }

    trackMouse(); 
    
    if (typeof setMouseToSpawnState === 'function') {
        setMouseToSpawnState();
    }

    // 3. Загружаем данные (может занять время)
    try {
        if (typeof loadWeatherCSV === 'function') {
            await loadWeatherCSV();
        }
        await fetchWeather();
        startCatBreathLoop(); // Запуск дыхания кота (проверится внутри)
    } catch (e) {
        console.error("Initialization error:", e);
    }
}

// Запуск приложения
init();
setInterval(fetchWeather, CONFIG.updateInterval);
