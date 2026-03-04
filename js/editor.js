// js/editor.js
class TundraEditor {
    constructor() {
        this.el = null;
        this.isShown = false;
        this.paused = false;
        this.dragEnabled = false;
        this.draggingElement = null;
        this.dragData = { startX: 0, startY: 0, startValX: 0, startValY: 0, group: '', type: '' };
    }

    init() {
        this.createUI();
        this.createToggleButton();
        this.syncWithConfig();
        this.setupDragEvents();
        console.log("Tundra Editor Initialized. Press 'E' to toggle UI.");
        
        window.addEventListener('keydown', (e) => {
            if (e.key === 'e' || e.key === 'E') this.toggle();
        });
    }

    createToggleButton() {
        const btn = document.createElement('button');
        btn.className = 'toggle-editor';
        btn.innerText = '🛠 Редактор Сцены';
        btn.onclick = () => this.toggle();
        document.body.appendChild(btn);
    }

    createUI() {
        const ui = document.createElement('div');
        ui.className = 'editor-ui';
        ui.innerHTML = `
            <h3>Редактор Сцены</h3>
            
            <div class="editor-group" style="text-align:center; background: #e76f5122; border: 1px solid #e76f51;">
                <label style="color:#e76f51; font-weight:900;">
                    <input type="checkbox" id="drag-mode" onchange="tundraEditor.toggleDrag(this.checked)"> ВКЛЮЧИТЬ ПЕРЕТАСКИВАНИЕ МЫШКОЙ
                </label>
                <p style="font-size:0.9rem; margin-top:0.5rem; opacity:0.8;">Зажми и тащи любой объект на острове</p>
            </div>

            <div class="editor-group">
                <label>Позиция острова (chum-bg)</label>
                ${this.renderSlider('container', 'left', -50, 150)}
                ${this.renderSlider('container', 'bottom', -20, 100)}
                ${this.renderSlider('container', 'width', 5, 100)}
            </div>

            <div class="editor-group">
                <label>Снежная база (tundra-base)</label>
                ${this.renderSlider('base', 'width', 50, 600)}
                ${this.renderSlider('base', 'bottom', -150, 100)}
            </div>

            <div class="editor-group">
                <label>Чум (animated)</label>
                ${this.renderSlider('chum', 'scale', 0.1, 4, 0.05)}
                ${this.renderSlider('chum', 'left', -100, 200)}
                ${this.renderSlider('chum', 'bottom', -100, 150)}
            </div>

            <div class="editor-group">
                <label>Ненец (Nenets)</label>
                ${this.renderSlider('nenets', 'scale', 0.1, 4, 0.1)}
                ${this.renderSlider('nenets', 'bottom', -100, 100)}
                ${this.renderSlider('nenets', 'minX', -300, 300)}
                ${this.renderSlider('nenets', 'maxX', -300, 600)}
            </div>

            <div class="editor-group">
                <label>Собака (Dog)</label>
                ${this.renderSlider('dog', 'scale', 0.1, 4, 0.1)}
                ${this.renderSlider('dog', 'bottom', -100, 100)}
                ${this.renderSlider('dog', 'homeX', -300, 300)}
            </div>

            <div class="editor-group">
                <label>Олени (Deer)</label>
                ${this.renderSlider('deer', 'scaleMin', 0.1, 3, 0.05)}
                ${this.renderSlider('deer', 'scaleMax', 0.1, 3, 0.05)}
                ${this.renderSlider('deer', 'bottom', -100, 100)}
                ${this.renderSlider('deer', 'minX', -300, 300)}
                ${this.renderSlider('deer', 'maxX', -300, 600)}
            </div>

            <div class="editor-actions">
                <button class="editor-btn save-btn" onclick="tundraEditor.applyAll()">Применить</button>
                <button class="editor-btn copy-btn" onclick="tundraEditor.exportConfig()">Копировать JSON</button>
            </div>
            <div class="editor-group" style="margin-top:1rem; text-align:center;">
                <label><input type="checkbox" id="pause-anim" onchange="tundraEditor.togglePause(this.checked)"> Пауза анимации</label>
            </div>
        `;
        document.body.appendChild(ui);
        this.el = ui;

        ui.querySelectorAll('input[type="range"]').forEach(input => {
            input.oninput = (e) => {
                const [group, key] = e.target.id.split('-');
                const val = parseFloat(e.target.value);
                document.getElementById(`${group}-${key}-num`).value = val;
                this.updateLive(group, key, val);
            };
        });

        ui.querySelectorAll('input[type="number"]').forEach(input => {
            input.onchange = (e) => {
                const [group, key] = e.target.id.split('-');
                const val = parseFloat(e.target.value);
                document.getElementById(`${group}-${key}`).value = val;
                this.updateLive(group, key, val);
            };
        });
    }

    renderSlider(group, key, min, max, step = 1) {
        const val = CONFIG.tundra[group][key] || 0;
        return `
            <div class="editor-row">
                <span>${key}</span>
                <input type="range" id="${group}-${key}" min="${min}" max="${max}" step="${step}" value="${val}">
                <input type="number" id="${group}-${key}-num" step="${step}" value="${val}">
            </div>
        `;
    }

    toggle() {
        this.isShown = !this.isShown;
        this.el.classList.toggle('show', this.isShown);
    }

    toggleDrag(enabled) {
        this.dragEnabled = enabled;
        document.body.classList.toggle('editor-drag-mode', enabled);
        if (enabled) {
            this.togglePause(true);
            document.getElementById('pause-anim').checked = true;
        }
    }

    setupDragEvents() {
        window.addEventListener('mousedown', (e) => {
            if (!this.dragEnabled) return;
            
            const target = e.target.closest('.chum-bg, .tundra-base, .chum-animated, .nenets, .dog, .deer');
            if (!target) return;

            e.preventDefault();
            this.draggingElement = target;
            
            let group = '';
            if (target.classList.contains('chum-bg')) group = 'container';
            else if (target.classList.contains('tundra-base')) group = 'base';
            else if (target.classList.contains('chum-animated')) group = 'chum';
            else if (target.classList.contains('nenets')) group = 'nenets';
            else if (target.classList.contains('dog')) group = 'dog';
            else if (target.classList.contains('deer')) group = 'deer';

            this.dragData = {
                startX: e.clientX,
                startY: e.clientY,
                group: group,
                startValX: group === 'dog' ? CONFIG.tundra[group].homeX : 
                           (group === 'deer' || group === 'nenets' ? window[group.charAt(0).toUpperCase() + group.slice(1) + 'System'].pos.x : 
                           (group === 'chum' ? CONFIG.tundra.chum.left : CONFIG.tundra[group].left || 50)),
                startValY: CONFIG.tundra[group].bottom
            };
            
            if (group === 'container') {
                this.dragData.startValX = CONFIG.tundra.container.left;
            }

            target.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.draggingElement) return;

            const dx = e.clientX - this.dragData.startX;
            const dy = e.clientY - this.dragData.startY;

            const group = this.dragData.group;
            
            // Reference sizes for coordinate calculation
            const refWidth = group === 'container' ? window.innerWidth : (document.querySelector('.chum-bg').getBoundingClientRect().width || 200);
            const refHeight = window.innerHeight; // Always use window height for predictable vertical drag

            const pctX = (dx / refWidth) * 100;
            const pctY = -(dy / refHeight) * 100; // Moving mouse UP should increase bottom value

            let newValX = this.dragData.startValX + pctX;
            let newValY = this.dragData.startValY + pctY;

            if (group === 'container') {
                this.updateLive('container', 'left', newValX);
                this.updateLive('container', 'bottom', newValY);
            } else if (group === 'base') {
                this.updateLive('base', 'bottom', newValY);
            } else if (group === 'chum') {
                this.updateLive('chum', 'left', newValX);
                this.updateLive('chum', 'bottom', newValY);
            } else if (group === 'nenets') {
                const sys = window.NenetsSystem;
                sys.pos.x = newValX;
                this.updateLive('nenets', 'bottom', newValY);
                sys.el.style.left = `${sys.pos.x}%`;
            } else if (group === 'dog') {
                const sys = window.DogSystem;
                sys.homeX = newValX;
                sys.pos.x = newValX;
                this.updateLive('dog', 'bottom', newValY);
                this.updateLive('dog', 'homeX', newValX);
                sys.el.style.left = `${sys.pos.x}%`;
            } else if (group === 'deer') {
                this.updateLive('deer', 'bottom', newValY);
                const deerObj = window.DeerSystem.deers.find(d => d.el === this.draggingElement);
                if (deerObj) {
                    deerObj.pos = newValX;
                    deerObj.el.style.left = `${deerObj.pos}%`;
                }
            }

            this.syncSliders();
        });

        window.addEventListener('mouseup', () => {
            if (this.draggingElement) {
                this.draggingElement.style.cursor = '';
                this.draggingElement = null;
            }
        });
    }

    syncSliders() {
        for (const group in CONFIG.tundra) {
            for (const key in CONFIG.tundra[group]) {
                const input = document.getElementById(`${group}-${key}`);
                const num = document.getElementById(`${group}-${key}-num`);
                if (input) input.value = CONFIG.tundra[group][key];
                if (num) num.value = CONFIG.tundra[group][key];
            }
        }
    }

    updateLive(group, key, val) {
        val = Math.round(val * 10) / 10;
        CONFIG.tundra[group][key] = val;
        this.applyToDOM();
    }

    applyToDOM() {
        const t = CONFIG.tundra;
        
        const chumBg = document.querySelector('.chum-bg');
        if (chumBg) {
            chumBg.style.left = `${t.container.left}%`;
            chumBg.style.bottom = `${t.container.bottom}%`;
            chumBg.style.width = `${t.container.width}vmin`;
            chumBg.style.pointerEvents = 'auto'; // Always auto in editor context
        }

        const tundraBase = document.querySelector('.tundra-base');
        if (tundraBase) {
            tundraBase.style.width = `${t.base.width}%`;
            tundraBase.style.bottom = `${t.base.bottom}%`;
            tundraBase.style.pointerEvents = 'auto';
        }

        const chum = document.getElementById('chum');
        if (chum) {
            chum.style.left = `${t.chum.left}%`;
            chum.style.bottom = `${t.chum.bottom}%`;
            chum.style.transform = `translateX(-50%) scale(${t.chum.scale})`;
            chum.style.pointerEvents = 'auto';
        }

        if (window.NenetsSystem && window.NenetsSystem.el) {
            const n = window.NenetsSystem;
            n.el.style.bottom = `${t.nenets.bottom}%`;
            n.el.style.transform = `scale(${t.nenets.scale}) ${n.el.classList.contains('flip') ? 'scaleX(-1)' : ''}`;
            n.el.style.zIndex = 100 - Math.round(t.nenets.bottom); // Чем ниже (меньше bottom), тем больше z-index
            n.el.style.pointerEvents = 'auto';
        }

        if (window.DogSystem && window.DogSystem.el) {
            const d = window.DogSystem;
            d.homeX = t.dog.homeX;
            d.el.style.bottom = `${t.dog.bottom}%`;
            d.el.style.transform = `scale(${t.dog.scale}) ${d.el.classList.contains('flip') ? 'scaleX(-1)' : ''}`;
            d.el.style.zIndex = 100 - Math.round(t.dog.bottom);
            if (d.state === 'IDLE') {
                d.pos.x = d.homeX;
                d.el.style.left = `${d.pos.x}%`;
            }
        }

        if (window.DeerSystem) {
            window.DeerSystem.deers.forEach(d => {
                const b = t.deer.bottom + (Math.random()*4-2);
                d.el.style.bottom = `${b}%`;
                d.el.style.zIndex = 100 - Math.round(b);
                d.el.style.transform = `scale(${d.scale}) ${d.el.classList.contains('flip') ? 'scaleX(-1)' : ''}`;
            });
        }
        
        // Чум тоже имеет z-index
        if (chum) {
            chum.style.zIndex = 100 - Math.round(t.chum.bottom);
        }

        this.drawDebugLines();
    }

    drawDebugLines() {
        const chumBg = document.querySelector('.chum-bg');
        if (!chumBg) return;
        
        document.querySelectorAll('.debug-line').forEach(el => el.remove());

        const t = CONFIG.tundra.deer; // Используем границы оленей как границы острова
        const cz = CONFIG.tundra.chumZone || { min: 25, max: 70 };

        const addLine = (pctX, color, label) => {
            const line = document.createElement('div');
            line.className = 'debug-line';
            // Линии рисуем внутри chumBg, который мы используем как систему координат 0-100%
            line.style.cssText = `
                position: absolute;
                bottom: -50px;
                left: ${pctX}%;
                width: 2px;
                height: 200px;
                background: ${color};
                z-index: 999;
                pointer-events: none;
            `;
            const text = document.createElement('div');
            text.innerText = label;
            text.style.cssText = `
                position: absolute; top: -20px; left: -30px;
                color: ${color}; font-weight: bold; background: rgba(0,0,0,0.5); padding: 2px 4px;
                white-space: nowrap; font-size: 12px;
            `;
            line.appendChild(text);
            chumBg.appendChild(line);
        };

        addLine(t.minX, '#ff4444', 'КРАЙ СНЕГА (ЛЕВО)');
        addLine(t.maxX, '#ff4444', 'КРАЙ СНЕГА (ПРАВО)');
        addLine(cz.min, '#ffdd00', 'СТЕНОЧКА ЧУМА (ЛЕВО)');
        addLine(cz.max, '#ffdd00', 'СТЕНОЧКА ЧУМА (ПРАВО)');
    }

    syncWithConfig() {
        this.applyToDOM();
    }

    applyAll() {
        this.applyToDOM();
    }

    exportConfig() {
        const json = JSON.stringify(CONFIG.tundra, null, 4);
        console.log("TUNDRA CONFIG:", json);
        navigator.clipboard.writeText(json);
        alert("Конфигурация скопирована в буфер обмена!");
    }

    togglePause(paused) {
        this.paused = paused;
        if (paused) document.body.classList.add('editor-paused');
        else document.body.classList.remove('editor-paused');
    }
}

const tundraEditor = new TundraEditor();
window.addEventListener('load', () => tundraEditor.init());
