# Clean7 Product Prompt

Clean7 is a multi-branch cleaning services platform operating across multiple cities in India. Each active branch serves customers within an 8 km radius using stored branch coordinates and radius-based geo serviceability.

The platform has 5 roles:

- `USER`
- `DIRECTOR`
- `BRANCH_ADMIN`
- `WORKER`
- `RIDER`

`DIRECTOR` has full system access. `BRANCH_ADMIN` is limited to assigned branch operations. `USER`, `WORKER`, and `RIDER` primarily use mobile flows, while `DIRECTOR` and `BRANCH_ADMIN` use the web admin panel.

## Current Catalog Architecture

The platform catalog is now modeled as:

```text
Category -> Service -> Variant -> AddOn
```

There is no subcategory layer.

Core entity names:

- `Category`
- `Service`
- `Variant`
- `AddOn`
- `Booking`

### Top-level categories

- `Laundry`
- `Doorstep Car Wash`
- `Pest Control`
- `Home Cleaning`

### Service delivery model

Each service has a `serviceMode`:

- `PICKUP_DELIVERY`
- `AT_HOME`

Current mapping:

- Laundry -> `PICKUP_DELIVERY`
- Doorstep Car Wash -> `AT_HOME`
- Pest Control -> `AT_HOME`
- Home Cleaning -> `AT_HOME`

### Pricing model

Variants are first-class and carry customer-selectable price configuration.

Supported pricing rules:

- `FIXED`
- `PER_ITEM`
- `ADD_ON`

## Booking and Scheduling Model

Customers choose:

- service
- variant
- optional add-ons
- service date
- a **service window preference** (`SlotCode`: `MORNING`, `AFTERNOON`, or `EVENING`)
- address

These three slot enums are **fixed product-wide**. They are **not** loaded from a slot-inventory API and carry **no** capacity counts or “available” flags for clients.

Booking validation is **preference-based**:

1. Branch must be **active** and **within service radius** of the address (geo).
2. Branch / date / slot must **not** match a **branch schedule override** (`slotCode` set disables one window; `slotCode: null` disables the entire day).
3. Optional **same-day cutoff** (India timezone) may reject some same-day preferences.

There is **no** slot utilization engine, remaining inventory, or dynamic slot list for customer scheduling.

### Same-day cutoff rules

- if current time is in `MORNING`, allow same-day `AFTERNOON` and `EVENING`
- if current time is in `AFTERNOON`, allow same-day `EVENING`
- if current time is in `EVENING`, allow only next-day onward

Future calendar dates are not subject to same-day progressive blocking beyond normal override checks.

## Branch Serviceability and Assignment

When a user places an order:

1. The user address must have latitude and longitude.
2. The system finds active branches within service radius using geo distance.
3. **Schedule overrides** may disallow the chosen date/slot for the assigned branch (validated at order commit).
4. Branch assignment is automatic for normal customer flows.

The user does not choose the branch for standard booking.

Branch served pin code lists are not part of the current architecture. Each branch stores only its own `postalCode` as location metadata along with coordinates.

## Service Behavior

### On-site services

On-site services use `AT_HOME`.

Examples:

- Doorstep Car Wash
- Pest Control
- Home Cleaning

Flow:

1. User books service, variant, address, date, and slot.
2. Branch Admin manually assigns a worker.
3. Worker navigates to customer location.
4. Worker updates progress through operational statuses.

### Laundry services

Laundry uses `PICKUP_DELIVERY`.

Flow:

1. User books laundry service and variant.
2. Branch Admin assigns a pickup rider.
3. Rider completes pickup.
4. Branch verifies intake.
5. Branch Admin updates normal order status from `RECEIVED_AT_BRANCH` to `PROCESSING`.
6. Branch Admin marks the order `READY_FOR_DELIVERY` when laundry processing is complete.
7. Once ready, Branch Admin groups orders into delivery trips.
8. Rider delivers orders and collects COD if needed.

`LaundryStageTask` is deprecated. No new records are created, no business logic depends on it, and no frontend should consume it. The table remains only for historical compatibility and rollback safety.

## Payments

Supported:

- `COD`
- `RAZORPAY`

Payment status is tracked separately from order execution status.

## Operational Controls

Branch Admins can:

- manage branch orders
- assign workers and riders
- create delivery trips
- manage branch schedule overrides
- monitor branch metrics

Branch schedule overrides are used for exceptional closures:

- disable one slot on one specific date.
- disable all slots on one specific date

## Design Intent

The current system should prioritize:

- a simple and scalable catalog structure
- clear entity naming
- geo-first branch assignment
- fixed three-slot customer preferences with commit-time validation (overrides + optional same-day rules), not slot inventory APIs
- operational realism without unnecessary structural complexity
