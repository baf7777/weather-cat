# Gemini Context: Yar-Sale Station (Weather Cat)

This project is an interactive web dashboard for monitoring weather, flights, and winter roads ("zimnik") for the Yar-Sale settlement (Yamal, Russia). It features a playful "cat in a box" theme with rich animations.

## Project Overview
- **Purpose:** Provide real-time local information (weather, transport) in an engaging, animated interface.
- **Main Technologies:**
    - **Frontend:** Vanilla JavaScript, HTML5, CSS3 (No frameworks).
    - **Data Collection:** Node.js, Playwright (for web scraping).
    - **Automation:** GitHub Actions (scheduled data updates).
- **Architecture:** 
    - A decoupled system where Node.js scripts scrape external sources and save data into static `flights.json` and `zimnik.json` files.
    - The frontend (browser) reads these JSON files and fetches live weather data via Open-Meteo API.

## Building and Running
- **Prerequisites:** Node.js v18+ (for scraping scripts).
- **Setup:**
  ```bash
  npm install
  npx playwright install # Required for scraping scripts
  ```
- **Development:**
    - Open `index.html` in a web browser (preferably via a local server like VS Code Live Server to avoid CORS/path issues).
- **Data Updates (Manual):**
  ```bash
  npm run scrape # Updates flights.json using scripts/scrape.js
  node scripts/scrape_zimnik.js # Updates zimnik.json
  ```
- **Testing:**
    - Toggle `testMode: true` in `js/config.js` to debug UI without live API calls.

## Key Files & Directories
- `index.html`: Entry point, defines the UI structure and loads JS modules.
- `js/`: Modular JavaScript logic.
    - `main.js`: Main controller, initializes all systems.
    - `config.js`: Central configuration (coordinates, intervals).
    - `weather.js`, `planes.js`, `zimnik.js`: Domain-specific logic for weather, flights, and roads.
- `scripts/`: Node.js scraping scripts.
    - `scrape.js`: Scrapes flight data from `slyport.ru`.
    - `scrape_zimnik.js`: Scrapes road status from `map.yanao.ru` (uses proxy).
- `flights.json` / `zimnik.json`: Static data stores updated by scrapers.
- `.github/workflows/`: GitHub Actions for automated 20-min flight updates and 6-hour winter road updates.

## Development Conventions
- **Vanilla Approach:** Avoid adding heavy JS frameworks. Keep logic in pure JS.
- **Resource Management:** Assets (images, sounds) should be optimized (WebP format preferred).
- **Scraping Safety:** `scripts/scrape.js` includes delays to bypass DDoS-Guard. Do not reduce these timeouts without testing.
- **Styling:** Use CSS variables and classes for animations. Responsive design is a priority (supports Telegram WebApp).

## TODO / Known Issues
- [ ] `scrape_zimnik.js` depends on a specific proxy; may need updates if it fails.
- [ ] Implement robust error handling for failed API/JSON fetches in the UI.
