// js/deer.js
class DeerSystem {
    constructor() {
        this.deers = [];
        this.maxDeers = 3;
        this.nextSpawnTime = 0;
    }

    init() {
        // Запускаем цикл обновления
        requestAnimationFrame((t) => this.tick(t));
    }

    spawnDeer() {
        if (this.deers.length >= this.maxDeers) return;

        const deer = document.createElement('div');
        deer.className = 'deer walk';
        
        // Рандомные параметры
        const side = Math.random() > 0.5 ? 'left' : 'right';
        const startPos = side === 'left' ? -100 : window.innerWidth + 100;
        const targetPos = side === 'left' ? window.innerWidth + 200 : -200;
        const speed = 0.6 + Math.random() * 0.8;
        const scale = 0.8 + Math.random() * 0.4;
        const bottom = 5 + Math.random() * 5; // Разная высота в "снегу"

        deer.style.left = `${startPos}px`;
        deer.style.bottom = `${bottom}rem`;
        deer.style.transform = `scale(${scale})`;
        
        if (side === 'right') {
            deer.classList.add('flip');
        }

        document.body.appendChild(deer);

        const deerObj = {
            el: deer,
            pos: startPos,
            target: targetPos,
            speed: side === 'left' ? speed : -speed,
            scale: scale,
            state: 'WALK',
            isFlipped: side === 'right'
        };

        this.deers.push(deerObj);
        
        // Клик по оленю
        deer.addEventListener('click', () => {
            if (deerObj.state === 'WALK') {
                deerObj.state = 'IDLE';
                deer.classList.remove('walk');
                deer.classList.add('idle');
                
                // Через 3 секунды пойдет дальше
                setTimeout(() => {
                    deerObj.state = 'WALK';
                    deer.classList.remove('idle');
                    deer.classList.add('walk');
                }, 3000);
            }
        });
    }

    tick(now) {
        if (now > this.nextSpawnTime) {
            this.spawnDeer();
            this.nextSpawnTime = now + 10000 + Math.random() * 15000; // Раз в 10-25 секунд
        }

        for (let i = this.deers.length - 1; i >= 0; i--) {
            const d = this.deers[i];
            
            if (d.state === 'WALK') {
                d.pos += d.speed;
                d.el.style.left = `${d.pos}px`;
                
                // Зеркальное отображение
                const flip = d.isFlipped ? 'scaleX(-1)' : 'scaleX(1)';
                d.el.style.transform = `scale(${d.scale}) ${flip}`;
            }

            // Удаляем если ушел за экран
            if ((d.speed > 0 && d.pos > window.innerWidth + 300) || 
                (d.speed < 0 && d.pos < -300)) {
                d.el.remove();
                this.deers.splice(i, 1);
            }
        }

        requestAnimationFrame((t) => this.tick(t));
    }
}

// Инициализация после загрузки
window.addEventListener('load', () => {
    window.DeerSystem = new DeerSystem();
    window.DeerSystem.init();
});
