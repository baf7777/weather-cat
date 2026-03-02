// js/deer.js
class DeerSystem {
    constructor() {
        this.deers = [];
        this.isMobile = window.innerWidth < 600;
        this.maxDeers = CONFIG.tundra.deer.maxDeers || 3; 
        this.escapedDeer = null;
    }

    init() {
        for (let i = 0; i < this.maxDeers; i++) {
            this.spawnDeer(i); // Передаем индекс, чтобы рассадить их по разным сторонам
        }
        requestAnimationFrame((t) => this.tick(t));
    }

    spawnDeer(index) {
        const chumBg = document.querySelector('.chum-bg');
        if (!chumBg) return;

        const deer = document.createElement('div');
        deer.className = `deer idle`;
        
        const t = CONFIG.tundra.deer;
        const cz = CONFIG.tundra.chumZone;
        
        // Разделяем оленей: часть слева от чума, часть справа
        let minX, maxX;
        if (index % 2 === 0) {
            // Справа от чума
            minX = cz.max;
            maxX = t.maxX;
        } else {
            // Слева от чума
            minX = t.minX;
            maxX = cz.min;
        }
        
        let startPos;
        let attempts = 0;
        do {
            startPos = minX + Math.random() * (maxX - minX);
            attempts++;
        } while (this.isTooClose(startPos) && attempts < 20);
        
        const speed = 0.05 + Math.random() * 0.05;
        const scale = t.scaleMin + Math.random() * (t.scaleMax - t.scaleMin);
        
        const baseBottom = t.bottom; 
        const randomOffset = (Math.random() * 8) - 4; // Разброс высоты
        
        deer.style.left = `${startPos}%`;
        deer.style.bottom = `${baseBottom + randomOffset}%`;
        
        deer.style.zIndex = 100 - Math.round(baseBottom + randomOffset); 
        deer.style.transform = `scale(${scale})`;
        
        const isFlipped = Math.random() > 0.5;
        if (isFlipped) deer.classList.add('flip');

        chumBg.appendChild(deer);

        const deerObj = {
            id: Math.random(),
            el: deer,
            pos: startPos,
            zone: { min: minX, max: maxX }, // Олень знает свою зону
            speed: isFlipped ? -speed : speed,
            scale: scale,
            state: 'IDLE',
            isFlipped: isFlipped,
            stateTimer: Date.now() + 2000 + Math.random() * 3000
        };

        this.deers.push(deerObj);
    }

    isTooClose(x, id = null) {
        return this.deers.some(d => d.id !== id && Math.abs(d.pos - x) < 15);
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
            // Если он смотрит в стену своей зоны, разворачиваем перед ходьбой
            if ((d.speed > 0 && d.pos + 10 > d.zone.max) || (d.speed < 0 && d.pos - 10 < d.zone.min)) {
                this.reverseDeer(d);
            }
            d.stateTimer = Date.now() + (4000 + Math.random() * 4000); 
        }
    }

    tick(now) {
        const currentTime = Date.now();

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
                    d.el.style.left = `${d.pos}%`;
                } else {
                    d.state = 'LOST';
                    d.el.classList.remove('walk');
                    d.el.classList.add('idle');
                }
            } else if (d.state === 'RETURNING') {
                // Возвращается в центр своей зоны
                const targetX = (d.zone.min + d.zone.max) / 2; 
                if (Math.abs(d.pos - targetX) > 2) {
                    const dir = d.pos > targetX ? -0.4 : 0.4;
                    d.pos += dir;
                    d.el.style.left = `${d.pos}%`;
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
                // Проверяем границы СВОЕЙ зоны (чтобы не зайти на чум и не упасть с острова)
                if (nextPos > d.zone.max || nextPos < d.zone.min) {
                    this.reverseDeer(d);
                    // Немного сдвигаем обратно, чтобы не застрять в стене
                    d.pos += d.speed; 
                    d.el.style.left = `${d.pos}%`;
                    continue;
                }
                d.pos += d.speed;
                d.el.style.left = `${d.pos}%`;
                
                const collision = this.deers.find(other => {
                    if (other.id === d.id) return false;
                    const dist = other.pos - d.pos;
                    const isAhead = (d.speed > 0 && dist > 0) || (d.speed < 0 && dist < 0);
                    return isAhead && Math.abs(dist) < 15 && 
                           Math.abs(parseFloat(other.el.style.bottom) - parseFloat(d.el.style.bottom)) < 1;
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
        d.targetX = 200; 
        d.speed = 0.3;
        d.isFlipped = false;
        d.el.classList.remove('flip');
    }
}

window.addEventListener('load', () => {
    window.DeerSystem = new DeerSystem();
    window.DeerSystem.init();
});
