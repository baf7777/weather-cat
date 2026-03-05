// --- СЕВЕРНОЕ СИЯНИЕ (Kp-индекс) ---
let auroraData = { kp: 0, level: 'Quiet' };

async function fetchAurora() {
    try {
        let data;
        if (CONFIG.testMode) {
            data = { kp: CONFIG.testData.kp || 0, level: 'Test' };
        } else {
            const res = await fetch('aurora.json');
            data = await res.json();
        }
        auroraData = data;
        renderAurora();
    } catch (e) {
        console.error("Aurora Error:", e);
    }
}

function renderAurora() {
    const { kp } = auroraData;
    const isNight = document.body.classList.contains('night');
    const isStorm = document.body.classList.contains('storm');
    
    const container = document.querySelector('.aurora-container');
    if (!container) return;

    // Обновляем текст на картонке
    if (els.auroraDisplay) {
        els.auroraDisplay.style.display = 'block';
        let icon = '✨';
        let color = '#99ff99'; // Светло-зеленый (норма)
        
        if (kp >= 5) {
            icon = '🔥';
            color = '#ff4d4d'; // Красный (шторм)
        } else if (kp >= 3) {
            icon = '🌌';
            color = '#ffff00'; // Желтый (активно)
        } else if (kp < 1) {
            icon = '💤';
            color = '#a0a0a0'; // Серый (штиль)
        }
        
        els.auroraDisplay.innerHTML = `${icon} Сияние: ${kp} Kp`;
        els.auroraDisplay.style.color = color;
    }

    // Условия для показа на небе: Ночь, Нет шторма, Kp > 1.5
    // Для Яр-Сале сияние часто видно при низком Kp, но сделаем порог 1.5 для красоты
    const shouldShow = isNight && !isStorm && kp >= 1.5;

    if (shouldShow) {
        document.body.classList.add('aurora-visible');
        
        // Динамически меняем яркость в зависимости от Kp
        // Kp 2 -> opacity 0.3, Kp 5 -> opacity 0.8, Kp 9 -> opacity 1.0
        let opacity = Math.min(1, (kp / 6)); 
        if (kp < 2) opacity = 0.3; // Минимальная видимость
        
        container.style.opacity = opacity;
        
        // Можно также менять скорость анимации (через CSS переменные, если добавить)
        // Но пока оставим базовую яркость
    } else {
        document.body.classList.remove('aurora-visible');
        container.style.opacity = 0;
    }
}

// Инициализация
function initAurora() {
    fetchAurora();
    // Обновляем реже чем погоду, т.к. Kp меняется не так быстро
    setInterval(fetchAurora, CONFIG.auroraUpdateInterval || 1800000);
}

// Слушаем изменения погоды (день/ночь/шторм), чтобы сразу обновить сияние
// Мы можем вызывать renderAurora из weather.js или просто по таймеру
