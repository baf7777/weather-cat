class Fireworks {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none'; 
        this.canvas.style.zIndex = '9999';
        document.body.appendChild(this.canvas);

        this.rockets = [];
        this.particles = [];
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.animate();

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initListeners());
        } else {
            this.initListeners();
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    initListeners() {
        const gifts = document.querySelectorAll('.gift-box, #the-box');
        
        gifts.forEach(gift => {
            gift.addEventListener('click', (e) => {
                const x = e.clientX;
                const y = e.clientY;
                this.launchRocket(x, y);
            });
        });
    }

    launchRocket(x, y) {
        // Запускаем ракету. Целевую высоту убрали, теперь всё решает физика
        this.rockets.push(new Rocket(x, y));
    }

    createExplosion(x, y) {
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffd700', '#ffffff', '#ff00ff', '#00ffff'];
        const particleCount = 100;

        for (let i = 0; i < particleCount; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.particles.push(new Particle(x, y, color));
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Шлейф исчезает быстрее
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalCompositeOperation = 'source-over';

        // Обновляем ракеты
        for (let i = this.rockets.length - 1; i >= 0; i--) {
            const r = this.rockets[i];
            r.update();
            r.draw(this.ctx);

            // Взрываемся, если ракета начала падать (вертикальная скорость стала положительной)
            // или вылетела за верхний край (на всякий случай)
            if (r.vy >= -1 || r.y < 50) {
                this.createExplosion(r.x, r.y);
                this.rockets.splice(i, 1);
            }
        }

        // Обновляем частицы
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update();
            p.draw(this.ctx);

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
}

class Rocket {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        // Случайная скорость вылета, чтобы высота взрыва была разной
        this.vy = -(Math.random() * 5 + 12); // от -12 до -17
        this.color = '#ffff00';
    }

    update() {
        this.y += this.vy;
        this.vy += 0.25; // Гравитация (замедляет полет вверх)
    }

    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
        
        // Рисуем хвост
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + 5);
        ctx.lineTo(this.x, this.y + 20);
        ctx.strokeStyle = 'rgba(255, 200, 50, 0.6)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 2; 
        
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        this.alpha = 1;
        this.decay = Math.random() * 0.015 + 0.01;
        this.gravity = 0.15;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity; 
        this.vx *= 0.95; 
        this.vy *= 0.95;
        this.alpha -= this.decay;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

new Fireworks();