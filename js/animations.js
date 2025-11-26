// Генерируем звезды один раз
function createStars() {
    for(let i=0; i<30; i++) {
        let s = document.createElement('div');
        s.className = 'star';
        s.style.left = Math.random() * 100 + '%';
        s.style.top = Math.random() * 100 + '%';
        s.style.width = Math.random() * 3 + 1 + 'px';
        s.style.height = s.style.width;
        s.style.animationDelay = Math.random() * 3 + 's';
        els.stars.appendChild(s);
    }
}

// --- ЛОГИКА СЛУЧАЙНОГО ВЗГЛЯДА КОТА ---
let eyeTargetMode = 'mouse'; // mouse | sky
let eyeSkyTarget = { x: 0, y: 0 };
let eyeRandomTimer = null;
let eyeCurrentTarget = null;
let eyeDesiredTarget = null;
const EYE_SMOOTH_FACTOR = 0.035;

function scheduleRandomGaze() {
    clearTimeout(eyeRandomTimer);
    
    if (!els.box.classList.contains('box-open')) {
        eyeTargetMode = 'mouse';
        return;
    }

    // Иногда оставляем прежний взгляд, чтобы избежать дерганий
    const keepCurrent = Math.random() < 0.2;
    if (!keepCurrent) {
        eyeTargetMode = Math.random() > 0.55 ? 'sky' : 'mouse';
    }
    
    if (eyeTargetMode === 'sky') {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        eyeSkyTarget = {
            x: viewportWidth * (0.15 + Math.random() * 0.7),
            y: viewportHeight * (0.05 + Math.random() * 0.25)
        };
    }

    eyeRandomTimer = setTimeout(scheduleRandomGaze, 3200 + Math.random() * 2600);
}

function startRandomGaze() {
    scheduleRandomGaze();
}

function stopRandomGaze() {
    clearTimeout(eyeRandomTimer);
    eyeRandomTimer = null;
    eyeTargetMode = 'mouse';
    eyeCurrentTarget = null;
    eyeDesiredTarget = null;
}

function trackMouse() {
    if (els.box.classList.contains('box-open')) {
        const catRect = els.catSign.getBoundingClientRect();
        const cx = catRect.left + catRect.width / 2;
        const cy = catRect.top;

        let targetX;
        let targetY;

        if (eyeTargetMode === 'sky') {
            targetX = eyeSkyTarget.x;
            targetY = eyeSkyTarget.y;
        } else {
            const mouseRect = els.mouse.getBoundingClientRect();
            targetX = mouseRect.left + mouseRect.width / 2;
            targetY = mouseRect.top + mouseRect.height / 2;
        }

        if (!eyeCurrentTarget) {
            eyeCurrentTarget = { x: cx, y: cy };
            eyeDesiredTarget = { x: targetX, y: targetY };
        } else {
            eyeDesiredTarget.x = targetX;
            eyeDesiredTarget.y = targetY;
        }

        eyeCurrentTarget.x += (eyeDesiredTarget.x - eyeCurrentTarget.x) * EYE_SMOOTH_FACTOR;
        eyeCurrentTarget.y += (eyeDesiredTarget.y - eyeCurrentTarget.y) * EYE_SMOOTH_FACTOR;

        const dx = (eyeCurrentTarget.x - cx) / window.innerWidth;
        const dy = (eyeCurrentTarget.y - cy) / window.innerHeight;

        els.pupils.forEach(pupil => {
            const limitX = Math.max(-10, Math.min(10, dx * 30));
            const limitY = Math.max(-5, Math.min(8, dy * 20));
            pupil.style.transform = `translate(calc(-50% + ${limitX}px), calc(-50% + ${limitY}px))`;
        });
    }
    requestAnimationFrame(trackMouse);
}

let isOpen = false;

function resetMouseAfterClose() {
    els.mouse.classList.remove('active', 'blown', 'frozen');
    els.mouse.className = 'mouse-wrapper sleeping'; // Добавляем класс сна
    
    if (mousePhysics) {
        cancelAnimationFrame(mousePhysics.animationId);
        mousePhysics = null;
    }
    
    if (typeof setMouseToSpawnState === 'function') {
        setMouseToSpawnState();
    } else {
        els.mouse.style.right = '-80px';
        els.mouse.style.bottom = '40px';
        els.mouse.style.transform = 'scaleX(1)';
    }
}

function toggleBox() {
    isOpen = !isOpen;
    if (isOpen) {
        els.box.classList.add('box-open');
        startRandomGaze();
        
        // Запускаем самолет при открытии!
        if (window.PlaneSystem) {
            window.PlaneSystem.spawnPlane();
            window.PlaneSystem.scheduleNextSpawn();
        }

        if (weatherState.temp < 0) {
            startCatBreathLoop();
        } else {
            stopCatBreathLoop();
        }
        setTimeout(updateMouseBehavior, 300);
    } else {
        els.box.classList.remove('box-open');
        stopRandomGaze();
        stopCatBreathLoop();
        requestMouseReturnHome(() => {
            setTimeout(resetMouseAfterClose, 150);
        });
    }
}

