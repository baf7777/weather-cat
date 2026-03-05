const fs = require('fs');

async function updateAurora() {
    console.log('Fetching aurora data from NOAA...');
    try {
        const response = await fetch('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json');
        const data = await response.json();
        
        if (!data || data.length === 0) {
            throw new Error('Empty data from NOAA');
        }

        // Берем последнюю запись
        const latest = data[data.length - 1];
        
        const result = {
            kp: parseFloat(latest.kp_index),
            level: getKpLevel(latest.kp_index),
            time: latest.time_tag,
            updatedAt: new Date().toISOString()
        };

        fs.writeFileSync('aurora.json', JSON.stringify(result, null, 2));
        console.log(`✅ Aurora data saved: Kp=${result.kp} (${result.level})`);
    } catch (error) {
        console.error('❌ Error updating aurora:', error.message);
        process.exit(1);
    }
}

function getKpLevel(kp) {
    if (kp < 3) return 'Quiet';
    if (kp < 4) return 'Unsettled';
    if (kp < 5) return 'Active';
    return 'Storm'; // Kp 5+ is a G1+ storm
}

updateAurora();
