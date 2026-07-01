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
    const response = await fetch('https://api.iextrading.com/1.0/tops/last?symbols=NVDA,LLY,TSM,GOOG,AMZN');
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

// Chart.js instance — destroy and recreate on each stock change
let priceChart = null;

function loadChart(symbol) {
  const stock = stocksData[symbol];
  if (!stock || !stock.priceHistory) return;

  const { dates, prices } = stock.priceHistory;
  const isPositive = stock.returnNumeric >= 0;
  const color = isPositive ? '#10b981' : '#ef4444';
  const colorFade = isPositive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)';

  // Destroy previous chart instance to avoid canvas reuse errors
  if (priceChart) {
    priceChart.destroy();
    priceChart = null;
  }

  const ctx = document.getElementById('price-chart').getContext('2d');

  priceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: `${symbol} – cena (USD)`,
        data: prices,
        borderColor: color,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: color,
        fill: true,
        backgroundColor: (ctx) => {
          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
          gradient.addColorStop(0, isPositive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)');
          gradient.addColorStop(1, 'rgba(0,0,0,0)');
          return gradient;
        },
        tension: 0.3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          titleColor: '#f8fafc',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          callbacks: {
            label: (ctx) => ` $${ctx.parsed.y.toFixed(2)} USD`
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#64748b',
            maxTicksLimit: 8,
            maxRotation: 0,
            callback: function(value, index, ticks) {
              // Show month/year labels
              const date = this.getLabelForValue(value);
              const d = new Date(date);
              return d.toLocaleDateString('pl-PL', { month: 'short', year: '2-digit' });
            }
          },
          grid: { color: 'rgba(255,255,255,0.04)' },
          border: { color: 'rgba(255,255,255,0.08)' }
        },
        y: {
          position: 'right',
          ticks: {
            color: '#64748b',
            callback: (v) => `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
          },
          grid: { color: 'rgba(255,255,255,0.04)' },
          border: { color: 'rgba(255,255,255,0.08)' }
        }
      }
    }
  });
}

// Initial startup
window.addEventListener('DOMContentLoaded', () => {
  fetchPrices();
});
