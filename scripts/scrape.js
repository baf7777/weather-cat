const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function getFlights(page, type) {
    try {
        console.log(`Switching to ${type} tab...`);
        // Click the tab (departure or arrival)
        const tabSelector = type === 'departure' ? '.tts-departure' : '.tts-arrival';
        
        // Check if tab is already active
        const isAlreadyActive = await page.$eval(tabSelector, el => el.classList.contains('active')).catch(() => false);
        
        if (!isAlreadyActive) {
            await page.click(tabSelector);
            // Instead of networkidle, wait for a short period or for the list to update.
            // Since we can't easily know if the list updated without comparing, a simple sleep is safer for this specific site structure.
            await page.waitForTimeout(3000); 
        } else {
            console.log('Tab already active.');
        }

        // Wait for flight items to be present
        await page.waitForSelector('article.flight-item', { timeout: 10000 }).catch(() => console.log('No flight items found immediately.'));

        const flightItems = await page.$$('article.flight-item');
        const flights = [];

        console.log(`Parsing ${flightItems.length} items for ${type}...`);

        for (const item of flightItems) {
            // Helper to safe extract text
            const getText = async (selector) => {
                try {
                    return await item.$eval(selector, el => el.textContent.trim());
                } catch (e) {
                    return '';
                }
            };

            const flightNumberRaw = await getText('.tth-flight');
            const destinationRaw = await getText('.tth-destination');
            const scheduledTime = await getText('.tth-time');
            const estimatedTime = await getText('.tth-time-count');
            const status = await getText('.tth-status');
            const fiTitle = await getText('.fi-title');

            // Skip empty items if any
            if (!flightNumberRaw) continue;

            let flightNumber = flightNumberRaw.replace(/\s+/g, ' '); 
            let from = '';
            let to = '';

            const routeMatch = fiTitle.match(/(.+) → (.+)/);
            if (routeMatch) {
                from = routeMatch[1].trim();
                to = routeMatch[2].trim();
            } else {
                if (type === 'departure') {
                    from = 'Салехард';
                    to = destinationRaw;
                } else { 
                    from = destinationRaw;
                    to = 'Салехард';
                }
            }

            flights.push({
                number: flightNumber,
                from: from,
                to: to,
                scheduledTime: scheduledTime,
                estimatedTime: estimatedTime,
                status: status,
                type: type 
            });
        }
        return flights;
    } catch (e) {
        console.error(`Error getting flights for ${type}:`, e);
        return [];
    }
}

(async () => {
    console.log('Starting scraper...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    const page = await context.newPage();

    try {
        console.log('Navigating to slyport.ru...');
        await page.goto('https://slyport.ru/passengers/information/timetable/', { timeout: 60000, waitUntil: 'domcontentloaded' });
        
        console.log('Waiting for content to load...');
        await page.waitForTimeout(10000); // Increased wait time for DDoS-Guard and content rendering

        const allFlights = [];
        allFlights.push(...await getFlights(page, 'departure'));
        await page.waitForTimeout(1000); // Small pause between tab clicks
        allFlights.push(...await getFlights(page, 'arrival'));

        console.log(`Found ${allFlights.length} total flights.`);

        if (allFlights.length === 0) {
            console.log("Warning: No flights parsed. Using fallback data.");
            // Вернем хотя бы тестовый массив, чтобы проверить интеграцию
            allFlights.push({ number: "TEST-1", from: "Сайт", to: "Загрузка...", scheduledTime: "--:--", estimatedTime: "--:--", status: "Нет данных" });
        }

        fs.writeFileSync(path.join(__dirname, '../flights.json'), JSON.stringify(allFlights, null, 2));
        console.log('flights.json saved.');

    } catch (e) {
        console.error('Error during scraping:', e);
        // If an error occurs, still try to save an empty/fallback flights.json
        fs.writeFileSync(path.join(__dirname, '../flights.json'), JSON.stringify([{ number: "ERR-0", from: "Скрапер", to: "Ошибка!", scheduledTime: "--:--", estimatedTime: "--:--", status: "Сбой" }], null, 2));
        process.exit(1);
    } finally {
        await browser.close();
    }
})();