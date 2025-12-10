const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    console.log('Starting Zimnik scraper...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // Set a realistic viewport
        await page.setViewportSize({ width: 1280, height: 720 });

        console.log('Navigating to map.yanao.ru...');
        await page.goto('https://map.yanao.ru/eks/zimnik', { waitUntil: 'networkidle', timeout: 60000 });
        
        console.log('Waiting for content...');
        // Wait for the side panel or specific text to ensure data is loaded
        try {
            await page.waitForSelector('text=Автомобильная дорога', { timeout: 15000 });
        } catch (e) {
            console.log('Selector timeout, proceeding with whatever is loaded...');
        }
        
        // Wait a bit more for dynamic rendering
        await page.waitForTimeout(5000);

        // Get the full text content of the body. 
        // We use innerText as it approximates the visual layout (newlines for blocks).
        const bodyText = await page.evaluate(() => document.body.innerText);

        // Parse the text
        const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
        const roads = [];

        // Heuristic:
        // We look for lines that look like road names.
        // The Status is usually the line immediately following the road name.
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check if line is a road name
            // Keywords based on the dump: "Автомобильная дорога", "Зимник"
            if (line.startsWith('Автомобильная дорога') || line.startsWith('Зимник') || line.includes('Лабытнанги - Мужи') || line.includes('Аксарка - Салемал')) {
                
                // Avoid capturing the header or random text
                if (line.length < 10) continue;

                // The status should be the next line
                if (i + 1 < lines.length) {
                    const status = lines[i+1];
                    
                    // Validate status looks like a status
                    // Valid statuses: "закрыт", "открыт", "разрешено...", "движение..."
                    // If the next line is another road or a date, then we missed the status or it's formatted differently.
                    // But based on the dump, it was "Road\nStatus".
                    
                    // Check if status is just a date (sometimes happens in sidebars)
                    if (status.match(/^\d{2}\.\d{2}\.\d{4}/)) continue;

                    roads.push({
                        road: line,
                        status: status
                    });
                }
            }
        }

        console.log(`Found ${roads.length} winter roads.`);
        
        if (roads.length === 0) {
            console.warn("No roads found! Dumping text for debug:");
            console.log(bodyText.substring(0, 500) + "...");
            // Add a fallback so the UI doesn't break
            roads.push({ road: "Данные не получены", status: "Проверьте источник" });
        }

        fs.writeFileSync(path.join(__dirname, '../zimnik.json'), JSON.stringify(roads, null, 2));
        console.log('zimnik.json saved.');

    } catch (e) {
        console.error('Error scraping zimnik:', e);
        // Fallback file
        fs.writeFileSync(path.join(__dirname, '../zimnik.json'), JSON.stringify([{ road: "Ошибка обновления", status: "Сбой скрапера" }], null, 2));
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
