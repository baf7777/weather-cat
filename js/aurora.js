// --- СЕВЕРНОЕ СИЯНИЕ (Kp + локальная вероятность для Яр-Сале) ---
let auroraData = { kp: 0, level: 'Quiet', local: { probability: null } };

async function fetchAurora() {
    try {
        let data;
        if (CONFIG.testMode) {
            data = {
                kp: CONFIG.testData.kp || 0,
                level: 'Test',
                local: { probability: null }
            };
        } else {
            const res = await fetch('aurora.json');
            data = await res.json();
        }
        auroraData = data;
        renderAurora();
    } catch (e) {
        console.error('Aurora Error:', e);
    }
}

function renderAurora() {
    const kp = Number(auroraData?.kp);
    const localProbability = Number(auroraData?.local?.probability);

    const hasKp = Number.isFinite(kp);
    const hasLocal = Number.isFinite(localProbability);

    const isNight = document.body.classList.contains('night');
    const isStorm = document.body.classList.contains('storm');

    const container = document.querySelector('.aurora-container');
    if (!container) return;

    if (els.auroraDisplay) {
        els.auroraDisplay.style.display = 'block';

        let color = '#99ff99';
        if (hasKp && kp >= 5) color = '#ff7a7a';
        else if (hasKp && kp >= 3) color = '#ffe07a';
        else if (hasKp && kp < 1) color = '#c6ccd6';

        const kpValue = hasKp ? Number(kp).toFixed(1).replace(/\.0$/, '') : '--';
        els.auroraDisplay.textContent = `Kp ${kpValue}`;
        els.auroraDisplay.style.color = color;
        els.auroraDisplay.classList.toggle('active', (hasLocal && localProbability >= 20) || (hasKp && kp >= 3));

        if (hasLocal) {
            els.auroraDisplay.title = `Яр-Сале: вероятность сияния ${Math.round(localProbability)}%`;
        } else {
            els.auroraDisplay.title = 'Яр-Сале: локальная вероятность недоступна, используется Kp';
        }
    }

    const shouldShowByLocal = hasLocal && localProbability >= 8;
    const shouldShowByKpFallback = !hasLocal && hasKp && kp >= 1.5;
    const shouldShow = isNight && !isStorm && (shouldShowByLocal || shouldShowByKpFallback);

    if (shouldShow) {
        document.body.classList.add('aurora-visible');

        let opacity;
        if (hasLocal) {
            opacity = Math.min(1, Math.max(0.25, localProbability / 60));
        } else if (hasKp) {
            opacity = Math.min(1, Math.max(0.25, kp / 6));
        } else {
            opacity = 0.25;
        }

        container.style.opacity = opacity;
    } else {
        document.body.classList.remove('aurora-visible');
        container.style.opacity = 0;
    }
}

function initAurora() {
    fetchAurora();
    setInterval(fetchAurora, CONFIG.auroraUpdateInterval || 1800000);
}
