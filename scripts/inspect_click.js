const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    console.log('Starting click inspection...');
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
        console.log('Navigating...');
        await page.goto('https://map.yanao.ru/eks/zimnik', { waitUntil: 'networkidle', timeout: 60000 });
        
        console.log('Waiting for table rows...');
        // Wait for the table rows to appear
        await page.waitForSelector('.source-widget-table tbody tr', { timeout: 30000 });

        // Get all rows
        const rows = await page.$$('.source-widget-table tbody tr');
        console.log(`Found ${rows.length} rows.`);

        if (rows.length > 0) {
            console.log('Clicking the first row...');
            await rows[0].click();
            
            console.log('Waiting for reaction...');
            await page.waitForTimeout(5000); // Wait for animations/loading

            // Dump content
            const content = await page.content();
            fs.writeFileSync(path.join(__dirname, '../debug_click.html'), content);
            console.log('Saved debug_click.html');

            // Try to find text related to tons
            const bodyText = await page.evaluate(() => document.body.innerText);
            if (bodyText.includes('тонн')) {
                console.log('Found "тонн" in body text!');
            }
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
})();
