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

  // Update Button text / state
  const addBtn = document.getElementById('add-portfolio-btn');
  if (portfolioSelection && portfolioSelection.symbol === symbol) {
    addBtn.textContent = 'Wybrana (W portfelu)';
    addBtn.className = 'btn btn-success badge-glow';
    addBtn.disabled = true;
  } else {
    addBtn.innerHTML = `
      <svg class="logo-svg" viewBox="0 0 24 24">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
      </svg>
      Wybierz do Portfela
    `;
    addBtn.className = 'btn btn-success';
    addBtn.disabled = false;
  }

  // Update chart
  loadTradingViewChart(symbol);

  // Update simulated shares calculation
  updateSharesSimulation();
}

// Dynamically create/embed TradingView Chart Widget
let currentWidget = null;
function loadTradingViewChart(symbol) {
  const loader = document.getElementById('chart-loader');
  loader.classList.remove('hidden');

  document.getElementById('tradingview_chart').innerHTML = '';

  setTimeout(() => {
    try {
      currentWidget = new TradingView.widget({
        "autosize": true,
        "symbol": `NASDAQ:${symbol}`,
        "interval": "D",
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

// Calculate simulation shares based on user input budget
function updateSharesSimulation() {
  const budgetInput = document.getElementById('budget');
  const budget = parseFloat(budgetInput.value) || 0;
  
  const stock = stocksData[currentSelectedSymbol];
  const priceUSD = activePrices[currentSelectedSymbol];
  const pricePLN = priceUSD * USD_TO_PLN;

  const shares = budget / pricePLN;
  const simEl = document.getElementById('simulated-shares');

  if (shares > 0) {
    simEl.textContent = `${shares.toFixed(2)} akcji (po ${pricePLN.toFixed(2)} PLN / szt.)`;
  } else {
    simEl.textContent = "0 akcji";
  }
}

// Handle portfolio selection
document.getElementById('add-portfolio-btn').addEventListener('click', () => {
  portfolioSelection = {
    symbol: currentSelectedSymbol,
    priceAtSelection: activePrices[currentSelectedSymbol]
  };
  localStorage.setItem('chosen_stock_portfolio', JSON.stringify(portfolioSelection));
  
  // Trigger update
  updatePortfolioUI();
  
  // Update details button
  selectStock(currentSelectedSymbol);
});

// Update portfolio panel at the bottom
function updatePortfolioUI() {
  const container = document.getElementById('portfolio-list-container');
  const emptyState = document.getElementById('portfolio-empty-state');
  const totalValEl = document.getElementById('portfolio-total-val');
  const budgetInput = document.getElementById('budget');
  const budget = parseFloat(budgetInput.value) || 0;

  // Try loading from localStorage if local state is null
  if (!portfolioSelection) {
    const saved = localStorage.getItem('chosen_stock_portfolio');
    if (saved) {
      portfolioSelection = JSON.parse(saved);
    }
  }

  if (!portfolioSelection) {
    emptyState.style.display = 'block';
    if (container.querySelector('.portfolio-grid')) {
      container.querySelector('.portfolio-grid').remove();
    }
    totalValEl.textContent = "0.00 PLN";
    return;
  }

  emptyState.style.display = 'none';

  const symbol = portfolioSelection.symbol;
  const stock = stocksData[symbol];
  const currentPrice = activePrices[symbol];
  const pricePLN = currentPrice * USD_TO_PLN;
  const purchasePricePLN = portfolioSelection.priceAtSelection * USD_TO_PLN;
  
  // Calculate shares bought with full budget
  const sharesCount = budget / purchasePricePLN;
  const currentValPLN = sharesCount * pricePLN;
  const profitPLN = currentValPLN - budget;
  const profitPct = ((currentPrice - portfolioSelection.priceAtSelection) / portfolioSelection.priceAtSelection) * 100;

  totalValEl.textContent = `${currentValPLN.toFixed(2)} PLN`;

  // Remove existing grid if any
  const existingGrid = container.querySelector('.portfolio-grid');
  if (existingGrid) {
    existingGrid.remove();
  }

  const grid = document.createElement('div');
  grid.className = 'portfolio-grid';
  grid.innerHTML = `
    <div class="portfolio-item">
      <div class="portfolio-item-header">
        <div class="portfolio-item-identity">
          <div class="stock-logo" style="background-color: ${stock.logoBg}15; color: ${stock.logoBg}; width:30px; height:30px; font-size:1rem;">${stock.logo}</div>
          <span style="font-weight:700;">${stock.symbol}</span>
          <span style="font-size:0.8rem; color:var(--text-muted);">${stock.fullname}</span>
        </div>
        <button class="portfolio-item-remove" onclick="removeFromPortfolio()">
          Usuń
        </button>
      </div>

      <div style="margin: 8px 0;">
        <span style="font-size: 0.8rem; color: var(--text-secondary);">Wielkość Pakietu:</span>
        <div style="font-size: 1.3rem; font-weight: 700; color: var(--text-primary); margin-top:2px;">
          ${sharesCount.toFixed(4)} akcji
        </div>
      </div>

      <div class="portfolio-item-details">
        <div>
          <span style="color: var(--text-muted);">Cena Zakupu:</span>
          <div class="portfolio-item-val">${purchasePricePLN.toFixed(2)} PLN</div>
        </div>
        <div>
          <span style="color: var(--text-muted);">Aktualny Kurs:</span>
          <div class="portfolio-item-val">${pricePLN.toFixed(2)} PLN</div>
        </div>
      </div>

      <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px; margin-top: 4px;">
        <span style="font-size: 0.8rem; color: var(--text-secondary);">Symulowana zmiana kursu (zobacz wpływ na budżet):</span>
        <div style="display: flex; align-items: center; gap: 12px; margin-top: 8px;">
          <input type="range" id="price-slider" min="-50" max="100" value="${profitPct.toFixed(0)}" style="flex: 1; accent-color: var(--accent-color);">
          <span id="slider-pct-label" style="font-weight: 700; min-width: 50px; text-align: right;">${profitPct >= 0 ? '+' : ''}${profitPct.toFixed(0)}%</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 0.85rem;">
          <span style="color: var(--text-muted);">Szacowany Wynik:</span>
          <span id="sim-profit-value" style="font-weight: 700;">${profitPLN >= 0 ? '+' : ''}${profitPLN.toFixed(2)} PLN</span>
        </div>
      </div>
    </div>
  `;

  container.appendChild(grid);

  // Setup simulation slider listener
  const slider = document.getElementById('price-slider');
  slider.addEventListener('input', (e) => {
    const pct = parseFloat(e.target.value);
    document.getElementById('slider-pct-label').textContent = `${pct >= 0 ? '+' : ''}${pct}%`;
    
    const simulatedPricePLN = purchasePricePLN * (1 + pct / 100);
    const simulatedVal = sharesCount * simulatedPricePLN;
    const simulatedProfit = simulatedVal - budget;
    
    const profitValEl = document.getElementById('sim-profit-value');
    profitValEl.textContent = `${simulatedProfit >= 0 ? '+' : ''}${simulatedProfit.toFixed(2)} PLN`;
    
    if (simulatedProfit >= 0) {
      profitValEl.style.color = 'var(--success-color)';
    } else {
      profitValEl.style.color = 'var(--danger-color)';
    }

    // Update global badge temporarily to show simulation impact
    totalValEl.textContent = `${simulatedVal.toFixed(2)} PLN`;
    if (simulatedProfit >= 0) {
      totalValEl.style.color = 'var(--success-color)';
    } else {
      totalValEl.style.color = 'var(--danger-color)';
    }
  });
}

// Remove stock from portfolio
window.removeFromPortfolio = function() {
  portfolioSelection = null;
  localStorage.removeItem('chosen_stock_portfolio');
  updatePortfolioUI();
  selectStock(currentSelectedSymbol);
};

// Event listener for budget changes
document.getElementById('budget').addEventListener('input', () => {
  updateSharesSimulation();
  updatePortfolioUI();
});

// Initial startup
window.addEventListener('DOMContentLoaded', () => {
  fetchPrices();
});
