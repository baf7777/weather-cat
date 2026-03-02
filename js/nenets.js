// js/nenets.js
class NenetsSystem {
    constructor() {
        this.el = null;
        this.state = 'WALK'; // WALK, SMOKE, IDLE
        this.pos = { x: 0, bottom: 0 };
        this.targetX = 0;
        this.stateTimer = 0;
        this.smokeInterval = null;
        this.lastSmokeTime = 0;
    }

    init() {
        this.createNenets();
        requestAnimationFrame((t) => this.tick(t));
    }

    createNenets() {
        const el = document.getElementById('nenets');
        if (!el) return;

        const t = CONFIG.tundra.nenets;
        this.pos.x = 50; 
        this.pos.bottom = t.bottom;

        el.style.left = `${this.pos.x}%`;
        el.style.bottom = `${this.pos.bottom}%`;
        el.style.transform = `scale(${t.scale})`;
        
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
        } else if (newState === 'SMOKE') {
            this.el.classList.add('smoke');
            this.stateTimer = Date.now() + 10000;
            
            setTimeout(() => {
                if (this.state === 'SMOKE') this.startSmoking();
            }, 1000);
        } else if (newState === 'IDLE') {
            this.el.classList.add('smoke'); 
            this.stateTimer = Date.now() + 3000 + Math.random() * 4000;
        }
    }

    getNewTargetX() {
        const t = CONFIG.tundra.nenets;
        const cz = CONFIG.tundra.chumZone;
        const rand = Math.random();
        
        let minX = t.minX;
        let maxX = t.maxX;

        // Если ненец находится справа от чума, он гуляет только справа
        if (this.pos.x > cz.max) {
            minX = cz.max;
        } 
        // Если слева - гуляет только слева
        else if (this.pos.x < cz.min) {
            maxX = cz.min;
        }

        if (rand < 0.3) {
            return maxX - 40 + Math.random() * 20; 
        }
        return minX + Math.random() * (maxX - minX);
    }

    tick(now) {
        if (!this.el) return;
        if (window.tundraEditor && window.tundraEditor.paused) {
            requestAnimationFrame((t) => this.tick(t));
            return;
        }

        const currentTime = Date.now();
        const t = CONFIG.tundra.nenets;
        const cz = CONFIG.tundra.chumZone;
        this.el.style.bottom = `${t.bottom}%`;

        let minX = t.minX;
        let maxX = t.maxX;

        // Определяем текущие границы в зависимости от стороны от чума
        if (this.pos.x >= cz.max) minX = cz.max;
        else if (this.pos.x <= cz.min) maxX = cz.min;

        if (this.state === 'WALK') {
            const dx = this.targetX - this.pos.x;
            if (Math.abs(dx) > 1) {
                let move = dx > 0 ? 0.2 : -0.2; 
                
                // Строгая проверка границ
                let nextPos = this.pos.x + move;
                if (nextPos > maxX) {
                    this.targetX = minX + Math.random() * (maxX - minX); // Выбираем новую цель
                    move = 0;
                } else if (nextPos < minX) {
                    this.targetX = minX + Math.random() * (maxX - minX);
                    move = 0;
                }

                this.pos.x += move;
                this.el.style.left = `${this.pos.x}%`;
                
                const flip = move > 0 ? 'scaleX(-1)' : '';
                this.el.style.transform = `scale(${t.scale}) ${flip}`;
                if (move > 0) this.el.classList.add('flip');
                else if (move < 0) this.el.classList.remove('flip');
            } else {
                this.setState('IDLE');
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
