// --- ФИЗИКА МЫШИ ---
let mousePhysics = null;
let weatherRules = null;

const CANCEL_MAPPINGS = {
    "1-4": { text: "1-4 КЛАССЫ<br>СПЯТ", color: "#a8dadc", textColor: "#1d3557" },
    "1-5": { text: "1-5 КЛАССЫ<br>ДОМА", color: "#7ca5b8", textColor: "#fff" }, 
    "1-6": { text: "1-6 КЛАССЫ<br>ДОМА", color: "#457b9d", textColor: "#fff" },
    "1-7": { text: "1-7 КЛАССЫ<br>ДОМА", color: "#3a698e", textColor: "#fff" },
    "1-8": { text: "1-8 КЛАССЫ<br>ДОМА", color: "#2f577e", textColor: "#fff" },
    "1-9": { text: "1-9 КЛАССЫ<br>ДОМА", color: "#1d3557", textColor: "#fff" },
    "1-11": { text: "ПОЛНАЯ<br>ОТМЕНА", color: "#003049", textColor: "#fff" }
};

// Получаем текущий масштаб сцены динамически
function getStageScale() {
    const stage = document.querySelector('.stage');
    if (!stage) return 1.5;
    
    const transform = window.getComputedStyle(stage).transform;
    if (transform === 'none') return 1.5; // Default fallback
    
    // Matrix format: matrix(scaleX, skewY, skewX, scaleY, translateX, translateY)
    try {
        const values = transform.split('(')[1].split(')')[0].split(',');
        const a = parseFloat(values[0]);
        const b = parseFloat(values[1]);
        // scale = sqrt(a*a + b*b)
        return Math.sqrt(a*a + b*b);
    } catch (e) {
        return 1.5;
    }
}

const MOUSE_GROUND_OFFSET = 70; // Чуть повыше, на уровне коробки
const MOUSE_ROAM_BACK = 80;   // Unused in new logic but kept for reference
const MOUSE_ROAM_FORWARD = 80; // Unused in new logic but kept for reference
const MOUSE_SPAWN_OFFSET = 80;
const MOUSE_HOME_TOLERANCE = 8;

let mouseHomeX = null;
let mouseRoamArea = { min: 0, max: window.innerWidth };

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function getBoxMetrics() {
    if (!els || !els.box) return null;
    const rect = els.box.getBoundingClientRect();
    return {
        left: rect.left,
        right: rect.right,
        center: rect.left + rect.width / 2,
        width: rect.width
    };
}

function getMouseSpawnState() {
    const viewportWidth = window.innerWidth;
    const metrics = getBoxMetrics();
    if (!metrics) {
        const fallbackRight = -80;
        const spawnX = viewportWidth - fallbackRight;
        mouseHomeX = spawnX;
        mouseRoamArea = {
            min: clamp(spawnX - 90, 0, viewportWidth),
            max: clamp(spawnX + 60, 0, viewportWidth)
        };
        return { x: spawnX, right: fallbackRight, bottom: MOUSE_GROUND_OFFSET, scaleX: 1 };
    }
    
    const boxRight = metrics.right;
    // Спавним пока справа (как домик), но ходить даем везде
    const spawnX = clamp(boxRight + MOUSE_SPAWN_OFFSET, 0, viewportWidth);
    
    // Зона бега: Вся ширина экрана (от левого края до правого)
    const roamMin = 20; 
    const roamMax = viewportWidth - 20;
    
    mouseHomeX = spawnX;
    mouseRoamArea = { min: roamMin, max: roamMax };
    
    return {
        x: spawnX,
        right: viewportWidth - spawnX,
        bottom: MOUSE_GROUND_OFFSET,
        scaleX: 1
    };
}

function setMouseToSpawnState() {
    const mouse = els.mouse;
    if (!mouse) return;
    const spawn = getMouseSpawnState();
    const currentScale = getStageScale();
    
    mouse.style.right = spawn.right + 'px';
    mouse.style.bottom = spawn.bottom + 'px';
    // Применяем динамический масштаб
    mouse.style.transform = `scale(${currentScale * spawn.scaleX}, ${currentScale})`;
}

// Плавная интерполяция (easing)
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(start, end, t) {
    return start + (end - start) * t;
}

function startMousePhysics(windSpeed, temperature) {
    // Останавливаем предыдущую симуляцию
    if (mousePhysics) {
        cancelAnimationFrame(mousePhysics.animationId);
    }
    
    const mouse = els.mouse;
    const viewportWidth = window.innerWidth;
    const spawnState = getMouseSpawnState();
    const roamMin = mouseRoamArea.min;
    const roamMax = mouseRoamArea.max;
    const homeX = mouseHomeX ?? spawnState.x;
    
    // Начальная позиция
    const computedRight = parseFloat(window.getComputedStyle(mouse).right);
    let startX = homeX;
    if (!isNaN(computedRight)) {
        startX = clamp(viewportWidth - computedRight, roamMin, roamMax);
    }
    
    const physics = {
        x: startX,
        y: MOUSE_GROUND_OFFSET,
        
        // Состояние: 'run' | 'idle'
        state: 'run',
        stateTimer: 0,
        // Бежим дольше (3-6 сек), чтобы успевать проходить экран
        nextStateTime: 3000 + Math.random() * 3000,
        
        // Скорость и направление
        // Значительно замедлили: 45 база + немного от ветра
        maxSpeed: 45 + windSpeed * 2,
        currentSpeed: 0,
        acceleration: 150, // Более плавный разгон
        direction: -1, // Начинаем движение влево (от домика в мир) 
        
        // Анимация (прыжки и нюхание)
        bouncePhase: Math.random() * Math.PI * 2,
        bounceAmplitude: 5, // Уменьшил амплитуду бега
        sniffAmplitude: 1,   // Уменьшил амплитуду нюхания (мелкая дрожь)
        
        // Масштаб
        scaleX: 1,
        targetScaleX: 1,
        scaleSmoothing: 0.25, // Увеличил демпфирование разворота
        
        lastTime: performance.now(),
        
        roamMin,
        roamMax,
        homeX,
        returningHome: false,
        onHomeReached: null
    };
    
    // Начальное направление
    physics.targetScaleX = physics.direction > 0 ? 1 : -1;
    physics.scaleX = physics.targetScaleX;
    
    function updatePhysics(currentTime) {
        const deltaTime = Math.min((currentTime - physics.lastTime) / 1000, 0.033);
        physics.lastTime = currentTime;
        const viewportWidthNow = window.innerWidth;
        
        // --- ЛОГИКА ВОЗВРАТА ДОМОЙ (ПРИОРИТЕТ) ---
        if (physics.returningHome) {
            const dir = physics.x < physics.homeX ? 1 : -1;
            physics.direction = dir;
            // При возврате бежим быстро и без остановок
            physics.currentSpeed = physics.maxSpeed * 1.5; 
            physics.x += physics.currentSpeed * dir * deltaTime;
            
            physics.bouncePhase += 15 * deltaTime; // Быстрый бег
            const bounce = Math.abs(Math.sin(physics.bouncePhase)) * physics.bounceAmplitude;
            physics.y = MOUSE_GROUND_OFFSET - bounce;

            if ((dir === 1 && physics.x >= physics.homeX) || (dir === -1 && physics.x <= physics.homeX)) {
                physics.x = physics.homeX;
                physics.returningHome = false;
                if (typeof physics.onHomeReached === 'function') {
                    physics.onHomeReached();
                    physics.onHomeReached = null;
                }
            }
        } 
        // --- ЕСТЕСТВЕННОЕ ПОВЕДЕНИЕ ---
        else {
            physics.stateTimer += deltaTime * 1000;
            
            // Смена состояний (Бег <-> Нюхание)
            if (physics.stateTimer >= physics.nextStateTime) {
                physics.stateTimer = 0;
                if (physics.state === 'run') {
                    // Останавливаемся понюхать
                    physics.state = 'idle';
                    physics.nextStateTime = 500 + Math.random() * 1500; // Стоим 0.5-2 сек
                } else {
                    // Побежали дальше
                    physics.state = 'run';
                    physics.nextStateTime = 1000 + Math.random() * 3000; // Бежим 1-4 сек
                    
                    // Иногда меняем направление после остановки
                    if (Math.random() > 0.4) {
                        physics.direction *= -1;
                    }
                }
            }
            
            // Обработка движения
            let targetSpeed = 0;
            let bounce = 0;
            
            if (physics.state === 'run') {
                targetSpeed = physics.maxSpeed;
                
                // Проверка границ
                if ((physics.direction === 1 && physics.x > physics.roamMax) || 
                    (physics.direction === -1 && physics.x < physics.roamMin)) {
                    physics.direction *= -1; // Разворот от стены
                    physics.currentSpeed = 0; // Сброс инерции
                }
                
                // Анимация бега (синусоида)
                physics.bouncePhase += 10 * deltaTime; // Частота прыжков
                bounce = Math.abs(Math.sin(physics.bouncePhase)) * physics.bounceAmplitude;
                
            } else {
                // IDLE (Нюхает)
                targetSpeed = 0;
                // Анимация нюхания (быстрая мелкая дрожь)
                physics.bouncePhase += 25 * deltaTime; 
                bounce = Math.sin(physics.bouncePhase) * physics.sniffAmplitude;
            }
            
            // Плавный разгон / торможение
            if (physics.currentSpeed < targetSpeed) {
                physics.currentSpeed += physics.acceleration * deltaTime;
                if (physics.currentSpeed > targetSpeed) physics.currentSpeed = targetSpeed;
            } else if (physics.currentSpeed > targetSpeed) {
                physics.currentSpeed -= physics.acceleration * deltaTime;
                if (physics.currentSpeed < targetSpeed) physics.currentSpeed = targetSpeed;
            }
            
            physics.x += physics.currentSpeed * physics.direction * deltaTime;
            physics.y = MOUSE_GROUND_OFFSET - bounce;
        }
        
        // Отражение (смотрит туда, куда двигается или куда собирается)
        physics.targetScaleX = physics.direction > 0 ? 1 : -1;
        const scaleDiff = physics.targetScaleX - physics.scaleX;
        physics.scaleX += scaleDiff * physics.scaleSmoothing;
        
        // ПРИМЕНЕНИЕ СТИЛЕЙ (С ГЛОБАЛЬНЫМ МАСШТАБОМ)
        const cssRight = viewportWidthNow - physics.x;
        mouse.style.right = cssRight + 'px';
        mouse.style.bottom = physics.y + 'px';
        
        // Используем динамический масштаб
        const gScale = getStageScale();
        
        mouse.style.transform = `scale(${gScale * physics.scaleX}, ${gScale})`;
        mouse.style.transition = 'none';
        mouse.style.display = 'block';
        
        // Табличка
        const mouseSign = mouse.querySelector('.mouse-sign');
        if (mouseSign) {
            const signScale = physics.scaleX < 0 ? -1 : 1;
            mouseSign.style.transform = `translateX(-50%) scaleX(${signScale})`;
        }
        
        mousePhysics.animationId = requestAnimationFrame(updatePhysics);
    }
    
    mousePhysics = physics;
    mousePhysics.animationId = requestAnimationFrame(updatePhysics);
}

function requestMouseReturnHome(onComplete) {
    if (!mousePhysics) {
        if (typeof onComplete === 'function') onComplete();
        return;
    }
    if (mousePhysics.returningHome) {
        mousePhysics.onHomeReached = onComplete;
        return;
    }
    mousePhysics.returningHome = true;
    mousePhysics.onHomeReached = onComplete;
}

// --- CSV & LOGIC ---

async function loadWeatherCSV() {
    try {
        const response = await fetch('погода.csv');
        if (!response.ok) throw new Error("HTTP " + response.status);
        const text = await response.text();
        weatherRules = parseCSV(text);
        console.log("Weather rules loaded:", weatherRules);
    } catch (e) {
        console.error("Failed to load weather CSV", e);
    }
}

function parseCSV(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    // Simple regex-like parser for CSV with quotes
    const parseLine = (line) => {
        const res = [];
        let current = '';
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"') {
                inQuote = !inQuote;
            } else if (c === ',' && !inQuote) {
                res.push(current);
                current = '';
            } else {
                current += c;
            }
        }
        res.push(current);
        return res;
    };

    // lines[0] is header
    const data = {};

    for (let i = 1; i < lines.length; i++) {
        const row = parseLine(lines[i]).map(val => val.replace(/^"|"$/g, ''));
        const temp = parseInt(row[0], 10); // Temperature is first column
        if (isNaN(temp)) continue;

        data[temp] = {};
        for (let j = 1; j < row.length; j++) {
            // j=1 is "Ветер 0" (0 m/s)
            const windSpeed = j - 1; 
            data[temp][windSpeed] = row[j];
        }
    }
    return data;
}

function getCSVRule(temp, wind) {
    if (!weatherRules) return null;
    
    // Clamp wind to max 20
    const w = Math.max(0, Math.min(20, Math.round(wind)));
    const t = Math.round(temp);
    
    // Temperature range logic
    if (t > -14) return ""; // Warmer than table -> No cancel
    if (t < -42) return "1-11"; // Colder than table -> Max cancel
    
    const row = weatherRules[t];
    if (row) {
        return row[w] || "";
    }
    return "";
}

// --- ЛОГИКА МЫШИ (CSV-DRIVEN) ---
function updateMouseBehavior() {
    const { temp, wind } = weatherState; // wind уже в м/с
    const m = els.mouse;
    const t = els.mouseMsg;
    
    m.className = 'mouse-wrapper active'; 
    m.style.display = 'block'; 
    m.style.opacity = '1'; 
    
    startMousePhysics(wind, temp);

    if (wind > 15) {
        t.innerHTML = "СДУВАЕТ!<br>ДЕРЖИСЬ!";
        t.style.background = "#e63946";
        t.style.color = "white";
        setTimeout(() => { m.classList.add('blown'); }, 500);
        return;
    }

    const ruleValue = getCSVRule(temp, wind);
    
    let cancelText = "";
    let color = "#2a9d8f";
    let textColor = "#fff";
    let isFrozen = false;

    if (ruleValue && CANCEL_MAPPINGS[ruleValue]) {
        const mapping = CANCEL_MAPPINGS[ruleValue];
        cancelText = mapping.text;
        color = mapping.color;
        textColor = mapping.textColor || "#fff";
        isFrozen = true;
    } else {
        // Если тепло или нет данных в таблице
        if (temp > 10) {
            cancelText = "ГУЛЯЕМ!";
            color = "#fb5607";
        } else {
            const phrases = ["В ШКОЛУ!", "НЕ НОЙ", "УЧИСЬ", "НОРМАЛДЫ"];
            cancelText = phrases[Math.floor(Math.random() * phrases.length)];
            color = "#2a9d8f";
        }
        textColor = "#fff";
    }

    t.innerHTML = cancelText;
    t.style.background = color;
    t.style.color = textColor;

    if (isFrozen) m.classList.add('frozen');
    else m.classList.remove('frozen');
}