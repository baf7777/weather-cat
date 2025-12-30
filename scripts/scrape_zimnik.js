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
    console.log('Starting Zimnik scraper with details...');
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
        await page.goto('https://map.yanao.ru/eks/zimnik', { waitUntil: 'networkidle', timeout: 90000 });
        
        console.log('Waiting for list content...');
        await page.waitForSelector('.source-widget-table tbody tr', { timeout: 30000 });

        const results = [];
        const rows = await page.$$('.source-widget-table tbody tr');
        console.log(`Found ${rows.length} winter roads in list.`);

        for (let i = 0; i < rows.length; i++) {
            try {
                // Re-fetch rows to avoid "element handle is detached" error after navigation/interaction
                const currentRows = await page.$$('.source-widget-table tbody tr');
                const row = currentRows[i];
                
                // Get basic info from the row
                const cells = await row.$$('td');
                if (cells.length < 2) continue;

                const rawName = await cells[0].innerText();
                const status = await cells[1].innerText();
                const cleanName = cleanRoadName(rawName);

                console.log(`Processing: ${cleanName}...`);

                // Click to open details
                await row.click();
                await page.waitForTimeout(2000); // Wait for card to appear

                // Extract tonnage from the attribute table that appeared
                const details = await page.evaluate(() => {
                    const data = {};
                    const attrRows = Array.from(document.querySelectorAll('tr'));
                    for (const r of attrRows) {
                        const nameCol = r.querySelector('.identify-attribute-name-column');
                        if (nameCol) {
                            const name = nameCol.innerText.trim();
                            const valCol = r.querySelector('td:nth-child(2) div');
                            if (valCol) {
                                const val = valCol.innerText.trim();
                                if (name.includes('масса (день)')) data.massDay = val;
                                if (name.includes('масса (ночь)')) data.massNight = val;
                            }
                        }
                    }
                    return data;
                });

                results.push({
                    road: cleanName,
                    status: status,
                    massDay: details.massDay || null,
                    massNight: details.massNight || null
                });

                // Optional: Close the identify dialog to clear space, 
                // but usually clicking another row just updates it.
                // Let's look for a close button just in case.
                const closeBtn = await page.$('.identify-dialog-close, .board-close');
                if (closeBtn) await closeBtn.click();

            } catch (err) {
                console.error(`Error processing row ${i}:`, err.message);
            }
        }

        // Deduplicate and filter
        const finalResults = [];
        const seen = new Set();
        for (const item of results) {
            if (!seen.has(item.road)) {
                finalResults.push(item);
                seen.add(item.road);
            }
        }

        console.log(`Saving ${finalResults.length} unique roads with tonnage.`);
        fs.writeFileSync(path.join(__dirname, '../zimnik.json'), JSON.stringify(finalResults, null, 2));
        console.log('zimnik.json saved.');

    } catch (e) {
        console.error('Error scraping zimnik:', e);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
