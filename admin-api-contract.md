# Admin API Contract

Base URL:

```text
http://localhost:8080
```

This document covers the current admin routes exposed through the API gateway:

- catalog administration
- order operations
- branch operations
- operator operations
- staff and auth-user administration
- admin profile management
- system reset

Admin-facing terminology should use:

- `Category`
- `Service`
- `Item`
- `AddOn`

Internal persistence may still use `Variant`. Admin payloads should treat those records as `Item`.

## Response Envelope

Success:

```json
{
  "success": true,
  "data": {}
}
```

Common error:

```json
{
  "success": false,
  "error": {
    "message": "Some message",
    "details": null
  }
}
```

Rules:

- Admin/frontend-facing APIs always return `error` as an object.
- Frontend can always read `error.message`.
- `details` contains optional structured metadata and is `null` when unused.

## Auth

All admin routes require:

```http
Authorization: Bearer <jwt>
```

Director-only routes are called out explicitly below.

## Shared Enums

```ts
type ServiceMode = "PICKUP_DELIVERY" | "AT_HOME";
type PricingType = "FIXED" | "PER_ITEM" | "ADD_ON";
type OverrideTargetType = "ITEM" | "ADDON";
type SlotCode = "MORNING" | "AFTERNOON" | "EVENING";
type OperatorStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE";
type Role = "DIRECTOR" | "BRANCH_ADMIN" | "OPERATOR" | "RIDER";
```

## Shared Objects

### Admin Category

```json
{
  "id": "category-id",
  "code": "HOME_CLEANING",
  "slug": "home-cleaning",
  "name": "Home Cleaning",
  "description": "At-home cleaning appointments for homes, bathrooms, kitchens, sofas, and mattresses.",
  "iconUrl": null,
  "imageUrl": null,
  "sortOrder": 0,
  "isEnabled": true,
  "services": []
}
```

### Admin Service

```json
{
  "id": "service-id",
  "categoryId": "category-id",
  "code": "HOME_FULL_HOME_CLEANING",
  "slug": "full-home-cleaning",
  "name": "Full Home Cleaning",
  "shortDescription": "Deep cleaning sized to the home configuration.",
  "longDescription": null,
  "serviceMode": "AT_HOME",
  "durationEstimateMinutes": null,
  "tags": null,
  "sortOrder": 0,
  "isEnabled": true,
  "versionNumber": 1,
  "category": {
    "id": "category-id",
    "code": "HOME_CLEANING",
    "slug": "home-cleaning",
    "name": "Home Cleaning"
  },
  "items": [],
  "addOns": []
}
```

### Admin Item

```json
{
  "id": "item-id",
  "code": "HOME_FULL_2_BHK",
  "slug": "home-full-home-cleaning-2-bhk",
  "name": "2 BHK",
  "pricingType": "FIXED",
  "price": 4499,
  "currency": "INR",
  "unitLabel": null,
  "minQty": null,
  "maxQty": null,
  "isEnabled": true,
  "sortOrder": 1,
  "service": {
    "id": "service-id",
    "code": "HOME_FULL_HOME_CLEANING",
    "slug": "full-home-cleaning",
    "name": "Full Home Cleaning",
    "category": {
      "id": "category-id",
      "code": "HOME_CLEANING",
      "slug": "home-cleaning",
      "name": "Home Cleaning"
    }
  }
}
```

### Admin AddOn

```json
{
  "id": "addon-id",
  "code": "HOME_FULL_BALCONY_CLEANING",
  "name": "Balcony Cleaning",
  "description": null,
  "pricingType": "ADD_ON",
  "price": 399,
  "currency": "INR",
  "unitLabel": null,
  "maxQty": null,
  "isEnabled": true,
  "sortOrder": 0,
  "service": {
    "id": "service-id",
    "code": "HOME_FULL_HOME_CLEANING",
    "slug": "full-home-cleaning",
    "name": "Full Home Cleaning",
    "category": {
      "id": "category-id",
      "code": "HOME_CLEANING",
      "slug": "home-cleaning",
      "name": "Home Cleaning"
    }
  }
}
```

### Geo Override

Branch-specific price overrides for catalog items and add-ons. Services themselves are not price targets; override the item or add-on inside the service instead.

```json
{
  "id": "override-id",
  "targetType": "ITEM",
  "itemId": "item-id",
  "addOnId": null,
  "branchId": "branch-id",
  "overriddenPrice": "20.00",
  "overriddenIsEnabled": null,
  "createdAt": "2026-05-12T10:00:00.000Z",
  "updatedAt": "2026-05-12T10:00:00.000Z"
}
```

### Branch Option

Lightweight branch record for admin select inputs such as geo override pricing.

```json
{
  "id": "branch-id",
  "code": "BLR01",
  "name": "Indiranagar Branch",
  "city": "Bangalore",
  "isActive": true
}
```

### Branch

```json
{
  "id": "branch-id",
  "code": "BLR01",
  "name": "Indiranagar Branch",
  "city": "Bangalore",
  "addressLine1": "12 MG Road",
  "addressLine2": null,
  "state": "Karnataka",
  "postalCode": "560001",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "serviceRadiusKm": 8,
  "assignedBranchAdminAuthUserId": "auth-user-id",
  "isActive": true,
  "operationalMetric": {
    "branchId": "branch-id",
    "activeOrderCount": 14,
    "pipelineBacklog": 6,
    "deliveryBacklog": 4,
    "slotUtilizationPct": 52,
    "isStale": false,
    "lastCalculatedAt": "2026-05-12T10:00:00.000Z"
  },
  "scheduleOverrides": []
}
```

### Operator Profile

```json
{
  "id": "operator-profile-id",
  "authUserId": "auth-user-id",
  "displayName": "Rider One",
  "branchId": "branch-id",
  "phoneNumber": "+919999999999",
  "role": "RIDER",
  "serviceCategoryCodes": ["LAUNDRY"],
  "serviceZones": [],
  "skillTags": [],
  "maxConcurrentJobs": 1,
  "onboardingStatus": "APPROVED",
  "status": "ACTIVE",
  "branch": {
    "id": "branch-id",
    "code": "BLR01",
    "name": "Indiranagar Branch"
  },
  "createdAt": "2026-05-12T10:00:00.000Z",
  "updatedAt": "2026-05-12T10:00:00.000Z"
}
```

### Admin Auth User

```json
{
  "id": "auth-user-id",
  "name": "Branch Admin",
  "email": "admin@example.com",
  "role": "BRANCH_ADMIN",
  "isVerified": false,
  "isActive": true,
  "createdAt": "2026-05-12T10:00:00.000Z",
  "updatedAt": "2026-05-12T10:00:00.000Z"
}
```

### Staff DTO

```json
{
  "id": "operator-profile-id",
  "fullName": "Operator One",
  "email": "operator@example.com",
  "phoneNumber": "+919999999999",
  "role": "OPERATOR",
  "branchId": "branch-id",
  "status": "ACTIVE",
  "onboardingStatus": "APPROVED",
  "serviceCategoryCodes": ["HOME_CLEANING"],
  "createdAt": "2026-05-12T10:00:00.000Z",
  "updatedAt": "2026-05-12T10:00:00.000Z"
}
```

### Admin Profile

```json
{
  "id": "profile-id",
  "authUserId": "auth-user-id",
  "email": "admin@example.com",
  "role": "BRANCH_ADMIN",
  "fullName": "Branch Admin",
  "phoneNumber": "+919999999999",
  "avatarUrl": null,
  "emergencyContactName": null,
  "emergencyContactPhone": null,
  "internalNotes": "Handles East zone",
  "emailOptIn": true,
  "smsOptIn": true,
  "whatsappOptIn": true,
  "createdAt": "2026-05-12T10:00:00.000Z",
  "updatedAt": "2026-05-12T10:00:00.000Z"
}
```

### Admin Order

Use the full `Order` envelope from [frontend-api-contract.md](/c:/Users/RAMAN/OneDrive/Desktop/waw-microservices/frontend-api-contract.md). Admin order endpoints return the same normalized order object.
That normalized order uses frontend `item*` terminology on order items, while internal persistence may still use `Variant`. For mixed laundry orders, order-level `serviceCode` may be `MIXED_LAUNDRY` as virtual grouping metadata only, and `serviceId`, `serviceSlug`, and `serviceName` are all `null`.

## Catalog Admin APIs

Notes:

- Catalog admin APIs do not expose generic `attributes` bags on services, items, or add-ons.
- Future metadata must be introduced with an explicit documented schema instead of a catch-all field.

### `GET /admin/categories`

Success `200`: `SuccessEnvelope<AdminCategory[]>`

### `POST /admin/categories`

Request:

```json
{
  "code": "HOME_CLEANING",
  "slug": "home-cleaning",
  "name": "Home Cleaning",
  "description": "At-home cleaning appointments for homes, bathrooms, kitchens, sofas, and mattresses.",
  "iconUrl": null,
  "imageUrl": null,
  "sortOrder": 2,
  "isEnabled": true,
  "changeSummary": "Initial setup"
}
```

Success `201`: `SuccessEnvelope<object>`

### `PATCH /admin/categories/:id`

Request:

```json
{
  "name": "Home Cleaning",
  "description": "Updated copy",
  "sortOrder": 2,
  "isEnabled": true,
  "changeSummary": "Copy refresh"
}
```

Success `200`: `SuccessEnvelope<object>`

### `GET /admin/services`

Optional query:

```text
category=<category-slug>
branchId=<optional-branch-id>
```

Success `200`: `SuccessEnvelope<AdminService[]>`

### `POST /admin/services`

Request:

```json
{
  "categoryId": "category-id",
  "code": "HOME_FULL_HOME_CLEANING",
  "slug": "full-home-cleaning",
  "name": "Full Home Cleaning",
  "shortDescription": "Deep cleaning sized to the home configuration.",
  "longDescription": null,
  "serviceMode": "AT_HOME",
  "durationEstimateMinutes": null,
  "tags": null,
  "sortOrder": 0,
  "isEnabled": true,
  "changeSummary": "Created service"
}
```

Success `201`: `SuccessEnvelope<object>`

### `PATCH /admin/services/:id`

Request:

```json
{
  "shortDescription": "Updated short description",
  "isEnabled": false,
  "changeSummary": "Temporarily unavailable"
}
```

Success `200`: `SuccessEnvelope<object>`

### `DELETE /admin/services/:id`

Role: `DIRECTOR` or `BRANCH_ADMIN`

Deletes the service and all dependent catalog records for that service:

- add-ons under the service
- geo overrides under those add-ons
- items/variants under the service
- geo overrides under those items

Success `200`: `SuccessEnvelope<object>`

### `GET /admin/items`

Optional query:

```text
serviceId=<optional-service-id>
```

Success `200`: `SuccessEnvelope<AdminItem[]>`

Legacy alias:

- `GET /admin/variants`

### `POST /admin/items`

Request:

```json
{
  "serviceId": "service-id",
  "code": "HOME_FULL_2_BHK",
  "slug": "home-full-home-cleaning-2-bhk",
  "name": "2 BHK",
  "pricingType": "FIXED",
  "basePrice": 4499,
  "currency": "INR",
  "unitLabel": null,
  "minQty": null,
  "maxQty": null,
  "sortOrder": 1,
  "isEnabled": true,
  "changeSummary": "Created item"
}
```

Success `201`: `SuccessEnvelope<object>`

Legacy alias:

- `POST /admin/variants`

### `PATCH /admin/items/:id`

Request:

```json
{
  "basePrice": 4599,
  "isEnabled": true,
  "changeSummary": "Updated festive pricing"
}
```

Success `200`: `SuccessEnvelope<object>`

Legacy alias:

- `PATCH /admin/variants/:id`

### `GET /admin/addons`

Optional query:

```text
serviceId=<optional-service-id>
```

Success `200`: `SuccessEnvelope<AdminAddOn[]>`

### `POST /admin/addons`

Request:

```json
{
  "serviceId": "service-id",
  "code": "HOME_FULL_BALCONY_CLEANING",
  "name": "Balcony Cleaning",
  "description": null,
  "pricingType": "ADD_ON",
  "price": 399,
  "currency": "INR",
  "unitLabel": null,
  "maxQty": null,
  "sortOrder": 0,
  "isEnabled": true,
  "changeSummary": "Created add-on"
}
```

Success `201`: `SuccessEnvelope<object>`

### `PATCH /admin/addons/:id`

Request:

```json
{
  "price": 449,
  "isEnabled": true,
  "changeSummary": "Revised premium add-on price"
}
```

Success `200`: `SuccessEnvelope<object>`

### `GET /admin/geo-overrides`

Success `200`: `SuccessEnvelope<GeoOverride[]>`

### `POST /admin/geo-overrides`

Request:

```json
{
  "targetType": "ITEM",
  "targetId": "item-id",
  "branchId": "branch-id",
  "overriddenPrice": 20,
  "overriddenIsEnabled": null
}
```

`targetType` must be `ITEM` or `ADDON`. Use the item/add-on `id` as `targetId`.

Success `201`: `SuccessEnvelope<GeoOverride>`

### `PATCH /admin/geo-overrides/:id`

Request:

```json
{
  "branchId": "branch-id",
  "overriddenPrice": 499,
  "overriddenIsEnabled": true
}
```

Success `200`: `SuccessEnvelope<GeoOverride>`

Use `GET /admin/branches/options` to populate the branch `<select>`. Use `GET /admin/items?serviceId=<service-id>` and `GET /admin/addons?serviceId=<service-id>` to pick the item or add-on to override.

## Order Admin APIs

### `GET /admin/orders`

Optional query:

```text
status=<OrderStatus>
paymentStatus=<PaymentStatus>
serviceCategory=<service-category-code>
customerAuthUserId=<auth-user-id>
scheduledDate=2026-05-13
```

Success `200`: `SuccessEnvelope<Order[]>`

### `GET /admin/orders/:orderId`

Success `200`: `SuccessEnvelope<Order>`

### `PATCH /admin/orders/:orderId/status`

Request:

```json
{
  "status": "CONFIRMED",
  "note": "Confirmed by branch"
}
```

Success `200`: `SuccessEnvelope<Order>`

### `PATCH /admin/orders/:orderId/payment`

Request:

```json
{
  "paymentStatus": "PAID",
  "paymentMethod": "RAZORPAY"
}
```

Success `200`: `SuccessEnvelope<Order>`

### `PATCH /admin/orders/:orderId/assignment`

Request:

```json
{
  "assignedOperatorAuthUserId": "operator-auth-user-id",
  "note": "Manual assignment",
  "forceOverride": false,
  "overrideReason": null
}
```

Success `200`: `SuccessEnvelope<Order>`

### `PATCH /admin/orders/:orderId/schedule`

Headers:

```http
idempotency-key: reschedule-123
```

Request:

```json
{
  "scheduledDate": "2026-05-14",
  "scheduledSlotCode": "AFTERNOON",
  "forceOverride": false,
  "overrideReason": null
}
```

Success `200`: `SuccessEnvelope<Order>`

### `POST /admin/orders/:orderId/payment/cod-collect`

Headers:

```http
idempotency-key: cod-collect-123
```

Request:

```json
{
  "collectedAmount": 556,
  "note": "COD collected at delivery"
}
```

Success `200`: `SuccessEnvelope<Order>`

### `POST /admin/orders/:orderId/pickup-rider`

Request:

```json
{
  "riderAuthUserId": "rider-auth-user-id"
}
```

Success `200`: `SuccessEnvelope<Order>`

### `POST /admin/orders/:orderId/laundry-intake`

Request:

```json
{
  "orderCode": "ABC1234567",
  "actualItemCount": 6,
  "continueWithMismatch": false,
  "note": "Received at branch"
}
```

Success `200`: `SuccessEnvelope<Order>`

### Manual laundry processing

After intake, laundry orders use normal order status transitions only. There is no laundry stage queue.

Use `PATCH /admin/orders/:orderId/status` to move the order through:

```text
RECEIVED_AT_BRANCH -> PROCESSING -> READY_FOR_DELIVERY
```

`LaundryStageTask` is deprecated. No new records are created, no business logic depends on it, and no frontend should consume it.

### `POST /admin/orders/:orderId/assign-operator`

Request:

```json
{
  "operatorId": "operator-profile-id"
}
```

Success `200`: `SuccessEnvelope<Order>`

### `POST /admin/orders/:orderId/reassign-operator`

Request:

```json
{
  "operatorId": "operator-profile-id"
}
```

Success `200`: `SuccessEnvelope<Order>`

### `POST /admin/orders/:orderId/complete`

Request body: none.

Success `200`: `SuccessEnvelope<Order>`

## Delivery Trip Admin APIs

### `GET /admin/delivery-trips`

Optional query:

```text
branchId=<optional-branch-id>
status=<CREATED|IN_PROGRESS|COMPLETED|CANCELLED>
```

Success `200`:

```json
{
  "success": true,
  "data": [
    {
      "id": "trip-id",
      "branchId": "branch-id",
      "riderAuthUserId": "rider-auth-user-id",
      "status": "CREATED",
      "startedAt": null,
      "completedAt": null,
      "cancelledAt": null,
      "note": null,
      "createdByAuthUserId": "admin-auth-user-id",
      "createdAt": "2026-05-12T10:00:00.000Z",
      "updatedAt": "2026-05-12T10:00:00.000Z",
      "stops": []
    }
  ]
}
```

### `POST /admin/delivery-trips`

Request:

```json
{
  "branchId": "branch-id",
  "riderAuthUserId": "rider-auth-user-id",
  "orderIds": ["order-1", "order-2"],
  "note": "Evening route"
}
```

Success `201`: `SuccessEnvelope<object>`

### `POST /admin/delivery-trips/:tripId/start`

Request body: none.

Success `200`: `SuccessEnvelope<object>`

### `POST /admin/delivery-trips/:tripId/complete`

Request body: none.

Success `200`: `SuccessEnvelope<object>`

## Branch Admin APIs

### `GET /admin/branches`

Success `200`: `SuccessEnvelope<Branch[]>`

### `GET /admin/branches/options`

Role: `DIRECTOR` or `BRANCH_ADMIN`

Lightweight branch list for admin select inputs such as geo override pricing.

Optional query:

```text
includeInactive=true
```

When omitted, only active branches are returned. `BRANCH_ADMIN` users only receive branches they are assigned to.

Success `200`: `SuccessEnvelope<BranchOption[]>`

### `POST /admin/branches`

Role: `DIRECTOR`

Request:

```json
{
  "code": "BLR01",
  "name": "Indiranagar Branch",
  "city": "Bangalore",
  "addressLine1": "12 MG Road",
  "addressLine2": null,
  "state": "Karnataka",
  "postalCode": "560001",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "serviceRadiusKm": 8,
  "assignedBranchAdminAuthUserId": "auth-user-id"
}
```

Success `201`: `SuccessEnvelope<Branch>`

### `PATCH /admin/branches/:branchId`

Request:

```json
{
  "code": "BLR01",
  "name": "Indiranagar Branch",
  "isActive": true,
  "city": "Bangalore",
  "addressLine1": "12 MG Road",
  "addressLine2": null,
  "state": "Karnataka",
  "postalCode": "560001",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "serviceRadiusKm": 10,
  "assignedBranchAdminAuthUserId": "auth-user-id"
}
```

Success `200`: `SuccessEnvelope<Branch>`

### `DELETE /admin/branches/:branchId`

Role: `DIRECTOR`

Success `200`: `SuccessEnvelope<Branch>`

### `GET /admin/branches/:branchId/schedule-overrides`

Success `200`:

```json
{
  "success": true,
  "data": [
    {
      "id": "override-id",
      "branchId": "branch-id",
      "slotCode": "MORNING",
      "specificDate": "2026-05-13T00:00:00.000Z",
      "reason": "Holiday",
      "createdAt": "2026-05-12T10:00:00.000Z",
      "updatedAt": "2026-05-12T10:00:00.000Z"
    }
  ]
}
```

### `POST /admin/branches/:branchId/schedule-overrides`

Request:

```json
{
  "slotCode": "MORNING",
  "specificDate": "2026-05-13",
  "reason": "Holiday"
}
```

Success `201`: `SuccessEnvelope<object>`

### `PATCH /admin/branches/:branchId/schedule-overrides/:overrideId`

Request:

```json
{
  "slotCode": "AFTERNOON",
  "specificDate": "2026-05-13",
  "reason": "Moved holiday block"
}
```

Success `200`: `SuccessEnvelope<object>`

### `DELETE /admin/branches/:branchId/schedule-overrides/:overrideId`

Success `200`: `SuccessEnvelope<object>`

## Operator Admin APIs

### `GET /admin/operators`

Success `200`: `SuccessEnvelope<OperatorProfile[]>`

### `POST /admin/operators`

Request:

```json
{
  "authUserId": "auth-user-id",
  "displayName": "Rider One",
  "branchId": "branch-id",
  "phoneNumber": "+919999999999",
  "role": "RIDER",
  "serviceCategoryCodes": ["LAUNDRY"],
  "serviceZones": [],
  "skillTags": [],
  "maxConcurrentJobs": 1
}
```

Success `201`: `SuccessEnvelope<OperatorProfile>`

### `PATCH /admin/operators/:authUserId/status`

Request:

```json
{
  "status": "INACTIVE"
}
```

Success `200`: `SuccessEnvelope<OperatorProfile>`

### `DELETE /admin/operators/:authUserId`

Success `200`: `SuccessEnvelope<OperatorProfile>`

## Auth User Admin APIs

### `POST /admin/auth-users`

Role: `DIRECTOR` or `BRANCH_ADMIN`

Request:

```json
{
  "name": "New User",
  "email": "new.user@example.com",
  "password": "password123",
  "role": "BRANCH_ADMIN",
  "isActive": true
}
```

Success `201`: `SuccessEnvelope<AdminAuthUser>`

### `GET /admin/auth-users`

Role: `DIRECTOR`

Optional query:

```text
role=<Role>
isActive=true|false
search=<free-text>
```

Success `200`: `SuccessEnvelope<AdminAuthUser[]>`

### `GET /admin/auth-users/:authUserId`

Role: `DIRECTOR`

Success `200`: `SuccessEnvelope<AdminAuthUser>`

### `PATCH /admin/auth-users/:authUserId`

Role: `DIRECTOR`

Request:

```json
{
  "name": "Updated Name",
  "role": "BRANCH_ADMIN",
  "isActive": true
}
```

Success `200`: `SuccessEnvelope<AdminAuthUser>`

### `DELETE /admin/auth-users/:authUserId`

Role: `DIRECTOR`

Success `200`: `SuccessEnvelope<AdminAuthUser>`

### `POST /admin/auth-users/:authUserId/reset-password`

Role: `DIRECTOR`

Request:

```json
{
  "password": "newpassword123"
}
```

Success `200`: `SuccessEnvelope<AdminAuthUser>`

## Staff Admin APIs

### `POST /admin/staff`

Request:

```json
{
  "fullName": "Operator One",
  "email": "operator@example.com",
  "password": "password123",
  "phoneNumber": "+919999999999",
  "role": "OPERATOR",
  "branchId": "branch-id",
  "serviceCategoryCodes": ["HOME_CLEANING"]
}
```

Success `201`: `SuccessEnvelope<StaffProfileDto>`

## Admin Profile APIs

### `GET /admin/profiles`

Optional query:

```text
email=<customer-email>
phoneNumber=<customer-phone>
```

At least one of `email` or `phoneNumber` is required.

Success `200`: `SuccessEnvelope<AdminProfile[]>`

### `GET /admin/profiles/:authUserId`

Success `200`: `SuccessEnvelope<AdminProfile>`

### `PATCH /admin/profiles/:authUserId`

Request:

```json
{
  "fullName": "Branch Admin",
  "phoneNumber": "+919999999999",
  "avatarUrl": null,
  "emergencyContactName": null,
  "emergencyContactPhone": null,
  "internalNotes": "Handles East zone"
}
```

Success `200`: `SuccessEnvelope<AdminProfile>`

## System Admin APIs

### `POST /admin/system/reset-all-data`

Role: `DIRECTOR`

Request body: none.

Success `200`:

```json
{
  "success": true,
  "data": {
    "message": "System data reset completed."
  }
}
```

## Development Reseed Workflow

Catalog reseed command:

```bash
npm run seed:reset
```

Notes:

- intended for development only
- clears catalogue tables and reapplies the exact `services.txt` catalog
- blocked when `NODE_ENV=production`
