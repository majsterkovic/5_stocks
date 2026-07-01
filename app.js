// Data (stocksData and USD_TO_PLN) is loaded dynamically from data.js
let currentSelectedSymbol = Object.keys(stocksData)[0] || "AMZN";
let portfolioSelection = null; // Stores selected stock symbol and details
let activePrices = {};

// Fetch real-time prices where possible (CORS proxy helper)
async function fetchPrices() {
  // Set fallback prices first
  for (let key in stocksData) {
    activePrices[key] = stocksData[key].fallbackPrice;
  }

  try {
    // Try public finance APIs for real-time prices
    const response = await fetch('https://api.iextrading.com/1.0/tops/last?symbols=AMZN,GOOGL,LLY,TSM,AAPL');
    if (response.ok) {
      const data = await response.json();
      data.forEach(item => {
        if (activePrices[item.symbol]) {
          activePrices[item.symbol] = item.price;
        }
      });
      console.log("Real-time prices loaded successfully:", activePrices);
    }
  } catch (error) {
    console.warn("Could not fetch real-time prices, using fallbacks:", error);
  }

  // Update UI components once prices are loaded
  renderStocksList();
  selectStock(currentSelectedSymbol);
  updatePortfolioUI();
}

// Render the sidebar list of stocks
function renderStocksList() {
  const container = document.getElementById('stocks-list');
  container.innerHTML = '';

  for (let key in stocksData) {
    const stock = stocksData[key];
    const price = activePrices[key];
    const pricePLN = (price * USD_TO_PLN).toFixed(2);
    const returnClass = stock.returnNumeric >= 0 ? 'positive' : 'negative';
    const returnSign = stock.returnNumeric >= 0 ? '+' : '';
    const isActive = key === currentSelectedSymbol ? 'active' : '';

    const card = document.createElement('div');
    card.className = `stock-card ${isActive}`;
    card.onclick = () => selectStock(key);
    card.innerHTML = `
      <div class="stock-header">
        <div class="stock-identity">
          <div class="stock-logo" style="background-color: ${stock.logoBg}15; color: ${stock.logoBg}">${stock.logo}</div>
          <div class="stock-name-symbol">
            <span class="stock-symbol">${stock.symbol}</span>
            <span class="stock-fullname">${stock.fullname}</span>
          </div>
        </div>
        <div class="stock-quick-chart">
          <span class="stock-price">${pricePLN} PLN</span>
          <span class="stock-change ${returnClass}">
            ${returnSign}${stock.oneYearReturn}
          </span>
        </div>
      </div>
      <div class="stock-desc">${stock.desc}</div>
      <div class="stock-metrics">
        <div class="metric-item">
          <span>Kapitalizacja:</span>
          <span>${stock.marketCap}</span>
        </div>
        <div class="metric-item">
          <span>C/Z (P/E):</span>
          <span>${stock.pe}</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  }
}

// Select stock and load details/charts
function selectStock(symbol) {
  currentSelectedSymbol = symbol;
  
  // Highlight active sidebar card
  const cards = document.querySelectorAll('.stock-card');
  cards.forEach(card => {
    const cardSymbol = card.querySelector('.stock-symbol').textContent;
    if (cardSymbol === symbol) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });

  const stock = stocksData[symbol];
  const price = activePrices[symbol];
  const pricePLN = price * USD_TO_PLN;

  // Update Detail Panel
  document.getElementById('detail-logo').textContent = stock.logo;
  document.getElementById('detail-logo').style.backgroundColor = `${stock.logoBg}15`;
  document.getElementById('detail-logo').style.color = stock.logoBg;
  document.getElementById('detail-symbol').textContent = stock.symbol;
  document.getElementById('detail-fullname').textContent = stock.fullname;
  document.getElementById('detail-desc').textContent = stock.desc;
  document.getElementById('detail-why').textContent = stock.why || "Brak danych";

  // Indicators
  document.getElementById('metric-pe').textContent = stock.pe;
  document.getElementById('metric-cap').textContent = stock.marketCap;
  
  const returnEl = document.getElementById('metric-return');
  returnEl.textContent = stock.oneYearReturn;
  returnEl.className = `indicator-value ${stock.returnNumeric >= 0 ? 'positive' : 'negative'}`;

  document.getElementById('metric-growth').textContent = stock.growth2026 || "--";
  document.getElementById('metric-rating').textContent = stock.rating || "--";
  document.getElementById('metric-potential').textContent = stock.potential || "--";

  // Update chart
  loadTradingViewChart(symbol);
}

// Mapping tickers to their respective exchanges for accurate TradingView data
const exchangeMap = {
  NVDA: "NASDAQ:NVDA",
  LLY: "NYSE:LLY",
  TSM: "NYSE:TSM",
  GOOG: "NASDAQ:GOOG",
  AMZN: "NASDAQ:AMZN"
};

// Dynamically create/embed TradingView Chart Widget
let currentWidget = null;
function loadTradingViewChart(symbol) {
  const loader = document.getElementById('chart-loader');
  loader.classList.remove('hidden');

  document.getElementById('tradingview_chart').innerHTML = '';
  const tvSymbol = exchangeMap[symbol] || `NASDAQ:${symbol}`;

  setTimeout(() => {
    try {
      currentWidget = new TradingView.widget({
        "autosize": true,
        "symbol": tvSymbol,
        "interval": "D",
        "range": "1Y", // Displays exactly one year of data
        "timezone": "Europe/Warsaw",
        "theme": "dark",
        "style": "3", // Area chart
        "locale": "pl",
        "toolbar_bg": "#1e293b",
        "enable_publishing": false,
        "hide_top_toolbar": true,
        "hide_legend": false,
        "save_image": false,
        "container_id": "tradingview_chart",
        "studies": [],
        "callback": function() {
          loader.classList.add('hidden');
        }
      });
      
      // Fallback in case callback doesn't fire (some browsers block iframe callbacks)
      setTimeout(() => {
        loader.classList.add('hidden');
      }, 2000);

    } catch (e) {
      console.error("TradingView widget initialization failed:", e);
      document.getElementById('tradingview_chart').innerHTML = `
        <div style="height:100%; display:flex; align-items:center; justify-content:center; color:var(--text-secondary); text-align:center; padding: 20px;">
          Wykres niedostępny w trybie offline.<br>Dane spółki i wskaźniki są wciąż w pełni aktywne.
        </div>
      `;
      loader.classList.add('hidden');
    }
  }, 150);
}

// Initial startup
window.addEventListener('DOMContentLoaded', () => {
  fetchPrices();
});
