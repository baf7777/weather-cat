const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function cleanRoadName(rawName) {
    if (rawName.toLowerCase().includes('ледовая переправа через реку обь автомобильной дороги салехард-лабытнанги')) {
        return "Ледовая переправа";
    }
    const segmentMatch = rawName.match(/\(участок\s+([^)]+)\)/i);
    if (segmentMatch) {
        let segmentName = segmentMatch[1].trim();
        if (segmentName === "Панаевск - Яр-Сале") return "Яр-Сале - Панаевск";
        if (segmentName === "Аксарка - Салемал") return "Салемал - Аксарка";
        if (segmentName === "Салемал - Панаевск") return "Панаевск - Салемал";
        return segmentName;
    }
    let name = rawName
        .replace(/^Автомобильная дорога/i, '')
        .replace(/^Зимник/i, '')
        .replace(/\(в границах.*?\)/gi, '')
        .replace(/в том числе зимник/gi, '')
        .replace(/с мостовым переходом.*$/i, '')
        .trim();
    name = name.replace(/^[-–—\s]+|[-–—\s]+$/g, '');
    name = name.replace(/[-–—]/g, '-');
    const parts = name.split(' - ').map(p => p.trim());
    if (parts.length > 3) {
        name = `${parts[0]} - ${parts[1]} - ${parts[parts.length - 1]}`;
    }
    name = name.trim();
    if (/Панаевск/i.test(name) && /Яр-Сале/i.test(name)) return "Яр-Сале - Панаевск";
    if (/Аксарка/i.test(name) && /Салемал/i.test(name)) return "Салемал - Аксарка";
    if (/Салемал/i.test(name) && /Панаевск/i.test(name)) return "Панаевск - Салемал";
    return name;
}

(async () => {
    console.log('Starting Zimnik scraper...');
    const browser = await chromium.launch({
        headless: true,
        proxy: {
            server: 'http://62.233.44.186:8225',
            username: 'user349701',
            password: '0trwdj'
        }
    });
    
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    try {
        await page.setViewportSize({ width: 1280, height: 720 });
        console.log('Navigating to map.yanao.ru...');
        
        // Return to domcontentloaded as requested
        await page.goto('https://map.yanao.ru/eks/zimnik', { waitUntil: 'domcontentloaded', timeout: 90000 });
        
        console.log('Page loaded, waiting for list content...');
        await page.waitForTimeout(15000); // Wait for JS rendering

        const bodyText = await page.evaluate(() => document.body ? document.body.innerText : "");
        const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
        
        const roadsMap = new Map();

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('регионального значения') || line.includes('муниципального значения') || line.length < 10) continue;

            if (line.startsWith('Автомобильная дорога') || line.startsWith('Зимник') || line.includes(' - ') || line.includes('Ледовая переправа')) {
                let status = "Неизвестно";
                let foundStatus = false;
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
                    } else if (cleanName.length > 3) {
                         roadsMap.set(cleanName, status);
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