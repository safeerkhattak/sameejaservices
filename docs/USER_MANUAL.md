# Sameeja Commission Services — User Manual

## 1. What the software does

Sameeja Commission Services is a private invoice and payment-tracking system for meat deliveries to Metro stores. It replaces informal notes and memory-based follow-ups with a clear record of:

- what was delivered;
- which store received it;
- product, unit, received quantity and Metro rate;
- invoice amount and approval status;
- full and partial payments;
- the exact invoices selected for a combined payment; and
- the remaining balance on every issued invoice.

The system does not process bank payments. The master user records a payment after money is received outside the application.

## 2. User roles

| Capability | Master user | Staff user |
| --- | --- | --- |
| View dashboard and invoices | Yes | Yes |
| Create and submit an invoice draft | Yes | Yes |
| Edit a submitted invoice | Yes | No |
| Approve and issue an invoice | Yes | No |
| Cancel an unpaid invoice | Yes | No |
| Record or allocate payments | Yes | No |
| Create and manage staff accounts | Yes | No |
| Create, edit, activate or deactivate products | Yes | No |

There is exactly one master account. Staff accounts are created only by that master user.

## 3. Initial master setup

1. Open the Supabase project dashboard.
2. Go to **Authentication → Users**.
3. Select **Add user** and create the owner's email and password.
4. Go to **Authentication settings / Sign In Providers** and turn off **Allow new users to sign up**.
5. Either sign in to the application immediately—the first authorized login becomes the master—or run `docs/CREATE_MASTER_USER.sql` after replacing its email and name placeholders.
6. Open the application and sign in with the owner's credentials.

No default master password is included in the source code. Do not share the master password or store it in the repository.

## 4. Creating staff accounts

1. Sign in as the master user.
2. Open **Team** from the sidebar.
3. Select **Create staff account**.
4. Enter the staff member's full name, email and a temporary password of at least eight characters.
5. Select **Create account**.
6. Share the credentials privately with that staff member.

From the same Team screen, the master can reset a staff password, disable the account, or enable it again. Disabling a person preserves their invoices and audit history.

## 5. Creating an invoice draft

1. Open **New invoice**.
2. Enter the invoice date. The application assigns the next unique invoice number automatically when the draft is submitted.
3. Enter the Metro store, store number and available reference details such as PO number and goods receiving number.
4. For every delivered article, select the product and enter the received quantity and Metro rate. The product's unit is shown in its own invoice column.
5. Confirm the automatically calculated line prices and invoice total.
6. Add an optional note.
7. Select **Submit draft**.

After submission, a staff user cannot change the invoice. This protects the submitted record. The master user can review and correct it before or after issuing it, provided no payment has been recorded against it.

## 6. Managing products

1. Sign in as the master user and open **Products**.
2. Select **Add product**.
3. Enter the article name, MGM code, Subsys code, unit and an optional default Metro rate.
4. Keep measurements out of the article name; for example, use `Whole FQ Veal` as the article and `Kg` as its unit.
5. Edit a product when its catalog details change, or deactivate it to remove it from new invoice entry.

Deactivation never changes old invoices. Each invoice keeps the name, codes and unit that were saved when it was created.

## 7. Reviewing and issuing invoices

1. Sign in as the master user.
2. Open **Invoices** and select an invoice marked **Awaiting review**.
3. Check the customer, store, references, articles, quantities, rates and total.
4. Use **Edit** if corrections are required.
5. Select **Approve & issue** when the invoice is correct.
6. Use **Print invoice** when a printable copy is needed.

An invoice with a recorded payment cannot be edited. A paid invoice cannot be cancelled because doing so would invalidate its payment history.

## 8. Recording full, partial or combined payments

1. Sign in as the master user.
2. Open **Payments → Record payment**.
3. Choose the customer and enter the amount actually received, payment date and optional bank/cheque reference.
4. Manually select only the invoices covered by that payment.
5. Enter the amount allocated to each selected invoice.
6. Make sure **Left to allocate** is zero.
7. Select **Record payment**.

The system never automatically applies money to all old invoices. For a combined payment, the master explicitly chooses every invoice and amount. A partial payment leaves the remaining invoice balance outstanding for a future payment.

## 9. Invoice statuses

- **Awaiting review:** A draft was submitted and needs master approval.
- **Unpaid:** The invoice is issued but has no allocated payment.
- **Partially paid:** Some money was allocated, but a balance remains.
- **Paid:** Allocated payments equal the invoice total.
- **Cancelled:** The invoice no longer counts toward outstanding balances.

## 10. Dashboard and registers

The master dashboard shows total issued invoices, payments received, outstanding balance, collection percentage, fully paid invoices, partially paid invoices and unpaid invoices.

The **Invoices** register shows every invoice, the amount received, remaining balance and current status. Use the search box to find an invoice by invoice number, store, PO number or goods receiving number.

The **Payments** register shows every recorded payment and the exact invoice allocations chosen by the master.

## 11. Data storage and security

- Application data is persisted in Supabase PostgreSQL.
- Authentication accounts are stored in Supabase Auth.
- Database and Auth administration happen only on the server.
- The Supabase secret key must never be placed in browser code or committed to Git.
- Unprovisioned, disabled and publicly created accounts are denied application access.
- Important invoice, payment and team-management actions are written to the audit log.

Before production deployment, rotate any database password or secret key that has been shared in a message, screenshot or public location. Put replacement values directly into `.env.local` for development and Vercel Environment Variables for production.

## 12. Current scope

The software intentionally does not track meat purchase cost, operating expenses, labor, tax, wastage or profit. Those modules can be added later if the client requests them.

## 13. Troubleshooting

- **Cannot sign in:** Confirm that the Auth user exists, the password is correct and the account is active on the Team screen.
- **Account not authorized:** The master must create that staff account from the Team screen.
- **Cannot edit an invoice:** Staff cannot edit submitted drafts, and invoices with payments are locked.
- **Cannot record a payment:** Only the master can record payments; the complete received amount must be allocated manually.
- **No products are available:** The master must add and activate products from the Products screen.
