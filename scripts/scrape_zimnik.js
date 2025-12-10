const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function cleanRoadName(rawName) {
    // 1. Если есть конкретный участок в скобках "..." (участок ...)", берем его
    const segmentMatch = rawName.match(/\(участок\s+([^)]+)\)/i);
    if (segmentMatch) {
        return segmentMatch[1].trim();
    }

    // 2. Убираем лишний мусор
    let name = rawName
        .replace(/^Автомобильная дорога/i, '')
        .replace(/^Зимник/i, '')
        .replace(/\(в границах.*?\)/gi, '')
        .replace(/в том числе зимник/gi, '')
        .replace(/с мостовым переходом.*$/i, '') // Убираем детали про мосты
        .trim();

    // Specific cleaning for "Ледовая переправа" if it's not a segment
    if (name.toLowerCase().includes('ледовая переправа')) {
        name = name.replace(/Ледовая переправа через реку Обь автомобильной дороги/i, 'Переправа через Обь: ');
        name = name.replace(/Салехард-Лабытнанги/i, 'Салехард-Лабытнанги').trim(); // Keep this part
    }

    // 3. Убираем лишние символы в начале/конце
    name = name.replace(/^[-–—\s]+|[-–—\s]+$/g, '');

    // 4. Дополнительное сокращение для очень длинных названий, если после очистки все еще длинные
    // Например, если осталось "Лабытнанги - Мужи - Азовы - Теги", то сократить до "Лабытнанги - Мужи - Теги"
    const parts = name.split(' - ').map(p => p.trim());
    if (parts.length > 3) { // If there are more than 3 parts (start - middle1 - middle2 - end)
        name = `${parts[0]} - ${parts[1]} - ${parts[parts.length - 1]}`;
    }
    
    return name;
}

(async () => {
    console.log('Starting Zimnik scraper...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.setViewportSize({ width: 1280, height: 720 });
        console.log('Navigating to map.yanao.ru...');
        await page.goto('https://map.yanao.ru/eks/zimnik', { waitUntil: 'networkidle', timeout: 60000 });
        
        try {
            await page.waitForSelector('text=Автомобильная дорога', { timeout: 15000 });
        } catch (e) {
            console.log('Selector timeout, proceeding...');
        }
        await page.waitForTimeout(5000);

        const bodyText = await page.evaluate(() => document.body.innerText);
        const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
        
        const roadsMap = new Map(); // Use Map for deduplication by Name

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Skip headers/garbage and lines that are too short to be a road or status
            if (line.includes('регионального значения') || line.includes('муниципального значения') || line.length < 10) continue;

            // Broader matching for road/crossing lines
            if (line.startsWith('Автомобильная дорога') || line.startsWith('Зимник') || line.includes(' - ') || line.includes('Ледовая переправа')) {
                
                let status = "Неизвестно";
                let foundStatus = false;
                
                // Look up to 3 lines ahead for the status, as "Ледовая переправа" status is long
                for (let j = 1; j <= 3; j++) { 
                    if (i + j < lines.length) {
                        const nextLine = lines[i+j].toLowerCase();
                        if (nextLine.includes('закрыт') || nextLine.includes('открыт') || nextLine.includes('движение') || nextLine.includes('тоннаж') || nextLine.includes('для всех видов транспорта')) {
                            status = lines[i+j];
                            foundStatus = true;
                            break;
                        }
                    }
                }

                if (foundStatus) {
                    const cleanName = cleanRoadName(line);
                    
                    if (cleanName.includes("Коротчаево")) {
                         roadsMap.set("Коротчаево - Красноселькуп", status);
                    } else if (cleanName.length > 3) { // Ensure cleaned name is not empty or too short
                         roadsMap.set(cleanName, status); // Set will handle overwriting duplicates with same cleanName
                    }
                }
            }
        }

        const roads = [];
        roadsMap.forEach((status, road) => {
            roads.push({ road, status });
        });

        console.log(`Found ${roads.length} unique winter roads (including ice crossings).`);
        
        if (roads.length === 0) {
            roads.push({ road: "Данные не получены", status: "Проверьте источник" });
        }

        fs.writeFileSync(path.join(__dirname, '../zimnik.json'), JSON.stringify(roads, null, 2));
        console.log('zimnik.json saved.');

    } catch (e) {
        console.error('Error scraping zimnik:', e);
        fs.writeFileSync(path.join(__dirname, '../zimnik.json'), JSON.stringify([{ road: "Ошибка", status: "Сбой" }], null, 2));
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
