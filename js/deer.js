// js/deer.js
class DeerSystem {
    constructor() {
        this.deers = [];
        this.maxDeers = 5;
        this.nextSpawnTime = 0;
    }

    init() {
        requestAnimationFrame((t) => this.tick(t));
    }

    spawnDeer() {
        if (this.deers.length >= this.maxDeers) return;

        const deer = document.createElement('div');
        // Начинаем либо с ходьбы, либо с ожидания
        const initialState = Math.random() > 0.5 ? 'WALK' : 'IDLE';
        deer.className = `deer ${initialState.toLowerCase()}`;
        
        const minX = window.innerWidth * 0.1;
        const maxX = window.innerWidth * 0.5;
        
        const side = Math.random() > 0.5 ? 'left' : 'right';
        const startPos = minX + Math.random() * (maxX - minX);
        
        const speed = 0.12 + Math.random() * 0.1;
        const scale = 0.4 + Math.random() * 0.2; 
        const bottom = 18 + Math.random() * 4; 

        deer.style.left = `${startPos}px`;
        deer.style.bottom = `${bottom}rem`;
        deer.style.transform = `scale(${scale})`;
        
        const isFlipped = Math.random() > 0.5;
        if (isFlipped) deer.classList.add('flip');

        document.body.appendChild(deer);

        const deerObj = {
            el: deer,
            pos: startPos,
            minX: minX,
            maxX: maxX,
            speed: isFlipped ? -speed : speed,
            scale: scale,
            state: initialState,
            isFlipped: isFlipped,
            // Таймер до следующей смены состояния
            stateTimer: Date.now() + (initialState === 'IDLE' ? (5000 + Math.random() * 7000) : (3000 + Math.random() * 4000))
        };

        this.deers.push(deerObj);
        
        deer.addEventListener('click', () => {
            this.toggleDeerState(deerObj);
        });
    }

    toggleDeerState(d) {
        if (d.state === 'WALK') {
            d.state = 'IDLE';
            d.el.classList.remove('walk');
            d.el.classList.add('idle');
            d.stateTimer = Date.now() + (6000 + Math.random() * 8000); // Стоит подольше
        } else {
            d.state = 'WALK';
            d.el.classList.remove('idle');
            d.el.classList.add('walk');
            d.stateTimer = Date.now() + (3000 + Math.random() * 4000); // Идет меньше
        }
    }

    tick(now) {
        if (performance.now() > this.nextSpawnTime) {
            this.spawnDeer();
            this.nextSpawnTime = performance.now() + 5000 + Math.random() * 10000; 
        }

        const currentTime = Date.now();

        for (let i = this.deers.length - 1; i >= 0; i--) {
            const d = this.deers[i];
            
            // Автоматическая смена состояния по таймеру
            if (currentTime > d.stateTimer) {
                this.toggleDeerState(d);
            }

            if (d.state === 'WALK') {
                d.pos += d.speed;
                d.el.style.left = `${d.pos}px`;
                
                // Разворот у границ
                if (d.pos > d.maxX || d.pos < d.minX) {
                    d.speed = -d.speed;
                    d.isFlipped = !d.isFlipped;
                    if (d.isFlipped) d.el.classList.add('flip');
                    else d.el.classList.remove('flip');
                }

                const flip = d.isFlipped ? 'scaleX(-1)' : 'scaleX(1)';
                d.el.style.transform = `scale(${d.scale}) ${flip}`;
            }
        }

        requestAnimationFrame((t) => this.tick(t));
    }
}

window.addEventListener('load', () => {
    window.DeerSystem = new DeerSystem();
    window.DeerSystem.init();
});
