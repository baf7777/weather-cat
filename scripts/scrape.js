const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    console.log('Starting scraper...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    const page = await context.newPage();

    try {
        console.log('Navigating to slyport.ru...');
        // Увеличиваем таймаут, так как DDoS-Guard может тупить
        await page.goto('https://slyport.ru/passengers/information/timetable/', { timeout: 60000, waitUntil: 'domcontentloaded' });
        
        // Ждем, пока пройдет проверка браузера (иногда это занимает 5-10 сек)
        console.log('Waiting for content to load...');
        await page.waitForTimeout(10000); 

        // Пробуем найти таблицу или контент. 
        // Так как точная структура неизвестна, вытащим весь текст и попробуем найти паттерны рейсов.
        // Обычно рейсы Ямала имеют код YC или ЛА (но в примере YC)
        // Пример строки: YC-123 Салехард Яр-Сале 10:30 Вылетел
        
        const content = await page.content();
        const innerText = await page.evaluate(() => document.body.innerText);
        
        console.log('Page text length:', innerText.length);
        
        // Парсинг (эвристический, так как API нет)
        // Ищем строки, похожие на рейсы.
        // Это упрощенный парсер, его, возможно, придется калибровать, видя реальный HTML в логах Action
        
        const flights = [];
        const lines = innerText.split('\n');
        
        // Регулярка для поиска времени (HH:MM) и номера рейса (2 буквы - цифры)
        // Пример: YC-123 ... 12:00
        const timeReg = /\d{2}:\d{2}/;
        
        // Попытаемся найти блоки. 
        // Если сайт сделан на div-ах, innerText может склеить всё в кашу.
        // Попробуем более умный подход: найти все элементы, содержащие время и похожие на строки таблицы.
        
        // ВАРИАНТ 2: Ищем через DOM, если таблица стандартная
        // Но надежнее пока просто сформировать заглушку из реальных данных, если парсинг не удался,
        // или попытаться найти паттерны.
        
        // Для первого запуска сделаем "умный дамп".
        // Мы сохраним innerText в лог, чтобы потом (в след. итерации) уточнить парсер,
        // а пока сгенерируем данные на основе того, что найдем.
        
        // Эмулятор парсинга (пока мы не видим реальную верстку):
        // Пытаемся найти паттерн "YC"
        
        const rawFlights = [];
        
        // Попытка найти элементы с классом, содержащим 'flight' или 'row' (частая практика)
        // const rows = await page.$$('tr, .row, .flight'); 
        
        // План Б: Просто ищем в тексте вхождения YC-
        const regex = /(YC|ЛА)[\s-]*(\d{2,4}).{1,50}(\d{1,2}:\d{2})/gi;
        
        let match;
        while ((match = regex.exec(innerText)) !== null) {
            // Это очень грубый парсинг, но для начала пойдет
            rawFlights.push({
                raw: match[0],
                number: match[1] + '-' + match[2],
                time: match[3]
            });
        }

        console.log(`Found ${rawFlights.length} potential flight strings.`);

        // Если ничего не нашли (из-за защиты или верстки),
        // оставим пустой массив, но не ломаем файл.
        // В реальном проекте тут нужно будет отладить селекторы.

        // --- ДЕБАГ: Сохраняем HTML для анализа ---
        fs.writeFileSync(path.join(__dirname, '../debug_page.html'), content);
        console.log('debug_page.html saved for inspection.');
        // --- КОНЕЦ ДЕБАГА ---

        // Формируем JSON
        const finalData = rawFlights.map(f => {
            // Пытаемся угадать города (хардкод для Салехарда)
            let from = "Салехард";
            let to = "Неизвестно";
            
            if (f.raw.includes("Салехард")) {
                // Если есть Салехард, ищем второй город
                // Это сложно без структуры.
                to = "Пункт назначения";
            }
            
            return {
                number: f.number,
                from: from,
                to: to,
                time: f.time,
                status: "По расписанию" // Статус пока дефолтный
            };
        });

        // --- ВРЕМЕННОЕ РЕШЕНИЕ ---
        // Так как я (ИИ) не могу сейчас запустить и проверить селекторы,
        // я добавлю "резервные" данные, если массив пуст, чтобы фронтенд не упал.
        // В будущем ты сможешь посмотреть логи GitHub Action и поправить селекторы.
        if (finalData.length === 0) {
            console.log("Warning: No flights parsed. Using fallback data + saving HTML snapshot for debug.");
            // Сохраним HTML для отладки (в артефакты Action)
            // fs.writeFileSync('debug_page.html', content);
            
            // Вернем хотя бы тестовый массив, чтобы проверить интеграцию
            finalData.push({ number: "TEST-1", from: "GitHub", to: "Action", time: "12:00", status: "No Data Scraped" });
        }

        fs.writeFileSync(path.join(__dirname, '../flights.json'), JSON.stringify(finalData, null, 2));
        console.log('flights.json saved.');

    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
