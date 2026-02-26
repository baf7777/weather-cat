// js/nenets.js
class NenetsSystem {
    constructor() {
        this.el = null;
        this.state = 'WALK'; 
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

    getChumPos() {
        const chum = document.querySelector('.chum-bg');
        if (!chum) return { x: window.innerWidth * 0.15, bottom: 32 };
        const rect = chum.getBoundingClientRect();
        const isMobile = window.innerWidth < 600;
        return {
            x: rect.left + rect.width / 2,
            bottom: isMobile ? 38 : 32
        };
    }

    createNenets() {
        const chum = this.getChumPos();
        const el = document.getElementById('nenets');
        if (!el) return;

        this.pos.x = chum.x - 30; 
        this.pos.bottom = chum.bottom - 2;

        el.style.left = `${this.pos.x}px`;
        el.style.bottom = `${this.pos.bottom}%`;
        
        this.el = el;
        
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const now = Date.now();
            if (this.state !== 'SMOKE' && now - this.lastSmokeTime > 20000) {
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
            this.stateTimer = Date.now() + 8000 + Math.random() * 5000;
        } else if (newState === 'SMOKE') {
            this.el.classList.add('smoke');
            this.stateTimer = Date.now() + 12000;
            setTimeout(() => {
                if (this.state === 'SMOKE') this.startSmoking();
            }, 1000);
        } else if (newState === 'IDLE') {
            this.el.classList.add('smoke'); 
            this.stateTimer = Date.now() + 3000 + Math.random() * 4000;
        }
    }

    getNewTargetX() {
        const chum = this.getChumPos();
        const rand = Math.random();
        
        // 20% шанс, что мужик пойдет проведать оленей
        if (rand < 0.2 && window.DeerSystem && window.DeerSystem.deers.length > 0) {
            const randomDeer = window.DeerSystem.deers[Math.floor(Math.random() * window.DeerSystem.deers.length)];
            return randomDeer.pos + (Math.random() * 40 - 20);
        }
        
        const range = 60; 
        return chum.x + (Math.random() * range * 2 - range);
    }

    tick(now) {
        if (!this.el) return;

        const currentTime = Date.now();
        const chum = this.getChumPos();
        this.pos.bottom = chum.bottom - 2;
        this.el.style.bottom = `${this.pos.bottom}%`;

        if (this.state === 'WALK') {
            const dx = this.targetX - this.pos.x;
            if (Math.abs(dx) > 3) {
                const move = dx > 0 ? 0.3 : -0.3;
                this.pos.x += move;
                this.el.style.left = `${this.pos.x}px`;
                if (move > 0) this.el.classList.add('flip');
                else this.el.classList.remove('flip');
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
        if (!this.el || this.state !== 'SMOKE') return;
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
