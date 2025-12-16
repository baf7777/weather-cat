// --- ЗАГРУЗКА ПОГОДЫ ---
async function fetchWeather() {
    els.loader.classList.add('show');
    try {
        let data;
        if (CONFIG.testMode) {
            // Симуляция задержки
            await new Promise(r => setTimeout(r, 800));
            data = { 
                current_weather: { 
                    temperature: CONFIG.testData.temp, 
                    windspeed: CONFIG.testData.wind, 
                    weathercode: CONFIG.testData.code, 
                    is_day: CONFIG.testData.is_day 
                },
                hourly: { apparent_temperature: [CONFIG.testData.apparent_temp] } 
            };
        } else {
            // Запрашиваем текущую погоду + apparent_temperature (ощущаемую)
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${CONFIG.lat}&longitude=${CONFIG.lon}&current_weather=true&hourly=apparent_temperature&forecast_days=1`);
            const json = await res.json();
            
            // Берем current ощущаемую по ближайшему часу (простое приближение)
            const currentHour = new Date().getHours();
            const apparent = json.hourly.apparent_temperature[currentHour] || json.current_weather.temperature;
            
            data = {
                current_weather: json.current_weather,
                apparent_temp: apparent
            };
        }

        weatherState = {
            temp: Math.round(data.current_weather.temperature),
            feel: Math.round(data.apparent_temp || data.current_weather.temperature),
            wind: data.current_weather.windspeed / 3.6, // переводим км/ч в м/с
            code: data.current_weather.weathercode,
            isDay: data.current_weather.is_day
        };

        renderWeather();

    } catch (e) {
        console.error("Weather Error:", e);
        els.tempDisplay.innerText = "ERR";
        els.mouseMsg.innerText = "НЕТ СВЯЗИ";
    } finally {
        els.loader.classList.remove('show');
    }
}

// --- ОТРИСОВКА ПОГОДЫ ---
function renderWeather() {
    const { temp, feel, wind, code, isDay } = weatherState;

    // 1. Текст
    els.tempDisplay.innerText = (temp > 0 ? "+" : "") + temp + "°C";
    els.feelDisplay.innerText = `Ощущается: ${(feel > 0 ? "+" : "") + feel}°`;

    // 2. Цвет таблички и иней
    els.frost.style.opacity = (temp <= -20) ? 0.8 : 0;
    
    let signColor = "#2a9d8f"; // Норма
    if (temp < -30) signColor = "#3b4d61"; // Дубак
    else if (temp < -15) signColor = "#468faf"; // Холодно
    else if (temp > 25) signColor = "#e76f51"; // Жара
    els.catSign.style.background = signColor;

    // 3. День / Ночь
    if (isDay === 0) els.body.classList.add('night');
    else els.body.classList.remove('night');

    // 4. Осадки
    els.snowContainer.innerHTML = '';
    els.rain.style.display = 'none';
    els.body.classList.remove('storm');

    // Коды снега: 71, 73, 75, 77, 85, 86
    if ([71, 73, 75, 77, 85, 86].includes(code) || temp < -5 && [51, 53, 55, 61, 63, 65].includes(code)) {
        createSnow(wind);
    }
    // Коды дождя
    else if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code)) {
        els.rain.style.display = 'block';
        if (code >= 95) els.body.classList.add('storm');
    }

    // 5. Пропеллер (скорость анимации зависит от ветра)
    // 0 м/с -> стоп, 20 м/с -> супер быстро
    const animSpeed = wind <= 0.5 ? 0 : Math.max(0.1, 1 - (wind / 15));
    if (animSpeed === 0) els.propeller.style.animation = 'none';
    else els.propeller.style.animation = `spin ${animSpeed}s linear infinite`;

    if (temp < 0 && els.box.classList.contains('box-open')) {
        if (!catBreathTimer) {
            startCatBreathLoop();
        }
    } else if (catBreathTimer) {
        stopCatBreathLoop();
    }
}

function createSnow(windSpeed) {
    const count = 50;
    for (let i = 0; i < count; i++) {
        const f = document.createElement('div');
        f.className = 'snowflake';
        
        // Расширяем область появления, чтобы при ветре не было пустых зон
        // Смещаем влево, так как ветер дует вправо (положительный X)
        f.style.left = (Math.random() * 150 - 50) + '%';
        
        f.style.width = Math.random() * 5 + 2 + 'px';
        f.style.height = f.style.width;
        f.style.opacity = Math.random();
        
        // Ветер: 1 м/с ~= 3vw смещения. 
        // Добавляем немного рандома для каждой снежинки
        const windOffset = (windSpeed * 3) + (Math.random() * 5); 
        f.style.setProperty('--wind-x', windOffset + 'vw');

        // Скорость падения зависит от размера, наклон от ветра
        const duration = Math.random() * 3 + 2;
        f.style.animationDuration = duration + 's';
        f.style.animationDelay = -Math.random() * 5 + 's';
        
        els.snowContainer.appendChild(f);
    }
}

