import yfinance as yf
import json
import os
import urllib.request

# The 5 stocks chosen by the user for the 2026 presentation (swapped META for TSM)
TICKERS = ["NVDA", "LLY", "TSM", "GOOG", "AMZN"]

# Custom 2026 consensus metrics and Polish descriptions
METADATA = {
    "NVDA": {
        "logo": "🟢",
        "logoBg": "#76B900",
        "desc": "Lider infrastruktury AI. Architektura Blackwell napędza potężny popyt od dostawców chmury (hyperscalerów). Wskazuje na punkt zwrotny agentów sztucznej inteligencji (agentic AI) jako nowy cykl wzrostowy.",
        "why": "Nvidia jest liderem infrastruktury AI. Przychody z data center wzrosły o 92% r/r w Q1 FY2027, a CEO Jensen Huang mówi o 'agentic AI inflection point' jako nowym cyklu wzrostowym. Architektura Blackwell napędza popyt od hyperscalerów, dostawców chmury AI i klientów suwerennych. Jedynym ryzykiem są ograniczenia eksportowe do Chin.",
        "growth2026": "61.0%",
        "rating": "Strong Buy",
        "potential": "+14.0%",
        "sector": "Półprzewodniki i AI"
    },
    "LLY": {
        "logo": "🧬",
        "logoBg": "#E00000",
        "desc": "Farmaceutyczny gigant napędzany rewolucyjnym popytem na leki odchudzające i przeciw otyłości (Mounjaro, Zepbound), wspierany trendami longevity i starzejącego się społeczeństwa.",
        "why": "Globalny boom na leki GLP-1 (Mounjaro, Zepbound) napędza rekordowy wzrost. W Q1 2026 przychody z leków na cukrzycę i otyłość wzrosły o 125% (Mounjaro) i 80% (Zepbound). Starzejąca się populacja i trend longevity tworzą długoterminowy popyt. To spółka o najwyższym wzroście przychodów w sektorze zdrowia.",
        "growth2026": "30.4%",
        "rating": "Buy",
        "potential": "+18.0%",
        "sector": "Farmacja i Zdrowie"
    },
    "TSM": {
        "logo": "🔌",
        "logoBg": "#005EB8",
        "desc": "Największa na świecie niezależna odlewnia półprzewodników. Produkuje najbardziej zaawansowane chipy na świecie dla gigantów takich jak Nvidia, Apple czy AMD, stanowiąc kręgosłup sektora technologicznego.",
        "why": "Kluczowy element globalnego łańcucha dostaw AI. Wzrost zapotrzebowania na układy Blackwell od Nvidii oraz procesory Apple bezpośrednio przekłada się na wyniki spółki. W 2026 roku TSMC umacnia swoją pozycję monopolisty w segmencie chipów 2nm i 3nm.",
        "growth2026": "28.0%",
        "rating": "Buy",
        "potential": "+15.0%",
        "sector": "Półprzewodniki"
    },
    "GOOG": {
        "logo": "🔍",
        "logoBg": "#4285F4",
        "desc": "Lider wyszukiwania internetowego rozwijający chmurę Google Cloud (wzrost o 63%) oraz płatne subskrypcje modeli Gemini. Najtańszy wycenowo gigant z technologicznego TOP 5.",
        "why": "Alphabet jest jednym z najsilniejszych performerów w 2026 roku — wskoczył z 4. na 2. miejsce pod względem kapitalizacji. Google Cloud rośnie o 63%, a backlog chmury prawie się podwoił do ponad $460 mld. Model Gemini ma już 350 mln płatnych subskrypcji. Przy P/E = 23 jest najtańszym gigantem tech z najwyższym wzrostem.",
        "growth2026": "20.0%",
        "rating": "Buy",
        "potential": "+15.0%",
        "sector": "Wyszukiwarki i Chmura AI"
    },
    "AMZN": {
        "logo": "📦",
        "logoBg": "#FF9900",
        "desc": "Dominator rynku e-commerce i chmury AWS, przeżywający rewolucję dzięki automatyzacji logistyki i rosnącym przychodom reklamowym. Uznawany za bezpieczną przystań o stabilnym wzroście.",
        "why": "AWS odnotowuje najszybszy wzrost sprzedaży od ponad 3 lat, a Amazon jest nazywany 'catch-up trade' — spółką, której momentum dopiero zaczyna być wyceniane. Reklama rośnie o 18%, a Prime o 9% r/r. Automatyzacja logistyki poprawia marże e-commerce. To najbezpieczniejszy wybór z piątki — solidny wzrost przy dużej kapitalizacji.",
        "growth2026": "15.0%",
        "rating": "Buy",
        "potential": "+12.0%",
        "sector": "E-commerce i Chmura AWS"
    }
}

def get_usd_to_pln_rate():
    try:
        url = "https://open.er-api.com/v6/latest/USD"
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode())
            rate = data["rates"]["PLN"]
            print(f"Pobrano kurs USD/PLN: {rate}")
            return rate
    except Exception as e:
        print(f"Błąd kursu walut ({e}), domyślnie: 4.02")
        return 4.02

def format_market_cap(market_cap):
    if not market_cap:
        return "N/A"
    if market_cap >= 1e12:
        return f"${market_cap / 1e12:.2f}T USD"
    elif market_cap >= 1e9:
        return f"${market_cap / 1e9:.2f}B USD"
    return f"${market_cap:,.0f} USD"

def format_percentage(val):
    if val is None:
        return "Brak"
    return f"{val:.2f}%"

def main():
    print("Pobieranie danych rynkowych z Yahoo Finance...")
    usd_to_pln = get_usd_to_pln_rate()
    stocks_data = {}

    for ticker_symbol in TICKERS:
        print(f"Przetwarzanie {ticker_symbol}...")
        try:
            ticker = yf.Ticker(ticker_symbol)
            info = ticker.info

            # 1-year historical return calculation
            hist = ticker.history(period="1y")
            if not hist.empty:
                first_price = hist['Close'].iloc[0]
                last_price = hist['Close'].iloc[-1]
                one_year_return_val = ((last_price - first_price) / first_price) * 100
                one_year_return = f"{one_year_return_val:+.2f}%"
                return_numeric = one_year_return_val
            else:
                one_year_return = "N/A"
                return_numeric = 0.0

            current_price = info.get("currentPrice") or info.get("regularMarketPrice")
            if not current_price and not hist.empty:
                current_price = hist['Close'].iloc[-1]

            pe = info.get("trailingPE")
            pe_str = f"{pe:.1f}" if pe else "N/A"

            div_yield = info.get("dividendYield")
            div_str = format_percentage(div_yield)

            market_cap = info.get("marketCap")
            cap_str = format_market_cap(market_cap)

            metadata = METADATA[ticker_symbol]

            stocks_data[ticker_symbol] = {
                "symbol": ticker_symbol,
                "fullname": info.get("longName", ticker_symbol),
                "logo": metadata["logo"],
                "logoBg": metadata["logoBg"],
                "desc": metadata["desc"],
                "why": metadata["why"],
                "growth2026": metadata["growth2026"],
                "rating": metadata["rating"],
                "potential": metadata["potential"],
                "pe": pe_str,
                "divYield": div_str,
                "marketCap": cap_str,
                "oneYearReturn": one_year_return,
                "returnNumeric": return_numeric,
                "fallbackPrice": current_price,
                "sector": metadata["sector"]
            }
            print(f"Pobrano pomyślnie {ticker_symbol} (Cena: {current_price} USD)")

        except Exception as e:
            print(f"Błąd pobierania {ticker_symbol}: {e}")
            metadata = METADATA[ticker_symbol]
            stocks_data[ticker_symbol] = {
                "symbol": ticker_symbol,
                "fullname": f"{ticker_symbol} Corp",
                "logo": metadata["logo"],
                "logoBg": metadata["logoBg"],
                "desc": metadata["desc"],
                "why": metadata["why"],
                "growth2026": metadata["growth2026"],
                "rating": metadata["rating"],
                "potential": metadata["potential"],
                "pe": "N/A",
                "divYield": "N/A",
                "marketCap": "N/A",
                "oneYearReturn": "N/A",
                "returnNumeric": 0.0,
                "fallbackPrice": 100.0,
                "sector": metadata["sector"]
            }

    js_content = f"""// Automatycznie wygenerowane dane - nie edytuj ręcznie!
const USD_TO_PLN = {usd_to_pln};
const stocksData = {json.dumps(stocks_data, indent=2, ensure_ascii=False)};
"""

    output_path = "data.js"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(js_content)
    
    print(f"Zapisano dane do {output_path}!")

if __name__ == "__main__":
    main()
