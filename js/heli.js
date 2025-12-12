class HeliSystem {
    constructor() {
        this.container = null;
        this.svg = null;
        
        // Конфигурация анимации
        this.state = 'IDLE'; // IDLE, STARTING, TAKEOFF, HOVER, LANDING, STOPPING
        this.timer = 0;
        
        // Параметры вертолета (из оригинального файла)
        this.centers = {
            main: { x: 1255, y: 415 },
            tail: { x: 2931, y: 461 }
        };
        
        this.animVars = {
            mainAngle: 0,
            tailAngle: 0,
            rpm: 0, // 0.0 to 1.0 (power)
            altitude: 0, // 0.0 to 1.0
            tilt: 0, // Current tilt angle
            xOffset: 0, // Current X drift
            yOffset: 0  // Current Y drift
        };

        this.config = {
            maxAltitude: 600, // px внутри SVG
            idleTime: 8000,
            hoverTime: 10000,
            spinUpTime: 6000,
            spinDownTime: 6000,
            moveTime: 5000    // Чуть медленнее для веса
        };

        this.lastTime = 0;
        this.nextActionTime = 0;
    }

    init() {
        // Создаем DOM элементы
        const container = document.createElement('div');
        container.className = 'heli-wrapper';
        
        this.isMobile = window.innerWidth < 768;

        // Реалистичная тундра (SVG)
        // На мобильных убираем фильтр блюра для производительности
        const snowFilterAttr = this.isMobile ? '' : 'filter="url(#snow-blur)"';
        
        const tundra = document.createElement('div');
        tundra.className = 'heli-tundra';
        tundra.innerHTML = `
            <svg viewBox="0 0 600 120" preserveAspectRatio="none" style="width:100%; height:100%;">
                <defs>
                    <linearGradient id="snow-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#fff" />
                        <stop offset="100%" stop-color="#d6eaf8" />
                    </linearGradient>
                    <filter id="snow-blur" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
                    </filter>
                </defs>
                
                <!-- Задний план (мягкие холмы) -->
                <path d="M-50,120 L-50,80 C50,60 150,90 250,70 C350,50 450,80 650,60 L650,120 Z" fill="#cbe3f5" />
                
                <!-- Сухие кустики (задний план) -->
                <g stroke="#6e5c53" stroke-width="1.5" fill="none" opacity="0.6">
                    <path d="M120,75 L120,60 M120,70 L115,62 M120,68 L125,63" />
                    <path d="M480,70 L480,55 M480,65 L475,58 M480,62 L485,57" />
                </g>

                <!-- Передний план (основной сугроб, мягкий) -->
                <path d="M-50,120 L-50,90 C20,85 100,95 180,80 C260,65 340,75 420,85 C500,95 580,80 650,90 L650,120 Z" fill="url(#snow-fill)" ${snowFilterAttr} opacity="0.9" />
                
                <!-- Сухие кустики (передний план) -->
                <g stroke="#5d4037" stroke-width="2" fill="none">
                     <!-- Слева -->
                    <path d="M80,92 L80,75 M80,85 L72,78 M80,82 L88,76" />
                    <!-- Справа -->
                    <path d="M350,85 L350,70 M350,80 L342,72 M350,78 L356,73" />
                     <!-- Мелкая травинка -->
                    <path d="M220,88 L222,80 M220,88 L218,82" stroke-width="1" />
                </g>
            </svg>
        `;
        container.appendChild(tundra);

        // Эффект снежной пыли (Downwash)
        const dust = document.createElement('div');
        dust.className = 'heli-snow-dust';
        dust.innerHTML = `
            <div class="dust-cloud dust-l"></div>
            <div class="dust-cloud dust-l" style="animation-delay: 0.2s; bottom: 5px;"></div>
            <div class="dust-cloud dust-r"></div>
            <div class="dust-cloud dust-r" style="animation-delay: 0.2s; bottom: 5px;"></div>
        `;
        container.appendChild(dust);

        // SVG вертолета
        container.innerHTML += `
            <svg id="heli-svg" viewBox="0 0 3240 1080" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <!-- Градиент для основного винта: прозрачный центр, дымка к краям -->
                    <radialGradient id="main-rotor-grad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                        <stop offset="0%" stop-color="#000" stop-opacity="0" />
                        <stop offset="70%" stop-color="#000" stop-opacity="0.02" />
                        <stop offset="90%" stop-color="#000" stop-opacity="0.15" />
                        <stop offset="100%" stop-color="#000" stop-opacity="0" />
                    </radialGradient>
                    
                    <!-- Градиент для хвостового винта -->
                    <radialGradient id="tail-rotor-grad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                        <stop offset="0%" stop-color="#000" stop-opacity="0" />
                        <stop offset="60%" stop-color="#000" stop-opacity="0.05" />
                        <stop offset="95%" stop-color="#000" stop-opacity="0.3" />
                        <stop offset="100%" stop-color="#000" stop-opacity="0" />
                    </radialGradient>
                </defs>

                <g id="heli-group">
                    <!-- Группируем части корпуса для затемнения (без огней) -->
                    <g class="heli-body-parts">
                        <image href="assets/heli.png" x="0" y="0" width="3240" height="1080" />
                        
                        <!-- Основной винт -->
                        <g id="heli-main-rotor">
                            <circle r="16" fill="#111"/>
                            <g id="heli-main-blades" stroke="#222" stroke-width="80" stroke-linecap="round" opacity="0.95">
                                <path d="M 25 0 L 1800 0"/>
                                <path d="M 25 0 L 1800 0" transform="rotate(72)"/>
                                <path d="M 25 0 L 1800 0" transform="rotate(144)"/>
                                <path d="M 25 0 L 1800 0" transform="rotate(216)"/>
                                <path d="M 25 0 L 1800 0" transform="rotate(288)"/>
                            </g>
                            <!-- Используем градиент вместо заливки -->
                            <circle id="heli-main-disk" r="1800" fill="url(#main-rotor-grad)"/>
                        </g>

                        <!-- Хвостовой винт -->
                        <g id="heli-tail-rotor">
                            <circle r="10" fill="#111"/>
                            <g id="heli-tail-blades" stroke="#222" stroke-width="14" stroke-linecap="round" opacity="0.95">
                                <path d="M 12 0 L 220 0"/>
                                <path d="M 12 0 L 220 0" transform="rotate(120)"/>
                                <path d="M 12 0 L 220 0" transform="rotate(240)"/>
                            </g>
                            <!-- Используем градиент -->
                            <circle id="heli-tail-disk" r="220" fill="url(#tail-rotor-grad)"/>
                        </g>
                    </g> <!-- Конец heli-body-parts -->

                    <!-- Огни (поверх корпуса, не затемняются) -->
                    <g id="heli-lights">
                        <!-- Красный маячок (сверху за винтом, ближе к хвосту) -->
                        <circle cx="2450" cy="680" r="12" class="heli-light-red" />
                        
                        <!-- Белый строб (на хвосте сверху) -->
                        <circle cx="3000" cy="400" r="8" class="heli-light-white" />
                        
                        <!-- Бортовой огонь (зеленый справа) -->
                        <circle cx="1000" cy="900" r="6" class="heli-light-green" />
                    </g>

                </g>
            </svg>
        `;

        // Вставляем перед облаками (или внутри спец контейнера)
        // В index.html clouds имеет z-index 2. Planes z-index 5.
        // Вставим вертолет в body, но CSS задаст z-index
        document.body.insertBefore(container, document.querySelector('.clouds'));
        
        this.container = container;
        this.els = {
            group: document.getElementById('heli-group'),
            dustContainer: dust,
            mainRotor: document.getElementById('heli-main-rotor'),
            tailRotor: document.getElementById('heli-tail-rotor'),
            mainBlades: document.getElementById('heli-main-blades'),
            tailBlades: document.getElementById('heli-tail-blades'),
            mainDisk: document.getElementById('heli-main-disk'),
            tailDisk: document.getElementById('heli-tail-disk')
        };

        // Устанавливаем начальную позицию винтов (без вращения)
        this.els.mainRotor.setAttribute("transform", 
            `translate(${this.centers.main.x} ${this.centers.main.y}) scale(1 0.12)`);
        
        this.els.tailRotor.setAttribute("transform", 
            `translate(${this.centers.tail.x} ${this.centers.tail.y})`);

        // Обработчик клика
        this.container.addEventListener('click', () => this.toggleFlight());
        this.container.addEventListener('touchstart', (e) => { e.preventDefault(); this.toggleFlight(); }); // Для тач-устройств

        // Запуск цикла анимации
        requestAnimationFrame((t) => this.tick(t));
    }

    toggleFlight() {
        // Логика переключения по клику
        // Разрешаем действие ТОЛЬКО в стабильных состояниях, чтобы не ломать анимацию
        switch (this.state) {
            case 'IDLE':
                // Если стоит - начинаем взлет
                this.scheduleNextAction('STARTING', 0);
                break;
            case 'HOVER':
                // Если висит - начинаем посадку
                this.scheduleNextAction('LANDING', 0);
                break;
            // Во всех остальных фазах (STARTING, TAKEOFF, LANDING, STOPPING) клики игнорируем
        }
    }

    scheduleNextAction(nextState, delay) {
        this.nextActionState = nextState;
        this.nextActionTime = performance.now() + delay;
    }

    // Линейная интерполяция
    lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
    }

    tick(now) {
        if (!this.lastTime) this.lastTime = now;
        const dt = now - this.lastTime;
        this.lastTime = now;

        // --- Логика переключения состояний ---
        if (this.nextActionTime > 0 && now >= this.nextActionTime) {
            this.state = this.nextActionState;
            this.nextActionTime = 0;
            this.stateStartTime = now;
            
            // Автоматические переходы (цепочки)
            switch (this.state) {
                case 'STARTING': 
                    this.scheduleNextAction('TAKEOFF', this.config.spinUpTime); 
                    break;
                case 'TAKEOFF': 
                    this.scheduleNextAction('HOVER', this.config.moveTime); 
                    break;
                case 'LANDING': 
                    this.scheduleNextAction('STOPPING', this.config.moveTime); 
                    break;
                case 'STOPPING': 
                    this.scheduleNextAction('IDLE', this.config.spinDownTime); 
                    break;
            }
        }

        // --- Целевые значения ---
        let targetRpm = 0;
        let targetAlt = 0;
        let targetTilt = 0;
        
        const stateTime = now - this.stateStartTime;
        const windFactor = (window.weatherState && window.weatherState.wind) ? Math.min(window.weatherState.wind, 20) / 5 : 1;

        let extraShakeFactor = 0;

        switch (this.state) {
            case 'IDLE':
                targetRpm = 0; targetAlt = 0; targetTilt = 0;
                break;
            case 'STARTING':
                targetRpm = Math.min(1, stateTime / this.config.spinUpTime);
                targetAlt = 0; targetTilt = 0;
                break;
            case 'TAKEOFF':
                targetRpm = 1;
                let tT = Math.min(1, stateTime / this.config.moveTime);
                let easeT = tT < 0.5 ? 2 * tT * tT : 1 - Math.pow(-2 * tT + 2, 2) / 2;
                targetAlt = easeT;
                targetTilt = -2.5; 
                extraShakeFactor = Math.sin(tT * Math.PI) * 5; 
                break;
            case 'HOVER':
                targetRpm = 1; targetAlt = 1; targetTilt = 0;
                const driftSpeed = now * 0.001;
                const hX = Math.sin(driftSpeed) * 5 + Math.cos(driftSpeed * 0.4) * 3;
                const hY = Math.sin(driftSpeed * 0.7) * 4 + Math.cos(driftSpeed * 1.5) * 2;
                this.animVars.xOffset = this.lerp(this.animVars.xOffset, hX * windFactor, 0.05);
                this.animVars.yOffset = this.lerp(this.animVars.yOffset, hY * windFactor, 0.05);
                targetTilt = Math.sin(driftSpeed * 0.5) * 1.5 * windFactor;
                break;
            case 'LANDING':
                targetRpm = 1;
                let tL = Math.min(1, stateTime / this.config.moveTime);
                let easeL = tL < 0.5 ? 2 * tL * tL : 1 - Math.pow(-2 * tL + 2, 2) / 2;
                targetAlt = 1 - easeL;
                targetTilt = 3.0; 
                extraShakeFactor = Math.sin(tL * Math.PI) * 5;
                this.animVars.xOffset = this.lerp(this.animVars.xOffset, 0, 0.05);
                this.animVars.yOffset = this.lerp(this.animVars.yOffset, 0, 0.05);
                break;
            case 'STOPPING':
                targetRpm = 1 - Math.min(1, stateTime / this.config.spinDownTime);
                targetAlt = 0; targetTilt = 0;
                break;
        }

        if (extraShakeFactor > 0) {
            targetTilt += (Math.random() - 0.5) * 0.5 * extraShakeFactor; 
        }

        // --- Физика ---
        this.animVars.rpm = this.lerp(this.animVars.rpm, targetRpm, 0.05);
        this.animVars.altitude = this.lerp(this.animVars.altitude, targetAlt, 0.03); 
        this.animVars.tilt = this.lerp(this.animVars.tilt, targetTilt, 0.04); 

        // --- Рендеринг ---
        const speedMult = this.animVars.rpm * this.animVars.rpm;
        this.animVars.mainAngle = (this.animVars.mainAngle + 35 * speedMult) % 360;
        this.animVars.tailAngle = (this.animVars.tailAngle + 60 * speedMult) % 360;

        this.els.mainRotor.setAttribute("transform", 
            `translate(${this.centers.main.x} ${this.centers.main.y}) scale(1 0.12) rotate(${this.animVars.mainAngle})`);
        this.els.tailRotor.setAttribute("transform", 
            `translate(${this.centers.tail.x} ${this.centers.tail.y}) rotate(${this.animVars.tailAngle})`);

        const diskOpacity = Math.max(0, Math.min(1, (this.animVars.rpm - 0.2) * 1.5));
        this.els.mainDisk.setAttribute("opacity", diskOpacity);
        this.els.tailDisk.setAttribute("opacity", diskOpacity);
        
        const bladeOpacity = Math.max(0.0, 1 - this.animVars.rpm * 1.5); 
        this.els.mainBlades.setAttribute("opacity", bladeOpacity);
        this.els.tailBlades.setAttribute("opacity", bladeOpacity);

        // Позиция корпуса
        const baseAltitude = -(this.animVars.altitude * this.config.maxAltitude);
        const yPos = baseAltitude + this.animVars.yOffset;
        const xPos = this.animVars.xOffset;

        // Эффект снежной пыли
        const groundProx = Math.max(0, 1 - this.animVars.altitude * 2.5);
        const powerFactor = Math.max(0, (this.animVars.rpm - 0.55) * 2.2);
        let dustOpacity = groundProx * powerFactor;

        if (this.state === 'IDLE' || this.animVars.rpm < 0.2) {
            dustOpacity = 0;
        }
        if (this.els.dustContainer) {
            this.els.dustContainer.style.opacity = dustOpacity;
        }
        
        // Вибрация
        const vibAmount = this.animVars.rpm * 3; 
        let vibX = (Math.random() - 0.5) * 2 * vibAmount;
        let vibY = (Math.random() - 0.5) * 2 * vibAmount;
        
        if (extraShakeFactor > 0) {
            vibX += (Math.random() - 0.5) * 2 * extraShakeFactor * 0.5;
            vibY += (Math.random() - 0.5) * 2 * extraShakeFactor * 0.5;
        }

        this.els.group.setAttribute("transform", 
            `translate(${xPos + vibX} ${yPos + vibY}) rotate(${this.animVars.tilt} 1500 700)`);

        requestAnimationFrame((t) => this.tick(t));
    }
}

// Запуск
window.HeliSystem = new HeliSystem();