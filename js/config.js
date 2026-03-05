// --- КОНФИГУРАЦИЯ ---
const CONFIG = {
    lat: 66.8333,
    lon: 70.8333, // Яр-Сале
    updateInterval: 600000, // 10 минут
    auroraUpdateInterval: 1800000, // 30 минут
    // Тестовый режим для проверки (включить true и менять параметры)
    testMode: false,
    testData: {
        temp: -55,
        apparent_temp: -41,
        wind: 20, // км/ч
        code: 71,
        is_day: 1,
        kp: 4.5 // Баллы сияния
    },
    // Настройки сцены тундры (сохранено из редактора)
    tundra: {
        "container": {
            "bottom": 32,
            "left": 16,
            "width": 20
        },
        "base": {
            "width": 250,
            "bottom": -30
        },
        "chum": {
            "scale": 0.45,
            "bottom": 22,
            "left": 49
        },
        // Зона, где стоит чум (в %), чтобы персонажи обходили её
        "chumZone": { min: 38, max: 62 }, 
        "nenets": {
            "scale": 1,
            "bottom": -1,
            "minX": 18,
            "maxX": 78
        },
        "dog": {
            "scale": 1,
            "bottom": -5,
            "homeX": 75
        },
        "deer": {
            "maxDeers": 3, 
            "scaleMin": 0.35,
            "scaleMax": 0.45,
            "bottom": -5,
            "minX": 18,
            "maxX": 78
        }
    }
};
