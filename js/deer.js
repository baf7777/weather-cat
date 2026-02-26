// js/deer.js
class DeerSystem {
    constructor() {
        this.deers = [];
        this.maxDeers = 5;
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
        const initialState = Math.random() > 0.5 ? 'WALK' : 'IDLE';
        deer.className = `deer ${initialState.toLowerCase()}`;
        
        const chumPos = this.getChumPos();
        // Возвращаем компактный радиус прогулки
        const range = window.innerWidth < 600 ? 80 : 150; 
        const minX = Math.max(10, chumPos.x - range);
        const maxX = Math.min(window.innerWidth - 50, chumPos.x + range);
        
        let startPos = minX + Math.random() * (maxX - minX);
        
        const speed = 0.06 + Math.random() * 0.06;
        const scale = 0.4 + Math.random() * 0.15; 
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
            speed: isFlipped ? -speed : speed,
            scale: scale,
            state: initialState,
            isFlipped: isFlipped,
            // Начальные таймеры: ходьба дольше, стоянка меньше
            stateTimer: Date.now() + (initialState === 'IDLE' ? (2000 + Math.random() * 3000) : (6000 + Math.random() * 6000))
        };

        this.deers.push(deerObj);
        
        deer.addEventListener('click', () => {
            this.toggleDeerState(deerObj);
        });
    }

    isTooClose(x, id = null) {
        return this.deers.some(d => d.id !== id && Math.abs(d.pos - x) < 60);
    }

    toggleDeerState(d) {
        if (d.state === 'WALK') {
            d.state = 'IDLE';
            d.el.classList.remove('walk');
            d.el.classList.add('idle');
            // Стоит МЕНЬШЕ (от 2 до 5 секунд)
            d.stateTimer = Date.now() + (2000 + Math.random() * 3000); 
        } else {
            d.state = 'WALK';
            d.el.classList.remove('idle');
            d.el.classList.add('walk');
            // Ходит ДОЛЬШЕ (от 6 до 12 секунд)
            d.stateTimer = Date.now() + (6000 + Math.random() * 6000); 
        }
    }

    tick(now) {
        if (this.deers.length < this.maxDeers) {
            this.spawnDeer();
        }

        const currentTime = Date.now();
        const chumPos = this.getChumPos();
        const range = window.innerWidth < 600 ? 80 : 150;
        const minX = Math.max(10, chumPos.x - range);
        const maxX = Math.min(window.innerWidth - 50, chumPos.x + range);

        for (let i = 0; i < this.deers.length; i++) {
            const d = this.deers[i];
            
            if (currentTime > d.stateTimer) {
                this.toggleDeerState(d);
            }

            if (d.state === 'WALK') {
                let nextPos = d.pos + d.speed;

                if (nextPos > maxX || nextPos < minX) {
                    this.reverseDeer(d);
                    continue;
                }

                const collision = this.deers.find(other => {
                    if (other.id === d.id) return false;
                    const dist = other.pos - d.pos;
                    const isAhead = (d.speed > 0 && dist > 0) || (d.speed < 0 && dist < 0);
                    return isAhead && Math.abs(dist) < 70 && 
                           Math.abs(parseFloat(other.el.style.bottom) - parseFloat(d.el.style.bottom)) < 1.5;
                });

                if (collision) {
                    d.state = 'IDLE';
                    d.el.classList.remove('walk');
                    d.el.classList.add('idle');
                    d.stateTimer = currentTime + (1500 + Math.random() * 2000); // Быстро трогается дальше
                } else {
                    d.pos = nextPos;
                    d.el.style.left = `${d.pos}px`;
                    const flip = d.isFlipped ? 'scaleX(-1)' : 'scaleX(1)';
                    d.el.style.transform = `scale(${d.scale}) ${flip}`;
                }
            }
        }

        requestAnimationFrame((t) => this.tick(t));
    }

    reverseDeer(d) {
        d.speed = -d.speed;
        d.isFlipped = !d.isFlipped;
        if (d.isFlipped) d.el.classList.add('flip');
        else d.el.classList.remove('flip');
    }
}

window.addEventListener('load', () => {
    window.DeerSystem = new DeerSystem();
    window.DeerSystem.init();
});
