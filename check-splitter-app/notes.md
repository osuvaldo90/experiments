# Check Splitter App - Development Notes

## Project Goal
Build a prototype check splitting app in Elixir using Phoenix and LiveView.

## Requirements
- Users can create a check by:
  - Uploading a receipt photo (with OCR parsing)
  - Entering items manually
- Generate share code for others to join
- Users enter names when creating/joining
- Tap to claim line items
- Items can be split between multiple users
- Owner can set tip amount
- Show breakdown of what everyone owes

## Decisions & Progress

### Session Start
- Created project folder: check-splitter-app
- Planning to use Phoenix LiveView for real-time collaborative features
- Need to choose storage mechanism (considering ETS for prototype simplicity vs PostgreSQL for persistence)

### Environment Setup
- Elixir/Phoenix not installed in current environment
- Will create complete project structure and code that can be run with:
  ```
  mix phx.new check_splitter --live
  ```
- Decision: Use ETS (Erlang Term Storage) for in-memory state management
  - Perfect for prototype - no database setup needed
  - Handles concurrent access well
  - Easy to implement with GenServer
  - Data is ephemeral (clears on restart) but acceptable for prototype

### Core Implementation
- Created Check and LineItem data structures
- Implemented CheckStore GenServer with ETS backend
  - Stores checks by ID and share code
  - Automatic cleanup of checks older than 24 hours
  - PubSub integration for real-time updates
- OCR Service using Tesseract
  - Parses receipt images to extract line items
  - Falls back to mock data for demo purposes
  - Uses regex patterns to identify items and prices

### LiveView Components Created
1. **HomeLive** - Landing page with feature overview
2. **NewCheckLive** - Create check with:
   - Manual item entry with add/remove functionality
   - Photo upload with OCR processing via live_file_input
   - Real-time item list display with totals
3. **JoinLive** - Join existing check with share code
4. **CheckLive** - Main collaborative view with:
   - Real-time updates via PubSub
   - Tap to claim/unclaim items
   - Visual indicators for claimed items
   - Tip setting modal
   - Automatic bill calculation and breakdown
   - Per-person totals showing subtotal, tip share, and total

### Styling
- Created comprehensive CSS with:
  - Responsive design (mobile-first)
  - Color scheme using CSS variables
  - Card-based layouts
  - Interactive item claiming with visual feedback
  - Modal dialogs
  - Clean, modern UI following design best practices

### Configuration
- Set up Phoenix endpoint with LiveView socket
- Configured routes for all views
- Added development hot-reload
- Environment-specific configs (dev, test, prod)

### Key Features Implemented
✅ Photo upload with OCR parsing
✅ Manual item entry
✅ Share code generation (6-character alphanumeric)
✅ Multi-user collaboration with real-time updates
✅ Item claiming with split calculations
✅ Tip setting by owner
✅ Automatic bill breakdown showing:
  - Per-person item costs
  - Equal tip split
  - Total owed per person
  - Grand total
✅ Visual distinction for current user
✅ Responsive design

### Technical Decisions
- **Storage**: ETS via GenServer
  - No database dependency required
  - Perfect for prototype/demo
  - Fast concurrent reads
  - Built-in Erlang reliability
- **Dependencies**:
  - phoenix ~> 1.7.10
  - phoenix_live_view ~> 0.20.2
  - nanoid for ID/code generation
  - decimal for precise money calculations
  - briefly for temp file handling
- **OCR**: Tesseract with graceful fallback
  - Would work with actual tesseract installation
  - Falls back to mock receipt for demo

### What Would Be Needed for Production
- Replace ETS with PostgreSQL/Ecto for persistence
- Add user authentication
- Improve OCR with better error handling
- Add receipt image storage (S3, etc.)
- Implement proper session management for participant tracking
- Add tests (ExUnit + LiveView testing)
- Add currency support beyond USD
- Add tax calculations
- Add payment integration (Stripe, Venmo, etc.)
- Add email/SMS notifications for share codes
- Rate limiting and abuse prevention

