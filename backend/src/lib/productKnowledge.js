// Product knowledge for the assistant to answer "how do I..." / "what is..."
// / "can this do..." questions about Ledgerly itself — separate from the
// tools, which handle questions about the user's actual data. Keep this in
// sync with what the app actually does; never describe a feature that
// doesn't exist, since the assistant is instructed to answer only from
// this text and say so when something isn't covered.

export const PRODUCT_KNOWLEDGE = `
LEDGERLY — PRODUCT KNOWLEDGE

What it is: an accounting and inventory system for small businesses —
not just mobile phone shops, though it has first-class support for
serial/IMEI-level stock tracking, which most general accounting software
lacks.

Currency: Sri Lankan Rupees (LKR) only right now, shown as "Rs. X".
There is no multi-currency support yet.

Theme: light only. There is no dark mode toggle.

--- Sales ---
Two kinds of sale, both created from the Sales page:
- Invoice: a credit sale. Nothing is deposited immediately — it adds to
  the customer's outstanding balance, due on the due date (defaults 30
  days out). Reference codes look like S1, S2, S3...
- Sales Receipt: a cash/bank sale paid on the spot. Money is deposited
  immediately into a chosen cash/bank account, no balance is created.
  Reference codes look like R1, R2, R3...
Both support multiple line items, a searchable product picker that
auto-fills the item's price, and — for products that track serial/IMEI
numbers — a picker to choose exactly which physical units are being sold.
Sales can be edited or deleted from the Sales list (pencil/trash icons on
each row); editing/deleting reverses and reapplies the stock and account
effects atomically.

--- Purchases ---
Recording a bill from a supplier increases stock. Reference codes look
like B1, B2, B3... Also supports multiple line items and serial/IMEI
entry for tracked products. Purchases can be edited or deleted the same
way sales can, with safety checks: you can't edit/delete a bill if any
serial unit it added has already been sold, or if doing so would drop
stock below zero.

--- Payments ---
- Receive Payment: records money collected from a customer, deposited to
  a chosen account. Can optionally be linked to one specific outstanding
  invoice so that invoice's balance reflects it, or left as a general
  payment against the customer's overall balance. Has its own list page
  (Payments Received) with edit/delete.
- Pay Bill: the same idea for money paid out to a supplier against a
  purchase bill. Has its own list page (Payments Made) with edit/delete.

--- Customers & Suppliers ---
Each has a list page and a detail page showing their full transaction
history and a real, computed balance (not a stored/cached number — it's
always derived live from actual invoices/payments, so it can't drift out
of sync).

--- Receivables & Payables ---
Two dedicated pages (sidebar items, not buried in Reports) that list
every customer who currently owes money (Receivables) or every supplier
you currently owe (Payables), sorted by amount, each with a one-click
shortcut straight into Receive Payment / Pay Bill with that person
already selected.

--- Inventory ---
The product catalog: name, price, cost, stock quantity, and a
"tracks serial/IMEI" toggle per product. When that toggle is on, every
unit purchased and sold is tracked individually by its serial/IMEI
number, not just as a quantity — this is the "Serial tracking" feature
in the sidebar. Products get auto-numbered codes (P1, P2, P3...).

--- Accounts (cash/bank) ---
Real cash/bank accounts with a running balance. Tapping into an account
shows its full transaction ledger — every deposit and withdrawal that
built up to the current balance, sourced from actual sales, payments,
purchases paid, and expenses.

--- Expenses ---
Recorded against a category and a specific cash/bank account (which it
withdraws from). Auto-numbered codes (EXP1, EXP2...).

--- Reports ---
- Inventory Valuation Summary: quantity on hand and total inventory value
  as of any date, computed with a real event-replay engine using FIFO,
  Weighted Average, or Standard Cost — whichever the user picks. Clicking
  an item drills into its full stock-movement ledger.
- Income Statement: Revenue, Cost of Goods Sold, Gross Profit, Operating
  Expenses, and Net Income over any date range — all computed from real
  recorded transactions.
- Sales Day Book / Purchase Day Book: a chronological line-by-line ledger
  of every sale or bill, with running totals.
- Chart of Accounts, General Ledger, Trial Balance: full double-entry
  bookkeeping. Every sale, purchase, payment, and expense automatically
  posts a balanced journal entry behind the scenes to the right accounts
  (Cash, Accounts Receivable/Payable, Revenue, COGS, Inventory, Expense
  categories, etc). A one-time "Backfill existing data" button on the
  Trial Balance page generates journal entries for records that existed
  before this feature was added.

--- Record numbering ---
Every record type gets its own sequential, human-readable code that
never repeats, even after a restart: customers (C1, C2...), products
(P1, P2...), purchases (B1, B2...), invoices (S1, S2...), sales receipts
(R1, R2...), customer payments (RCPT1, RCPT2...), supplier payments
(PAY1, PAY2...), expenses (EXP1, EXP2...).

--- This assistant ---
The chat assistant (you) can currently: create invoices, sales receipts,
and purchase bills; add new customers and suppliers; record customer
payments and supplier payments; and answer questions or search across
customers, suppliers, products, sales, purchases, and balances — using
real, live data via tools, never made up.
It cannot: edit or delete existing records (do that from the relevant
list page in the app), read/extract data from uploaded images or PDFs
(no OCR yet), export documents to PDF, send payment reminders, or handle
more than one currency. These are known gaps, not secrets — say so
plainly if asked about them.
`.trim()
