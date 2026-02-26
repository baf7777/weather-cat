// js/deer.js
class DeerSystem {
    constructor() {
        this.deers = [];
        this.maxDeers = 5;
    }

    init() {
        // Сразу создаем 5 оленей
        for (let i = 0; i < this.maxDeers; i++) {
            this.spawnDeer();
        }
        requestAnimationFrame((t) => this.tick(t));
    }

    spawnDeer() {
        const deer = document.createElement('div');
        const initialState = Math.random() > 0.5 ? 'WALK' : 'IDLE';
        deer.className = `deer ${initialState.toLowerCase()}`;
        
        // Пастбище возле чума (от 5% до 45% экрана)
        const minX = window.innerWidth * 0.05;
        const maxX = window.innerWidth * 0.45;
        
        // Случайная позиция, которая не слишком близко к другим оленям
        let startPos;
        let attempts = 0;
        do {
            startPos = minX + Math.random() * (maxX - minX);
            attempts++;
        } while (this.isTooClose(startPos) && attempts < 10);
        
        const speed = 0.1 + Math.random() * 0.1;
        const scale = 0.4 + Math.random() * 0.15; 
        const bottomRem = 18 + Math.random() * 4; 

        deer.style.left = `${startPos}px`;
        deer.style.bottom = `${bottomRem}rem`;
        // Устанавливаем z-index на основе высоты (чем ниже на экране, тем ближе к нам)
        deer.style.zIndex = Math.round(100 - bottomRem);
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
            state: initialState,
            isFlipped: isFlipped,
            width: 40, // Примерная ширина оленя для коллизий
            stateTimer: Date.now() + (initialState === 'IDLE' ? (5000 + Math.random() * 7000) : (3000 + Math.random() * 4000))
        };

        this.deers.push(deerObj);
        
        deer.addEventListener('click', () => {
            this.toggleDeerState(deerObj);
        });
    }

    isTooClose(x, id = null) {
        return this.deers.some(d => d.id !== id && Math.abs(d.pos - x) < 50);
    }

    toggleDeerState(d) {
        if (d.state === 'WALK') {
            d.state = 'IDLE';
            d.el.classList.remove('walk');
            d.el.classList.add('idle');
            d.stateTimer = Date.now() + (6000 + Math.random() * 10000); 
        } else {
            d.state = 'WALK';
            d.el.classList.remove('idle');
            d.el.classList.add('walk');
            d.stateTimer = Date.now() + (3000 + Math.random() * 5000); 
        }
    }

    tick(now) {
        // Поддерживаем ровно 5 оленей
        if (this.deers.length < this.maxDeers) {
            this.spawnDeer();
        }

        const currentTime = Date.now();

        for (let i = 0; i < this.deers.length; i++) {
            const d = this.deers[i];
            
            if (currentTime > d.stateTimer) {
                this.toggleDeerState(d);
            }

            if (d.state === 'WALK') {
                let nextPos = d.pos + d.speed;

                // 1. Проверка границ пастбища
                if (nextPos > d.maxX || nextPos < d.minX) {
                    this.reverseDeer(d);
                    continue;
                }

                // 2. Проверка столкновения с другими оленями
                const collision = this.deers.find(other => 
                    other.id !== d.id && 
                    Math.abs(other.pos - nextPos) < 45 && // Дистанция между оленями
                    Math.abs(parseFloat(other.el.style.bottom) - parseFloat(d.el.style.bottom)) < 1 // Только если на одной линии
                );

                if (collision) {
                    // Если впереди кто-то есть, олень просто останавливается и ждет
                    d.state = 'IDLE';
                    d.el.classList.remove('walk');
                    d.el.classList.add('idle');
                    d.stateTimer = currentTime + (2000 + Math.random() * 3000);
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
