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

    // 3. Убираем лишние символы в начале/конце
    name = name.replace(/^[-–—\s]+|[-–—\s]+$/g, '');

    // 4. Сокращаем длинные списки городов
    // Лабытнанги - Мужи - Азовы - Теги -> Лабытнанги - Теги
    // Но лучше оставить "Лабытнанги - Мужи - Теги", чтобы понятнее.
    // Пока просто вернем очищенное имя, если оно не слишком длинное.
    
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
        
        // Wait for content
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
            
            // Skip headers/garbage
            if (line.includes('регионального значения') || line.includes('муниципального значения') || line.length < 10) continue;

            if (line.startsWith('Автомобильная дорога') || line.startsWith('Зимник') || line.includes(' - ')) {
                
                // Try to find status in the next few lines (sometimes there's an empty line)
                let status = "Неизвестно";
                let foundStatus = false;
                
                for (let j = 1; j <= 2; j++) {
                    if (i + j < lines.length) {
                        const nextLine = lines[i+j].toLowerCase();
                        if (nextLine.includes('закрыт') || nextLine.includes('открыт') || nextLine.includes('движение') || nextLine.includes('тоннаж')) {
                            status = lines[i+j];
                            foundStatus = true;
                            break;
                        }
                    }
                }

                if (foundStatus) {
                    const cleanName = cleanRoadName(line);
                    
                    // Specific fix for "Korotchaevo" which often has long text
                    if (cleanName.includes("Коротчаево")) {
                         roadsMap.set("Коротчаево - Красноселькуп", status);
                    } else if (cleanName.length > 3) {
                         // Only add if we haven't seen this EXACT name+status combination OR overwrite?
                         // Usually we want unique names.
                         // If duplicates have same name but different status, that's tricky.
                         // But usually duplicates are just artifacts.
                         if (!roadsMap.has(cleanName)) {
                             roadsMap.set(cleanName, status);
                         }
                    }
                }
            }
        }

        const roads = [];
        roadsMap.forEach((status, road) => {
            roads.push({ road, status });
        });

        console.log(`Found ${roads.length} unique winter roads.`);
        
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
