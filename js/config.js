// --- CONFIGURATION ---
const CONFIG = {
    lat: 66.8333,
    lon: 70.8333, // Yar-Sale
    updateInterval: 600000, // 10 minutes
    auroraUpdateInterval: 1800000, // 30 minutes

    // Test mode
    testMode: false,
    testData: {
        temp: -55,
        apparent_temp: -41,
        wind: 20, // km/h
        code: 71,
        is_day: 1,
        kp: 4.5
    },

    // Stickers on the box
    boxStickers: [
        {
            src: "assets/stickers/Juger.png",
            x: "53%",
            y: "8%",
            width: "5.2rem",
            rotate: -9,
            z: 39
        },
        {
            src: "assets/stickers/sleep.png",
            x: "5%",
            y: "65%",
            width: "5.2rem",
            rotate: -9,
            flipX: false,
            z: 39
        }
    ],

    // Breakpoint for tundra profile switching
    tundraMobileBreakpoint: 768,

    // Per-device tundra presets (from scene editor)
    tundraProfiles: {
        mobile: {
            container: {
                bottom: 37,
                left: 13,
                width: 27
            },
            base: {
                width: 268,
                bottom: -7
            },
            chum: {
                scale: 0.4,
                bottom: 35.5,
                left: 43
            },
            chumZone: {
                min: 38,
                max: 62
            },
            nenets: {
                scale: 1.1,
                bottom: 28,
                minX: -100,
                maxX: -73
            },
            dog: {
                scale: 1,
                bottom: 17,
                homeX: 36
            },
            deer: {
                maxDeers: 3,
                scaleMin: 1,
                scaleMax: 0.5,
                bottom: -1,
                minX: -27,
                maxX: 128
            }
        },
        desktop: {
            container: {
                bottom: 40,
                left: 23,
                width: 22
            },
            base: {
                width: 238,
                bottom: -7
            },
            chum: {
                scale: 0.8,
                bottom: 48.9,
                left: 50.2
            },
            chumZone: {
                min: 38,
                max: 62
            },
            nenets: {
                scale: 1.5,
                bottom: 35.3,
                minX: -100,
                maxX: -73
            },
            dog: {
                scale: 1.5,
                bottom: 28,
                homeX: 16.7
            },
            deer: {
                maxDeers: 3,
                scaleMin: 2.1,
                scaleMax: 0.6,
                bottom: 38,
                minX: -23,
                maxX: 116
            }
        }
    },

    // Active runtime tundra config (selected from profile below)
    tundra: {}
};

function cloneTundraConfig(cfg) {
    if (typeof structuredClone === "function") {
        return structuredClone(cfg);
    }
    return JSON.parse(JSON.stringify(cfg));
}

function getTundraProfileName() {
    if (typeof window === "undefined") return "desktop";
    return window.innerWidth <= CONFIG.tundraMobileBreakpoint ? "mobile" : "desktop";
}

function applyTundraProfile() {
    const profileName = getTundraProfileName();
    const profile = CONFIG.tundraProfiles[profileName] || CONFIG.tundraProfiles.desktop;
    CONFIG.tundraProfileName = profileName;
    CONFIG.tundra = cloneTundraConfig(profile);
}

if (typeof window !== "undefined") {
    applyTundraProfile();
    window.applyTundraProfile = applyTundraProfile;
}
