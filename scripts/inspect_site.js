const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    console.log('Starting inspection...');
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
        await page.goto('https://map.yanao.ru/eks/zimnik', { waitUntil: 'networkidle', timeout: 60000 });
        
        console.log('Waiting for content...');
        await page.waitForTimeout(10000); // Wait for initial render

        // Dump the main body HTML to see classes
        const content = await page.content();
        fs.writeFileSync(path.join(__dirname, '../debug_page.html'), content);
        console.log('Saved debug_page.html');

        // Try to identify list items specifically
        const listItems = await page.evaluate(() => {
            // Try to find elements that might be list items. 
            // Often they are in a sidebar or container.
            // Let's look for common list tags or repeating class patterns.
            const allDivs = Array.from(document.querySelectorAll('div'));
            // Filter divs that have some text content and might be roads
            return allDivs
                .filter(d => d.innerText.includes('зимник') || d.innerText.includes('Автомобильная дорога'))
                .slice(0, 5) // just first 5 to check structure
                .map(d => ({
                    className: d.className,
                    text: d.innerText.substring(0, 100),
                    html: d.outerHTML.substring(0, 300)
                }));
        });

        console.log('Potential list items:', JSON.stringify(listItems, null, 2));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
})();
