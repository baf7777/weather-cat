// js/deer.js
class DeerSystem {
    constructor() {
        this.deers = [];
        // На мобилках делаем стадо поменьше, чтобы не было кучи
        this.isMobile = window.innerWidth < 600;
        this.maxDeers = this.isMobile ? 3 : 5; 
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
        return {
            x: rect.left + rect.width / 2,
            bottom: this.isMobile ? 38 : 32,
            width: rect.width
        };
    }

    spawnDeer() {
        const deer = document.createElement('div');
        deer.className = `deer idle`;
        
        const chumPos = this.getChumPos();
        
        // РАСШИРЯЕМ ЗОНУ ПРОГУЛКИ: на мобилках даем больше места вправо (до 150px)
        const range = this.isMobile ? 120 : 200; 
        const minX = Math.max(10, chumPos.x - 40); // Слева прижимаем к чуму
        const maxX = Math.min(window.innerWidth - 50, chumPos.x + range); // Вправо даем гулять больше
        
        let startPos;
        let attempts = 0;
        do {
            startPos = minX + Math.random() * (maxX - minX);
            attempts++;
        } while (this.isTooClose(startPos) && attempts < 20);
        
        const speed = 0.05 + Math.random() * 0.05;
        const scale = (this.isMobile ? 0.45 : 0.55) + Math.random() * 0.15; 
        
        // БОЛЬШЕ ВЕРТИКАЛЬНОГО РАЗНООБРАЗИЯ (создаем глубину)
        const baseBottom = chumPos.bottom - 3; 
        const randomOffset = (Math.random() * 6) - 3; // Разброс высоты +-3%
        
        deer.style.left = `${startPos}px`;
        deer.style.bottom = `${baseBottom + randomOffset}%`;
        
        // z-index на основе высоты для правильного перекрытия
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

    isTooClose(x, id = null) {
        // Увеличили минимальную дистанцию между оленями при спавне
        return this.deers.some(d => d.id !== id && Math.abs(d.pos - x) < 80);
    }

    toggleDeerState(d) {
        if (d.state === 'WALK') {
            d.state = 'IDLE';
            d.el.classList.remove('walk');
            d.el.classList.add('idle');
            d.stateTimer = Date.now() + (2000 + Math.random() * 3000); 
        } else {
            d.state = 'WALK';
            d.el.classList.remove('idle');
            d.el.classList.add('walk');
            d.stateTimer = Date.now() + (6000 + Math.random() * 6000); 
        }
    }

    tick(now) {
        const currentTime = Date.now();
        const chumPos = this.getChumPos();
        const range = this.isMobile ? 120 : 200;
        const minX = Math.max(10, chumPos.x - 40);
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
                
                // СТРОГАЯ КОЛЛИЗИЯ: олени не заходят друг в друга
                const collision = this.deers.find(other => {
                    if (other.id === d.id) return false;
                    const dist = other.pos - d.pos;
                    const isAhead = (d.speed > 0 && dist > 0) || (d.speed < 0 && dist < 0);
                    // Проверяем близость по X и схожесть по высоте (bottom)
                    return isAhead && Math.abs(dist) < 90 && 
                           Math.abs(parseFloat(other.el.style.bottom) - parseFloat(d.el.style.bottom)) < 2;
                });

                if (collision) {
                    d.state = 'IDLE';
                    d.el.classList.remove('walk');
                    d.el.classList.add('idle');
                    d.stateTimer = currentTime + 2000;
                }

                if (currentTime > d.stateTimer) {
                    this.toggleDeerState(d);
                }
            } else if (d.state === 'IDLE') {
                if (currentTime > d.stateTimer && !this.escapedDeer) {
                    this.toggleDeerState(d);
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
}

window.addEventListener('load', () => {
    window.DeerSystem = new DeerSystem();
    window.DeerSystem.init();
});
