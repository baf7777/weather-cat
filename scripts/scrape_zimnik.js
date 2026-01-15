const fs = require('fs');
const path = require('path');
const { request } = require('playwright');

// Helper to clean road names
function cleanRoadName(rawName) {
    if (!rawName) return "Неизвестная дорога";

    // Specific overrides
    if (rawName.toLowerCase().includes('ледовая переправа через реку обь')) {
        return "Ледовая переправа";
    }

    // Check for "участок" (segment)
    const segmentMatch = rawName.match(/\(участок\s+([^)]+)\)/i);
    if (segmentMatch) {
        let segmentName = segmentMatch[1].trim();
        // Normalize direction for known segments
        if (segmentName === "Панаевск - Яр-Сале") return "Яр-Сале - Панаевск";
        if (segmentName === "Аксарка - Салемал") return "Салемал - Аксарка";
        if (segmentName === "Салемал - Панаевск") return "Панаевск - Салемал";
        return segmentName;
    }

    // General cleaning
    let name = rawName
        .replace(/^Автомобильная дорога/i, '')
        .replace(/^Зимняя автомобильная дорога/i, '')
        .replace(/^Зимник/i, '')
        .replace(/«/g, '')
        .replace(/»/g, '')
        .replace(/"/g, '')
        .replace(/\(в границах.*?\)/gi, '')
        .replace(/в том числе зимник/gi, '')
        .replace(/с мостовым переходом.*$/i, '')
        .trim();
    
    // Trim dashes and spaces from ends
    name = name.replace(/^[-–—\s]+|[-–—\s]+$/g, '');
    name = name.replace(/[-–—]/g, '-'); // Normalize dashes

    // Simplify multipart names if needed, but keeping full names is usually safer for unique IDs
    // Example: "Коротчаево - Красноселькуп" is good.
    
    // Specific fix for "Яр-Сале - Сюнай Сале" if it comes out messy
    if (/Яр-Сале.*Сюнай.*Сале/i.test(name)) return "Яр-Сале - Сюнай Сале";
    
    // Fix "с. Самбург" to "Самбург"
    name = name.replace(/^с\.\s*/i, '');

    // Deduplication logic helper (names sometimes flip)
    const parts = name.split(' - ').map(p => p.trim());
    if (parts.length > 3) {
         name = `${parts[0]} - ${parts[1]} - ${parts[parts.length - 1]}`;
    }

    return name.trim();
}

function getStatusText(code) {
    switch (code) {
        case 0: return "открыт для всех видов транспорта";
        case 1: return "закрыт";
        case 2: return "открыт с ограничением";
        default: return "нет данных";
    }
}

(async () => {
    console.log('Starting Zimnik API scraper with PROXY...');
    
    // Query for ALL winter roads (tip_zimnika 1 and 2)
    // Layer 29 seems to be the one.
    const url = "https://map.yanao.ru/elitegis/rest/services/dep_dep/dep_transport_pub/MapServer/29/query?f=json&where=1=1&outFields=*&returnGeometry=false";

    let context;
    try {
        // Create a request context with the proxy
        context = await request.newContext({
            proxy: {
                server: 'http://185.184.78.71:9127',
                username: 'qv6d1k',
                password: '4xWwGA'
            },
            ignoreHTTPSErrors: true
        });

        const response = await context.get(url);
        
        if (!response.ok()) {
            throw new Error(`API returned status: ${response.status()} ${response.statusText()}`);
        }
        
        const data = await response.json();
        
        if (!data.features) {
            throw new Error('No features found in API response');
        }

        console.log(`Found ${data.features.length} records.`);

        const results = data.features.map(f => {
            const attr = f.attributes;
            const cleanName = cleanRoadName(attr.name);
            const status = getStatusText(attr.mode_work);
            
            // Map weight fields
            // The API returns 'weight' for Day and 'weight_night' for Night.
            // Sometimes they contain text like "до 30 тонн".
            
            return {
                road: cleanName,
                status: status,
                massDay: attr.weight || "-",
                massNight: attr.weight_night || "-",
                type: attr.tip_zimnika // Keep type for filtering
            };
        });

        // Filter: Keep all Regional (1) AND only "Яр-Сале - Сюнай Сале" from Municipal (2)
        // Or simply: keep if type == 1 OR road == "Яр-Сале - Сюнай Сале"
        const filteredResults = results.filter(r => {
            // Check for specific municipal road name (after cleaning)
            if (r.road === "Яр-Сале - Сюнай Сале") return true;
            // Otherwise, only keep regional roads (assuming tip_zimnika 1 is regional)
            // Note: The API docs/behavior suggests 1 is Regional, 2 is Municipal.
            return r.type === 1;
        });
        
        // Remove 'type' field before saving to match expected JSON format
        const finalResults = filteredResults.map(({ type, ...rest }) => rest);

        // Deduplication: favor "open" status if duplicates exist? 
        // Or just keep unique names.
        // Usually the map layer doesn't have duplicate active geometries for the same road segment name, 
        // but let's be safe.
        const uniqueResults = [];
        const seen = new Set();
        
        for (const item of finalResults) {
            if (!seen.has(item.road)) {
                uniqueResults.push(item);
                seen.add(item.road);
            } else {
                // If we have a duplicate, maybe check if this one has better info?
                // For now, first one wins.
                console.log(`Duplicate road name skipped: ${item.road}`);
            }
        }

        console.log(`Saving ${uniqueResults.length} unique roads.`);
        
        // Ensure "Яр-Сале - Сюнай Сале" is present if it exists in the source
        const target = uniqueResults.find(r => r.road === "Яр-Сале - Сюнай Сале");
        if (target) {
            console.log("Target road found:", target);
        } else {
            console.warn("Target road 'Яр-Сале - Сюнай Сале' NOT found in the result set.");
        }

        fs.writeFileSync(path.join(__dirname, '../zimnik.json'), JSON.stringify(uniqueResults, null, 2));
        console.log('zimnik.json saved successfully.');

    } catch (err) {
        console.error('Error fetching zimnik data:', err);
        process.exit(1);
    } finally {
        if (context) await context.dispose();
    }
})();