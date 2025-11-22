# CheckSplitter - Phoenix LiveView Prototype

A real-time check splitting application built with Elixir, Phoenix, and LiveView. This prototype demonstrates collaborative bill splitting with OCR receipt parsing, real-time updates, and automatic cost calculations.

## Features

### Core Functionality
- 📸 **Receipt Upload with OCR** - Upload a receipt photo and automatically parse line items using Tesseract OCR
- ✍️ **Manual Entry** - Alternatively, enter items manually with description and price
- 🔗 **Share Code System** - Generate unique 6-character codes to invite friends
- 👥 **Multi-User Collaboration** - Real-time updates as participants join and claim items
- ✅ **Item Claiming** - Tap items to claim them; multiple people can claim the same item
- 💰 **Smart Splitting** - Automatically split items between multiple claimers
- 💵 **Tip Handling** - Set tip amount and split equally among all participants
- 📊 **Bill Breakdown** - Clear breakdown showing each person's subtotal, tip share, and total owed

### Technical Highlights
- **Real-time Collaboration** - Phoenix PubSub enables instant updates across all connected clients
- **ETS Storage** - In-memory storage via GenServer for fast, concurrent access without database setup
- **LiveView** - Server-rendered UI with WebSocket updates (no custom JavaScript needed)
- **Responsive Design** - Mobile-first CSS that works on all screen sizes
- **Type Safety** - Uses Elixir structs and Decimal library for precise money calculations

## Architecture

### Data Model

```elixir
Check
├── id (unique identifier)
├── share_code (6-char code for joining)
├── owner_name (creator's name)
├── tip_amount (Decimal)
├── items (list of LineItem)
├── participants (map of participant_id => name)
└── inserted_at (DateTime)

LineItem
├── id (unique identifier)
├── description (string)
├── price (Decimal)
└── claimed_by (list of participant_ids)
```

### Storage Layer

**CheckStore GenServer**
- Manages ETS table for concurrent read/write access
- Stores checks by both ID and share code for fast lookup
- Automatic cleanup of checks older than 24 hours
- Broadcasts updates via Phoenix PubSub for real-time sync

### LiveView Pages

1. **HomeLive** (`/`) - Landing page with feature overview
2. **NewCheckLive** (`/new`) - Create new check with manual or photo entry
3. **JoinLive** (`/join` or `/join/:share_code`) - Join existing check
4. **CheckLive** (`/check/:id`) - Main collaborative check view

### OCR Integration

The OCR module (`CheckSplitter.OCR`) wraps Tesseract OCR:
- Extracts text from receipt images
- Uses regex patterns to identify line items and prices
- Filters out common non-item text (subtotal, tax, headers)
- Falls back to mock data for demo/development purposes

## Installation & Setup

### Prerequisites

- Elixir 1.14+ and Erlang/OTP 25+
- Node.js 18+ (for asset compilation)
- Tesseract OCR (optional, for receipt parsing)

### Install Tesseract (Optional)

```bash
# macOS
brew install tesseract

# Ubuntu/Debian
sudo apt-get install tesseract-ocr

# Windows
# Download from https://github.com/UB-Mannheim/tesseract/wiki
```

### Setup Application

```bash
# Install dependencies
mix deps.get

# Install Node.js dependencies for assets
cd assets && npm install && cd ..

# Compile assets
mix assets.build

# Start the Phoenix server
mix phx.server
```

The application will be available at [http://localhost:4000](http://localhost:4000).

## Usage

### Creating a Check

1. Navigate to the home page and click "Start New Check"
2. Enter your name
3. Choose to either:
   - **Upload Photo**: Take/upload a receipt photo for automatic OCR parsing
   - **Enter Manually**: Add items one by one with description and price
4. Review the parsed/entered items
5. Click "Create Check & Get Share Code"
6. Share the code with friends!

### Joining a Check

1. Click "Join Existing Check" from home page
2. Enter the 6-character share code
3. Enter your name
4. Click "Join Check"

### Claiming Items

1. Once on the check page, tap any item to claim it
2. Tap again to unclaim
3. Items can be claimed by multiple people (cost splits automatically)
4. See real-time updates as others claim items

### Setting Tip

1. Click "Set Tip" button on the check page
2. Enter tip amount in dollars
3. Tip is split equally among all participants
4. View updated totals in the breakdown section

### Understanding the Breakdown

The bill breakdown shows for each participant:
- **Items**: Total cost of items they claimed (split if shared)
- **Tip**: Their equal share of the tip
- **Total**: Final amount they owe

## Project Structure

```
check-splitter-app/
├── lib/
│   ├── check_splitter/
│   │   ├── application.ex          # App supervision tree
│   │   ├── check.ex                # Check data structure & logic
│   │   ├── line_item.ex            # Line item structure
│   │   ├── check_store.ex          # ETS-backed storage GenServer
│   │   └── ocr.ex                  # OCR integration
│   └── check_splitter_web/
│       ├── components/
│       │   ├── core_components.ex  # Reusable UI components
│       │   ├── layouts.ex          # Layout module
│       │   └── layouts/            # Layout templates
│       ├── live/
│       │   ├── home_live.ex        # Landing page
│       │   ├── new_check_live.ex   # Create check
│       │   ├── join_live.ex        # Join check
│       │   └── check_live.ex       # Main check view
│       ├── endpoint.ex             # Phoenix endpoint
│       ├── router.ex               # Route definitions
│       ├── telemetry.ex            # Telemetry setup
│       └── check_splitter_web.ex   # Web module
├── assets/
│   └── css/
│       └── app.css                 # Application styles
├── config/
│   ├── config.exs                  # Base configuration
│   ├── dev.exs                     # Development config
│   ├── test.exs                    # Test config
│   └── runtime.exs                 # Runtime config
├── mix.exs                         # Project definition & deps
├── notes.md                        # Development notes
└── README.md                       # This file
```

## Key Code Locations

### Bill Calculation Logic
`lib/check_splitter/check.ex:114` - `calculate_totals/1` function
- Iterates through all items
- Divides item cost by number of claimers
- Adds equal tip share to each participant
- Returns per-person breakdown

### Real-time Updates
`lib/check_splitter/check_store.ex:69` - PubSub broadcasting
- Broadcasts check updates to all subscribers
- `lib/check_splitter_web/live/check_live.ex:24` - Subscription
- `lib/check_splitter_web/live/check_live.ex:34` - Update handler

### Item Claiming
`lib/check_splitter_web/live/check_live.ex:43` - `handle_event("toggle_claim")`
- Toggles claim status for current participant
- Updates check in store
- Triggers broadcast to all connected clients

### OCR Processing
`lib/check_splitter/ocr.ex:13` - `parse_receipt/1` function
- Calls Tesseract via system command
- Parses text output into line items
- Falls back to mock data if Tesseract unavailable

## Dependencies

### Production
- `phoenix` ~> 1.7.10 - Web framework
- `phoenix_live_view` ~> 0.20.2 - Real-time server-rendered UI
- `jason` ~> 1.2 - JSON encoding/decoding
- `plug_cowboy` ~> 2.5 - HTTP server
- `nanoid` ~> 2.0 - Unique ID and share code generation
- `briefly` ~> 0.4 - Temporary file handling for uploads
- Implicit: `decimal` for precise money calculations

### Development
- `phoenix_live_reload` ~> 1.2 - Hot reload during development
- `phoenix_live_dashboard` ~> 0.8.2 - Development dashboard
- `floki` >= 0.30.0 - HTML parsing for tests

## Development Notes

### Design Decisions

**Why ETS instead of a database?**
- Perfect for prototype - no setup required
- Excellent performance for concurrent reads
- Built into Erlang/OTP (no external dependencies)
- Data is ephemeral but acceptable for demo
- Automatic cleanup prevents memory bloat

**Why LiveView instead of SPA?**
- Server-rendered reduces client complexity
- Real-time updates via WebSockets built-in
- No need for separate API layer
- SEO-friendly (though not critical for this app)
- Leverages Elixir's concurrency strengths

**Why Decimal for money?**
- Floating-point arithmetic is imprecise for money
- Decimal provides exact calculations
- Prevents rounding errors in bill splitting

### Limitations & Future Improvements

**Current Limitations:**
- Data doesn't persist across server restarts (ETS is in-memory)
- No user authentication or accounts
- Participant tracking is simplified (uses first participant ID)
- No actual payment integration
- OCR quality depends on Tesseract and image quality
- Share codes never expire (rely on 24hr cleanup)
- No currency support beyond USD

**Production Improvements:**
- Replace ETS with PostgreSQL/Ecto for persistence
- Add proper user authentication (email/phone + password or OAuth)
- Implement session-based participant tracking
- Add payment integration (Stripe, Venmo, PayPal, Cash App)
- Use cloud OCR service (Google Vision, AWS Textract) for better accuracy
- Add receipt image storage (S3, CloudFlare R2)
- Implement comprehensive test suite
- Add internationalization and multi-currency support
- Add tax calculation options
- Email/SMS notifications for share codes
- Export/download final breakdown as PDF
- Rate limiting and abuse prevention
- Accessibility improvements (ARIA labels, keyboard navigation)

### Testing

While no tests are included in this prototype, here's how you'd test it:

```elixir
# Example test structure
defmodule CheckSplitter.CheckTest do
  use ExUnit.Case

  test "calculate_totals splits items correctly" do
    # Test equal splitting
    # Test unequal claiming
    # Test tip distribution
  end
end

defmodule CheckSplitterWeb.CheckLiveTest do
  use CheckSplitterWeb.ConnCase
  import Phoenix.LiveViewTest

  test "claiming an item updates in real-time", %{conn: conn} do
    # Test LiveView interactions
  end
end
```

## API Overview

While there's no REST API (LiveView handles everything), here are the key public functions:

### CheckStore API

```elixir
# Create a new check
{:ok, check} = CheckStore.create_check("Alice")

# Get check by ID
{:ok, check} = CheckStore.get_check(id)

# Get check by share code
{:ok, check} = CheckStore.get_check_by_share_code("ABC123")

# Update check
{:ok, check} = CheckStore.update_check(updated_check)

# Subscribe to check updates
CheckStore.subscribe(check_id)
```

### Check Operations

```elixir
# Create new check
check = Check.new("Alice")

# Add participant
check = Check.add_participant(check, "Bob")

# Add item
check = Check.add_item(check, "Burger", "14.99")

# Claim item
check = Check.claim_item(check, item_id, participant_id)

# Set tip
check = Check.set_tip(check, "10.00")

# Calculate totals
totals = Check.calculate_totals(check)
```

## Contributing

This is a prototype/demonstration project. Key areas for contribution:
- Improve OCR accuracy and error handling
- Add comprehensive test coverage
- Implement database persistence layer
- Add user authentication
- Improve accessibility
- Add internationalization

## License

This is a prototype application created for demonstration purposes.

## Acknowledgments

- Built with [Phoenix Framework](https://phoenixframework.org/)
- UI components inspired by [Tailwind CSS](https://tailwindcss.com/)
- OCR powered by [Tesseract](https://github.com/tesseract-ocr/tesseract)

---

**Note**: This is a prototype application intended to demonstrate Phoenix LiveView capabilities. It should not be used in production without significant enhancements around security, persistence, authentication, and testing.
