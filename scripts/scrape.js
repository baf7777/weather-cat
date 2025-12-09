const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function getFlights(page, type) {
    // Click the tab (departure or arrival)
    const tabSelector = type === 'departure' ? '.tts-departure' : '.tts-arrival';
    await page.click(tabSelector);
    await page.waitForLoadState('networkidle'); // Wait for content to load after click
    await page.waitForTimeout(2000); // Additional wait to ensure content is fully rendered

    const flightItems = await page.$$('article.flight-item');
    const flights = [];

    for (const item of flightItems) {
        // Extract data using more specific selectors
        const flightNumberRaw = await item.$eval('.tth-flight', el => el.textContent.trim());
        const destinationRaw = await item.$eval('.tth-destination', el => el.textContent.trim());
        const scheduledTime = await item.$eval('.tth-time', el => el.textContent.trim());
        const estimatedTime = await item.$eval('.tth-time-count', el => el.textContent.trim());
        const status = await item.$eval('.tth-status', el => el.textContent.trim());
        
        // The fi-title gives a clearer "From -> To" format
        const fiTitle = await item.$eval('.fi-title', el => el.textContent.trim());

        let flightNumber = flightNumberRaw.replace(/\s+/g, ' '); // Normalize spaces
        let from = '';
        let to = '';

        // Determine from/to based on fiTitle
        const routeMatch = fiTitle.match(/(.+) → (.+)/);
        if (routeMatch) {
            from = routeMatch[1].trim();
            to = routeMatch[2].trim();
        } else {
            // Fallback if route format is unexpected
            if (type === 'departure') {
                from = 'Салехард';
                to = destinationRaw;
            } else { // arrival
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
            type: type // For debugging/verification
        });
    }
    return flights;
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