// js/smoke.js
function initChumSmoke() {
    const smokeContainer = document.getElementById('chum-smoke');
    if (!smokeContainer) return;

    function createParticle() {
        const p = document.createElement('div');
        p.className = 'smoke-particle';
        
        // Влияние ветра из глобального состояния
        const wind = (window.weatherState && window.weatherState.wind) ? window.weatherState.wind : 2;
        
        // Случайный дрейф по горизонтали (базовый + ветер)
        const driftBase = (Math.random() * 40 - 20); // Естественный разброс
        const windFactor = wind * 10; // Смещение по ветру
        const driftX = (driftBase + windFactor) + 'px';
        
        // Случайные параметры для живости
        const size = (Math.random() * 8 + 6) + 'px';
        const duration = (Math.random() * 2 + 3) + 's';
        const rotation = (Math.random() * 360) + 'deg';
        const delay = (Math.random() * 0.5) + 's';

        p.style.width = size;
        p.style.height = size;
        p.style.setProperty('--drift-x', driftX);
        p.style.setProperty('--duration', duration);
        p.style.setProperty('--rotation', rotation);
        p.style.animationDelay = delay;

        smokeContainer.appendChild(p);

        // Удаляем частицу после завершения анимации (duration + delay)
        const totalTime = (parseFloat(duration) + parseFloat(delay)) * 1000;
        setTimeout(() => {
            p.remove();
        }, totalTime);
    }

    // Генерируем частицы чаще для "густого" и мягкого дыма
    setInterval(createParticle, 400);
}

document.addEventListener('DOMContentLoaded', initChumSmoke);
