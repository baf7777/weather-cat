// --- СИСТЕМА САМОЛЕТОВ (CANVAS VERSION) ---

let YAMAL_FLIGHTS = []; // Будет загружено из flights.json

// !!! СЮДА ДОПИСЫВАТЬ ФРАЗЫ !!!
const PLANE_PHRASES = [
    "Наконец то отпуск ухааа!!!",
    "Я больше никогда не вернусь в эту дыру",
    "Эх щас бы страгонинки",
    "Лечу к котику",
    "Блять я телефон дома забыл!",
    "Ух, морозно!",
    "Вижу оленей!",
    "Ямал Привееет"
];

const PLANE_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;

window.PlaneSystem = {
    canvas: null,
    ctx: null,
    container: null, 
    planes: [],
    nextSpawnTime: 0,
    
    async init() {
        this.canvas = document.getElementById('planes-layer');
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Загрузка расписания
        await this.loadSchedule();

        // Слой для DOM элементов
        let planeDomLayer = document.getElementById('planes-dom-layer');
        if (!planeDomLayer) {
            planeDomLayer = document.createElement('div');
            planeDomLayer.id = 'planes-dom-layer';
            planeDomLayer.style.position = 'absolute';
            planeDomLayer.style.top = '0';
            planeDomLayer.style.left = '0';
            planeDomLayer.style.width = '100%';
            planeDomLayer.style.height = '100%';
            planeDomLayer.style.pointerEvents = 'none'; 
            planeDomLayer.style.zIndex = '6'; 
            planeDomLayer.style.overflow = 'hidden';
            document.body.appendChild(planeDomLayer);
        }
        this.container = planeDomLayer;

        this.createScheduleUI();
        this.loop();
    },

    async loadSchedule() {
        try {
            // Пытаемся загрузить сгенерированный JSON
            const res = await fetch('flights.json?nocache=' + Date.now());
            if (res.ok) {
                YAMAL_FLIGHTS = await res.json();
            } else {
                throw new Error("flights.json not found");
            }
        } catch (e) {
            console.warn("Could not load flight schedule, using backup:", e);
            // Фолбэк данные, если файл еще не создан
            YAMAL_FLIGHTS = [
                { number: "YC-ERR", from: "Сайт", to: "Загрузка...", time: "--:--", status: "Нет данных" }
            ];
        }
    },

    createScheduleUI() {
        // Кнопка
        const btn = document.createElement('div');
        btn.className = 'schedule-btn';
        btn.title = "Расписание рейсов";
        btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;
        document.body.appendChild(btn);

        // Табло
        const board = document.createElement('div');
        board.className = 'schedule-board';
        board.innerHTML = `
            <div class="board-header">
                <div class="board-title">Рейсы Ямала</div>
                <div class="board-close">&times;</div>
            </div>
            <ul class="flight-list">
                ${YAMAL_FLIGHTS.map(f => {
                    const statusClass = f.status === "Отменен" ? "st-cancel" : "st-ok";
                    return `
                    <li class="flight-item">
                        <div class="f-info">
                            <span class="f-num">${f.number}</span>
                            <span class="f-route">${f.from} &rarr; ${f.to}</span>
                        </div>
                        <div class="f-info" style="align-items: flex-end;">
                            <span class="f-time">${f.time}</span>
                            <span class="f-status ${statusClass}">${f.status}</span>
                        </div>
                    </li>
                    `;
                }).join('')}
            </ul>
        `;
        document.body.appendChild(board);

        // Логика
        const toggle = () => board.classList.toggle('active');
        btn.addEventListener('click', toggle);
        board.querySelector('.board-close').addEventListener('click', () => board.classList.remove('active'));
    },

    resize() {
        if (this.canvas) {
            const dpr = window.devicePixelRatio || 1;
            this.canvas.width = window.innerWidth * dpr;
            this.canvas.height = window.innerHeight * dpr;
            this.canvas.style.width = window.innerWidth + 'px';
            this.canvas.style.height = window.innerHeight + 'px';
            if (this.ctx) this.ctx.scale(dpr, dpr);
        }
    },

    scheduleNextSpawn() {
        // Спавн каждые 30-50 секунд
        const delay = 30000 + Math.random() * 20000;
        this.nextSpawnTime = performance.now() + delay;
        console.log("PlaneSystem: Next plane in ~30-50s");
    },

    spawnPlane() {
        if (this.planes.length >= 2) {
            console.log("PlaneSystem: Limit (2) reached");
            return;
        }

        const isLeftToRight = Math.random() > 0.5;
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;

        const startY = Math.random() * (viewportH * 0.4);
        const endY = Math.random() * (viewportH * 0.4);
        const startX = isLeftToRight ? -50 : viewportW + 50;
        const endX = isLeftToRight ? viewportW + 50 : -50;

        const speed = 25 + Math.random() * 15; 
        
        const dx = endX - startX;
        const dy = endY - startY;
        const rotation = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        const angleRad = Math.atan2(dy, dx);

        const wingOffset = 2.5;
        const perpAngle = angleRad + Math.PI / 2;
        const offX = Math.cos(perpAngle) * wingOffset;
        const offY = Math.sin(perpAngle) * wingOffset;

        const el = document.createElement('div');
        el.className = 'plane';
        el.innerHTML = PLANE_SVG;
        el.style.left = '0';
        el.style.top = '0';
        el.style.transform = `translate(${startX}px, ${startY}px) rotate(${rotation}deg)`;
        // Включаем кликабельность для самого самолета
        el.style.pointerEvents = 'auto'; 
        el.style.cursor = 'pointer';
        
        this.container.appendChild(el);

        const planeObj = {
            el: el,
            x: startX,
            y: startY,
            targetX: endX,
            targetY: endY,
            dx: dx,
            dy: dy,
            angleRad: angleRad,
            offX: offX,
            offY: offY,
            speed: speed,
            rotation: rotation,
            distanceTotal: Math.sqrt(dx*dx + dy*dy),
            distanceTraveled: 0,
            lastTrailTime: 0,
            isFinished: false,
            trail: [],
            msgEl: null, // Элемент сообщения
            msgTimer: null
        };

        // Обработчик клика
        el.addEventListener('click', (e) => {
            e.stopPropagation(); // Чтобы не кликнулось по коробке/фону
            this.showPlaneMessage(planeObj);
        });
        // Для тач-устройств
        el.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            this.showPlaneMessage(planeObj);
        });

        this.planes.push(planeObj);
    },

    showPlaneMessage(p) {
        // Если уже есть сообщение, удаляем старое
        if (p.msgEl) {
            p.msgEl.remove();
            clearTimeout(p.msgTimer);
        }

        const text = PLANE_PHRASES[Math.floor(Math.random() * PLANE_PHRASES.length)];
        
        const msg = document.createElement('div');
        msg.className = 'plane-msg';
        msg.innerText = text;
        
        // Добавляем в контейнер (не внутрь самолета, чтобы не вращалось)
        this.container.appendChild(msg);
        
        // Начальная позиция
        msg.style.left = p.x + 'px';
        msg.style.top = p.y + 'px';

        p.msgEl = msg;

        // Удаляем через 3 секунды
        p.msgTimer = setTimeout(() => {
            if (p.msgEl) {
                p.msgEl.remove();
                p.msgEl = null;
            }
        }, 3000);
    },

    updateAndDrawTrails() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; 

        for (let i = this.planes.length - 1; i >= 0; i--) {
            const p = this.planes[i];
            const trail = p.trail;

            for (let j = 0; j < trail.length; j++) {
                const pt = trail[j];
                
                if (p.isFinished) {
                    pt.alpha -= 0.002; 
                    pt.r += 0.01; 
                } else {
                    if (pt.r < 1.5) { 
                         pt.r += 0.002; 
                    }
                }

                if (pt.alpha > 0) {
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 255, 255, ${pt.alpha})`;
                    ctx.fill();
                }
            }

            if (p.isFinished) {
                if (trail.length > 0 && trail[trail.length-1].alpha <= 0) {
                     p.trail = []; 
                }
            }
        }
    },

    loop(time) {
        if (!time) time = performance.now();

        if (time > this.nextSpawnTime) {
            this.spawnPlane();
            this.scheduleNextSpawn();
        }

        this.updateAndDrawTrails();

        for (let i = this.planes.length - 1; i >= 0; i--) {
            const p = this.planes[i];

            if (!p.isFinished) {
                const moveStep = p.speed * 0.016; 
                const ratio = moveStep / p.distanceTotal;
                
                p.x += p.dx * ratio;
                p.y += p.dy * ratio;
                p.distanceTraveled += moveStep;

                p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rotation}deg)`;

                // Обновляем позицию сообщения, если оно есть
                if (p.msgEl) {
                    p.msgEl.style.left = p.x + 'px';
                    p.msgEl.style.top = p.y + 'px';
                }

                if (time - p.lastTrailTime > 30) {
                    const cx = p.x + 12;
                    const cy = p.y + 12;
                    const tailOffset = 10;
                    const tailX = cx - Math.cos(p.angleRad) * tailOffset;
                    const tailY = cy - Math.sin(p.angleRad) * tailOffset;

                    p.trail.push({ x: tailX - p.offX, y: tailY - p.offY, r: 0.3, alpha: 0.3 });
                    p.trail.push({ x: tailX + p.offX, y: tailY + p.offY, r: 0.3, alpha: 0.3 });
                    
                    p.lastTrailTime = time;
                }

                if (p.distanceTraveled >= p.distanceTotal) {
                    p.isFinished = true;
                    p.el.remove(); 
                    if (p.msgEl) p.msgEl.remove(); // Удаляем сообщение при исчезновении
                }
            } else {
                if (p.trail.length === 0) {
                    this.planes.splice(i, 1);
                }
            }
        }

        requestAnimationFrame(this.loop.bind(this));
    }
};
