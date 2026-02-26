// js/dog.js
class DogSystem {
    constructor() {
        this.dog = null;
        this.el = null;
        this.state = 'IDLE'; // IDLE (sitting), WALK, BARK
        this.pos = { x: 0, y: 0 };
        this.stateTimer = 0;
    }

    init() {
        this.createDog();
        requestAnimationFrame((t) => this.tick(t));
    }

    getChumPos() {
        const chum = document.querySelector('.chum-bg');
        if (!chum) return { x: window.innerWidth * 0.15, bottom: 32 };
        const rect = chum.getBoundingClientRect();
        const styles = window.getComputedStyle(chum);
        const isMobile = window.innerWidth < 600;
        return {
            x: rect.left + rect.width / 2,
            bottom: isMobile ? 38 : 32
        };
    }

    createDog() {
        const chum = this.getChumPos();
        const el = document.createElement('div');
        el.className = 'dog sit';
        
        // Позиция рядом с чумом
        this.pos.x = chum.x + 40;
        this.pos.bottom = chum.bottom - 3; // Чуть ниже чума

        el.style.left = `${this.pos.x}px`;
        el.style.bottom = `${this.pos.bottom}%`;
        
        document.body.appendChild(el);
        this.el = el;

        el.addEventListener('click', () => this.bark());
    }

    bark() {
        if (this.state === 'BARK') return;
        const prevState = this.state;
        this.setState('BARK');
        
        if (window.playBark) {
            window.playBark();
        }
        
        // Лает 2 секунды и возвращается в прошлое состояние
        setTimeout(() => {
            this.setState(prevState === 'BARK' ? 'IDLE' : prevState);
        }, 2000);
    }

    setState(newState) {
        if (this.state === newState) return;
        this.el.classList.remove('walk', 'sit', 'bark');
        this.state = newState;
        this.el.classList.add(newState.toLowerCase());
        
        // Настройка таймера для следующей смены состояния
        if (newState === 'IDLE') {
            this.stateTimer = Date.now() + (5000 + Math.random() * 10000);
        } else if (newState === 'WALK') {
            this.stateTimer = Date.now() + (3000 + Math.random() * 5000);
            this.targetX = this.getNewTargetX();
        }
    }

    getNewTargetX() {
        const chum = this.getChumPos();
        const range = 100;
        return chum.x + (Math.random() * range * 2 - range);
    }

    tick(now) {
        if (!this.el) return;

        const currentTime = Date.now();
        const chum = this.getChumPos();

        // Логика смены состояний
        if (currentTime > this.stateTimer && this.state !== 'BARK') {
            if (this.state === 'IDLE') {
                this.setState('WALK');
            } else {
                this.setState('IDLE');
            }
        }

        // Движение
        if (this.state === 'WALK') {
            const dx = this.targetX - this.pos.x;
            if (Math.abs(dx) > 2) {
                const move = dx > 0 ? 1 : -1;
                this.pos.x += move * 0.8;
                this.el.style.left = `${this.pos.x}px`;
                
                if (move > 0) this.el.classList.remove('flip');
                else this.el.classList.add('flip');
            } else {
                this.setState('IDLE');
            }
        }

        // Проверка близости оленей (чтобы погавкать)
        if (this.state === 'IDLE' && window.DeerSystem && window.DeerSystem.deers) {
            const nearbyDeer = window.DeerSystem.deers.find(d => 
                Math.abs(d.pos - this.pos.x) < 60 && 
                Math.abs(parseFloat(d.el.style.bottom) - this.pos.bottom) < 5
            );
            if (nearbyDeer && Math.random() < 0.01) {
                this.bark();
            }
        }

        requestAnimationFrame((t) => this.tick(t));
    }
}

window.addEventListener('load', () => {
    window.DogSystem = new DogSystem();
    window.DogSystem.init();
});
