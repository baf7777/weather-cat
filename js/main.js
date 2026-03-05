// Инициализация элементов DOM
const els = {
    body: document.body,
    box: document.getElementById('the-box'),
    frost: document.querySelector('.frost-overlay'),
    boxStickers: document.getElementById('box-stickers'),
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

function isCatBreathColdEnough() {
    return weatherState.temp <= -8;
}

function triggerCatBreath() {
    if (!els.catBreath) return;
    if (!els.box || !els.box.classList.contains('box-open')) return;
    if (!isCatBreathColdEnough()) return;

    els.catBreath.classList.remove('show');
    setTimeout(() => {
        if (els.box && els.box.classList.contains('box-open') && isCatBreathColdEnough()) {
            els.catBreath.classList.add('show');
        }
    }, 20);
}

function scheduleNextCatBreath() {
    if (!els.box || !els.box.classList.contains('box-open') || !isCatBreathColdEnough()) {
        catBreathTimer = null;
        return;
    }

    const nextDelay = 3200 + Math.random() * 5200;
    catBreathTimer = setTimeout(() => {
        triggerCatBreath();
        scheduleNextCatBreath();
    }, nextDelay);
}

function startCatBreathLoop() {
    if (catBreathTimer) return;
    triggerCatBreath();
    scheduleNextCatBreath();
}

function stopCatBreathLoop() {
    if (catBreathTimer) {
        clearTimeout(catBreathTimer);
        catBreathTimer = null;
    }
    if (els.catBreath) {
        els.catBreath.classList.remove('show');
    }
}


function renderBoxStickers() {
    if (!els.boxStickers) return;

    els.boxStickers.innerHTML = "";
    const stickers = Array.isArray(CONFIG.boxStickers) ? CONFIG.boxStickers : [];

    stickers.forEach((sticker, index) => {
        if (!sticker || !sticker.src) return;

        const img = document.createElement("img");
        img.className = "box-sticker";
        img.src = sticker.src;
        img.alt = sticker.alt || `Sticker ${index + 1}`;
        img.draggable = false;

        if (sticker.width != null) {
            img.style.width = typeof sticker.width === "number" ? `${sticker.width}rem` : String(sticker.width);
        }
        if (sticker.x != null) {
            img.style.left = typeof sticker.x === "number" ? `${sticker.x}%` : String(sticker.x);
        }
        if (sticker.y != null) {
            img.style.top = typeof sticker.y === "number" ? `${sticker.y}%` : String(sticker.y);
        }
        if (sticker.z != null) {
            img.style.zIndex = String(sticker.z);
        }
        if (sticker.opacity != null) {
            img.style.opacity = String(sticker.opacity);
        }

        const rotate = Number.isFinite(sticker.rotate) ? sticker.rotate : -6;
        img.style.setProperty("--sticker-rot", `${rotate}deg`);

        if (sticker.animate !== false) {
            img.classList.add("sway");
        } else {
            img.style.transform = `rotate(${rotate}deg)`;
        }

        img.addEventListener("error", () => {
            img.remove();
            console.warn(`Sticker not found: ${sticker.src}`);
        });

        els.boxStickers.appendChild(img);
    });
}

function toggleBox() {
    if (!els.box) return;
    els.box.classList.toggle('box-open');

    if (els.box.classList.contains('box-open')) {
        if (typeof startRandomGaze === 'function') {
            startRandomGaze();
        }

        if (isCatBreathColdEnough()) startCatBreathLoop();
        else stopCatBreathLoop();

        if (typeof updateMouseBehavior === 'function') {
            setTimeout(updateMouseBehavior, 300);
        }
    } else {
        if (typeof stopRandomGaze === 'function') {
            stopRandomGaze();
        }

        stopCatBreathLoop();

        if (typeof requestMouseReturnHome === 'function') {
            requestMouseReturnHome(() => {
                if (typeof resetMouseAfterClose === 'function') {
                    setTimeout(resetMouseAfterClose, 150);
                }
            });
        } else if (typeof resetMouseAfterClose === 'function') {
            setTimeout(resetMouseAfterClose, 150);
        }
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
    renderBoxStickers();
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





