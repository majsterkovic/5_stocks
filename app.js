// ─── State ────────────────────────────────────────────────────────────────────
let currentSymbol = Object.keys(stocksData)[0];
let liveHistory   = {};   // symbol → { dates, prices }
let livePrices    = {};   // symbol → current USD price
let priceChart    = null;

// Seed fallback prices from data.js
for (const key in stocksData) {
  livePrices[key] = stocksData[key].fallbackPrice;
}

// ─── Live data via Yahoo Finance JSON API (CORS-enabled, no key needed) ───────
async function fetchLiveHistory(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1y&interval=1d`;
  const res  = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json   = await res.json();
  const result = json.chart.result[0];
  const ts     = result.timestamp;
  const closes = result.indicators.quote[0].close;
  const meta   = result.meta;

  // Pair timestamps with closes and drop nulls
  const pairs = ts
    .map((t, i) => ({ date: new Date(t * 1000).toISOString().split('T')[0], price: closes[i] }))
    .filter(p => p.price != null);

  return {
    dates:        pairs.map(p => p.date),
    prices:       pairs.map(p => Math.round(p.price * 100) / 100),
    currentPrice: meta.regularMarketPrice ?? meta.chartPreviousClose,
  };
}

async function loadAllLiveData() {
  const symbols = Object.keys(stocksData);
  const results = await Promise.allSettled(symbols.map(s => fetchLiveHistory(s)));

  results.forEach((r, i) => {
    const sym = symbols[i];
    if (r.status === 'fulfilled') {
      liveHistory[sym] = { dates: r.value.dates, prices: r.value.prices };
      livePrices[sym]  = r.value.currentPrice;
      console.log(`✅ Live data for ${sym}: $${r.value.currentPrice}`);
    } else {
      console.warn(`⚠️ Yahoo Finance blocked for ${sym}, using cached data.js values.`);
      // Fall back to priceHistory embedded by fetch_data.py
      if (stocksData[sym].priceHistory) liveHistory[sym] = stocksData[sym].priceHistory;
    }
  });

  // Re-render with fresh data
  renderSidebar();
  selectStock(currentSymbol);
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function renderSidebar() {
  const container = document.getElementById('stocks-list');
  container.innerHTML = '';

  for (const key in stocksData) {
    const stock      = stocksData[key];
    const price      = livePrices[key] ?? stock.fallbackPrice;
    const pricePLN   = (price * USD_TO_PLN).toFixed(2);
    const positive   = stock.returnNumeric >= 0;
    const returnSign = positive ? '+' : '';
    const isActive   = key === currentSymbol ? 'active' : '';

    const card = document.createElement('div');
    card.className = `stock-card ${isActive}`;
    card.onclick   = () => selectStock(key);
    card.innerHTML = `
      <div class="stock-header">
        <div class="stock-identity">
          <div class="stock-logo" style="background-color:${stock.logoBg}15;color:${stock.logoBg}">${stock.logo}</div>
          <div class="stock-name-symbol">
            <span class="stock-symbol">${stock.symbol}</span>
            <span class="stock-fullname">${stock.fullname}</span>
          </div>
        </div>
        <div class="stock-quick-chart">
          <span class="stock-price">${pricePLN} PLN</span>
          <span class="stock-change ${positive ? 'positive' : 'negative'}">
            ${returnSign}${stock.oneYearReturn}
          </span>
        </div>
      </div>
      <div class="stock-desc">${stock.desc}</div>
      <div class="stock-metrics">
        <div class="metric-item"><span>Kapitalizacja:</span><span>${stock.marketCap}</span></div>
        <div class="metric-item"><span>C/Z (P/E):</span><span>${stock.pe}</span></div>
      </div>
    `;
    container.appendChild(card);
  }
}

// ─── Detail panel ─────────────────────────────────────────────────────────────
function selectStock(symbol) {
  currentSymbol = symbol;

  // Active highlight in sidebar
  document.querySelectorAll('.stock-card').forEach(card => {
    card.classList.toggle('active', card.querySelector('.stock-symbol').textContent === symbol);
  });

  const stock = stocksData[symbol];
  const price = livePrices[symbol] ?? stock.fallbackPrice;

  // Header
  const logo = document.getElementById('detail-logo');
  logo.textContent       = stock.logo;
  logo.style.backgroundColor = `${stock.logoBg}15`;
  logo.style.color           = stock.logoBg;
  document.getElementById('detail-symbol').textContent   = stock.symbol;
  document.getElementById('detail-fullname').textContent = stock.fullname;

  // Descriptions
  document.getElementById('detail-desc').textContent = stock.desc;
  document.getElementById('detail-why').textContent  = stock.why ?? 'Brak danych';

  // Metrics
  document.getElementById('metric-pe').textContent  = stock.pe;
  document.getElementById('metric-cap').textContent = stock.marketCap;
  const returnEl = document.getElementById('metric-return');
  returnEl.textContent = stock.oneYearReturn;
  returnEl.className   = `indicator-value ${stock.returnNumeric >= 0 ? 'positive' : 'negative'}`;
  document.getElementById('metric-growth').textContent   = stock.growth2026  ?? '--';
  document.getElementById('metric-rating').textContent   = stock.rating      ?? '--';
  document.getElementById('metric-potential').textContent = stock.potential  ?? '--';

  // Chart — use live data if available, otherwise fall back to data.js history
  const history = liveHistory[symbol] ?? stock.priceHistory;
  renderChart(symbol, history, stock.returnNumeric >= 0);
}

// ─── Chart.js ─────────────────────────────────────────────────────────────────
function renderChart(symbol, history, isPositive) {
  if (!history) return;

  const color = isPositive ? '#10b981' : '#ef4444';

  if (priceChart) { priceChart.destroy(); priceChart = null; }

  const ctx = document.getElementById('price-chart').getContext('2d');

  priceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: history.dates,
      datasets: [{
        label: `${symbol} – cena (USD)`,
        data:  history.prices,
        borderColor: color,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: color,
        fill: true,
        backgroundColor: ctx => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
          g.addColorStop(0, isPositive ? 'rgba(16,185,129,0.28)' : 'rgba(239,68,68,0.28)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          return g;
        },
        tension: 0.3,
      }]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(17,24,39,0.95)',
          titleColor:      '#f8fafc',
          bodyColor:       '#94a3b8',
          borderColor:     'rgba(255,255,255,0.08)',
          borderWidth:     1,
          callbacks: {
            title: items => items[0].label,
            label: ctx  => ` $${ctx.parsed.y.toFixed(2)} USD`,
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#64748b',
            maxTicksLimit: 8,
            maxRotation:   0,
            callback(value) {
              const d = new Date(this.getLabelForValue(value));
              return d.toLocaleDateString('pl-PL', { month: 'short', year: '2-digit' });
            }
          },
          grid:   { color: 'rgba(255,255,255,0.04)' },
          border: { color: 'rgba(255,255,255,0.08)' },
        },
        y: {
          position: 'right',
          ticks: {
            color: '#64748b',
            callback: v => `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
          },
          grid:   { color: 'rgba(255,255,255,0.04)' },
          border: { color: 'rgba(255,255,255,0.08)' },
        }
      }
    }
  });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // 1. Seed from static data.js immediately (instant render, no network wait)
  for (const key in stocksData) {
    if (stocksData[key].priceHistory) liveHistory[key] = stocksData[key].priceHistory;
  }
  renderSidebar();
  selectStock(currentSymbol);

  // 2. Then try live Yahoo Finance in background (updates chart silently)
  loadAllLiveData();
});
