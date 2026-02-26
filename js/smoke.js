// js/smoke.js
function initChumSmoke() {
    const smokeContainer = document.getElementById('chum-smoke');
    if (!smokeContainer) return;

    function createParticle() {
        const p = document.createElement('div');
        p.className = 'smoke-particle';
        
        // Рандомное смещение дыма по ветру
        const windDrift = (window.weatherState && window.weatherState.wind) ? window.weatherState.wind * 5 : 20;
        const driftX = (Math.random() * 20 + windDrift) + 'px';
        p.style.setProperty('--drift-x', driftX);
        
        // Случайный размер
        const size = Math.random() * 6 + 4 + 'px';
        p.style.width = size;
        p.style.height = size;

        smokeContainer.appendChild(p);

        // Удаляем частицу после анимации
        setTimeout(() => {
            p.remove();
        }, 4000);
    }

    // Создаем частицы дыма через интервал
    setInterval(createParticle, 800);
}

document.addEventListener('DOMContentLoaded', initChumSmoke);
