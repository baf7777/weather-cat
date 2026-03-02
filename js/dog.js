// js/dog.js
class DogSystem {
    constructor() {
        this.el = null;
        this.state = 'IDLE'; 
        this.pos = { x: 0, bottom: 0 };
        this.homeX = 0;
        this.targetX = 0;
        this.stateTimer = 0;
        this.isMobile = window.innerWidth < 600;
    }

    init() {
        this.createDog();
        requestAnimationFrame((t) => this.tick(t));
    }

    createDog() {
        const chumBg = document.querySelector('.chum-bg');
        if (!chumBg) return;

        const el = document.createElement('div');
        el.className = 'dog sit';
        
        const t = CONFIG.tundra.dog;
        this.homeX = t.homeX;
        this.pos.x = this.homeX;
        this.pos.bottom = t.bottom;

        el.style.left = `${this.pos.x}%`;
        el.style.bottom = `${this.pos.bottom}%`;
        el.style.transform = `scale(${t.scale})`;
        el.style.zIndex = 5;
        
        chumBg.appendChild(el);
        this.el = el;

        el.addEventListener('click', () => this.startMission());
        this.stateTimer = Date.now() + 5000;
    }

    startMission() {
        if (this.state !== 'IDLE' && this.state !== 'RANDOM_WALK') return;
        if (!window.DeerSystem || !window.DeerSystem.escapedDeer) {
            this.bark();
            return;
        }
        this.setState('TO_DEER');
    }

    bark() {
        this.setState('BARKING');
        if (window.playBark) window.playBark();
        
        setTimeout(() => {
            if (window.DeerSystem && window.DeerSystem.escapedDeer && this.state === 'BARKING') {
                const d = window.DeerSystem.escapedDeer;
                d.state = 'RETURNING';
                d.el.classList.remove('idle');
                d.el.classList.add('walk');
                this.setState('TO_HOME');
            } else {
                this.setState('IDLE');
            }
        }, 1500);
    }

    setState(newState) {
        if (!this.el) return;
        this.el.classList.remove('walk', 'sit', 'bark');
        this.state = newState;
        
        let className = 'sit';
        if (newState === 'TO_DEER' || newState === 'TO_HOME' || newState === 'RANDOM_WALK' || newState === 'TO_NENETS') className = 'walk';
        if (newState === 'BARKING') className = 'bark';
        
        this.el.classList.add(className);

        if (newState === 'IDLE') {
            this.stateTimer = Date.now() + 10000 + Math.random() * 10000;
        } else if (newState === 'RANDOM_WALK') {
            const cz = CONFIG.tundra.chumZone;
            const t = CONFIG.tundra.dog;
            
            // Собака гуляет либо справа, либо слева от чума, не пересекая его
            let minX = -60;
            let maxX = 160;
            
            if (this.homeX > cz.max) {
                // Собака живет справа
                minX = cz.max;
            } else if (this.homeX < cz.min) {
                // Собака живет слева
                maxX = cz.min;
            }
            
            const range = this.isMobile ? 30 : 60;
            this.targetX = this.homeX + (Math.random() * range - range/2);
            this.targetX = Math.max(minX, Math.min(maxX, this.targetX));
        }
    }

    tick(now) {
        if (!this.el) return;
        if (window.tundraEditor && window.tundraEditor.paused) {
            requestAnimationFrame((t) => this.tick(t));
            return;
        }

        const currentTime = Date.now();
        const t = CONFIG.tundra.dog;
        this.el.style.bottom = `${t.bottom}%`;
        this.homeX = t.homeX;

        if (this.state === 'IDLE' && currentTime > this.stateTimer) {
            const rand = Math.random();
            if (rand < 0.2 && window.NenetsSystem && window.NenetsSystem.el) {
                this.setState('TO_NENETS');
            } else {
                this.setState('RANDOM_WALK');
            }
        }

        if (this.state === 'TO_DEER') {
            const target = window.DeerSystem.escapedDeer;
            if (target) {
                const dist = (target.pos - 10) - this.pos.x;
                if (Math.abs(dist) > 2) {
                    const move = dist > 0 ? 0.3 : -0.3;
                    this.pos.x += move;
                    this.el.style.left = `${this.pos.x}%`;
                    
                    const flip = move > 0 ? 'scaleX(-1)' : '';
                    this.el.style.transform = `scale(${t.scale}) ${flip}`;
                    if (move > 0) this.el.classList.add('flip');
                    else this.el.classList.remove('flip');
                } else {
                    this.bark();
                }
            }
        } else if (this.state === 'TO_NENETS') {
            const nenets = window.NenetsSystem;
            if (nenets && nenets.el) {
                const dist = (nenets.pos.x + 10) - this.pos.x;
                if (Math.abs(dist) > 5) {
                    const move = dist > 0 ? 0.3 : -0.3;
                    this.pos.x += move;
                    this.el.style.left = `${this.pos.x}%`;
                    
                    const flip = move > 0 ? 'scaleX(-1)' : '';
                    this.el.style.transform = `scale(${t.scale}) ${flip}`;
                    if (move > 0) this.el.classList.add('flip');
                    else this.el.classList.remove('flip');
                } else {
                    this.bark();
                }
            } else {
                this.setState('TO_HOME');
            }
        } else if (this.state === 'TO_HOME') {
            const dist = this.homeX - this.pos.x;
            if (Math.abs(dist) > 2) {
                const move = dist > 0 ? 0.3 : -0.3;
                this.pos.x += move;
                this.el.style.left = `${this.pos.x}%`;
                
                const flip = move > 0 ? 'scaleX(-1)' : '';
                this.el.style.transform = `scale(${t.scale}) ${flip}`;
                if (move > 0) this.el.classList.add('flip');
                else this.el.classList.remove('flip');
            } else {
                this.setState('IDLE');
                this.el.classList.remove('flip');
                this.el.style.transform = `scale(${t.scale})`;
            }
        } else if (this.state === 'RANDOM_WALK') {
            const cz = CONFIG.tundra.chumZone;
            let minX = CONFIG.tundra.dog.minX || -30;
            let maxX = CONFIG.tundra.dog.maxX || 160;
            
            if (this.homeX >= cz.max) minX = cz.max;
            else if (this.homeX <= cz.min) maxX = cz.min;

            const dist = this.targetX - this.pos.x;
            if (Math.abs(dist) > 1) {
                let move = dist > 0 ? 0.3 : -0.3;
                
                let nextPos = this.pos.x + move;
                if (nextPos > maxX || nextPos < minX) {
                    this.setState('IDLE'); // Отменяем прогулку, если уперлись в край
                    return requestAnimationFrame((t) => this.tick(t));
                }

                this.pos.x += move;
                this.el.style.left = `${this.pos.x}%`;
                
                const flip = move > 0 ? 'scaleX(-1)' : '';
                this.el.style.transform = `scale(${t.scale}) ${flip}`;
                if (move > 0) this.el.classList.add('flip');
                else this.el.classList.remove('flip');
            } else {
                this.setState('IDLE');
            }
        }

        requestAnimationFrame((t) => this.tick(t));
    }
}

window.addEventListener('load', () => {
    window.DogSystem = new DogSystem();
    window.DogSystem.init();
});
