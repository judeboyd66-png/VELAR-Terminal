"""
news.py — parallel RSS aggregator + S&P 100 earnings (Nasdaq API)
News:     18 quality feeds, parallel fetch, Groq impact scoring, 3-min cache
          HIGH-impact articles persisted 7 days, MEDIUM 48h (rolling archive)
Earnings: Nasdaq public earnings calendar — no API key required
"""
import os, re, time, json, logging, requests, calendar
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
import feedparser
from fastapi import APIRouter
from diskcache import Cache

try:
    from groq import Groq
    _groq = Groq(api_key=os.getenv("GROQ_API_KEY", ""))
except Exception:
    _groq = None

router = APIRouter()
cache  = Cache("/tmp/signal_cache")
log    = logging.getLogger(__name__)

# ── RSS sources — verified working, curated for financial signal ──────────────
FEEDS = [
    # ── Markets / general wires ──
    {"name": "Bloomberg",         "url": "https://feeds.bloomberg.com/markets/news.rss",                    "max": 14},
    {"name": "Bloomberg Econ",    "url": "https://feeds.bloomberg.com/economics/news.rss",                  "max": 14},  # Fed, rates, macro
    {"name": "CNBC",              "url": "https://www.cnbc.com/id/20910258/device/rss/rss.html",            "max": 12},
    {"name": "CNBC World",        "url": "https://www.cnbc.com/id/100003114/device/rss/rss.html",           "max": 10},
    {"name": "MarketWatch",       "url": "https://feeds.marketwatch.com/marketwatch/topstories/",           "max": 12},
    {"name": "Yahoo Finance",     "url": "https://finance.yahoo.com/news/rssindex",                         "max": 12},
    {"name": "WSJ Markets",       "url": "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",                  "max": 12},
    # ── Macro / economics specialists ──
    {"name": "FT",                "url": "https://www.ft.com/rss/home",                                     "max": 10},
    {"name": "FT Markets",        "url": "https://www.ft.com/markets?format=rss",                           "max": 10},  # deeper market/macro
    {"name": "The Economist",     "url": "https://www.economist.com/finance-and-economics/rss.xml",         "max": 10},
    {"name": "ForexLive",         "url": "https://www.forexlive.com/feed/news",                              "max": 12},
    {"name": "Guardian Economy",  "url": "https://www.theguardian.com/business/economics/rss",              "max": 8},
    {"name": "NPR Economy",       "url": "https://feeds.npr.org/1017/rss.xml",                              "max": 8},
    {"name": "Politico Economy",  "url": "https://rss.politico.com/economy.xml",                            "max": 6},
    {"name": "Wolf Street",       "url": "https://wolfstreet.com/feed/",                                    "max": 8},
    # ── Commodities specialists ──
    {"name": "Kitco",             "url": "https://www.kitco.com/rss/kitco-news-articles.rss",               "max": 10},
    {"name": "OilPrice.com",      "url": "https://oilprice.com/rss/main",                                   "max": 10},
    # ── Geopolitics ──
    {"name": "BBC World",         "url": "https://feeds.bbci.co.uk/news/world/rss.xml",                     "max": 10},
    {"name": "AP",                "url": "https://rsshub.app/apnews/topics/world-news",                     "max": 8},
    # ── AI / Tech ──
    {"name": "TechCrunch",        "url": "https://techcrunch.com/feed/",                                    "max": 8},
    {"name": "Ars Technica",      "url": "https://feeds.arstechnica.com/arstechnica/index",                 "max": 6},
    # ── Crypto ──
    {"name": "CoinDesk",          "url": "https://www.coindesk.com/arc/outboundfeeds/rss/",                 "max": 8},
    {"name": "CoinTelegraph",     "url": "https://cointelegraph.com/rss",                                   "max": 8},
]

# Titles containing these strings are junk — skip them regardless of source
_JUNK_PATTERNS = [
    # SEC / regulatory filings
    "form 144", "form 13f", "form 13g", "form s-1", "form 10-", "form 8-k",
    "proxy statement", "sec filing",
    # C-suite announcements (low signal)
    "appoints ", " as ceo", " as president and ceo", " as chief executive",
    "board of directors", "board member", "names new cfo", "names new coo",
    # Tech product fluff (not financial)
    "new pixel", "iphone review", "android review", "best laptop",
    "long fingernails", "nail polish", "touchscreen tip",
    "apple watch", "airpods", "headphones review",
    # Lifestyle / irrelevant
    "recipe", "horoscope", "workout", "weight loss", "diet tips",
    # Legal noise
    "drops lawsuit", "settles lawsuit", "class action settlement",
]

# ── Static company metadata (avoids hammering Yahoo for basic info) ──────────
COMPANIES = [
    # ticker, name, sector, approx_mcap_B
    ('AAPL',  'Apple Inc.',               'Technology',        3200e9),
    ('MSFT',  'Microsoft Corp.',           'Technology',        3100e9),
    ('NVDA',  'NVIDIA Corp.',              'Technology',        2900e9),
    ('AMZN',  'Amazon.com Inc.',           'Consumer Cyclical', 2100e9),
    ('META',  'Meta Platforms',            'Technology',        1400e9),
    ('GOOGL', 'Alphabet Inc.',             'Technology',        2200e9),
    ('TSLA',  'Tesla Inc.',                'Consumer Cyclical',  700e9),
    ('JPM',   'JPMorgan Chase',            'Financial',          590e9),
    ('BRK-B', 'Berkshire Hathaway',        'Financial',          900e9),
    ('LLY',   'Eli Lilly',                 'Healthcare',         730e9),
    ('V',     'Visa Inc.',                 'Financial',          570e9),
    ('UNH',   'UnitedHealth Group',        'Healthcare',         500e9),
    ('XOM',   'Exxon Mobil',               'Energy',             490e9),
    ('AVGO',  'Broadcom Inc.',             'Technology',         780e9),
    ('MA',    'Mastercard Inc.',           'Financial',          450e9),
    ('JNJ',   'Johnson & Johnson',         'Healthcare',         380e9),
    ('COST',  'Costco Wholesale',          'Consumer Defensive', 380e9),
    ('PG',    'Procter & Gamble',          'Consumer Defensive', 360e9),
    ('HD',    'Home Depot',                'Consumer Cyclical',  340e9),
    ('ABBV',  'AbbVie Inc.',               'Healthcare',         310e9),
    ('BAC',   'Bank of America',           'Financial',          310e9),
    ('CVX',   'Chevron Corp.',             'Energy',             280e9),
    ('KO',    'Coca-Cola Co.',             'Consumer Defensive', 260e9),
    ('MRK',   'Merck & Co.',               'Healthcare',         260e9),
    ('NFLX',  'Netflix Inc.',              'Communication',      270e9),
    ('CRM',   'Salesforce Inc.',           'Technology',         280e9),
    ('PEP',   'PepsiCo Inc.',              'Consumer Defensive', 230e9),
    ('AMD',   'Advanced Micro Devices',    'Technology',         260e9),
    ('TMO',   'Thermo Fisher Scientific',  'Healthcare',         200e9),
    ('ACN',   'Accenture PLC',             'Technology',         200e9),
    ('WMT',   'Walmart Inc.',              'Consumer Defensive', 700e9),
    ('ORCL',  'Oracle Corp.',              'Technology',         380e9),
    ('ADBE',  'Adobe Inc.',                'Technology',         200e9),
    ('MCD',   'McDonald\'s Corp.',         'Consumer Cyclical',  210e9),
    ('CSCO',  'Cisco Systems',             'Technology',         200e9),
    ('DIS',   'Walt Disney Co.',           'Communication',      200e9),
    ('INTU',  'Intuit Inc.',               'Technology',         170e9),
    ('TXN',   'Texas Instruments',         'Technology',         170e9),
    ('IBM',   'IBM Corp.',                 'Technology',         170e9),
    ('AMGN',  'Amgen Inc.',                'Healthcare',         160e9),
    ('CAT',   'Caterpillar Inc.',          'Industrials',        180e9),
    ('GS',    'Goldman Sachs',             'Financial',          160e9),
    ('MS',    'Morgan Stanley',            'Financial',          150e9),
    ('AXP',   'American Express',          'Financial',          160e9),
    ('BKNG',  'Booking Holdings',          'Consumer Cyclical',  160e9),
    ('ISRG',  'Intuitive Surgical',        'Healthcare',         160e9),
    ('NOW',   'ServiceNow Inc.',           'Technology',         180e9),
    ('PANW',  'Palo Alto Networks',        'Technology',         120e9),
    ('SBUX',  'Starbucks Corp.',           'Consumer Cyclical',  100e9),
    ('LMT',   'Lockheed Martin',           'Defense',            140e9),
    ('BA',    'Boeing Co.',                'Industrials',         90e9),
    ('GD',    'General Dynamics',          'Defense',            100e9),
    ('RTX',   'RTX Corp.',                 'Defense',            150e9),
    ('DE',    'Deere & Company',           'Industrials',        120e9),
    ('HON',   'Honeywell Intl.',           'Industrials',        130e9),
    ('NEE',   'NextEra Energy',            'Utilities',          140e9),
    ('C',     'Citigroup Inc.',            'Financial',           90e9),
    ('WFC',   'Wells Fargo',               'Financial',          200e9),
    ('SCHW',  'Charles Schwab',            'Financial',           90e9),
    ('PFE',   'Pfizer Inc.',               'Healthcare',         130e9),
    ('GILD',  'Gilead Sciences',           'Healthcare',          90e9),
    ('REGN',  'Regeneron Pharma',          'Healthcare',         100e9),
    ('VRTX',  'Vertex Pharma',             'Healthcare',         120e9),
    ('MU',    'Micron Technology',         'Technology',         100e9),
    ('AMAT',  'Applied Materials',         'Technology',         130e9),
    ('ADI',   'Analog Devices',            'Technology',          90e9),
    ('LRCX',  'Lam Research',              'Technology',          90e9),
    ('SLB',   'SLB (Schlumberger)',         'Energy',              70e9),
    ('COP',   'ConocoPhillips',            'Energy',             120e9),
    ('EOG',   'EOG Resources',             'Energy',              65e9),
    ('OXY',   'Occidental Petroleum',      'Energy',              50e9),
    ('CVS',   'CVS Health',                'Healthcare',          75e9),
    ('ELV',   'Elevance Health',           'Healthcare',         100e9),
    ('UPS',   'United Parcel Service',     'Industrials',        100e9),
    ('FDX',   'FedEx Corp.',               'Industrials',         65e9),
    ('BX',    'Blackstone Inc.',           'Financial',          160e9),
    ('KKR',   'KKR & Co.',                 'Financial',          110e9),
    ('SPGI',  'S&P Global Inc.',           'Financial',          140e9),
    ('BLK',   'BlackRock Inc.',            'Financial',          130e9),
    ('KLAC',  'KLA Corp.',                 'Technology',          80e9),
    ('ABBV',  'AbbVie Inc.',               'Healthcare',         310e9),
    ('ZTS',   'Zoetis Inc.',               'Healthcare',          75e9),
    ('BSX',   'Boston Scientific',         'Healthcare',          95e9),
    ('DHR',   'Danaher Corp.',             'Healthcare',         150e9),
    ('ABT',   'Abbott Laboratories',       'Healthcare',         170e9),
]
# dedupe
seen_tickers: set = set()
COMPANIES_DEDUP = []
for row in COMPANIES:
    if row[0] not in seen_tickers:
        seen_tickers.add(row[0])
        COMPANIES_DEDUP.append(row)
COMPANIES = COMPANIES_DEDUP

# ── Tagging ─────────────────────────────────────────────────────────────────
def tag_article(title: str, summary: str) -> str:
    t = (title + " " + summary).lower()

    # ── Conflicts (check first — very specific) ──────────────────────────────
    if any(k in t for k in [
        "war ","warfare","military strike","russia","ukraine","nato","missile",
        " troops","invasion","geopolit","israel","gaza","iran ","iran'","iran-",
        "south china sea","taiwan strait","airstrike","ceasefire","pentagon",
        "warship","nuclear threat","north korea","hamas","hezbollah","idf",
        "drone strike","armed conflict","cease fire","war deal","war in ",
        "deal with iran","strikes on iran","attack on iran","iran war",
        "iran nuclear","middle east conflict","red sea attack","houthi",
        "military escalation","defense spending","nato defense",
    ]):
        return "Conflicts"

    # ── AI / Tech ────────────────────────────────────────────────────────────
    if any(k in t for k in [
        "artificial intelligence"," ai ","large language model","llm","openai",
        "anthropic","nvidia chip","semiconductor","deepseek","chatgpt",
        "machine learning"," agi ","generative ai","chips act","chip maker",
        "tsmc","gpu ","data center ai","model weights","foundation model",
        "robotics","autonomous vehicle","self-driving",
    ]):
        return "AI"

    # ── Crypto ───────────────────────────────────────────────────────────────
    if any(k in t for k in [
        "bitcoin","crypto "," eth ","ethereum","digital asset","blockchain",
        "defi","stablecoin","binance","coinbase"," btc ","altcoin","web3",
        "solana","ripple"," xrp ","nft ","cryptocurrency","prediction market",
        "polymarket","kalshi",
    ]):
        return "Crypto"

    # ── Fed / Rates (monetary policy — very broad) ───────────────────────────
    if any(k in t for k in [
        "federal reserve","fed reserve","fomc","jerome powell","powell said",
        "rate hike","rate cut","interest rate","monetary policy","fed funds",
        "hawkish","dovish","fed minutes","fed decision","basis points",
        "central bank rate","policy rate","quantitative tightening","qt ",
        "balance sheet","fed chair","fed officials","fed speakers",
        "ecb rate","bank of england rate","boe rate","rba rate",
        "rate decision","rate pause","rate hold","higher for longer",
        "powell out","replace powell","fire powell","new fed chair",
        "warsh","fed independence","treasury secretary",
        "bank of canada","bank of england","bank of japan","rba ","rbnz ",
        "ecb meeting","boe meeting","boj meeting","central bank decision",
        "central bank recruit","central bank appoint",
        "yield rises","yield falls","rate expectations",
    ]):
        return "Fed / Rates"

    # ── Inflation ────────────────────────────────────────────────────────────
    if any(k in t for k in [
        "inflation","consumer price","cpi ","core cpi","pce ","core pce",
        "price index","producer price","ppi ","prices rose","prices fell",
        "price pressures","disinflation","deflation","tariff inflation",
        "cost of living","purchasing power","price stability",
        "prices surge","prices drop","rising prices","fuel prices rise",
        "oil prices rise","oil prices fall","gas prices",
    ]):
        return "Inflation"

    # ── Labor / Employment ───────────────────────────────────────────────────
    if any(k in t for k in [
        "jobs report","nonfarm payroll","payroll","unemployment rate",
        "jobless claims","initial claims","labor market","hiring freeze",
        "mass layoff","job cuts","wages grew","wage growth","labor force",
        "job openings","jolts","employment data","labor department",
        "participation rate","private payroll","adp employment",
        "layoffs","hiring slows","jobs added","jobs lost",
    ]):
        return "Labor"

    # ── GDP / Global Macro ───────────────────────────────────────────────────
    if any(k in t for k in [
        " gdp "," gdp,"," gdp.","gross domestic","economic growth","economic output",
        "recession","economic slowdown","economic contraction","global economy",
        "world economy","imf ","world bank","oecd ","trade deficit","trade surplus",
        "current account","balance of payments","fiscal policy","government spending",
        "budget deficit","national debt","sovereign","eurozone economy",
        "uk economy","china economy","europe economy","u.s. economy","us economy",
        # Trade & policy
        "tariff","trade war","trade policy","trade deal","import duty","export ban",
        "economic policy","spending bill","stimulus","debt ceiling","fiscal cliff",
        "manufacturing output","industrial output","construction spending","factory order",
        "consumer spending","retail sales","housing starts","building permit",
        "durable goods","business investment","capex","capital expenditure",
        "supply chain","global trade","sanctions impact",
        "economic growth","growth slows","economy sputters","economy contracts",
        "infrastructure spending","infrastructure investment",
        "fuel rationing","energy rationing","ev tax","electric vehicle policy",
    ]):
        return "Global Macro"

    # ── Credit / Rates ───────────────────────────────────────────────────────
    if any(k in t for k in [
        "credit spread","corporate bond","treasury yield","yield curve","10-year",
        "2-year yield","high yield","investment grade","junk bond"," cds ",
        "leveraged loan","default rate","debt market","bond market","t-bill",
        "bond yield","gilt yield","bund yield",
        "debt refinancing","bond issuance","credit market",
    ]):
        return "Credit / Rates"

    # ── Earnings (corporate results) ─────────────────────────────────────────
    if any(k in t for k in [
        "earnings","quarterly results","quarterly profit","quarterly revenue",
        "q1 results","q2 results","q3 results","q4 results",
        "first quarter","second quarter","third quarter","fourth quarter",
        "revenue beat","revenue miss","profit rose","profit fell","profit miss",
        " eps ","guidance cut","guidance raise","beat estimates","missed estimates",
        "net income","operating profit","annual results","full-year results",
        "reports earnings","fiscal year results","tops estimates","raises forecast",
        "record revenue","record profit","reported a loss","reported a profit",
    ]):
        return "Earnings"

    # ── Oil / Energy ─────────────────────────────────────────────────────────
    if any(k in t for k in [
        " oil ","opec","crude ","wti ","brent ","natural gas","lng ","energy price",
        "pipeline","oil price","barrel","gasoline","diesel","fuel price",
        "oil output","oil supply","oil demand","refinery","energy supply",
        "renewable energy","solar energy","wind energy","nuclear energy",
        "energy crisis","power plant","electricity price",
    ]):
        return "Oil / Energy"

    # ── FX / Currencies ──────────────────────────────────────────────────────
    if any(k in t for k in [
        " yen ","jpy ","carry trade","dollar index","dxy ",
        "eurusd","gbpusd","fx market","currency market"," forex","pound sterling",
        "euro falls","euro rises","dollar falls","dollar rises","dollar strength",
        "dollar weakness","currency war","fx volatility","dollar index",
        "swiss franc","australian dollar","canadian dollar","emerging market currency",
    ]):
        return "FX / Japan"

    # ── Commodities ──────────────────────────────────────────────────────────
    if any(k in t for k in [
        " gold ","gold price","silver ","copper ","commodity","commodities",
        " wheat "," corn ","metals ","iron ore","lithium ","platinum","palladium",
        "agricultural","soybeans","cotton ","lumber ","uranium ",
        "coffee price","arabica","cocoa price","sugar price","zinc ","nickel ",
    ]):
        return "Commodities"

    # ── Equities ─────────────────────────────────────────────────────────────
    if any(k in t for k in [
        "nasdaq","s&p 500","dow jones","equity market","stock market",
        "wall street","market rally","market selloff","index futures","stock index",
        "buyback","share repurchase","dividend cut","dividend raise",
        "stock rises","stock falls","stock surges","stock drops","stock jumps",
        "shares rise","shares fall","shares surge","shares drop","shares jump",
        "stock price","share price","market cap","ipo ","going public",
        "going private","merger","acquisition","takeover","private equity",
        "venture capital","vc fund","startup valuation",
        "stock slips","shares slide","stock climbs","stock plunges",
        "market gains","market losses","equity rally","equity selloff",
    ]):
        return "Equities"

    return "Markets"


# ── Keyword fallback impact scoring ─────────────────────────────────────────
HIGH_KW = [
    "rate decision","fomc decision","emergency rate","rate hike","rate cut",
    "fed raises","fed cuts","boj raises","ecb raises","surprise hike","surprise cut",
    "nonfarm payroll","nfp ","cpi came in","inflation surged","inflation dropped",
    "gdp contraction","recession confirmed","recession declared",
    "nuclear","airstrike","missile attack","invasion begins","war declared",
    "ceasefire broken","emergency session","state of emergency",
    "circuit breaker","flash crash","market halted","bank failure","bank run",
    "contagion","liquidity crisis","bailout","opec cuts output","oil embargo",
]
MEDIUM_KW = [
    "jobless claims","retail sales"," pmi ","ism ","housing starts",
    "consumer confidence","trade deficit","core pce","durable goods",
    "powell said","lagarde said","fed speech","fed minutes","hawkish tone","dovish tone",
    "earnings beat","earnings miss","raised guidance","cut guidance","quarterly profit",
    "surged","plunged","tumbled","rallied","soared","hit record","all-time high",
    "sanctions imposed","trade war","tariff",
]

def keyword_impact(title: str, summary: str) -> str:
    t = (title + " " + summary).lower()
    if any(k in t for k in HIGH_KW):   return "high"
    if any(k in t for k in MEDIUM_KW): return "medium"
    return "low"


# ── Groq batch scoring ───────────────────────────────────────────────────────
def groq_score_impacts(articles: list[dict]) -> list[dict]:
    """Send up to 60 headlines to Groq in one call; annotate impact field."""
    if not _groq or not articles:
        return articles

    headlines = "\n".join(
        f"{i}. {a['title']}" for i, a in enumerate(articles[:60])
    )
    prompt = f"""You are a financial news impact classifier for professional traders.

For each headline below, classify market impact as exactly one of: high | medium | low

Rules:
- high   = central bank decisions, NFP/CPI surprises, war escalation, market crises, oil shocks, bank failures
- medium = scheduled data (PMI, claims, retail sales), earnings beats/misses, central bank speeches, notable price moves
- low    = commentary, opinion pieces, analyst notes, minor corporate news, background stories

Respond ONLY with a JSON array, no other text. Example: [{{"i":0,"impact":"high"}},{{"i":1,"impact":"low"}}]

Headlines:
{headlines}"""

    try:
        resp = _groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=800,
        )
        raw = resp.choices[0].message.content.strip()
        # strip markdown fences
        raw = re.sub(r"```(?:json)?", "", raw).replace("```", "").strip()
        scores = json.loads(raw)
        mapping = {s["i"]: s["impact"] for s in scores if "i" in s and "impact" in s}
        for i, a in enumerate(articles[:60]):
            if i in mapping and mapping[i] in ("high", "medium", "low"):
                a["impact"] = mapping[i]
    except Exception as e:
        log.warning(f"Groq impact scoring failed: {e}")

    return articles


# ── Feed fetcher (run in thread pool) ────────────────────────────────────────
_RSS_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
}

def _fetch_feed(feed_info: dict) -> list[dict]:
    articles = []
    try:
        # Fetch with explicit 12s timeout so slow feeds don't block the pool
        r = requests.get(feed_info["url"], headers=_RSS_HEADERS, timeout=12)
        feed = feedparser.parse(r.content)
        for entry in feed.entries[:feed_info.get("max", 10)]:
            title   = (getattr(entry, "title",   "") or "").strip()
            summary = (getattr(entry, "summary", "") or "").strip()
            link    = (getattr(entry, "link",    "") or "").strip()
            if not title:
                continue
            # Skip junk: SEC filings, C-suite announcements, product fluff
            if any(p in title.lower() for p in _JUNK_PATTERNS):
                continue
            pub_ts = 0
            try:
                if hasattr(entry, "published_parsed") and entry.published_parsed:
                    # feedparser returns UTC struct_time — use calendar.timegm (not time.mktime)
                    pub_ts = calendar.timegm(entry.published_parsed)
            except Exception:
                pass
            articles.append({
                "title":     title[:200],
                "summary":   re.sub(r"<[^>]+>", "", summary)[:600],
                "source":    feed_info["name"],
                "url":       link,
                "tag":       tag_article(title, summary),
                "impact":    keyword_impact(title, summary),  # overwritten by Groq below
                "published": getattr(entry, "published", ""),
                "ts":        pub_ts,
            })
        log.info(f"Feed {feed_info['name']}: {len(articles)} articles")
    except Exception as e:
        log.warning(f"Feed {feed_info['name']} failed: {type(e).__name__}: {e}")
    return articles


# ── Main endpoint ─────────────────────────────────────────────────────────────
_FULL_CACHE_KEY = "news_feed_v5_full"   # always stores up to 300 articles

@router.get("/feed")
def get_news_feed(limit: int = 80):
    # Serve from full cache if available (slice at query time)
    full = cache.get(_FULL_CACHE_KEY)
    if full:
        return full[:limit]

    # Fetch all feeds in parallel
    articles: list[dict] = []
    with ThreadPoolExecutor(max_workers=14) as pool:
        futures = {pool.submit(_fetch_feed, f): f for f in FEEDS}
        for fut in as_completed(futures):
            articles.extend(fut.result())

    log.info(f"Fetched {len(articles)} raw articles from {len(FEEDS)} feeds")

    # Sort newest first, dedupe by title prefix
    articles.sort(key=lambda a: a["ts"], reverse=True)
    seen, deduped = set(), []
    for a in articles:
        key = a["title"][:70].lower()
        if key not in seen:
            seen.add(key)
            deduped.append(a)

    # AI impact scoring on top 60 (rest keep keyword score)
    deduped = groq_score_impacts(deduped)

    # Save HIGH / MEDIUM articles to rolling archive before slicing
    _archive_important(deduped)

    # Merge with archive: add important older articles not already in feed
    archived  = _load_archive()
    feed_keys = {a['title'][:80].lower() for a in deduped}
    extras    = [{**a, 'pinned': True} for a in archived if a['title'][:80].lower() not in feed_keys]
    # Sort extras by impact then recency
    extras.sort(key=lambda a: (0 if a.get('impact') == 'high' else 1, -(a.get('ts') or 0)))
    # Keep top 20 important older articles
    merged = deduped + extras[:20]

    # Cache full set (up to 300), serve sliced by limit
    cache.set(_FULL_CACHE_KEY, merged[:300], expire=180)   # 3 min cache
    return merged[:limit]


# ── Earnings via Nasdaq public API (no key required) ─────────────────────────

NASDAQ_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'application/json, text/plain, */*',
}

# All S&P 100 tickers we care about (for fast lookup)
SP100_SET = {row[0] for row in COMPANIES}

def _safe_float(v) -> float | None:
    try:
        s = str(v).replace('$','').replace(',','').strip()
        f = float(s)
        return None if (f != f) else round(f, 3)   # NaN check
    except Exception:
        return None

def _fetch_nasdaq_date(date_str: str) -> list[dict]:
    """Fetch all earnings reported on a given date from Nasdaq calendar."""
    try:
        r = requests.get(
            'https://api.nasdaq.com/api/calendar/earnings',
            params={'date': date_str},
            headers=NASDAQ_HEADERS,
            timeout=8,
        )
        if not r.ok:
            return []
        rows = r.json().get('data', {}).get('rows') or []
        return rows
    except Exception:
        return []

def _build_earnings_calendar() -> list[dict]:
    """
    Fetch Nasdaq earnings for every business day in the window
    Oct 2025 → Jun 2026, then merge with our company metadata.
    """
    # Generate business days in window
    start = datetime(2025, 10, 1)
    end   = datetime.now() + timedelta(days=100)
    dates: list[str] = []
    d = start
    while d <= end:
        if d.weekday() < 5:          # Mon–Fri only
            dates.append(d.strftime('%Y-%m-%d'))
        d += timedelta(days=1)

    # Fetch all dates in parallel (max 20 workers)
    raw_by_sym: dict[str, list] = {}
    with ThreadPoolExecutor(max_workers=20) as pool:
        futs = {pool.submit(_fetch_nasdaq_date, dt): dt for dt in dates}
        for fut in as_completed(futs):
            for row in fut.result():
                sym = (row.get('symbol') or '').upper()
                if sym not in SP100_SET:
                    continue
                raw_by_sym.setdefault(sym, []).append({
                    'date': futs[fut],
                    'eps':  _safe_float(row.get('eps')),
                    'est':  _safe_float(row.get('epsForecast')),
                    'surp': _safe_float(row.get('surprise')),
                    'mcap': row.get('marketCap', ''),
                    'name': row.get('name', ''),
                    'fq':   row.get('fiscalQuarterEnding', ''),
                })

    # Build final list from our static COMPANIES order (preserves ranking)
    today = datetime.now().strftime('%Y-%m-%d')
    company_map = {sym: (name, sector, mcap) for sym, name, sector, mcap in COMPANIES}
    results: list[dict] = []

    for sym, (name, sector, mcap) in company_map.items():
        entries = sorted(raw_by_sym.get(sym, []), key=lambda x: x['date'])
        past    = [e for e in entries if e['date'] <= today]
        future  = [e for e in entries if e['date'] >  today]

        last = past[-1]  if past   else None
        nxt  = future[0] if future else None

        results.append({
            'ticker':        sym,
            'name':          name,
            'mcap':          mcap,
            'sector':        sector,
            'lastDate':      last['date']   if last else None,
            'epsEst':        last['est']    if last else None,
            'epsActual':     last['eps']    if last else None,
            'surprise':      last['surp']   if last else None,
            'fiscalQ':       last['fq']     if last else None,
            'revenueEst':    None,
            'revenueActual': None,
            'revSurprise':   None,
            'nextDate':      nxt['date']    if nxt  else None,
            'priceChange':   None,
        })

    results.sort(key=lambda x: x['mcap'], reverse=True)
    return results


@router.get("/earnings")
def get_earnings_calendar():
    cached = cache.get('earnings_nasdaq')
    if cached:
        return cached

    results = _build_earnings_calendar()
    cache.set('earnings_nasdaq', results, expire=14400)   # 4-hour cache
    return results


# ── News archive — persist important articles beyond the 3-min fetch ──────────

ARCHIVE_TTL = {'high': 7 * 86400, 'medium': 2 * 86400}   # 7d / 48h in seconds

def _archive_important(articles: list[dict]):
    """Save HIGH and MEDIUM articles to a rolling archive in diskcache."""
    for a in articles:
        impact = a.get('impact', 'low')
        if impact not in ARCHIVE_TTL:
            continue
        key = f"arc:{a['title'][:80].lower().replace(' ', '_')}"
        if not cache.get(key):
            cache.set(key, a, expire=ARCHIVE_TTL[impact])

def _load_archive() -> list[dict]:
    """Return all archived articles still within their TTL."""
    results = []
    for key in cache:
        if isinstance(key, str) and key.startswith('arc:'):
            a = cache.get(key)
            if a:
                results.append(a)
    return results
