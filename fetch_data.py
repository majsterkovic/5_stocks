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
        "desc": "Lider infrastruktury AI i największa firma półprzewodnikowa na świecie. Architektura Blackwell napędza potężny popyt od dostawców chmury (hyperscalerów) — AWS, Azure i Google Cloud masowo kupują GPU Nvidii. Jensen Huang wskazuje na punkt zwrotny agentów AI (agentic AI) jako kolejny cykl wzrostowy po generatywnej AI.",
        "why": "Nvidia dominuje rynek akceleratorów AI z udziałem przekraczającym 80%. W Q1 FY2027 (maj 2026) przychody z data center osiągnęły rekordowe $75.2 mld (+92% r/r), a łączne przychody $81.6 mld przebiły konsensus analityków ($78.8 mld). CEO Jensen Huang mówi o 'agentic AI inflection point' — nowym cyklu, w którym AI samodzielnie wykonuje zadania. Architektura Blackwell napędza popyt od hyperscalerów, klientów suwerennych (rządy) i przedsiębiorstw. Główne ryzyko: ograniczenia eksportowe chipów do Chin i potencjalna korekta po gwałtownym wzroście wycen.",
        "growth2026": "55.0%",
        "rating": "Strong Buy",
        "potential": "+14.0%",
        "sector": "Półprzewodniki i AI"
    },
    "LLY": {
        "logo": "🧬",
        "logoBg": "#E00000",
        "desc": "Farmaceutyczny gigant napędzany rewolucyjnym popytem na leki odchudzające GLP-1 (Mounjaro, Zepbound). W kwietniu 2026 FDA zatwierdziło Foundayo (orforglipron) — pierwszy doustny lek GLP-1 od Lilly, co otwiera zupełnie nowy segment pacjentów preferujących tabletki zamiast zastrzyków.",
        "why": "Globalny boom na leki GLP-1 napędza rekordowy wzrost Eli Lilly. W Q1 2026 Mounjaro wygenerował $8.66 mld (+125% r/r), a Zepbound $4.16 mld (+80% r/r). Łączne przychody firmy wzrosły o 56% do $19.8 mld, bijąc oczekiwania analityków. Firma podniosła prognozę roczną do $82-85 mld. Kluczowy nowy katalizator to zatwierdzenie Foundayo (orforglipron) — doustnej tabletki GLP-1, która może dotrzeć do pacjentów unikających zastrzyków. Starzejąca się populacja i epidemia otyłości tworzą wieloletni trend wzrostowy. Ryzyko: presja cenowa na leki i konkurencja ze strony Novo Nordisk.",
        "growth2026": "30.4%",
        "rating": "Buy",
        "potential": "+18.0%",
        "sector": "Farmacja i Zdrowie"
    },
    "TSM": {
        "logo": "🔌",
        "logoBg": "#005EB8",
        "desc": "Największa na świecie niezależna odlewnia półprzewodników (foundry). TSMC produkuje najbardziej zaawansowane chipy na świecie w technologii 3nm i 2nm dla klientów takich jak Nvidia, Apple, AMD i Qualcomm. Bez TSMC nie istniałaby rewolucja AI — firma jest dosłownie kręgosłupem globalnego sektora technologicznego.",
        "why": "TSMC to jedyna firma na świecie zdolna do masowej produkcji chipów w najnowszych nodach technologicznych. Wzrost zapotrzebowania na GPU Blackwell od Nvidii i procesory Apple bezpośrednio przekłada się na wyniki spółki. Firma podniosła prognozę wzrostu na 2026 rok do ponad 30% w dolarach, a analitycy szacują nawet ~40%. Technologia 3nm pracuje z obłożeniem ponad 100%, a masowa produkcja chipów 2nm (N2P) ruszy w 2. połowie 2026. Zainteresowanie technologią 2nm znacznie przewyższa tempo adopcji 3nm na tym samym etapie. TSMC podnosi ceny o 5-10% na zaawansowanych nodach. Ryzyko: napięcia geopolityczne wokół Tajwanu i cykliczność rynku półprzewodników.",
        "growth2026": "33.0%",
        "rating": "Strong Buy",
        "potential": "+20.0%",
        "sector": "Półprzewodniki"
    },
    "GOOG": {
        "logo": "🔍",
        "logoBg": "#4285F4",
        "desc": "Alphabet to gigant technologiczny stojący za wyszukiwarką Google, YouTube, systemem Android i chmurą Google Cloud. W 2026 roku jest jednym z najszybciej rosnących Big Techów dzięki eksplozji przychodów z chmury AI (+63%) i monetyzacji modelu Gemini. Przy relatywnie niskim P/E jest najtańszym z technologicznych gigantów.",
        "why": "Alphabet jest jednym z najsilniejszych performerów w 2026 — awansował na 2-3 miejsce pod względem kapitalizacji rynkowej (~$4.0-4.3 bln). Google Cloud rośnie o 63% r/r do $20 mld kwartalnie, a backlog chmury osiągnął rekordowe $462 mld — co wskazuje na przyszłe przychody. Gemini ma ponad 900 mln aktywnych użytkowników miesięcznie, a przychody z subskrypcji AI przekroczyły $1.2 mld w 2025. Ponad 120 tys. przedsiębiorstw używa Gemini. Przy P/E ~23 Alphabet jest najtańszym gigantem tech z najwyższym wzrostem chmury. Ryzyko: ogromne nakłady inwestycyjne ($180-190 mld CapEx w 2026) i regulacje antymonopolowe.",
        "growth2026": "20.0%",
        "rating": "Buy",
        "potential": "+10.0%",
        "sector": "Wyszukiwarki i Chmura AI"
    },
    "AMZN": {
        "logo": "📦",
        "logoBg": "#FF9900",
        "desc": "Amazon to dominator rynku e-commerce i chmury obliczeniowej (AWS). W 2026 roku przeżywa przyspieszenie dzięki rekordowemu wzrostowi AWS (+28%), dynamicznie rosnącej reklamie cyfrowej (+24%) i poprawie marż e-commerce dzięki automatyzacji logistyki. Analitycy nazywają Amazona 'catch-up trade' — spółką, której momentum dopiero zaczyna być wyceniane.",
        "why": "AWS odnotowuje najszybszy wzrost sprzedaży od 15 kwartałów (28% r/r w Q1 2026, do $37.6 mld), napędzany popytem na AI training i inference. Segment reklamowy rośnie o 24% r/r do $17.2 mld — stając się jednym z najbardziej dochodowych biznesów firmy. Automatyzacja centrów logistycznych systematycznie poprawia marże segmentu e-commerce. Amazon jest nazywany 'catch-up trade' — spółką, która jeszcze nie w pełni odzwierciedla w cenie swoje fundamenty. Przy kapitalizacji ~$2.5 bln oferuje solidny wzrost przy stosunkowo bezpiecznym profilu ryzyka. Główne ryzyko: ogromne nakłady na infrastrukturę AI (~$200 mld CapEx w 2026) mogą ograniczyć wolne przepływy pieniężne w krótkim terminie.",
        "growth2026": "15.0%",
        "rating": "Buy",
        "potential": "+30.0%",
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
                "sector": metadata["sector"],
                "priceHistory": {
                    "dates": hist.index.strftime("%Y-%m-%d").tolist(),
                    "prices": [round(float(p), 2) for p in hist['Close'].tolist()]
                }
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
