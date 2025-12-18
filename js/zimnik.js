
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
        // Контейнер для кнопок слева
        const container = document.querySelector('.controls-left');

        // 1. Create Button
        const btn = document.createElement('div');
        btn.className = 'schedule-btn'; // Reuse same style
        btn.title = "Зимники Ямала";
        
        // Icon: Road Image
        btn.innerHTML = `<img src="assets/road.webp" alt="Zimnik" style="width: 3.2rem; height: 3.2rem; object-fit: contain; filter: brightness(0.15) contrast(1.5);">`;
        
        if (container) {
            container.appendChild(btn);
        } else {
            document.body.appendChild(btn);
        }

        // 2. Create Board (Modal)
        const board = document.createElement('div');
        board.className = 'schedule-board';
        board.id = 'zimnik-board'; // ID for specific styling if needed

        const renderList = () => {
            if (this.data.length === 0) {
                return `<li class="flight-item"><div class="f-info" style="width:100%; text-align:center;">Нет данных</div></li>`;
            }

            // Define the custom order based on the user's request.
            // These should match the canonical names produced by scripts/scrape_zimnik.js
            const customOrder = [
                "Яр-Сале - Панаевск",
                "Панаевск - Салемал",
                "Салемал - Аксарка",
                "Ледовая переправа",
                "Коротчаево - Красноселькуп",
                "Лабытнанги - Мужи - Теги" // Any remaining at the end
            ];

            const sortedData = [...this.data].sort((a, b) => {
                // Use the canonical road names directly from the data for sorting
                let indexA = customOrder.indexOf(a.road);
                let indexB = customOrder.indexOf(b.road);

                // If a road is not in customOrder, put it at the end
                // Assign a high number (e.g., customOrder.length) to items not in the list
                indexA = indexA === -1 ? customOrder.length : indexA;
                indexB = indexB === -1 ? customOrder.length : indexB;

                return indexA - indexB;
            });

            return sortedData.map(item => {
                const statusLower = item.status.toLowerCase();
                let statusClass = "st-ok"; // Default green
                let displayStatus = item.status;
                
                // Logic for status color & text shortening
                if (statusLower.includes("закрыт") || statusLower.includes("запрещ") || statusLower.includes("нет")) {
                    statusClass = "st-cancel";
                    displayStatus = "Закрыт";
                } else if (statusLower.includes("открыт") || statusLower.includes("движение")) {
                    if (statusLower.includes("всех видов")) displayStatus = "Открыт (все)";
                    else if (statusLower.includes("полнопривод")) displayStatus = "Только 4х4";
                    else displayStatus = "Открыт";
                }

                // Road name is already cleaned by the scraper; apply display abbreviations
                let roadName = item.road;
                roadName = roadName
                    .replace("Лабытнанги", "Лбт")
                    .replace("Салехард", "Схд")
                    .replace("Красноселькуп", "К.Селькуп");

                return `
                <li class="flight-item" style="padding: 8px 0;">
                    <div class="f-info" style="max-width: 60%;">
                        <span class="f-route" style="font-size: 13px; line-height: 1.2;">${roadName}</span>
                    </div>
                    <div class="f-info" style="align-items: flex-end; max-width: 40%; text-align: right;">
                        <span class="f-status ${statusClass}" style="font-size: 10px; white-space: nowrap;">${displayStatus}</span>
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
