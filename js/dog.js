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

        this.speeds = {
            toDeer: 1.2,
            toHome: 1.0,
            random: 0.5,
            toNenets: 0.9
        };
    }

    init() {
        this.createDog();
        requestAnimationFrame((t) => this.tick(t));
    }

    getChumPos() {
        const chum = document.querySelector('.chum-bg');
        if (!chum) return { x: window.innerWidth * 0.15, bottom: 32 };
        const rect = chum.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            bottom: this.isMobile ? 38 : 32
        };
    }

    createDog() {
        const chum = this.getChumPos();
        const el = document.createElement('div');
        el.className = 'dog sit';
        
        // На мобилках ставим собаку чуть правее чума, чтобы не в куче
        this.homeX = chum.x + (this.isMobile ? 60 : 50);
        this.pos.x = this.homeX;
        this.pos.bottom = chum.bottom - 2;

        el.style.left = `${this.pos.x}px`;
        el.style.bottom = `${this.pos.bottom}%`;
        el.style.zIndex = 5;
        
        document.body.appendChild(el);
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
            // Ограничиваем гуляние собаки, чтобы не путалась под ногами
            const range = this.isMobile ? 40 : 80;
            this.targetX = this.homeX + (Math.random() * range * 2 - range);
        }
    }

    tick(now) {
        if (!this.el) return;

        const currentTime = Date.now();
        const chum = this.getChumPos();
        this.pos.bottom = chum.bottom - 2;
        this.el.style.bottom = `${this.pos.bottom}%`;

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
                const dist = (target.pos - 30) - this.pos.x;
                if (Math.abs(dist) > 5) {
                    const move = dist > 0 ? this.speeds.toDeer : -this.speeds.toDeer;
                    this.pos.x += move;
                    this.el.style.left = `${this.pos.x}px`;
                    if (move > 0) this.el.classList.add('flip');
                    else this.el.classList.remove('flip');
                } else {
                    this.bark();
                }
            }
        } else if (this.state === 'TO_NENETS') {
            const nenets = window.NenetsSystem;
            if (nenets && nenets.el) {
                const dist = (nenets.pos.x + 20) - this.pos.x;
                if (Math.abs(dist) > 30) {
                    const move = dist > 0 ? this.speeds.toNenets : -this.speeds.toNenets;
                    this.pos.x += move;
                    this.el.style.left = `${this.pos.x}px`;
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
            if (Math.abs(dist) > 5) {
                const move = dist > 0 ? this.speeds.toHome : -this.speeds.toHome;
                this.pos.x += move;
                this.el.style.left = `${this.pos.x}px`;
                if (move > 0) this.el.classList.add('flip');
                else this.el.classList.remove('flip');
            } else {
                this.setState('IDLE');
                this.el.classList.remove('flip');
            }
        } else if (this.state === 'RANDOM_WALK') {
            const dist = this.targetX - this.pos.x;
            if (Math.abs(dist) > 2) {
                const move = dist > 0 ? this.speeds.random : -this.speeds.random;
                this.pos.x += move;
                this.el.style.left = `${this.pos.x}px`;
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
