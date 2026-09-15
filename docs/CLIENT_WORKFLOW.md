# Sameeja Commission Services — Client Workflow

## What the software does

Sameeja Commission Services keeps one reliable record of meat-delivery invoices, received payments, partial payments, and outstanding balances. It replaces manual follow-up notes with a clear invoice-by-invoice ledger.

The current version intentionally does not manage meat purchase costs, expenses, labour, tax, operations, or wastage. Those modules can be added later if required.

## User roles

### Master user / Owner

The owner has full access. The owner can:

- manage customers;
- manage the product catalogue;
- create invoices;
- review and edit submitted invoice drafts;
- approve and issue invoices;
- cancel an invoice that has no payment;
- record and allocate payments manually;
- create, disable, reactivate, and reset passwords for staff accounts; and
- view all dashboard totals and balances.

### Staff user

Staff can create and submit invoice drafts. Once submitted, staff cannot edit the invoice, approve it, cancel it, record payments, manage products, or manage users.

## Initial setup

The owner first opens **Customers** and creates each company that receives deliveries. Every customer receives a permanent internal ID. Names are only display information, so two different customers may have the same name without their invoices or payments being mixed. Editing a customer's name does not change its identity. Deactivating a customer prevents new invoices while preserving all history.

The owner then opens **Products** and adds the articles used on invoices. Each product contains:

- article name;
- MGM code;
- Subsys code;
- default unit; and
- optional default Metro rate.

The unit and rate are convenient defaults only. They can be changed on each invoice line for the specific delivery. Deactivating a product removes it from new invoices without changing historical invoices.

The owner then opens **Team** to create staff accounts. Each staff member receives an email address and temporary password for login.

## Invoice workflow

1. The owner or staff member selects **New invoice**.
2. The system assigns the next unique invoice number automatically when the invoice is submitted.
3. The user selects the customer record, then enters the delivery date, Metro store, supplier number, store number, PO number, and goods-receiving number. The invoice is linked to the selected customer's unique ID, not its name.
4. The user adds one or more products from the catalogue.
5. For every line, the user confirms or changes the unit, then enters the delivered quantity and Metro rate.
6. The software calculates each line price and the complete invoice total.
7. Submitting creates an invoice with **Awaiting review** status.
8. Staff cannot change the submitted draft. The owner opens it, verifies the details, and can edit it if necessary.
9. The owner selects **Approve & issue**. The invoice then becomes available for payment allocation.

An invoice may be cancelled only when no payment has been recorded against it. Cancellation preserves its history but removes it from outstanding totals.

## Payment allocation workflow

Only the owner can record a payment.

1. The owner selects **Record payment** or **Allocate a payment**.
2. The software shows every issued invoice linked to the selected customer's unique ID that still has a balance. Similar or identical customer names cannot cause invoices to be mixed.
3. The owner enters the payment date, exact amount received, and an optional bank-transfer or cheque reference.
4. The owner manually selects the invoice or invoices covered by that payment.
5. The owner enters the amount to apply to each selected invoice.
6. The software does not choose invoices or distribute money automatically.
7. The total allocated must equal the exact payment received before it can be saved.
8. An allocation cannot exceed an invoice's remaining balance.
9. Once saved, each invoice immediately shows its updated received amount, remaining balance, and payment status.

This supports one payment covering several selected invoices and partial payments where the remaining amount is paid later.

## Invoice payment statuses

- **Awaiting review:** submitted draft that has not been issued by the owner.
- **Unpaid:** issued invoice with no payment.
- **Partially paid:** issued invoice with some payment and a remaining balance.
- **Paid:** issued invoice whose full balance has been received.
- **Cancelled:** invoice removed from active balances while its record remains preserved.

## Dashboard

The owner dashboard shows:

- total value of issued invoices;
- total payments received;
- total outstanding balance;
- number of drafts awaiting review;
- counts of paid, partially paid, and unpaid invoices; and
- invoices currently needing attention.

Staff see the information needed to submit drafts and follow their review status, without access to owner-only payment and management functions.

## Finding and exporting records

The **Invoices** register can be filtered by invoice/customer/store text, date range, exact customer record, and payment status. The **Payments** register can be filtered by customer/reference/invoice text, date range, and exact customer record. Active filters remain applied while moving between result pages.

Use **Export Excel** for a sortable spreadsheet with real date and currency values, or **Export PDF** for a print-ready report. An export contains every record matching the active filters, not only the records visible on the current page. Invoice exports include totals, received amounts, and balances; payment exports include references and the invoices selected for each allocation.

## Example

An issued invoice totals **Rs 35,000**. Metro pays **Rs 10,000** first:

1. The owner records a Rs 10,000 payment.
2. The owner selects that invoice and allocates Rs 10,000 to it.
3. The invoice becomes **Partially paid**, with a Rs 25,000 balance.
4. When Metro later pays the remaining Rs 25,000, the owner records a second payment and selects the same invoice.
5. The invoice becomes **Paid**, with a zero balance.

All invoices, allocations, statuses, and balances are persisted in the Supabase PostgreSQL database.
