
window.ZimnikSystem = {
    data: [],
    
    async init() {
        console.log("ZimnikSystem init");
        await this.loadData();
        this.createUI();
    },

    async loadData() {
        try {
            const res = await fetch('zimnik.json?nocache=' + Date.now());
            if (res.ok) {
                this.data = await res.json();
            } else {
                throw new Error("zimnik.json not found");
            }
        } catch (e) {
            console.warn("Could not load zimnik data:", e);
            this.data = [{ road: "Данные недоступны", status: "Ошибка" }];
        }
    },

    createUI() {
        // 1. Create Button
        const btn = document.createElement('div');
        btn.className = 'schedule-btn'; // Reuse same style
        btn.title = "Зимники Ямала";
        
        // Position it: The Helicopter is at left: 160px.
        // Button width 44px + gap 16px = 60px step.
        // 160 + 60 = 220px.
        btn.style.left = '220px';
        btn.style.top = '20px';
        btn.style.right = 'auto';

        // Icon: Road Image
        btn.innerHTML = `<img src="assets/road.png" alt="Zimnik" style="width: 42px; height: 42px; object-fit: contain; filter: brightness(0.15) contrast(1.5);">`;
        
        document.body.appendChild(btn);

        // 2. Create Board (Modal)
        const board = document.createElement('div');
        board.className = 'schedule-board';
        board.id = 'zimnik-board'; // ID for specific styling if needed

        const renderList = () => {
            if (this.data.length === 0) {
                return `<li class="flight-item"><div class="f-info" style="width:100%; text-align:center;">Нет данных</div></li>`;
            }

            return this.data.map(item => {
                const statusLower = item.status.toLowerCase();
                let statusClass = "st-ok"; // Default green
                
                // Logic for status color
                if (statusLower.includes("закрыт") || statusLower.includes("запрещ") || statusLower.includes("нет")) {
                    statusClass = "st-cancel";
                }

                // Clean up road name (sometimes too long)
                let roadName = item.road.replace("Автомобильная дорога", "").replace("Зимник", "").trim();
                // If it starts with "-", remove it
                if (roadName.startsWith("-")) roadName = roadName.substring(1).trim();

                return `
                <li class="flight-item">
                    <div class="f-info" style="max-width: 65%;">
                        <span class="f-route">${roadName}</span>
                    </div>
                    <div class="f-info" style="align-items: flex-end; max-width: 35%; text-align: right;">
                        <span class="f-status ${statusClass}">${item.status}</span>
                    </div>
                </li>
                `;
            }).join('');
        };

        board.innerHTML = `
            <div class="board-header">
                <div class="board-title">Зимники</div>
                <div class="board-close">&times;</div>
            </div>
            <ul class="flight-list">
                ${renderList()}
            </ul>
        `;
        document.body.appendChild(board);

        // 3. Events
        const toggle = () => {
            // Close others if open (optional)
            const otherBoard = document.querySelector('.schedule-board.active');
            if (otherBoard && otherBoard !== board) otherBoard.classList.remove('active');
            
            board.classList.toggle('active');
        };

        btn.addEventListener('click', toggle);
        board.querySelector('.board-close').addEventListener('click', () => board.classList.remove('active'));
    }
};

// Auto-init if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.ZimnikSystem.init());
} else {
    window.ZimnikSystem.init();
}
