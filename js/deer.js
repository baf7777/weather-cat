// js/deer.js
class DeerSystem {
    constructor() {
        this.deers = [];
        this.maxDeers = 5;
        this.escapedDeer = null;
    }

    init() {
        for (let i = 0; i < this.maxDeers; i++) {
            this.spawnDeer();
        }
        requestAnimationFrame((t) => this.tick(t));
    }

    getChumPos() {
        const chum = document.querySelector('.chum-bg');
        if (!chum) return { x: 100, bottom: 32 };
        const rect = chum.getBoundingClientRect();
        const isMobile = window.innerWidth < 600;
        return {
            x: rect.left + rect.width / 2,
            bottom: isMobile ? 38 : 32,
            width: rect.width
        };
    }

    spawnDeer() {
        const deer = document.createElement('div');
        deer.className = `deer idle`;
        
        const chumPos = this.getChumPos();
        const range = window.innerWidth < 600 ? 80 : 150; 
        const minX = Math.max(10, chumPos.x - range);
        const maxX = Math.min(window.innerWidth - 50, chumPos.x + range);
        
        let startPos = minX + Math.random() * (maxX - minX);
        
        const speed = 0.06 + Math.random() * 0.06;
        // ОЛЕНИ СТАЛИ БОЛЬШЕ (0.55 - 0.75 вместо 0.4 - 0.55)
        const scale = 0.55 + Math.random() * 0.2; 
        const baseBottom = chumPos.bottom - 2.5; 
        const randomOffset = (Math.random() * 2) - 1; 
        
        deer.style.left = `${startPos}px`;
        deer.style.bottom = `${baseBottom + randomOffset}%`;
        deer.style.zIndex = 4; 
        deer.style.transform = `scale(${scale})`;
        
        const isFlipped = Math.random() > 0.5;
        if (isFlipped) deer.classList.add('flip');

        document.body.appendChild(deer);

        const deerObj = {
            id: Math.random(),
            el: deer,
            pos: startPos,
            minX: minX,
            maxX: maxX,
            speed: isFlipped ? -speed : speed,
            scale: scale,
            state: 'IDLE',
            isFlipped: isFlipped,
            stateTimer: Date.now() + 2000 + Math.random() * 3000
        };

        this.deers.push(deerObj);
    }

    triggerEscape() {
        if (this.escapedDeer) return;
        const d = this.deers[Math.floor(Math.random() * this.deers.length)];
        this.escapedDeer = d;
        d.state = 'ESCAPING';
        d.el.classList.remove('idle');
        d.el.classList.add('walk');
        d.targetX = window.innerWidth * 0.85;
        d.speed = 0.4;
        d.isFlipped = false;
        d.el.classList.remove('flip');
    }

    tick(now) {
        const currentTime = Date.now();
        const chumPos = this.getChumPos();
        const range = window.innerWidth < 600 ? 80 : 150;
        const minX = Math.max(10, chumPos.x - range);
        const maxX = Math.min(window.innerWidth - 50, chumPos.x + range);

        for (let i = 0; i < this.deers.length; i++) {
            const d = this.deers[i];
            
            if (d.speed < 0) {
                d.isFlipped = true;
                d.el.classList.add('flip');
            } else if (d.speed > 0) {
                d.isFlipped = false;
                d.el.classList.remove('flip');
            }

            if (d.state === 'ESCAPING') {
                if (d.pos < d.targetX) {
                    d.pos += d.speed;
                    d.el.style.left = `${d.pos}px`;
                } else {
                    d.state = 'LOST';
                    d.el.classList.remove('walk');
                    d.el.classList.add('idle');
                }
            } else if (d.state === 'RETURNING') {
                const targetX = chumPos.x + (Math.random() * 60 - 30); 
                if (Math.abs(d.pos - targetX) > 5) {
                    const dir = d.pos > targetX ? -0.6 : 0.6;
                    d.pos += dir;
                    d.el.style.left = `${d.pos}px`;
                    d.isFlipped = dir < 0; 
                } else {
                    d.state = 'IDLE';
                    d.el.classList.remove('walk');
                    d.el.classList.add('idle');
                    this.escapedDeer = null;
                    d.stateTimer = currentTime + 5000;
                }
            } else if (d.state === 'WALK') {
                let nextPos = d.pos + d.speed;
                if (nextPos > maxX || nextPos < minX) {
                    this.reverseDeer(d);
                    continue;
                }
                d.pos += d.speed;
                d.el.style.left = `${d.pos}px`;
                if (currentTime > d.stateTimer) {
                    d.state = 'IDLE';
                    d.el.classList.remove('walk');
                    d.el.classList.add('idle');
                    d.stateTimer = currentTime + 2000 + Math.random() * 3000;
                }
            } else if (d.state === 'IDLE') {
                if (currentTime > d.stateTimer && !this.escapedDeer) {
                    d.state = 'WALK';
                    d.el.classList.remove('idle');
                    d.el.classList.add('walk');
                    d.stateTimer = currentTime + 6000 + Math.random() * 6000;
                }
            }

            const flip = d.isFlipped ? 'scaleX(-1)' : 'scaleX(1)';
            d.el.style.transform = `scale(${d.scale}) ${flip}`;
        }
        requestAnimationFrame((t) => this.tick(t));
    }

    reverseDeer(d) {
        d.speed = -d.speed;
    }
}

window.addEventListener('load', () => {
    window.DeerSystem = new DeerSystem();
    window.DeerSystem.init();
});
