# Bank Transactions Summarizer - V2 Architecture Proposal

## Executive Summary

This document proposes a v2 architecture for the bank-transactions-summarizer application, addressing current limitations while building on what works well in v1.

## V1 Assessment

### What Works Well

1. **Simple, Effective UI**: Clean interface with file upload, search, and filtering
2. **Excel Processing**: Reliable SheetJS-based parsing of bank transaction files
3. **Category-Based Grouping**: Two-level category system (main → sub) works well
4. **Monthly Statistics**: Clear visualization of spending by category over time
5. **Color-Coded Spending**: Visual highlighting of above/below average spending
6. **Default Data Loading**: DATA_DIR environment variable for persistent data

### Current Limitations

1. **No Data Persistence**: Must re-upload files each session
2. **Manual Category Mapping**: Categories hardcoded in JSON, requires code changes
3. **Basic AI Integration**: OpenAI endpoint exists but unused
4. **No Transaction Categorization Help**: Manual mapping of merchant categories to custom categories
5. **Limited Analytics**: Only sum/average, no trends or forecasting
6. **Single User**: No authentication or multi-user support
7. **Monolithic Frontend**: All logic in vanilla JS with global state
8. **Simple Color Coding**: Fixed ratio thresholds (2x red, 0.5x green) instead of statistical methods

### Technology Stack (V1)
- **Backend**: Node.js + Express, Babel transpilation
- **Frontend**: Vanilla JavaScript + D3.js (loaded from CDN), SheetJS (ESM from CDN)
- **No Database**: File-based only

---

## V2 Architecture Proposal

### Design Principles

1. **Incremental Migration**: Keep v1 working, build v2 alongside
2. **Maintain Simplicity**: Don't over-engineer for hypothetical needs
3. **AI-First**: Leverage AI for categorization and insights
4. **Modern Stack**: Use current best practices while keeping it simple
5. **Local-First**: Continue to work without cloud dependencies

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User Interface                       │
│  (React + TypeScript - or keep vanilla JS initially)    │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────┐
│              Backend API (Express + TypeScript)          │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │ File       │  │ Transaction│  │ Category         │  │
│  │ Upload     │  │ Analysis   │  │ Management       │  │
│  └────────────┘  └────────────┘  └──────────────────┘  │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │ AI         │  │ Statistics │  │ Export           │  │
│  │ Integration│  │ Engine     │  │ Generator        │  │
│  └────────────┘  └────────────┘  └──────────────────┘  │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────┐
│              Data Layer (SQLite)                         │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │ Transactions│  │ Categories │  │ User Preferences │  │
│  └────────────┘  └────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack (V2)

#### Backend
- **Runtime**: Node.js 18+ (keep current)
- **Framework**: Express (keep current, proven)
- **Language**: TypeScript (migration from Babel/JS)
- **Database**: SQLite with better-sqlite3
  - Simple, file-based, no setup required
  - Excellent performance for single-user
  - Easy backups (just copy the file)
- **AI Integration**:
  - OpenAI API (already integrated)
  - Anthropic Claude API (add as alternative)
  - Configurable provider

#### Frontend
- **Option A** (Minimal): Keep vanilla JS + D3.js, add better state management
- **Option B** (Recommended): React + TypeScript
  - Better maintainability
  - Rich ecosystem
  - Type safety
- **Bundler**: Vite (fast, modern, good DX)
- **Visualization**: Keep D3.js (works well)
- **Styling**: Tailwind CSS or keep plain CSS

#### Development
- **Testing**: Jest (already in place) + Playwright for E2E
- **Linting**: ESLint + Prettier (already in place)
- **Build**: TypeScript compiler + bundler

### Database Schema

```sql
-- Transactions table
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_date DATE NOT NULL,
  book_date DATE NOT NULL,
  value_date DATE,
  text TEXT NOT NULL,
  amount REAL NOT NULL,
  merchant_category TEXT,
  custom_category_id INTEGER,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (custom_category_id) REFERENCES categories(id)
);

-- Categories table (two-level hierarchy)
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  main_category TEXT NOT NULL,
  sub_category TEXT NOT NULL,
  color TEXT,
  UNIQUE(main_category, sub_category)
);

-- Category mappings (merchant_category -> custom_category)
CREATE TABLE category_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_category TEXT UNIQUE NOT NULL,
  category_id INTEGER NOT NULL,
  confidence REAL, -- For AI-suggested mappings
  source TEXT, -- 'manual', 'ai', 'learned'
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- User preferences
CREATE TABLE preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- AI suggestions log (for learning)
CREATE TABLE ai_suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_text TEXT NOT NULL,
  merchant_category TEXT,
  suggested_category_id INTEGER,
  confidence REAL,
  accepted BOOLEAN,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (suggested_category_id) REFERENCES categories(id)
);
```

### API Endpoints (RESTful)

```
POST   /api/transactions/upload       # Upload and parse Excel file
GET    /api/transactions               # List transactions (with filters)
GET    /api/transactions/:id           # Get single transaction
PUT    /api/transactions/:id           # Update transaction (category, notes)
DELETE /api/transactions/:id           # Delete transaction

GET    /api/categories                 # List all categories
POST   /api/categories                 # Create category
PUT    /api/categories/:id             # Update category
DELETE /api/categories/:id             # Delete category (if unused)

GET    /api/mappings                   # List category mappings
POST   /api/mappings                   # Create/update mapping
DELETE /api/mappings/:id               # Delete mapping

POST   /api/ai/categorize              # AI categorize transactions
POST   /api/ai/insights                # Get AI insights on spending

GET    /api/statistics                 # Get statistics (monthly by category)
GET    /api/statistics/trends          # Get trend analysis

GET    /api/export                     # Export data (CSV/Excel)
```

### Core Features (V2)

#### 1. Data Persistence
- SQLite database stores all transactions
- Import Excel files → parse → store in DB
- Never lose data between sessions
- Quick search and filtering with SQL indexes

#### 2. Smart Category Management
- CRUD operations for categories via UI
- Merchant category → custom category mappings
- AI-assisted categorization:
  - First-time: AI suggests categories for new merchant categories
  - Learning: Track accepted/rejected suggestions
  - Bulk categorization: "Categorize all uncategorized transactions"

#### 3. Enhanced AI Integration
- **Transaction Categorization**:
  ```
  User: "Categorize these transactions"
  AI: Analyzes merchant names, amounts, patterns
  AI: Suggests categories with confidence scores
  User: Accept/reject/modify suggestions
  ```

- **Spending Insights**:
  ```
  User: "What are my spending patterns?"
  AI: Analyzes trends, anomalies, seasonal patterns
  AI: "Your restaurant spending increased 40% in December..."
  ```

- **Category Suggestions**:
  ```
  AI: "I noticed these transactions might fit a new category:
       'Subscriptions'. Should I create it?"
  ```

#### 4. Advanced Statistics
- Keep current sum/average tables
- Add:
  - Month-over-month trends
  - Year-over-year comparison
  - Statistical outlier detection (z-score based)
  - Spending forecasts (simple linear or moving average)
  - Budget vs actual (future feature)

#### 5. Better Visualization
- Keep color-coded spending table
- Improve color algorithm:
  - Use z-scores instead of fixed ratios
  - Configurable thresholds
  - Color-blind friendly palettes
- Add optional charts:
  - Spending trends over time
  - Category breakdown (pie/donut chart)
  - Top merchants by spending

#### 6. Export & Reports
- Export to Excel with formatting
- Export to CSV
- PDF reports (future)
- Customizable date ranges

### Implementation Phases

#### Phase 1: Foundation (Core Infrastructure)
1. Set up TypeScript + Express backend
2. Implement SQLite schema and migrations
3. Create basic CRUD API for transactions and categories
4. Build file upload endpoint with Excel parsing
5. Migrate v1 categories.json to database

**Deliverable**: Backend API that can store and retrieve transactions

#### Phase 2: Data Migration
1. Import v1 transactions to v2 database
2. Create data import/export utilities
3. Build backward compatibility layer
4. Test with real data

**Deliverable**: V1 data successfully migrated to V2

#### Phase 3: Core Frontend
1. Set up frontend (React + Vite or vanilla JS refactor)
2. Build transaction list view with filters
3. Implement statistics table (keep v1 design)
4. Add category management UI
5. Implement search and date filtering

**Deliverable**: Feature parity with v1, using database

#### Phase 4: AI Features
1. AI-powered category suggestion
2. Bulk categorization workflow
3. Spending insights endpoint
4. Confidence scoring for suggestions

**Deliverable**: AI helps categorize transactions automatically

#### Phase 5: Enhanced Analytics
1. Implement z-score based coloring
2. Add trend analysis
3. Build optional chart views
4. Month-over-month comparisons

**Deliverable**: Better insights into spending patterns

#### Phase 6: Polish & Export
1. Export functionality (Excel, CSV)
2. Improved error handling
3. Loading states and UX polish
4. Documentation

**Deliverable**: Production-ready v2

### Migration Strategy

1. **Keep v1 Running**: Maintain v1/ directory as-is
2. **Build v2 in Parallel**: Create v2/ directory with new stack
3. **Shared Data**: Both can read from DATA_DIR during transition
4. **Cut-Over**: When v2 reaches parity, redirect users
5. **Deprecation**: Keep v1 for 1-2 releases, then archive

### File Structure

```
bank-transactions-summarizer/
├── v1/                          # Current version (keep as-is)
│   └── source/
├── v2/                          # New version
│   ├── backend/
│   │   ├── src/
│   │   │   ├── api/             # API routes
│   │   │   ├── services/        # Business logic
│   │   │   ├── db/              # Database access
│   │   │   ├── ai/              # AI integration
│   │   │   └── index.ts         # Entry point
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── services/        # API clients
│   │   │   └── App.tsx
│   │   ├── public/
│   │   ├── package.json
│   │   └── vite.config.ts
│   ├── shared/                   # Shared types
│   │   └── types.ts
│   └── database/
│       ├── migrations/
│       └── seeds/
├── Makefile                      # Updated to run v1 or v2
└── README.md
```

### Risk Mitigation

1. **Complexity Creep**: Start minimal, add features incrementally
2. **Over-Engineering**: Don't build features until needed
3. **Data Loss**: Implement backup/export early
4. **Migration Issues**: Test thoroughly with v1 data
5. **AI Costs**: Cache responses, limit API calls, allow manual override

### Open Questions

1. **Frontend Framework**: React or keep vanilla JS?
   - **Recommendation**: React for long-term maintainability

2. **AI Provider**: OpenAI only or support multiple?
   - **Recommendation**: Support both OpenAI and Anthropic

3. **Multi-User**: Single user or add authentication?
   - **Recommendation**: Single user for v2, add auth later if needed

4. **Deployment**: Desktop app or web app?
   - **Recommendation**: Keep as local web app (npm start)

5. **Color Scheme**: Keep current or implement z-scores immediately?
   - **Recommendation**: Keep current in phase 3, improve in phase 5

### Success Metrics

- ✅ All v1 features working in v2
- ✅ Transactions persist between sessions
- ✅ AI successfully categorizes >80% of transactions correctly
- ✅ Category management via UI (no code changes needed)
- ✅ Performance: <100ms for statistics calculation with 10k transactions
- ✅ Zero data loss during migration

### Conclusion

V2 will transform the application from a stateless file processor to a stateful AI-powered financial analysis tool while maintaining the simplicity and effectiveness that makes v1 work well. The phased approach allows for incremental delivery and validation.

The core improvements are:
1. **Persistence** (SQLite)
2. **AI Integration** (categorization + insights)
3. **Type Safety** (TypeScript)
4. **Better UX** (modern frontend, category management)
5. **Enhanced Analytics** (trends, forecasting)

This proposal balances ambition with pragmatism, focusing on delivering real value without over-engineering.
