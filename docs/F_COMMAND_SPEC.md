# OpenTerm Terminal Command Specification

---

## 1. Command Grammar

### 1.1 General Structure

```
COMMAND ::= [TICKER] [FUNCTION] [MODIFIERS]
          | SYSTEM_COMMAND [ARGS]
```

**Components:**

| Component | Required | Description | Example |
|-----------|----------|-------------|---------|
| TICKER | No | Security identifier | `AAPL`, `MSFT`, `SPY` |
| FUNCTION | No | Action to perform | `GP`, `FA`, `NEWS` |
| MODIFIERS | No | Function parameters | `1Y`, `QUARTERLY` |

### 1.2 Command Patterns

```
Pattern 1: TICKER only
  → Display overview for ticker
  Example: AAPL

Pattern 2: TICKER FUNCTION
  → Execute function for ticker
  Example: AAPL GP

Pattern 3: TICKER FUNCTION MODIFIERS
  → Execute function with modifiers
  Example: AAPL GP 1Y

Pattern 4: FUNCTION only (uses context ticker)
  → Execute function for last-used ticker
  Example: GP (uses previously selected ticker)

Pattern 5: SYSTEM_COMMAND
  → Execute system command
  Example: WL, SCREEN, HELP

Pattern 6: SYSTEM_COMMAND ARGS
  → Execute system command with arguments
  Example: WL ADD AAPL, SCREEN PE<20
```

---

## 2. Function Reference

### 2.1 Price & Chart Functions

| Command | Aliases | Description | Modifiers |
|---------|---------|-------------|-----------|
| `GP` | `GRAPH`, `PRICE`, `CHART` | Price chart | Period: `1M`, `3M`, `6M`, `1Y`, `2Y`, `5Y`, `MAX` |
| `QUOTE` | `Q`, `QR` | Current quote snapshot | - |
| `HPR` | `HISTORY` | Historical price table | Period |

**Examples:**
```
AAPL GP           → 1-year price chart (default)
AAPL GP 5Y        → 5-year price chart
AAPL QUOTE        → Current quote
GP 3M             → 3-month chart for context ticker
```

### 2.2 Fundamentals Functions

| Command | Aliases | Description | Modifiers |
|---------|---------|-------------|-----------|
| `FA` | `FUNDIES`, `FUNDAMENTALS` | Fundamentals overview | - |
| `IS` | `INCOME` | Income statement | `ANNUAL`, `QUARTERLY` |
| `BS` | `BALANCE` | Balance sheet | `ANNUAL`, `QUARTERLY` |
| `CF` | `CASHFLOW` | Cash flow statement | `ANNUAL`, `QUARTERLY` |
| `RATIOS` | - | Key ratios | - |

**Examples:**
```
AAPL FA           → Fundamentals snapshot
AAPL IS QUARTERLY → Quarterly income statements
AAPL RATIOS       → Key financial ratios
```

### 2.3 SEC Filings Functions

| Command | Aliases | Description | Modifiers |
|---------|---------|-------------|-----------|
| `FILINGS` | `SEC`, `EDGAR` | List all filings | Form type filter |
| `10K` | `ANNUAL` | Annual reports | - |
| `10Q` | `QUARTERLY` | Quarterly reports | - |
| `8K` | `CURRENT` | Current reports | - |

**Examples:**
```
AAPL FILINGS      → All recent filings
AAPL 10K          → 10-K filings only
AAPL SEC 8K       → 8-K current reports
```

### 2.4 News Functions

| Command | Aliases | Description | Modifiers |
|---------|---------|-------------|-----------|
| `NEWS` | `N` | News for ticker | - |
| `HEADLINES` | - | Top headlines only | - |

**Examples:**
```
AAPL NEWS         → News for Apple
NEWS TECH         → Tech sector news
```

### 2.5 Analytics Functions

| Command | Aliases | Description | Modifiers |
|---------|---------|-------------|-----------|
| `ANALYTICS` | `STATS` | Return/risk stats | Period |
| `CORR` | `CORRELATION` | Correlation analysis | Ticker list |
| `BETA` | - | Beta vs benchmark | Benchmark ticker |

**Examples:**
```
AAPL ANALYTICS 1Y     → 1-year analytics
CORR AAPL MSFT GOOGL  → Correlation matrix
AAPL BETA SPY         → Beta vs S&P 500
```

---

## 3. System Commands

### 3.1 Watchlist Commands

| Command | Description | Arguments |
|---------|-------------|-----------|
| `WL` | Show watchlist | - |
| `WL ADD <TICKER>` | Add to watchlist | Ticker |
| `WL REMOVE <TICKER>` | Remove from watchlist | Ticker |
| `WL CLEAR` | Clear watchlist | - |

**Examples:**
```
WL                → Show default watchlist
WL ADD AAPL       → Add Apple to watchlist
WL REMOVE MSFT    → Remove Microsoft
```

### 3.2 Portfolio Commands

| Command | Description | Arguments |
|---------|-------------|-----------|
| `PORT` | Portfolio overview | - |
| `PORT PERF` | Portfolio performance | Period |
| `PORT ADD` | Add transaction | Interactive |
| `PORT HOLDINGS` | Holdings detail | - |

### 3.3 Screener Commands

| Command | Description | Arguments |
|---------|-------------|-----------|
| `SCREEN` | Run screener | Filter expressions |
| `SCREEN EXPORT` | Export results to CSV | - |

**Filter Syntax:**
```
SCREEN <FIELD><OPERATOR><VALUE> [AND <FIELD><OPERATOR><VALUE>]...
```

**Operators:**
| Operator | Meaning |
|----------|---------|
| `>` | Greater than |
| `>=` | Greater than or equal |
| `<` | Less than |
| `<=` | Less than or equal |
| `=` | Equal |
| `!=` | Not equal |

**Screener Fields:**
| Field | Description | Example |
|-------|-------------|---------|
| `MKT_CAP` | Market cap ($) | `MKT_CAP>10B` |
| `PE` | P/E ratio | `PE<25` |
| `ROE` | Return on equity | `ROE>0.15` |
| `ROIC` | Return on invested capital | `ROIC>0.12` |
| `MARGIN` | Profit margin | `MARGIN>0.20` |
| `DEBT_EQUITY` | Debt to equity | `DEBT_EQUITY<1` |
| `DIV_YIELD` | Dividend yield | `DIV_YIELD>0.02` |
| `SECTOR` | Sector name | `SECTOR=Technology` |
| `RETURN_6M` | 6-month return | `RETURN_6M>0.10` |

**Value Suffixes:**
| Suffix | Multiplier |
|--------|------------|
| `K` | 1,000 |
| `M` | 1,000,000 |
| `B` | 1,000,000,000 |

**Examples:**
```
SCREEN MKT_CAP>10B AND PE<25
SCREEN ROE>0.15 AND DEBT_EQUITY<2 AND SECTOR=Technology
SCREEN DIV_YIELD>0.03 AND MKT_CAP>1B
```

### 3.4 Macro Commands

| Command | Description | Arguments |
|---------|-------------|-----------|
| `MACRO <SERIES>` | View macro series | Series ID |
| `YCRV` | Yield curve | Country: `US` |
| `RATES` | Interest rates overview | - |
| `ECON` | Economic calendar | - |

**Common Series:**
| ID | Description |
|----|-------------|
| `CPI` | Consumer Price Index |
| `GDP` | Gross Domestic Product |
| `UNRATE` | Unemployment Rate |
| `FEDFUNDS` | Federal Funds Rate |

**Examples:**
```
MACRO CPI         → CPI chart
YCRV US           → US yield curve
MACRO UNRATE      → Unemployment rate
```

### 3.5 Help Commands

| Command | Description | Arguments |
|---------|-------------|-----------|
| `HELP` | General help | - |
| `HELP <FUNCTION>` | Function help | Function name |
| `?` | Quick help | - |
| `? <FUNCTION>` | Quick function help | Function name |

**Examples:**
```
HELP              → Show all commands
HELP GP           → Help for GP command
? SCREEN          → Quick screener help
```

---

## 4. Context Memory

### 4.1 Ticker Context

The terminal maintains a "context ticker" - the last-used ticker symbol.

**Rules:**
1. Any command with a ticker sets the context
2. Commands without a ticker use the context
3. Context persists until explicitly changed
4. Context is shown in the command bar hint

**Example Session:**
```
> AAPL                    # Context: AAPL, shows overview
> GP 1Y                   # Uses context: AAPL GP 1Y
> FA                      # Uses context: AAPL FA
> MSFT                    # Context: MSFT, shows overview
> GP                      # Uses context: MSFT GP
```

### 4.2 Display Indicator

Command bar shows current context:
```
┌─────────────────────────────────────────────────────┐
│ [AAPL] > _                                          │
└─────────────────────────────────────────────────────┘
```

---

## 5. Autocomplete System

### 5.1 Autocomplete Types

| Type | Trigger | Source |
|------|---------|--------|
| Ticker | First word, uppercase | Security master |
| Function | After ticker | Function list |
| Modifier | After function | Function-specific |
| Screener field | After SCREEN | Field list |
| Watchlist ticker | After WL ADD/REMOVE | Security master |

### 5.2 Autocomplete Behavior

1. **Debounce**: Wait 150ms after keystroke
2. **Min chars**: 1 character for tickers, 2 for search
3. **Max results**: 8 suggestions
4. **Ranking**:
   - Exact match first
   - Prefix match second
   - Fuzzy match third
   - Watchlist items boosted

### 5.3 Autocomplete UI

```
┌─────────────────────────────────────────────────────┐
│ > AAP_                                              │
├─────────────────────────────────────────────────────┤
│ ▸ AAPL    Apple Inc.              NASDAQ     ★     │
│   AAPD    Direxion Daily AAPL...  NASDAQ           │
│   AAPU    Direxion Daily AAPL...  NASDAQ           │
│   AAP     Advance Auto Parts      NYSE             │
└─────────────────────────────────────────────────────┘
```

- `★` indicates watchlist item
- Arrow keys navigate
- Tab completes selection
- Enter executes

### 5.4 Fuzzy Matching

Uses fuzzy matching for typo tolerance:

| Input | Matches |
|-------|---------|
| `APPL` | `AAPL` (swap) |
| `GOGLE` | `GOOGL` (missing char) |
| `MSOF` | `MSFT` (partial) |

Fuzzy score factors:
- Character match ratio
- Prefix bonus
- Position penalty
- Common misspelling patterns

---

## 6. Error Handling

### 6.1 Error Types

| Error | Message | Guidance |
|-------|---------|----------|
| Unknown ticker | `Ticker 'XYZ' not found` | `Try searching: XYZ` |
| Unknown function | `Unknown function 'ABC'` | `Type HELP for commands` |
| Invalid modifier | `Invalid period '7Y'` | `Valid: 1M, 3M, 6M, 1Y, 2Y, 5Y, MAX` |
| Missing context | `No ticker selected` | `Enter a ticker first` |
| Parse error | `Could not parse command` | `Example: AAPL GP 1Y` |

### 6.2 Error Display

```
┌─────────────────────────────────────────────────────┐
│ ⚠ Ticker 'XYZ' not found                            │
│                                                     │
│   Did you mean?                                     │
│   • XYL - Xylem Inc.                               │
│   • XOM - Exxon Mobil                              │
│                                                     │
│   Or search: /search XYZ                           │
└─────────────────────────────────────────────────────┘
```

---

## 7. Help System

### 7.1 General Help

`HELP` command output:

```
╔═══════════════════════════════════════════════════════╗
║                    OPENTERM HELP                       ║
╠═══════════════════════════════════════════════════════╣
║ NAVIGATION                                             ║
║   AAPL           Security overview                     ║
║   AAPL GP        Price chart                          ║
║   AAPL FA        Fundamentals                         ║
║   AAPL FILINGS   SEC filings                          ║
║   AAPL NEWS      News                                 ║
║                                                        ║
║ ANALYSIS                                               ║
║   SCREEN ...     Screen securities                     ║
║   CORR ...       Correlation matrix                    ║
║                                                        ║
║ WATCHLIST                                              ║
║   WL             Show watchlist                        ║
║   WL ADD AAPL    Add to watchlist                     ║
║   WL REMOVE AAPL Remove from watchlist                 ║
║                                                        ║
║ MACRO                                                  ║
║   MACRO CPI      Economic series                       ║
║   YCRV US        Yield curve                          ║
║                                                        ║
║ Type HELP <CMD> for detailed help                      ║
╚═══════════════════════════════════════════════════════╝
```

### 7.2 Function Help

`HELP SCREEN` output:

```
╔═══════════════════════════════════════════════════════╗
║                    SCREEN - Screener                   ║
╠═══════════════════════════════════════════════════════╣
║ Usage: SCREEN <filter> [AND <filter>]...              ║
║                                                        ║
║ FILTERS:                                               ║
║   MKT_CAP     Market cap         MKT_CAP>10B          ║
║   PE          P/E ratio          PE<25                 ║
║   ROE         Return on equity   ROE>0.15             ║
║   ROIC        Return on capital  ROIC>0.12            ║
║   MARGIN      Profit margin      MARGIN>0.20          ║
║   DEBT_EQUITY Debt/Equity        DEBT_EQUITY<1        ║
║   DIV_YIELD   Dividend yield     DIV_YIELD>0.02       ║
║   SECTOR      Sector             SECTOR=Technology    ║
║   RETURN_6M   6-month return     RETURN_6M>0.10       ║
║                                                        ║
║ OPERATORS: > >= < <= = !=                              ║
║                                                        ║
║ EXAMPLES:                                              ║
║   SCREEN MKT_CAP>10B AND PE<25                        ║
║   SCREEN ROE>0.15 AND SECTOR=Technology               ║
║   SCREEN DIV_YIELD>0.03 AND DEBT_EQUITY<1             ║
╚═══════════════════════════════════════════════════════╝
```

---

## 8. Keyboard Shortcuts

### 8.1 Command Bar Shortcuts

| Key | Action |
|-----|--------|
| `/` or `Ctrl+K` | Focus command bar |
| `Enter` | Execute command |
| `Escape` | Clear / unfocus |
| `Tab` | Accept autocomplete |
| `Up Arrow` | Previous command / autocomplete up |
| `Down Arrow` | Next autocomplete |
| `Ctrl+U` | Clear line |
| `Ctrl+A` | Go to start |
| `Ctrl+E` | Go to end |

### 8.2 Panel Shortcuts

| Key | Action |
|-----|--------|
| `1-9` | Focus panel by number |
| `Ctrl+1-9` | Toggle panel visibility |
| `]` | Next panel |
| `[` | Previous panel |
| `Escape` | Return to command bar |

### 8.3 Global Shortcuts

| Key | Action |
|-----|--------|
| `?` | Show help |
| `Ctrl+W` | Add current ticker to watchlist |
| `Ctrl+R` | Refresh current panel |
| `Ctrl+E` | Export current panel data |

---

## 9. Command History

### 9.1 History Behavior

- Last 100 commands stored
- Persisted in localStorage
- Duplicate adjacent commands collapsed
- Accessible via Up/Down arrows

### 9.2 History Search

`Ctrl+R` initiates reverse search:

```
┌─────────────────────────────────────────────────────┐
│ (reverse-search): GP_                               │
├─────────────────────────────────────────────────────┤
│ ▸ AAPL GP 1Y                                        │
│   MSFT GP 5Y                                        │
│   GOOGL GP                                          │
└─────────────────────────────────────────────────────┘
```

---

## 10. Parser Implementation

### 10.1 Tokenization

```typescript
interface Token {
  type: 'TICKER' | 'FUNCTION' | 'MODIFIER' | 'OPERATOR' | 'VALUE' | 'KEYWORD';
  value: string;
  position: number;
}

function tokenize(input: string): Token[] {
  // 1. Uppercase input
  // 2. Split on whitespace
  // 3. Classify each token
}
```

### 10.2 Command Types

```typescript
type Command =
  | { type: 'ticker_overview'; ticker: string }
  | { type: 'ticker_function'; ticker: string; function: string; modifiers: string[] }
  | { type: 'context_function'; function: string; modifiers: string[] }
  | { type: 'system_command'; command: string; args: string[] }
  | { type: 'screener'; filters: ScreenerFilter[] }
  | { type: 'error'; message: string };
```

### 10.3 Parser Flow

```
Input → Tokenize → Classify → Build Command → Validate → Execute
```

1. **Tokenize**: Split input into tokens
2. **Classify**: Determine token types
3. **Build**: Construct command object
4. **Validate**: Check for errors
5. **Execute**: Route to handler

---

## 11. Command Router

### 11.1 Routing Map

| Command Type | Panel Target | API Endpoint |
|--------------|--------------|--------------|
| `ticker_overview` | Overview | `/instruments/ticker/{t}` |
| `GP` | Chart | `/prices/{id}/daily` |
| `FA` | Fundamentals | `/fundamentals/{id}` |
| `FILINGS` | Filings | `/filings?ticker={t}` |
| `NEWS` | News | `/news?ticker={t}` |
| `WL` | Watchlist | `/watchlists/default` |
| `SCREEN` | Screener | `/screener/screen` |
| `MACRO` | Macro | `/macro/series/{id}` |
| `YCRV` | Macro | `/macro/yield-curve` |

### 11.2 Panel Updates

Commands update specific panels, not full page:

```typescript
function executeCommand(cmd: Command) {
  const { panel, apiCall, params } = routeCommand(cmd);

  // Update only target panel
  panelManager.setLoading(panel, true);

  const data = await apiCall(params);

  panelManager.setData(panel, data);
  panelManager.setLoading(panel, false);
}
```

---

## 12. State Management

### 12.1 Terminal State

```typescript
interface TerminalState {
  // Context
  contextTicker: string | null;
  contextInstrumentId: string | null;

  // History
  commandHistory: string[];
  historyIndex: number;

  // Input
  currentInput: string;
  cursorPosition: number;

  // Autocomplete
  autocompleteVisible: boolean;
  autocompleteResults: AutocompleteItem[];
  autocompleteIndex: number;
}
```

### 12.2 State Persistence

| State | Storage | Scope |
|-------|---------|-------|
| Command history | localStorage | Session-persistent |
| Context ticker | React state | Session only |
| Watchlist | Postgres | Persistent |
| Panel layout | localStorage | Persistent |
