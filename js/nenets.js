// js/nenets.js
class NenetsSystem {
    constructor() {
        this.el = null;
        this.state = 'WALK'; // WALK, SMOKE, IDLE, REPAIRING
        this.pos = { x: 0, bottom: 0 };
        this.targetX = 0;
        this.stateTimer = 0;
        this.smokeInterval = null;
        this.lastSmokeTime = 0;
        this.activeBuran = null; // Буран, который мы чиним
    }

    init() {
        this.createNenets();
        requestAnimationFrame((t) => this.tick(t));
    }

    getChumPos() {
        const chum = document.querySelector('.chum-bg');
        if (!chum) return { x: window.innerWidth * 0.15, bottom: 32, width: 100 };
        const rect = chum.getBoundingClientRect();
        const isMobile = window.innerWidth < 600;
        return {
            x: rect.left + rect.width / 2,
            bottom: isMobile ? 38 : 32,
            width: rect.width
        };
    }

    createNenets() {
        const el = document.getElementById('nenets');
        if (!el) return;

        // Позиционируем относительно родителя (chum-bg)
        this.pos.x = 50; // Центр чума (в % от родителя)
        this.pos.bottom = -2;

        el.style.left = `${this.pos.x}%`;
        el.style.bottom = `${this.pos.bottom}%`;
        
        this.el = el;
        
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const now = Date.now();
            if (this.state !== 'SMOKE' && now - this.lastSmokeTime > 15000) {
                this.setState('SMOKE');
                this.lastSmokeTime = now;
            }
        });

        this.setState('WALK'); 
    }

    setState(newState) {
        if (!this.el) return;
        this.el.classList.remove('walk', 'smoke');
        this.state = newState;

        if (this.smokeInterval) {
            clearInterval(this.smokeInterval);
            this.smokeInterval = null;
        }

        if (newState === 'WALK') {
            this.el.classList.add('walk');
            this.targetX = this.getNewTargetX();
            this.stateTimer = Date.now() + 10000; 
        } else if (newState === 'SMOKE' || newState === 'REPAIRING') {
            this.el.classList.add('smoke');
            const duration = newState === 'REPAIRING' ? 15000 : 10000;
            this.stateTimer = Date.now() + duration;
            
            setTimeout(() => {
                if (this.state === newState) this.startSmoking();
            }, 1000);
        } else if (newState === 'IDLE') {
            this.el.classList.add('smoke'); 
            this.stateTimer = Date.now() + 3000 + Math.random() * 4000;
        }
    }

    getNewTargetX() {
        const rand = Math.random();
        
        // 30% шанс пойти чинить буран
        if (rand < 0.3) {
            this.activeBuran = Math.random() > 0.5 ? 'b1' : 'b2';
            const buran = document.querySelector(`.buran-img.${this.activeBuran}`);
            if (buran) {
                // Идем к позиции бурана (парсим его left из стилей)
                const buranLeft = parseFloat(buran.style.left) || 0;
                return buranLeft + (this.activeBuran === 'b1' ? -5 : 5);
            }
        }
        
        // 20% шанс пойти к оленям (если мы знаем их примерные координаты в %)
        if (rand < 0.5) {
            return 100 + Math.random() * 50; // Уходим вправо к стаду
        }

        // Обычная прогулка у чума
        this.activeBuran = null;
        return 20 + Math.random() * 60;
    }

    tick(now) {
        if (!this.el) return;

        const currentTime = Date.now();

        if (this.state === 'WALK') {
            const dx = this.targetX - this.pos.x;
            if (Math.abs(dx) > 1) {
                const move = dx > 0 ? 0.2 : -0.2; // Медленный шаг в %
                this.pos.x += move;
                this.el.style.left = `${this.pos.x}%`;
                
                if (move > 0) this.el.classList.add('flip');
                else this.el.classList.remove('flip');
            } else {
                if (this.activeBuran) {
                    this.setState('REPAIRING');
                } else {
                    this.setState('IDLE');
                }
            }
        } else {
            if (currentTime > this.stateTimer) {
                this.setState('WALK');
            }
        }

        requestAnimationFrame((t) => this.tick(t));
    }

    startSmoking() {
        if (this.smokeInterval) return;
        this.smokeInterval = setInterval(() => {
            this.createSmokeParticle();
        }, 900);
    }

    createSmokeParticle() {
        if (!this.el) return;
        const p = document.createElement('div');
        p.className = 'nenets-smoke-particle';
        const rect = this.el.getBoundingClientRect();
        const isFlipped = this.el.classList.contains('flip');
        const mouthX = isFlipped ? rect.right - 15 : rect.left + 15;
        const mouthY = rect.top + 15;
        p.style.left = mouthX + 'px';
        p.style.top = mouthY + 'px';
        const driftX = (Math.random() * 30 - 10) + 'px';
        p.style.setProperty('--dx', driftX);
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 2000);
    }
}

window.addEventListener('load', () => {
    window.NenetsSystem = new NenetsSystem();
    window.NenetsSystem.init();
});
