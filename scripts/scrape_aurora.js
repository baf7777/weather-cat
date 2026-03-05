const fs = require('fs');

const YAR_SALE = {
    name: 'Yar-Sale',
    lat: 66.860618,
    lon: 70.844018
};

async function updateAurora() {
    console.log('Fetching aurora data from NOAA...');
    try {
        const [kpPayload, ovationPayload] = await Promise.all([
            fetchPlanetaryKp(),
            fetchOvationLatest().catch((error) => {
                console.warn('⚠️ Ovation unavailable, fallback to Kp only:', error.message);
                return null;
            })
        ]);

        const result = {
            kp: kpPayload.kp,
            level: getKpLevel(kpPayload.kp),
            time: kpPayload.time,
            updatedAt: new Date().toISOString(),
            location: {
                name: YAR_SALE.name,
                lat: YAR_SALE.lat,
                lon: YAR_SALE.lon
            },
            local: getLocalAuroraForYarSale(ovationPayload)
        };

        fs.writeFileSync('aurora.json', JSON.stringify(result, null, 2));

        const localText = Number.isFinite(result.local?.probability)
            ? `, local=${result.local.probability}%`
            : ', local=n/a';
        console.log(`✅ Aurora data saved: Kp=${result.kp} (${result.level})${localText}`);
    } catch (error) {
        console.error('❌ Error updating aurora:', error.message);
        process.exit(1);
    }
}

async function fetchPlanetaryKp() {
    const response = await fetch('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json');
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Empty planetary Kp data from NOAA');
    }

    const latest = data[data.length - 1];
    const kp = Number.parseFloat(latest.kp_index);
    if (!Number.isFinite(kp)) {
        throw new Error('Invalid Kp value in NOAA response');
    }

    return {
        kp,
        time: latest.time_tag || null
    };
}

async function fetchOvationLatest() {
    const response = await fetch('https://services.swpc.noaa.gov/json/ovation_aurora_latest.json');
    const data = await response.json();

    if (!data) {
        throw new Error('Empty Ovation data from NOAA');
    }

    return data;
}

function getLocalAuroraForYarSale(payload) {
    if (!payload) {
        return {
            probability: null,
            source: 'NOAA Ovation',
            status: 'unavailable'
        };
    }

    const points = extractOvationPoints(payload);
    if (points.length === 0) {
        return {
            probability: null,
            source: 'NOAA Ovation',
            status: 'no_points'
        };
    }

    let nearest = null;
    for (const point of points) {
        const distanceDeg = angularDistanceDeg(YAR_SALE.lat, YAR_SALE.lon, point.lat, point.lon);
        if (!nearest || distanceDeg < nearest.distanceDeg) {
            nearest = {
                ...point,
                distanceDeg
            };
        }
    }

    return {
        probability: nearest ? nearest.probability : null,
        source: 'NOAA Ovation',
        status: nearest ? 'ok' : 'no_match',
        observationTime: pickFirst(payload, ['Observation Time', 'observation_time', 'observationTime']) || null,
        forecastTime: pickFirst(payload, ['Forecast Time', 'forecast_time', 'forecastTime']) || null,
        nearestPoint: nearest
            ? {
                lat: nearest.lat,
                lon: nearest.lon,
                distanceDeg: Number(nearest.distanceDeg.toFixed(2))
            }
            : null
    };
}

function extractOvationPoints(payload) {
    const rawPoints = [];

    if (Array.isArray(payload.coordinates)) {
        rawPoints.push(...payload.coordinates);
    }
    if (Array.isArray(payload.data)) {
        rawPoints.push(...payload.data);
    }
    if (Array.isArray(payload)) {
        rawPoints.push(...payload);
    }

    const normalized = [];
    for (const raw of rawPoints) {
        const point = normalizePoint(raw);
        if (point) normalized.push(point);
    }

    return normalized;
}

function normalizePoint(raw) {
    if (Array.isArray(raw)) {
        if (raw.length < 3) return null;

        const a = Number(raw[0]);
        const b = Number(raw[1]);
        const c = Number(raw[2]);
        if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) return null;

        let lat = a;
        let lon = b;
        if (Math.abs(a) > 90 || Math.abs(b) <= 90) {
            lat = b;
            lon = a;
        }

        if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;

        return {
            lat,
            lon,
            probability: clampProbability(c)
        };
    }

    if (raw && typeof raw === 'object') {
        const lat = Number(
            pickFirst(raw, ['lat', 'latitude', 'Lat', 'Latitude'])
        );
        const lon = Number(
            pickFirst(raw, ['lon', 'lng', 'longitude', 'Lon', 'Longitude'])
        );
        const probability = Number(
            pickFirst(raw, ['probability', 'value', 'aurora', 'p'])
        );

        if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(probability)) return null;
        if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;

        return {
            lat,
            lon,
            probability: clampProbability(probability)
        };
    }

    return null;
}

function clampProbability(value) {
    if (!Number.isFinite(value)) return null;
    return Math.max(0, Math.min(100, Math.round(value)));
}

function angularDistanceDeg(lat1, lon1, lat2, lon2) {
    const dLat = lat1 - lat2;
    const dLonRaw = Math.abs(lon1 - lon2);
    const dLon = Math.min(dLonRaw, 360 - dLonRaw);
    return Math.sqrt((dLat * dLat) + (dLon * dLon));
}

function pickFirst(obj, keys) {
    if (!obj || typeof obj !== 'object') return undefined;
    for (const key of keys) {
        if (obj[key] !== undefined) return obj[key];
    }
    return undefined;
}

function getKpLevel(kp) {
    if (kp < 3) return 'Quiet';
    if (kp < 4) return 'Unsettled';
    if (kp < 5) return 'Active';
    return 'Storm';
}

updateAurora();
