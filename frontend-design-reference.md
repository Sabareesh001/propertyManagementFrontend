# Frontend Design Reference — Property Management API

> This document is the single source of truth for UI/frontend designers building against the Property Management API.
> It covers every endpoint, request/response schema, validation rule, status enum, and business flow.
> Base URL: `http://localhost:5000` (dev). Auth: JWT Bearer token or `jwt_token` HttpOnly cookie set on login.

---

## Table of Contents

1. [User Roles & Permissions](#1-user-roles--permissions)
2. [Authentication & Session](#2-authentication--session)
3. [User Verification Flow](#3-user-verification-flow)
4. [Property Lifecycle](#4-property-lifecycle)
5. [Lease Proposal Flow](#5-lease-proposal-flow)
6. [Lease Contract Lifecycle](#6-lease-contract-lifecycle)
7. [Charges & Payments](#7-charges--payments)
8. [Bank Accounts](#8-bank-accounts)
9. [Stripe Connect](#9-stripe-connect)
10. [Complaints](#10-complaints)
11. [Admin Finance Dashboard](#11-admin-finance-dashboard)
12. [Notifications](#12-notifications)
13. [Pagination](#13-pagination)
14. [Complete Endpoint Reference](#14-complete-endpoint-reference)
15. [All DTOs & Schemas](#15-all-dtos--schemas)
16. [Validation Rules Cheat Sheet](#16-validation-rules-cheat-sheet)
17. [Status Enums & Lookup Values](#17-status-enums--lookup-values)
18. [Error Response Format](#18-error-response-format)
19. [Page-by-Page Design Guide](#19-page-by-page-design-guide)

---

## 1. User Roles & Permissions

The system has three roles. A user registers with one role but can later gain the Owner role via `/api/user/become-owner`.

| Role ID | Name     | Who They Are                              |
|---------|----------|-------------------------------------------|
| 1       | Tenant   | Rents properties; submits proposals       |
| 2       | Owner    | Lists properties; creates leases          |
| 3       | Admin    | Verifies users/properties; approves leases|

**Key access rules:**
- To **list a property**: must be `Owner` + user must be `Verified`
- To **submit a lease proposal**: must be any authenticated user + `Verified`
- To **accept a proposal / create a lease**: must be `Owner`
- To **sign a lease** / **upload lease agreement documents**: must be `Tenant`
- To **apply charges**: must be `Owner` of that property
- To **record payment**: must be `Tenant` of that lease
- Admin-only actions: verify/reject users, verify/reject lease templates, activate leases

---

## 2. Authentication & Session

### Register
```
POST /api/user/register
Auth: None
```
**Request body:**
```json
{
  "email": "user@example.com",
  "password": "StrongPass1!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+919876543210",
  "dateOfBirth": "1995-04-20",
  "roleId": 1
}
```
**Response 201:** `UserResponseDto` (see §15)

**Validation:**
- `email`: required, valid email format, no whitespace
- `password`: min 12 chars, must have uppercase, lowercase, digit, special char
- `firstName`/`lastName`: 2–100 chars, letters/spaces/hyphens/apostrophes only
- `phone`: 7–15 digits, may include `+`, spaces, hyphens, parentheses
- `dateOfBirth`: required, must be ≥ 18 years ago, must be ≥ 1900
- `roleId`: must be a valid role ID in the database (1=Tenant, 2=Owner, 3=Admin)

---

### Login
```
POST /api/user/login
Auth: None
```
**Request body:**
```json
{
  "email": "user@example.com",
  "password": "StrongPass1!"
}
```
**Response 200:** `UserResponseDto` + sets `jwt_token` HttpOnly cookie (expires 1 hour)

> The JWT is also returned in the `Authorization: Bearer <token>` header pattern for non-cookie clients.

**Email verification gate:** Login fails with **403** if the account's email is not yet verified:
```json
{
  "status": 403,
  "detail": "Email address has not been verified.",
  "errorCode": "EMAIL_NOT_VERIFIED"
}
```
> **UI guidance:** On login, check `error.errorCode === "EMAIL_NOT_VERIFIED"` and show a "Resend verification email" link that calls `POST /api/user/resend-verification`.

---

### Verify Email
```
GET /api/user/verify-email/{hash}
Auth: None
```
`hash` is the token from the verification link emailed at registration (`{FrontendUrl}/auth/verify-email/{hash}`).

**Response 200:**
```json
{ "message": "Email verified successfully.", "emailVerified": true }
```

**Errors:**
- 404: hash is unknown/invalid
- 400: hash has expired (links expire 24h after registration)

---

### Resend Verification Email
```
POST /api/user/resend-verification
Auth: None
```
**Request body:**
```json
{ "email": "user@example.com" }
```

**Response 200:** Always returns a generic success message regardless of whether the email exists or is already verified (avoids leaking registered emails):
```json
{ "message": "If an account with that email exists and is not yet verified, a new verification link has been sent." }
```

---

### Become Owner (upgrade role)
```
POST /api/user/become-owner
Auth: Required (any role)
```
No request body. Adds `Owner` role to the current user, re-issues JWT cookie.

**Response 200:** `UserResponseDto`

---

### Get All Users
```
GET /api/user?pageNumber=&pageSize=
Auth: Required
```
Paginated (see §13). **Response 200:** `PagedResultDto<UserResponseDto>`

---

### Get User by ID
```
GET /api/user/{id}
Auth: None
```
**Response 200:** `UserResponseDto`

---

### Update User
```
PUT /api/user/{id}
Auth: None
```
**Request body:**
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "+919876543210",
  "dateOfBirth": "1995-04-20"
}
```
All fields are optional (partial update). Only provided non-null fields are applied.

---

### Delete User
```
DELETE /api/user/{id}
Auth: None
```
**Response 200:** `{ "message": "User deleted successfully" }`

---

## 3. User Verification Flow

Before a user can list a property or submit a lease proposal, they must be **Verified**.

### State Machine

```
Unverified (1)
     │
     ▼  POST /api/userverification/submit
  Pending (2)
     │
     ├──[Admin approves]──▶  Verified (3)
     │
     └──[Admin rejects]───▶  Rejected (4)
                                  │
                                  └── User can resubmit → Pending (2)
```

### Submit Verification Request
```
POST /api/userverification/submit
Auth: Required
```
**Request body:**
```json
{
  "documents": [
    {
      "documentTypeId": 1,
      "documentNumber": "ABCDE1234F",
      "documentUrl": "https://cdn.example.com/pan-card.pdf"
    }
  ]
}
```
At least one document required. Document type IDs:
- `1` = Pan Card
- `2` = Property Deed
- `3` = Salary Slip
- `4` = Lease Agreement

**Validation per document:**
- `documentTypeId`: 1–4
- `documentNumber`: 4–50 chars, alphanumeric + hyphens only
- `documentUrl`: required, non-empty

**Response 201:** `UserVerificationResponseDto`

---

### Get My Verification Status
```
GET /api/userverification/status
Auth: Required
```
**Response 200:**
```json
{ "status": "Pending" }
```
Possible values: `"Unverified"`, `"Pending"`, `"Verified"`, `"Rejected"`

---

### Get Pending Verifications (Admin only)
```
GET /api/userverification/pending?pageNumber=&pageSize=
Auth: Admin
```
Paginated (see §13). **Response 200:** `PagedResultDto<UserVerificationResponseDto>`

---

### Approve Verification (Admin only)
```
POST /api/userverification/{id}/verify
Auth: Admin
```
**Request body:**
```json
{ "remarks": "Documents verified successfully." }
```
`remarks` is optional, max 500 chars.

**Response 200:** `UserVerificationResponseDto`

---

### Reject Verification (Admin only)
```
POST /api/userverification/{id}/reject
Auth: Admin
```
**Request body:**
```json
{ "remarks": "Pan card image is blurry. Please resubmit." }
```
**Response 200:** `UserVerificationResponseDto`

---

### Upload Verification Document
```
POST /api/userverification/upload-document
Auth: Required
Content-Type: multipart/form-data
```
Uploads a PDF file (max 10 MB) and returns a permanent URL to reference in `SubmitVerificationDto.documents[].documentUrl`.

**Form field:** `file` — the PDF binary.

**Response 200:**
```json
{ "url": "http://localhost:5000/uploads/verificationdocs/<uuid>.pdf" }
```

**Errors:**
- 400: No file provided / not a PDF / exceeds 10 MB

---

## 4. Property Lifecycle

### Verification States

```
Draft (1)  ──[owner submits]──▶  Submitted (2)
     │                                  │
     └──[owner re-submits after       [Admin verifies/rejects]
         rejection]─────────────▶    ┌───┴───┐
                                     ▼       ▼
                               Verified(3) Rejected(4)
                                    │
                      [owner can re-submit Rejected → Submitted]
```

### Availability States

| ID | Name        | Meaning                          |
|----|-------------|----------------------------------|
| 1  | Available   | Listed and open for proposals    |
| 2  | Occupied    | Active lease exists              |
| 3  | Unavailable | Taken off market by owner        |

---

### Create Property
```
POST /api/property
Auth: Owner
```
> Requires the owner to be a Verified user (enforced in service layer).

**Request body:**
```json
{
  "title": "2BHK Apartment in Koramangala",
  "description": "Spacious apartment near metro...",
  "addressLine": "123, 5th Block, Koramangala",
  "cityId": 5,
  "monthlyRent": 25000.00,
  "upfrontPayment": 50000.00,
  "securityDeposit": 75000.00,
  "thumbnailImgUrl": "https://cdn.example.com/thumb.jpg",
  "propertyImages": [
    {
      "imageUrl": "https://cdn.example.com/img1.jpg",
      "description": "Living room",
      "displayOrder": 1
    }
  ]
}
```

**Validation:**
- `title`: 3–150 chars, letters/digits/spaces/hyphens/commas/periods
- `description`: optional, max 2000 chars
- `addressLine`: 5–300 chars, required
- `cityId`: must be > 0 and exist in database
- `monthlyRent` / `upfrontPayment` / `securityDeposit`: ≥ 0; monthlyRent and upfrontPayment cannot both be 0
- Per image: `imageUrl` required; `displayOrder` ≥ 0

**Response 201:** `PropertyResponseDto`

---

### Get All Properties (public)
```
GET /api/property?pageNumber=&pageSize=
Auth: None
```
Paginated (see §13), newest first. **Response 200:** `PagedResultDto<PropertyResponseDto>`

---

### Get Property by ID (public)
```
GET /api/property/{id}
Auth: None
```
`id` is an integer.

**Response 200:** `PropertyResponseDto`

---

### Get My Properties
```
GET /api/property/my?pageNumber=&pageSize=
Auth: Owner
```
Paginated (see §13), newest first. **Response 200:** `PagedResultDto<PropertyResponseDto>`

---

### Update Property
```
PUT /api/property/{id}
Auth: Owner (must be property owner)
```
Same structure as Create, but uses `propertyImages` as `PropertyImageDto[]` (each may have an `id` field to update existing images; omitting `id` or setting `null` adds a new image).

**Response 200:** `PropertyResponseDto`

---

### Delete Property
```
DELETE /api/property/{id}
Auth: Owner (must be property owner)
```
**Response 204:** No content

---

### Submit Property for Verification (Owner)
```
PUT /api/property/{id}/submit
Auth: Owner (must be property owner)
```
No request body. Moves the property from Draft (or Rejected) → Submitted.

**Pre-condition:** The property must have at least one attached document with `documentTypeId === 2` (Property Deed) that has not been deleted. If no deed is present the API returns **400**:
```json
{
  "status": 400,
  "detail": "A property deed document must be attached before submitting for verification."
}
```

> **UI guidance:** Disable the "Submit for Verification" button and show a prompt ("Please upload a Property Deed document first") when `GET /api/property/{id}/documents` returns no document with `documentTypeId === 2`.

**Response 200:** `PropertyResponseDto`

---

### Get Properties Pending Verification (Admin only)
```
GET /api/property/pending-verification?pageNumber=&pageSize=
Auth: Admin
```
Paginated (see §13), oldest first (FIFO queue). **Response 200:** `PagedResultDto<PropertyResponseDto>`

---

### Verify/Reject Property (Admin only)
```
PUT /api/property/{id}/verify?approve=true
Auth: Admin
```
- `approve=true` → Verified (3)
- `approve=false` → Rejected (4)

**Request body:**
```json
{ "remarks": "All documents are in order." }
```
`remarks` is optional, max 500 chars.

**Response 200:** `PropertyResponseDto`

---

### Upload Property Image(s) (Owner)
```
POST /api/property/upload-image
Auth: Owner
Content-Type: multipart/form-data
```
Uploads one or more image files and returns permanent URLs to use in `CreatePropertyDto.propertyImages[].imageUrl` or `UpdatePropertyDto`.

**Form field:** `files` — one or more image binaries (repeat the field for multiple files).

**Accepted formats:** JPEG, PNG, GIF, WebP. Max **5 MB per file**. Total request limit 50 MB.

**Response 200:**
```json
{
  "urls": [
    "http://localhost:5000/uploads/propertyimages/<uuid>.jpg",
    "http://localhost:5000/uploads/propertyimages/<uuid>.png"
  ]
}
```

**Errors:**
- 400: No files provided / unsupported image type / any single file exceeds 5 MB

**Typical flow:**
1. Owner selects images in the property form
2. POST each batch to `/api/property/upload-image` → receive `urls[]`
3. Map each URL into `propertyImages[].imageUrl` with `description` and `displayOrder`
4. Include the full `propertyImages` array in the Create/Update property request body

---

### Upload Property Document (Owner)
```
POST /api/property/upload-document
Auth: Owner
Content-Type: multipart/form-data
```
Uploads a PDF file (max 10 MB) and returns a permanent URL to reference in `AddPropertyDocumentDto.documentUrl` or `CreatePropertyDto`.

**Form field:** `file` — the PDF binary.

**Response 200:**
```json
{ "url": "http://localhost:5000/uploads/propertydocs/<uuid>.pdf" }
```

**Errors:**
- 400: No file provided / not a PDF / exceeds 10 MB

---

### Add Document to Property (Owner)
```
POST /api/property/{id}/documents
Auth: Owner (must be property owner)
```
**Request body:**
```json
{
  "documentTypeId": 2,
  "documentNumber": "DEED-12345",
  "documentUrl": "http://localhost:5000/uploads/propertydocs/<uuid>.pdf"
}
```

**Validation:**
- `documentTypeId`: 1–5
- `documentNumber`: 4–50 chars, `^[a-zA-Z0-9\-]+$`
- `documentUrl`: required, valid absolute URL

**Response 201:** `DocumentResponseDto`

---

### Get Property Documents
```
GET /api/property/{id}/documents?pageNumber=&pageSize=
Auth: Required
```
Paginated (see §13). **Response 200:** `PagedResultDto<DocumentResponseDto>`

---

### Remove Property Document (Owner)
```
DELETE /api/property/{id}/documents/{documentId}
Auth: Owner (must be property owner)
```
`documentId` is a GUID.

**Response 204:** No content

---

## 5. Lease Proposal Flow

A tenant expresses interest in a property by submitting a lease proposal.

### State Machine

```
Draft (1)  ──[tenant submits]──▶  Submitted (2)
    │                                    │
    │                           [Owner reviews]
    │                              ┌─────┴──────┐
    │                              ▼            ▼
    │                         Approved(3)   Rejected(4)
    │
    └──[tenant cancels]──▶  Cancelled(6)
    │
Submitted ──[tenant cancels]──▶  Cancelled(6)
```
Also: `Expired (5)` — set by system when proposal is not acted on.

---

### Create Lease Proposal
```
POST /api/leaseproposal
Auth: Required (any verified user)
```
**Request body:**
```json
{
  "propertyId": 12,
  "startDate": "2026-08-01",
  "endDate": "2027-07-31",
  "monthlyRent": 24000.00,
  "upfrontPayment": 48000.00,
  "securityDeposit": 72000.00
}
```
All fields are **required** — a proposal must include full lease terms to be created:
- `startDate`: must be today or later (cannot be in the past)
- `endDate`: must be > `startDate` and at least 1 month after
- `monthlyRent`, `upfrontPayment`, `securityDeposit`: all required, must be ≥ 0 (can be 0 but must be explicitly provided)

**Response 201:** `LeaseProposalResponseDto`

---

### Submit Proposal (Tenant)
```
POST /api/leaseproposal/{id}/submit
Auth: Required (must be proposal owner)
```
Moves status from Draft → Submitted.

**Response 200:** `LeaseProposalResponseDto`

---

### Accept Proposal (Owner)
```
PUT /api/leaseproposal/{id}/accept
Auth: Owner (must own the property)
```
Moves status to Approved. The owner then creates a lease referencing this proposal.

**Response 200:** `LeaseProposalResponseDto`

---

### Reject Proposal (Owner)
```
PUT /api/leaseproposal/{id}/reject
Auth: Owner (must own the property)
```
**Response 200:** `LeaseProposalResponseDto`

---

### Update Lease Proposal (Tenant — Draft only)
```
PUT /api/leaseproposal/{id}
Auth: Required (must be the tenant who created the proposal)
```
Full replace of a Draft proposal — all fields are **required** on every update call.

**Request body:**
```json
{
  "startDate": "2026-09-01",
  "endDate": "2027-08-31",
  "monthlyRent": 23000.00,
  "upfrontPayment": 46000.00,
  "securityDeposit": 69000.00
}
```
All five fields must be provided. Same validation rules as Create apply (`startDate` not in the past, `endDate` ≥ 1 month after `startDate`, amounts ≥ 0). Proposal must be in **Draft** status.

**Response 200:** `LeaseProposalResponseDto`

---

### Cancel Proposal (Tenant)
```
PUT /api/leaseproposal/{id}/cancel
Auth: Tenant (must be proposal owner)
```
Can cancel if status is Draft or Submitted.

**Response 200:** `LeaseProposalResponseDto`

---

### Get My Requests (Tenant view)
```
GET /api/leaseproposal/my-requests?pageNumber=&pageSize=
Auth: Tenant
```
Paginated (see §13). **Response 200:** `PagedResultDto<LeaseProposalResponseDto>`

---

### Get Received Requests (Owner view)
```
GET /api/leaseproposal/received-requests?pageNumber=&pageSize=
Auth: Owner
```
Returns proposals for all the owner's properties, with tenant details embedded. Paginated (see §13).

**Response 200:** `PagedResultDto<LeaseProposalResponseDto>` (each item has `tenant` field with `TenantDetailsDto`)

---

## 6. Lease Contract Lifecycle

Once a proposal is Approved, the owner creates a formal lease. The lease goes through a multi-step verification and signing process.

### State Machine

```
Draft (1)
  │
  ├─[owner edits]──▶ Draft (1)
  │
  ▼  PUT /{id}/submit (owner)
Submitted (2)
  │
  ├─[Admin rejects]──▶ Rejected (6)
  │
  ▼  PUT /{id}/verify-template?approve=true (Admin)
PendingSignature (3)
  │
  ▼  PUT /{id}/sign (Tenant uploads signed doc)
TenantSigned (4)
  │
  ├─[Admin rejects]──▶ Rejected (6)
  │
  ▼  PUT /{id}/verify-signed?approve=true (Admin)
Active (5)
  │
  ├─[system/admin]──▶ Expired (8)
  └─[admin]─────────▶ Terminated (7)
```

---

### Create Lease
```
POST /api/lease
Auth: Owner
```
**Request body:**
```json
{
  "tenantId": "uuid-of-tenant",
  "propertyId": 12,
  "proposalId": "uuid-of-approved-proposal",
  "startDate": "2026-08-01",
  "endDate": "2027-07-31",
  "monthlyRent": 25000.00,
  "upfrontPayment": 50000.00,
  "securityDeposit": 75000.00,
  "agreementDocumentUrl": "https://cdn.example.com/lease-template.pdf",
  "documents": [
    {
      "documentTypeId": 2,
      "documentNumber": "DEED-12345",
      "documentUrl": "https://cdn.example.com/deed.pdf"
    }
  ]
}
```

**Validation:**
- `tenantId`: required, valid GUID
- `propertyId`: required, > 0
- `proposalId`: required, valid GUID
- `startDate`: required, must not be in the past
- `endDate`: required, must be > startDate, at least 1 month after startDate
- `monthlyRent` / `upfrontPayment` / `securityDeposit`: ≥ 0
- `agreementDocumentUrl`: optional (can be added when submitting)

**Response 201:** `LeaseResponseDto`

---

### Update Lease (Owner — only Draft or Submitted)
```
PUT /api/lease/{id}
Auth: Owner
```
All fields optional (partial update). Same structure as Create minus `tenantId`/`propertyId`/`proposalId`.

If `statusId: 2` (Submitted) is included, `agreementDocumentUrl` becomes required.

**Response 200:** `LeaseResponseDto`

---

### Submit Lease (Owner)
```
PUT /api/lease/{id}/submit
Auth: Owner
```
No request body. Moves Draft → Submitted (requires `agreementDocumentUrl` to be already set).

**Response 200:** `LeaseResponseDto`

---

### Get Pending Templates (Admin)
```
GET /api/lease/pending-templates?pageNumber=&pageSize=
Auth: Admin
```
Returns all leases in **Submitted (2)** status whose templates are awaiting verification, oldest first. Use this to populate the admin verification queue instead of polling `GET /api/lease/my-leases` and filtering client-side. Paginated (see §13).

**Response 200:** `PagedResultDto<LeaseResponseDto>`

---

### Verify Template (Admin)
```
PUT /api/lease/{id}/verify-template?approve=true
Auth: Admin
```
- `approve=true` → PendingSignature
- `approve=false` → Rejected

**Response 200:** `LeaseResponseDto`

---

### Sign Lease (Tenant)
```
PUT /api/lease/{id}/sign
Auth: Tenant
```
**Request body:**
```json
{
  "signedAgreementDocumentUrl": "https://cdn.example.com/signed-lease.pdf"
}
```
`signedAgreementDocumentUrl` is required and non-empty.

Moves PendingSignature → TenantSigned.

**Response 200:** `LeaseResponseDto`

---

### Get Pending Signed Leases (Admin)
```
GET /api/lease/pending-signed?pageNumber=&pageSize=
Auth: Admin
```
Returns all leases in **TenantSigned (4)** status whose signed agreements are awaiting verification, oldest first. Use this to populate the admin signed-lease verification queue instead of polling `GET /api/lease/my-leases` and filtering client-side. Mirror of `GET /api/lease/pending-templates` for the signing stage. Paginated (see §13).

**Response 200:** `PagedResultDto<LeaseResponseDto>`

---

### Verify Signed Lease (Admin)
```
PUT /api/lease/{id}/verify-signed?approve=true
Auth: Admin
```
- `approve=true` → Active (charges can now be applied)
- `approve=false` → Rejected

**Response 200:** `LeaseResponseDto`

---

### Get Lease by ID
```
GET /api/lease/{id}
Auth: Required (Owner/Tenant of lease, or Admin)
```
**Response 200:** `LeaseResponseDto`

---

### Get My Leases
```
GET /api/lease/my-leases?pageNumber=&pageSize=
Auth: Required
```
Returns leases where the user is the owner or tenant (based on role). Paginated (see §13).

**Response 200:** `PagedResultDto<LeaseResponseDto>`

---

### Get Lease Documents
```
GET /api/lease/{id}/documents?pageNumber=&pageSize=
Auth: Required (Owner/Tenant of lease, or Admin)
```
Paginated (see §13). **Response 200:** `PagedResultDto<DocumentResponseDto>`

---

### Upload Lease Agreement Document (Tenant)
```
POST /api/lease/{id}/documents
Auth: Tenant (must be the tenant of the lease)
```
Lets the tenant attach their own agreement documents to the lease (in addition to signing via `PUT /api/lease/{id}/sign`). The document is added to the lease's document collection and is returned by `GET /api/lease/{id}/documents`.

**Request body:**
```json
{
  "documentTypeId": 4,
  "documentNumber": "AGR-12345",
  "documentUrl": "https://cdn.example.com/tenant-agreement.pdf"
}
```

**Validation:**
- `documentTypeId`: required, must be between `1` and `5`
- `documentNumber`: optional; when supplied, 4–50 chars, letters/digits/hyphens only
- `documentUrl`: required, must be a valid absolute URL

The lease must **not** be in `Draft (1)` or `Submitted (2)` status; otherwise the request is rejected with `400`.

**Response 201:** `DocumentResponseDto`

---

## 7. Charges & Payments

Charges are applied by the owner to an **Active** lease. The tenant pays against those charges.

### Charge Types

| ID | Name            |
|----|-----------------|
| 1  | Monthly Rent    |
| 2  | Security Deposit|
| 3  | Upfront Payment |
| 4  | Maintenance     |
| 5  | Penalty         |
| 6  | Other           |

### Charge Statuses

| ID | Name           |
|----|----------------|
| 1  | Pending        |
| 2  | Partially Paid |
| 3  | Paid           |
| 4  | Overdue        |
| 5  | Cancelled      |

### Payment Methods

| ID | Name      | Category |
|----|-----------|----------|
| 1–6| Various   | Manual   |
| 7  | Stripe    | Online   |

### Payment Statuses

| ID | Name      |
|----|-----------|
| 1  | Pending   |
| 2  | Completed |
| 3  | Failed    |
| 4  | Refunded  |

---

### Apply Charge (Owner)
```
POST /api/lease/{leaseId}/charges
Auth: Owner (must own the property of that lease)
```
**Request body:**
```json
{
  "chargeTypeId": 1,
  "amount": 25000.00,
  "description": "August 2026 rent",
  "dueDate": "2026-08-05T00:00:00Z"
}
```

**Validation:**
- `chargeTypeId`: > 0, required
- `amount`: > 0
- `description`: optional, max 500 chars
- `dueDate`: required, cannot be in the past

**Response 201:** `ChargeResponseDto`

---

### Get All Charges for Lease
```
GET /api/lease/{leaseId}/charges?pageNumber=&pageSize=
Auth: Required (Owner or Tenant of that lease)
```
Paginated (see §13), newest first. **Response 200:** `PagedResultDto<ChargeResponseDto>`

Each charge includes `amountPaid` and `balanceDue` computed fields.

---

### Get Charge by ID
```
GET /api/lease/{leaseId}/charges/{chargeId}
Auth: Required (Owner or Tenant of that lease)
```
**Response 200:** `ChargeResponseDto`

---

### Record Payment (Tenant)
```
POST /api/lease/{leaseId}/payments
Auth: Tenant (must be tenant of that lease)
```
A single payment can cover multiple charges (partial or full amounts).

**Request body:**
```json
{
  "chargeAllocations": [
    { "chargeId": "uuid-of-charge-1", "amount": 25000.00 },
    { "chargeId": "uuid-of-charge-2", "amount": 10000.00 }
  ],
  "paymentMethodId": 1,
  "transactionRef": "TXN-2026-08-001",
  "currencyId": 1
}
```

**Validation:**
- `chargeAllocations`: at least one required
  - Each `chargeId`: valid GUID, required
  - Each `amount`: > 0
- `paymentMethodId`: > 0, required
- `transactionRef`: 4–100 chars, alphanumeric + hyphens/underscores only
- `currencyId`: > 0 (default = 1 for INR)

**Response 201:** `PaymentResponseDto`

---

### Get All Payments for Lease
```
GET /api/lease/{leaseId}/payments?pageNumber=&pageSize=
Auth: Required (Owner or Tenant of that lease)
```
Paginated (see §13), newest first. **Response 200:** `PagedResultDto<PaymentResponseDto>`

---

## 8. Bank Accounts

Users can register bank accounts (used for manual payment tracking / payout purposes).

### Create Bank Account
```
POST /api/bankaccount
Auth: Required
```
**Request body:**
```json
{
  "bankName": "State Bank of India",
  "accountNumber": "123456789012",
  "accountHolderName": "John Doe",
  "ifscCode": "SBIN0001234"
}
```

**Validation:**
- `bankName`: 2–100 chars, letters/spaces/hyphens/periods/ampersands
- `accountNumber`: digits only, 9–18 digits
- `accountHolderName`: 2–100 chars, letters/spaces/hyphens/apostrophes
- `ifscCode`: exactly 11 chars, format `^[A-Z]{4}0[A-Z0-9]{6}$` (e.g. `SBIN0001234`)

**Response 201:** `BankAccountResponseDto`

---

### Get My Bank Accounts
```
GET /api/bankaccount?pageNumber=&pageSize=
Auth: Required
```
Paginated (see §13), newest first. **Response 200:** `PagedResultDto<BankAccountResponseDto>`

---

### Get Bank Account by ID
```
GET /api/bankaccount/{id}
Auth: Required (must own the account)
```
**Response 200:** `BankAccountResponseDto`

---

### Update Bank Account
```
PUT /api/bankaccount/{id}
Auth: Required (must own the account)
```
Same body as Create.

**Response 200:** `BankAccountResponseDto`

---

### Delete Bank Account
```
DELETE /api/bankaccount/{id}
Auth: Required (must own the account)
```
**Response 204:** No content

---

## 9. Stripe Connect

Owners can connect a Stripe Express account to receive online rent payments from tenants.

### Onboarding Flow

```
1. Owner calls POST /api/stripe/connect/onboard
   → Receives onboardingUrl (Stripe hosted page)
   → Frontend redirects owner to onboardingUrl

2. Stripe redirects back to OnboardingReturnUrl (configured in appsettings.json)

3. Owner can check GET /api/stripe/connect/status to confirm onboarding

4. Tenant calls POST /api/stripe/lease/{leaseId}/payments/intent
   → Receives clientSecret + publishableKey
   → Frontend uses Stripe.js to confirm payment

5. Stripe calls POST /api/stripe/webhook automatically
   → Backend records payment as Completed
```

---

### Onboard Owner
```
POST /api/stripe/connect/onboard
Auth: Owner
```
No request body.

**Response 200:**
```json
{
  "onboardingUrl": "https://connect.stripe.com/setup/...",
  "stripeAccountId": "acct_xxxx"
}
```

---

### Get Stripe Account Status
```
GET /api/stripe/connect/status
Auth: Owner
```
**Response 200:**
```json
{
  "stripeAccountId": "acct_xxxx",
  "chargesEnabled": true,
  "payoutsEnabled": true,
  "detailsSubmitted": true,
  "isOnboarded": true
}
```
`isOnboarded = chargesEnabled && payoutsEnabled && detailsSubmitted`

---

### Create Payment Intent (Tenant pays online)
```
POST /api/stripe/lease/{leaseId}/payments/intent
Auth: Tenant
```
**Request body:** Same as `RecordPaymentDto` (with `paymentMethodId: 7` for Stripe)
```json
{
  "chargeAllocations": [
    { "chargeId": "uuid-of-charge", "amount": 25000.00 }
  ],
  "paymentMethodId": 7,
  "transactionRef": "STRIPE-TXN-001",
  "currencyId": 1
}
```

**Response 200:**
```json
{
  "paymentId": "uuid-of-payment",
  "clientSecret": "pi_xxx_secret_xxx",
  "publishableKey": "pk_test_xxx",
  "amount": 25000.00,
  "platformFee": 1250.00,
  "currency": "inr"
}
```
Frontend must use `clientSecret` with Stripe.js `confirmCardPayment` or `confirmPayment`.

---

### Stripe Webhook (internal)
```
POST /api/stripe/webhook
Auth: None (verified via Stripe-Signature header)
```
Handles:
- `payment_intent.succeeded` → marks Payment as Completed, charges as Paid
- `payment_intent.payment_failed` → marks Payment as Failed
- `account.updated` → updates owner's Stripe onboarding status

---

## 10. Complaints

A tenant raises a complaint against one of their **Active** leases. The owner of the property (or an admin) triages it through a status state machine, and any participant can add comments to a shared thread.

### State Machine

```
Open (1)
  │
  ├─[owner/admin]──▶ InProgress (2)
  │                       │
  ├─[owner/admin]──▶ Resolved (3) ◀──[owner/admin]──┘
  │                       │
  │        ┌──[tenant-creator]──▶ Closed (4)  [terminal]
  │        └──[any participant]──▶ InProgress (2)  [reopen]
  │
  └─[tenant-creator or admin]──▶ Cancelled (5)  [terminal]
```
`Closed` and `Cancelled` are terminal — no further transitions allowed once reached.

### Categories (ComplaintTypeId)
| ID | Name             |
|----|------------------|
| 1  | Maintenance      |
| 2  | Plumbing         |
| 3  | Electrical       |
| 4  | Appliance        |
| 5  | Noise/Neighbours |
| 6  | Security/Safety  |
| 7  | Billing/Payment  |
| 8  | Other            |

### Priorities (PriorityId)
| ID | Name   |
|----|--------|
| 1  | Low    |
| 2  | Medium |
| 3  | High   |
| 4  | Urgent |

### Statuses (StatusId)
| ID | Name       |
|----|------------|
| 1  | Open       |
| 2  | InProgress |
| 3  | Resolved   |
| 4  | Closed     |
| 5  | Cancelled  |

---

### Create Complaint (Tenant)
```
POST /api/complaint
Auth: Tenant (must be the tenant of the lease)
```
**Request body:**
```json
{
  "leaseId": "uuid-of-active-lease",
  "categoryId": 2,
  "priorityId": 3,
  "subject": "Kitchen sink leaking",
  "description": "Water pooling under the sink since yesterday evening.",
  "attachmentUrl": "https://cdn.example.com/leak-photo.jpg"
}
```
**Validation:**
- `leaseId`: required, must reference an **Active** lease the tenant belongs to
- `categoryId`: 1–8
- `priorityId`: 1–4
- `subject`: 5–150 chars
- `description`: 10–2000 chars
- `attachmentUrl`: optional

**Response 201:** `ComplaintResponseDto` (with empty `comments`)

---

### Get My Complaints (Tenant view)
```
GET /api/complaint/my?pageNumber=&pageSize=
Auth: Required
```
Complaints created by the current user, newest first. Each item has an empty `comments` list (use Get Complaint by ID for the full thread). Paginated (see §13).

**Response 200:** `PagedResultDto<ComplaintResponseDto>`

---

### Get Received Complaints (Owner view)
```
GET /api/complaint/received?pageNumber=&pageSize=
Auth: Owner
```
Complaints raised on any of the owner's properties, newest first. Paginated (see §13).

**Response 200:** `PagedResultDto<ComplaintResponseDto>`

---

### Get All Complaints (Admin only)
```
GET /api/complaint?pageNumber=&pageSize=
Auth: Admin
```
All complaints in the system, newest first. Paginated (see §13).

**Response 200:** `PagedResultDto<ComplaintResponseDto>`

---

### Get Complaint by ID
```
GET /api/complaint/{id}
Auth: Required (tenant who created it, owner of the property, or Admin)
```
Returns the full comment thread (not paginated — thread length is naturally bounded).

**Response 200:** `ComplaintResponseDto` (with populated `comments[]`)

---

### Update Complaint Status
```
PUT /api/complaint/{id}/status
Auth: Required (permission depends on the transition — see state machine above)
```
**Request body:**
```json
{
  "statusId": 2,
  "note": "Plumber scheduled for tomorrow morning."
}
```
`note` is optional — if provided, it's appended to the thread as a comment from the acting user.

**Response 200:** `ComplaintResponseDto` (with refreshed `comments[]`)

**Errors:**
- 403: caller doesn't have permission for this specific transition (e.g. a tenant trying to mark Resolved)
- 400: the transition isn't valid from the complaint's current status (e.g. Closed → anything)

---

### Add Comment
```
POST /api/complaint/{id}/comments
Auth: Required (tenant who created it, owner of the property, or Admin)
```
**Request body:**
```json
{ "message": "Confirmed — plumber will arrive between 10am and 12pm." }
```
`message`: 1–2000 chars.

Blocked with **400** if the complaint is `Closed` or `Cancelled`.

**Response 201:** `ComplaintCommentDto`

---

### Upload Complaint Attachment
```
POST /api/complaint/upload-document
Auth: Required
Content-Type: multipart/form-data
```
Uploads a PDF or image (max 10 MB) and returns a permanent URL to use as `attachmentUrl` on create.

**Form field:** `file` — PDF, JPEG, PNG, GIF, or WebP.

**Response 200:**
```json
{ "url": "http://localhost:5000/uploads/complaintdocs/<uuid>.pdf" }
```

**Errors:**
- 400: No file provided / unsupported type / exceeds 10 MB

---

## 11. Admin Finance Dashboard

Admin-only, platform-wide finance views that aggregate data across every lease — not scoped to a single owner or tenant.

### Get All Payments (Admin only)
```
GET /api/admin/payments?from=&to=&pageNumber=&pageSize=
Auth: Admin
```
Every payment across all leases, newest first, enriched with lease/property/owner/tenant context. `from`/`to` (`DateTime`) optionally filter on `createdAt`. Paginated (see §13).

**Response 200:** `PagedResultDto<AdminPaymentDto>`

---

### Get All Charges (Admin only)
```
GET /api/admin/charges?from=&to=&pageNumber=&pageSize=
Auth: Admin
```
Every charge across all leases, newest first, enriched with lease/property/owner/tenant context. `from`/`to` optionally filter on `createdAt`. Paginated (see §13).

**Response 200:** `PagedResultDto<AdminChargeDto>`

---

### Get Finance Summary (Admin only)
```
GET /api/admin/finance-summary?from=&to=
Auth: Admin
```
Server-side aggregated figures across **all** payments matching the optional `from`/`to` filter — **not paginated** (it's a single object, not a list).

**Response 200:** `AdminFinanceSummaryDto`

---

## 12. Notifications

Real-time notifications pushed over SignalR and also readable via REST for the notification inbox/bell icon.

### Get My Notifications
```
GET /api/notification?pageNumber=&pageSize=
Auth: Required
```
Notifications addressed to the current user, newest first. Paginated (see §13).

**Response 200:** `PagedResultDto<NotificationResponseDto>`

---

### Mark Notification as Read
```
PUT /api/notification/{id}/read
Auth: Required (must be the recipient)
```
No request body.

**Response 204:** No content

---

### Real-Time Push (SignalR)
```
Hub: /hubs/notifications
Auth: JWT via Authorization header, jwt_token cookie, or ?access_token= query param (SignalR can't set custom headers on the WebSocket handshake)
Event: "ReceiveNotification" → NotificationResponseDto
```
On connect, the server joins the socket to a personal group keyed by the user's ID, so a `NotifyAsync` call (triggered by proposal/lease/complaint events elsewhere in the API) pushes to every open tab/device for that user. Reconnects and multiple tabs are handled automatically — no extra client-side group management needed.

**Typical flow:**
1. Frontend connects to `/hubs/notifications` right after login using the JWT.
2. Subscribe to `"ReceiveNotification"` — append incoming DTOs to the notification bell dropdown / toast list.
3. `GET /api/notification` on page load to backfill history (e.g. before the socket connected).
4. `PUT /api/notification/{id}/read` when the user opens/dismisses a notification.

---

## 13. Pagination

Every "list" endpoint in this API (any endpoint that previously returned a bare array) now returns a **paginated envelope** instead of a raw array, and accepts standard query-string pagination parameters. This is a single, DRY mechanism applied consistently across the whole API — if you've implemented it for one paginated endpoint, every other one works identically.

### Request query parameters
| Param        | Type | Default | Constraints                          |
|--------------|------|---------|---------------------------------------|
| `pageNumber` | int  | `1`     | Must be ≥ 1                           |
| `pageSize`   | int  | `20`    | Must be between `1` and `100`         |

Both are optional — omit them to get page 1 with 20 items. Values outside the constraints return **400** with a standard validation error body (see §18).

### Response envelope — `PagedResultDto<T>`
```typescript
{
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;   // total items matching the query, across all pages
  totalPages: number;   // ceil(totalCount / pageSize)
}
```
> **UI guidance:** Read the list from `.items`, not the response root. Use `totalCount`/`totalPages` to render a pager or "Showing X–Y of Z" label; don't infer total count from `items.length` (that's just the current page's size).

### Which endpoints are paginated
All of the following accept `?pageNumber=&pageSize=` and return `PagedResultDto<T>` — every one is cross-referenced above in its own section:

`GET /api/user`, `GET /api/userverification/pending`, `GET /api/property`, `GET /api/property/my`, `GET /api/property/pending-verification`, `GET /api/property/{id}/documents`, `GET /api/leaseproposal/my-requests`, `GET /api/leaseproposal/received-requests`, `GET /api/lease/pending-templates`, `GET /api/lease/pending-signed`, `GET /api/lease/my-leases`, `GET /api/lease/{id}/documents`, `GET /api/lease/{leaseId}/charges`, `GET /api/lease/{leaseId}/payments`, `GET /api/bankaccount`, `GET /api/complaint/my`, `GET /api/complaint/received`, `GET /api/complaint`, `GET /api/admin/payments`, `GET /api/admin/charges`, `GET /api/notification`.

**Not paginated** (single objects, or naturally bounded thread endpoints): `GET /api/property/{id}`, `GET /api/lease/{id}`, `GET /api/complaint/{id}` (full comment thread), `GET /api/admin/finance-summary` (aggregate).

---

## 14. Complete Endpoint Reference

`📄` marks paginated GET endpoints — see §13 for the shared `?pageNumber=&pageSize=` / `PagedResultDto<T>` contract.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/user/register` | None | Register new user |
| POST | `/api/user/login` | None | Login, set JWT cookie |
| GET | `/api/user/verify-email/{hash}` | None | Confirm email address |
| POST | `/api/user/resend-verification` | None | Resend verification email |
| GET 📄 | `/api/user` | Required | Get all users |
| GET | `/api/user/{id}` | None | Get user by ID |
| PUT | `/api/user/{id}` | None | Update user |
| DELETE | `/api/user/{id}` | None | Delete user |
| POST | `/api/user/become-owner` | Required | Add Owner role |
| POST | `/api/userverification/submit` | Required | Submit KYC documents |
| GET | `/api/userverification/status` | Required | Get my verification status |
| GET 📄 | `/api/userverification/pending` | Admin | List pending verifications |
| POST | `/api/userverification/{id}/verify` | Admin | Approve verification |
| POST | `/api/userverification/{id}/reject` | Admin | Reject verification |
| POST | `/api/userverification/upload-document` | Required | Upload verification PDF (multipart) |
| POST | `/api/property` | Owner | Create property |
| GET 📄 | `/api/property` | None | Get all properties |
| GET | `/api/property/{id}` | None | Get property by ID (int) |
| GET 📄 | `/api/property/my` | Owner | Get my properties |
| PUT | `/api/property/{id}` | Owner | Update property |
| DELETE | `/api/property/{id}` | Owner | Delete property |
| PUT | `/api/property/{id}/submit` | Owner | Submit property for verification |
| GET 📄 | `/api/property/pending-verification` | Admin | List properties pending verification |
| PUT | `/api/property/{id}/verify?approve=` | Admin | Approve/reject property |
| POST | `/api/property/upload-image` | Owner | Upload property image(s) (multipart) |
| POST | `/api/property/upload-document` | Owner | Upload property PDF (multipart) |
| POST | `/api/property/{id}/documents` | Owner | Add document to property |
| GET 📄 | `/api/property/{id}/documents` | Required | Get property documents |
| DELETE | `/api/property/{id}/documents/{documentId}` | Owner | Remove property document |
| POST | `/api/leaseproposal` | Required | Create lease proposal |
| POST | `/api/leaseproposal/{id}/submit` | Required | Submit draft proposal |
| PUT | `/api/leaseproposal/{id}` | Required | Update draft proposal |
| PUT | `/api/leaseproposal/{id}/accept` | Owner | Accept proposal |
| PUT | `/api/leaseproposal/{id}/reject` | Owner | Reject proposal |
| PUT | `/api/leaseproposal/{id}/cancel` | Tenant | Cancel proposal |
| GET 📄 | `/api/leaseproposal/my-requests` | Tenant | My outgoing proposals |
| GET 📄 | `/api/leaseproposal/received-requests` | Owner | Incoming proposals |
| POST | `/api/lease` | Owner | Create lease contract |
| PUT | `/api/lease/{id}` | Owner | Update draft lease |
| PUT | `/api/lease/{id}/submit` | Owner | Submit lease for review |
| GET 📄 | `/api/lease/pending-templates` | Admin | List templates pending verification |
| PUT | `/api/lease/{id}/verify-template?approve=` | Admin | Approve/reject template |
| PUT | `/api/lease/{id}/sign` | Tenant | Sign the lease |
| GET 📄 | `/api/lease/pending-signed` | Admin | List signed leases pending verification |
| PUT | `/api/lease/{id}/verify-signed?approve=` | Admin | Activate/reject signed lease |
| GET | `/api/lease/{id}` | Required | Get lease by ID (GUID) |
| GET 📄 | `/api/lease/my-leases` | Required | Get my leases |
| GET 📄 | `/api/lease/{id}/documents` | Required | Get lease documents |
| POST | `/api/lease/{id}/documents` | Tenant | Upload tenant lease document |
| POST | `/api/lease/{leaseId}/charges` | Owner | Apply charge to lease |
| GET 📄 | `/api/lease/{leaseId}/charges` | Required | Get all charges |
| GET | `/api/lease/{leaseId}/charges/{chargeId}` | Required | Get single charge |
| POST | `/api/lease/{leaseId}/payments` | Tenant | Record payment |
| GET 📄 | `/api/lease/{leaseId}/payments` | Required | Get all payments |
| POST | `/api/bankaccount` | Required | Create bank account |
| GET 📄 | `/api/bankaccount` | Required | Get my bank accounts |
| GET | `/api/bankaccount/{id}` | Required | Get account by ID (GUID) |
| PUT | `/api/bankaccount/{id}` | Required | Update bank account |
| DELETE | `/api/bankaccount/{id}` | Required | Delete bank account |
| POST | `/api/stripe/connect/onboard` | Owner | Start Stripe Connect onboarding |
| GET | `/api/stripe/connect/status` | Owner | Get Stripe account status |
| POST | `/api/stripe/lease/{leaseId}/payments/intent` | Tenant | Create Stripe PaymentIntent |
| POST | `/api/stripe/webhook` | None | Stripe webhook handler |
| POST | `/api/complaint` | Tenant | Create complaint |
| GET 📄 | `/api/complaint/my` | Required | My created complaints |
| GET 📄 | `/api/complaint/received` | Owner | Complaints on my properties |
| GET 📄 | `/api/complaint` | Admin | All complaints |
| GET | `/api/complaint/{id}` | Required | Get complaint with full thread |
| PUT | `/api/complaint/{id}/status` | Required | Transition complaint status |
| POST | `/api/complaint/{id}/comments` | Required | Add comment to thread |
| POST | `/api/complaint/upload-document` | Required | Upload complaint attachment (multipart) |
| GET 📄 | `/api/admin/payments` | Admin | Platform-wide payments |
| GET 📄 | `/api/admin/charges` | Admin | Platform-wide charges |
| GET | `/api/admin/finance-summary` | Admin | Aggregated finance figures |
| GET 📄 | `/api/notification` | Required | My notifications |
| PUT | `/api/notification/{id}/read` | Required | Mark notification as read |

---

## 15. All DTOs & Schemas

### UserResponseDto
```typescript
{
  id: string;           // UUID
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;  // "YYYY-MM-DD"
  createdAt: string;    // ISO datetime
  updatedAt: string | null;
  role: RoleResponseDto | null;        // primary role
  roles: RoleResponseDto[];            // all roles
  verificationStatusId: number | null; // 1=Unverified, 2=Pending, 3=Verified, 4=Rejected
  activeStatusId: number | null;       // 1=Active, 2=Inactive, 3=Suspended
  emailVerified: boolean;              // must be true to log in (see §2)
}
```

### RoleResponseDto
```typescript
{
  id: number;   // 1=Tenant, 2=Owner, 3=Admin
  name: string;
}
```

### PropertyResponseDto
```typescript
{
  id: number;
  ownerId: string;          // UUID
  title: string;
  description: string | null;
  addressLine: string;
  cityId: number | null;
  monthlyRent: number;
  upfrontPayment: number;
  securityDeposit: number;
  thumbnailImgUrl: string | null;
  verificationStatusId: number | null;  // 1=Draft, 2=Submitted, 3=Verified, 4=Rejected
  availabilityStatusId: number | null;  // 1=Available, 2=Occupied, 3=Unavailable
  createdAt: string | null;
  verifiedBy: string | null;    // UUID of admin
  remarks: string | null;       // admin verification remarks
  propertyImages: PropertyImageResponseDto[];
  documents: DocumentResponseDto[];     // property-level documents (deeds, etc.)
}
```

### PropertyImageResponseDto
```typescript
{
  id: string;         // UUID
  propertyId: number;
  imageUrl: string;
  description: string | null;
  displayOrder: number;
}
```

### LeaseProposalResponseDto
```typescript
{
  id: string;             // UUID
  tenantId: string | null;
  propertyId: number | null;
  startDate: string | null;    // "YYYY-MM-DD"
  endDate: string | null;
  monthlyRent: number | null;
  upfrontPayment: number | null;
  securityDeposit: number | null;
  statusId: number | null;    // 1=Draft, 2=Submitted, 3=Approved, 4=Rejected, 5=Expired, 6=Cancelled
  tenant: TenantDetailsDto | null;
  reviewedBy: string | null;   // UUID
  reviewedAt: string | null;
  createdAt: string | null;
}
```

### TenantDetailsDto
```typescript
{
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  occupation: string | null;
  monthlyIncome: number | null;
}
```

### LeaseResponseDto
```typescript
{
  id: string;             // UUID
  tenantId: string | null;
  propertyId: number | null;
  proposalId: string;     // UUID
  startDate: string | null;
  endDate: string | null;
  monthlyRent: number | null;
  upfrontPayment: number | null;
  securityDeposit: number | null;
  statusId: number | null;    // 1=Draft, 2=Submitted, 3=PendingSignature, 4=TenantSigned, 5=Active, 6=Rejected, 7=Terminated, 8=Expired
  statusName: string | null;
  agreementDocumentUrl: string | null;
  signedAgreementDocumentUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
```

### ChargeResponseDto
```typescript
{
  id: string;           // UUID
  chargeTypeId: number | null;
  chargeTypeName: string | null;
  amount: number | null;
  description: string | null;
  dueDate: string | null;   // ISO datetime
  statusId: number | null;  // 1=Pending, 2=PartiallyPaid, 3=Paid, 4=Overdue, 5=Cancelled
  statusName: string | null;
  amountPaid: number;       // computed
  balanceDue: number;       // computed
  createdAt: string | null;
  updatedAt: string | null;
}
```

### PaymentResponseDto
```typescript
{
  id: string;               // UUID
  amount: number | null;
  transactionRef: string | null;
  paymentMethodId: number | null;
  paymentMethodName: string | null;
  statusId: number | null;  // 1=Pending, 2=Completed, 3=Failed, 4=Refunded
  statusName: string | null;
  paidBy: string | null;    // UUID
  paidAt: string | null;
  currencyId: number | null;
  chargeAllocations: ChargeAllocationResponseDto[];
  createdAt: string | null;
}

// ChargeAllocationResponseDto
{
  chargeId: string;        // UUID
  amountApplied: number | null;
}
```

### BankAccountResponseDto
```typescript
{
  id: string;              // UUID
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  ifscCode: string;
  createdAt: string;
}
```

### UserVerificationResponseDto
```typescript
{
  id: string;            // UUID
  userId: string;        // UUID
  status: string;        // "Pending" | "Verified" | "Rejected" | "Unverified"
  remarks: string | null;
  verifiedBy: string | null;  // UUID of admin
  createdAt: string;
  updatedAt: string | null;
  documents: DocumentResponseDto[];
}
```

### DocumentResponseDto
```typescript
{
  id: string;                // UUID
  documentTypeId: number | null;
  documentNumber: string | null;
  documentUrl: string | null;
}
```

### AddPropertyDocumentDto
```typescript
{
  documentTypeId: number;   // 1–5
  documentNumber: string;   // 4–50 chars, alphanumeric + hyphens
  documentUrl: string;      // valid absolute URL
}
```

### UpdateLeaseProposalDto
All fields optional — only non-null fields are applied. Proposal must be Draft.
```typescript
{
  startDate?: string;        // "YYYY-MM-DD"
  endDate?: string;          // "YYYY-MM-DD"
  monthlyRent?: number;
  upfrontPayment?: number;
  securityDeposit?: number;
}
```

### StripeOnboardingResponseDto
```typescript
{
  onboardingUrl: string;
  stripeAccountId: string;
}
```

### StripeAccountStatusDto
```typescript
{
  stripeAccountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  isOnboarded: boolean;   // chargesEnabled && payoutsEnabled && detailsSubmitted
}
```

### CreatePaymentIntentResponseDto
```typescript
{
  paymentId: string;     // UUID
  clientSecret: string;  // Stripe client secret for Stripe.js
  publishableKey: string;
  amount: number;
  platformFee: number;
  currency: string;      // e.g. "inr"
}
```

### PagedResultDto\<T\>
The generic envelope wrapping every paginated list response (see §13).
```typescript
{
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
```

### ComplaintResponseDto
```typescript
{
  id: string;                  // UUID
  leaseId: string | null;      // UUID
  propertyId: number | null;
  propertyTitle: string | null;
  tenantId: string | null;     // UUID
  tenantName: string | null;
  ownerId: string | null;      // UUID
  categoryId: number | null;   // 1–8, see §10
  categoryName: string | null;
  priorityId: number | null;   // 1–4, see §10
  priorityName: string | null;
  statusId: number | null;     // 1–5, see §10
  statusName: string | null;
  subject: string | null;
  description: string | null;
  attachmentUrl: string | null;
  createdBy: string | null;    // UUID
  resolvedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  commentCount: number;
  comments: ComplaintCommentDto[];  // empty on list endpoints; populated on Get by ID
}
```

### ComplaintCommentDto
```typescript
{
  id: string;             // UUID
  complaintId: string;    // UUID
  authorId: string;       // UUID
  authorName: string | null;
  authorRole: string | null;  // "Admin" | "Owner" | "Tenant"
  message: string | null;
  createdAt: string | null;
}
```

### AdminPaymentDto
Extends `PaymentResponseDto` (see above) with platform-wide context:
```typescript
{
  // ...all PaymentResponseDto fields, plus:
  platformFee: number | null;   // Stripe fee; null for manual payments
  leaseId: string;              // UUID
  propertyId: number | null;
  ownerId: string | null;       // UUID
  ownerName: string | null;
  tenantId: string | null;      // UUID
  tenantEmail: string | null;
}
```

### AdminChargeDto
Extends `ChargeResponseDto` (see above) with platform-wide context:
```typescript
{
  // ...all ChargeResponseDto fields, plus:
  leaseId: string;              // UUID
  propertyId: number | null;
  propertyTitle: string | null;
  ownerId: string | null;       // UUID
  ownerName: string | null;
  tenantId: string | null;      // UUID
  tenantName: string | null;
  tenantEmail: string | null;
}
```

### AdminFinanceSummaryDto
```typescript
{
  companyRevenue: number;   // sum of platform fees on Completed payments
  grossVolume: number;      // sum of amounts on Completed payments
  pendingAmount: number;    // sum of amounts on Pending payments
  paymentCount: number;
  completedCount: number;
  failedCount: number;
  refundedCount: number;
}
```

### NotificationResponseDto
```typescript
{
  id: string;                  // UUID
  typeId: number;               // see NotificationType (server-internal event catalog)
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;  // UUID
  isRead: boolean;
  createdAt: string | null;
}
```

---

## 16. Validation Rules Cheat Sheet

| Field | Rules |
|-------|-------|
| Email | Required, valid email, no whitespace |
| Password (register) | Min 12 chars, uppercase, lowercase, digit, special char |
| First/Last Name | 2–100 chars, `^[a-zA-Z\s'\-]+$` |
| Phone | 7–15 digits, `^\+?[\d\s\-\(\)]{7,15}$` |
| Date of Birth | Past date, ≥ 1900, user must be ≥ 18 years old |
| Property Title | 3–150 chars, `^[a-zA-Z0-9\s\-,\.]+$` |
| Property Description | Optional, max 2000 chars |
| Address Line | 5–300 chars |
| Monthly Rent | ≥ 0; not both rent and upfront 0 simultaneously |
| Lease Start Date | Today or future |
| Lease End Date | > Start Date, ≥ 1 month after Start |
| Charge Amount | > 0 |
| Charge Due Date | Today or future |
| Bank Name | 2–100 chars, `^[a-zA-Z\s\-\.&]+$` |
| Account Number | Digits only, 9–18 digits |
| Account Holder Name | 2–100 chars, letters/spaces/hyphens/apostrophes |
| IFSC Code | Exactly 11 chars, `^[A-Z]{4}0[A-Z0-9]{6}$` |
| Transaction Ref | 4–100 chars, `^[a-zA-Z0-9\-_]+$` |
| Document Number | 4–50 chars, `^[a-zA-Z0-9\-]+$` |
| Document Type ID | 1–4 |
| Signed Agreement URL | Required (non-empty) when signing lease |
| Agreement Doc URL | Required when submitting a lease (statusId=2) |
| Verification Remarks | Optional, max 500 chars |
| Charge Description | Optional, max 500 chars |
| Property Document Type ID | 1–5 |
| Property Document Number | 4–50 chars, `^[a-zA-Z0-9\-]+$` |
| Property Document URL | Required, valid absolute URL |
| Upload Document | PDF only, max 10 MB, `multipart/form-data` field name `file` |
| Upload Image(s) | JPEG/PNG/GIF/WebP only, max 5 MB per file, `multipart/form-data` field name `files` (repeatable) |
| Page Number | ≥ 1 (default 1) — see §13 |
| Page Size | 1–100 (default 20) — see §13 |
| Complaint Subject | 5–150 chars |
| Complaint Description | 10–2000 chars |
| Complaint Category ID | 1–8 |
| Complaint Priority ID | 1–4 |
| Complaint Status ID (transition) | 1–5; must be a valid transition from current status (see §10) |
| Comment Message | 1–2000 chars |
| Resend Verification Email | Required, valid email format |

---

## 17. Status Enums & Lookup Values

### User Verification Status
| ID | Name       |
|----|------------|
| 1  | Unverified |
| 2  | Pending    |
| 3  | Verified   |
| 4  | Rejected   |

### User Active Status
| ID | Name      |
|----|-----------|
| 1  | Active    |
| 2  | Inactive  |
| 3  | Suspended |

### Property Verification Status
| ID | Name      |
|----|-----------|
| 1  | Draft     |
| 2  | Submitted |
| 3  | Verified  |
| 4  | Rejected  |

### Property Availability Status
| ID | Name        |
|----|-------------|
| 1  | Available   |
| 2  | Occupied    |
| 3  | Unavailable |

### Proposal Status
| ID | Name      |
|----|-----------|
| 1  | Draft     |
| 2  | Submitted |
| 3  | Approved  |
| 4  | Rejected  |
| 5  | Expired   |
| 6  | Cancelled |

### Lease Status
| ID | Name             |
|----|------------------|
| 1  | Draft            |
| 2  | Submitted        |
| 3  | PendingSignature |
| 4  | TenantSigned     |
| 5  | Active           |
| 6  | Rejected         |
| 7  | Terminated       |
| 8  | Expired          |

### Charge Type
| ID | Name             |
|----|------------------|
| 1  | Monthly Rent     |
| 2  | Security Deposit |
| 3  | Upfront Payment  |
| 4  | Maintenance      |
| 5  | Penalty          |
| 6  | Other            |

### Charge Status
| ID | Name           |
|----|----------------|
| 1  | Pending        |
| 2  | Partially Paid |
| 3  | Paid           |
| 4  | Overdue        |
| 5  | Cancelled      |

### Payment Status
| ID | Name      |
|----|-----------|
| 1  | Pending   |
| 2  | Completed |
| 3  | Failed    |
| 4  | Refunded  |

### Document Type
| ID | Name                  |
|----|-----------------------|
| 1  | Pan Card              |
| 2  | Property Deed         |
| 3  | Salary Slip           |
| 4  | Lease Agreement       |
| 5  | Signed Lease Agreement|

### Roles
| ID | Name   |
|----|--------|
| 1  | Tenant |
| 2  | Owner  |
| 3  | Admin  |

### Complaint Category
| ID | Name             |
|----|------------------|
| 1  | Maintenance      |
| 2  | Plumbing         |
| 3  | Electrical       |
| 4  | Appliance        |
| 5  | Noise/Neighbours |
| 6  | Security/Safety  |
| 7  | Billing/Payment  |
| 8  | Other            |

### Complaint Priority
| ID | Name   |
|----|--------|
| 1  | Low    |
| 2  | Medium |
| 3  | High   |
| 4  | Urgent |

### Complaint Status
| ID | Name       |
|----|------------|
| 1  | Open       |
| 2  | InProgress |
| 3  | Resolved   |
| 4  | Closed     |
| 5  | Cancelled  |

---

## 18. Error Response Format

The `GlobalExceptionHandler` maps exceptions to HTTP status codes consistently:

| Exception Type              | HTTP Status | Notes                              |
|-----------------------------|-------------|-------------------------------------|
| `InvalidOperationException` | 400         | Business rule violations            |
| `KeyNotFoundException`      | 404         | Entity not found                    |
| `UnauthorizedAccessException`| 403        | Forbidden (wrong role/ownership)    |
| `EmailNotVerifiedException` | 403         | Login blocked, unverified email — subclass of `UnauthorizedAccessException`, checked first (see §2) |
| `StripeException` (invalid) | 400         | Invalid Stripe request              |
| `StripeException` (other)   | 502         | Stripe downstream error             |

**Machine-readable error codes:** Some 4xx responses include an `errorCode` extension on the standard ProblemDetails body so the frontend can branch without string-matching `detail`. Currently only `EMAIL_NOT_VERIFIED` (see §2) uses this — check `error.errorCode` before falling back to `error.detail` for display.

**Validation errors (400):**
Returned before the controller executes via `ValidationFilter`. Format:
```json
{
  "errors": {
    "Email": ["Email address is required.", "A valid email address is required."],
    "Password": ["Password must contain at least one uppercase letter."]
  }
}
```

**Standard error response:**
```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "Bad Request",
  "status": 400,
  "detail": "User with this email already exists."
}
```

---

## 19. Page-by-Page Design Guide

This section maps pages a frontend app would need to the API calls that power them.

---

### Public Pages (no auth)

#### Property Listing Page
- `GET /api/property` — fetch all properties
- Show: thumbnail, title, address, monthly rent, availability badge, verification badge
- Filter by: city, rent range, availability status
- Cards link to Property Detail page

#### Property Detail Page
- `GET /api/property/{id}` — fetch property
- Show: image gallery, full description, address, all financial details, availability status
- CTA: "Request to Rent" → leads to Proposal form (requires login)

---

### Auth Pages

#### Register Page
- `POST /api/user/register`
- Fields: email, password, confirm password, first name, last name, phone, date of birth, role (Tenant/Owner)
- Show inline validation per field
- On success: redirect to login or dashboard

#### Login Page
- `POST /api/user/login`
- Fields: email, password
- On success: store user in context, redirect to role-appropriate dashboard

---

### Tenant Dashboard Pages

#### My Profile / Verification Status
- `GET /api/userverification/status` — show current status
- If Unverified/Rejected: show "Submit Documents" CTA
- Status badge: Unverified (grey) | Pending (yellow) | Verified (green) | Rejected (red)

#### Submit KYC Documents
- `POST /api/userverification/submit`
- Dynamic list — tenant adds multiple documents
- For each document:
  1. Select document type (Pan Card / Salary Slip etc.)
  2. Enter document number
  3. Upload PDF → `POST /api/userverification/upload-document` (multipart, field: `file`) → get `url`
  4. Use returned `url` as `documentUrl`
- Show existing rejected remarks if re-submitting

#### Browse Properties (same as public listing)
- When logged in: show "Request to Rent" button on available, verified properties

#### Lease Proposals — My Requests
- `GET /api/leaseproposal/my-requests`
- Show each proposal with: property name, dates, rent, status badge, created date
- Status badges: Draft | Submitted | Approved | Rejected | Cancelled | Expired
- Actions:
  - Draft: "Edit" → `PUT /api/leaseproposal/{id}` (update terms) + "Submit" → `POST /api/leaseproposal/{id}/submit`
  - Draft/Submitted: "Cancel" → `PUT /api/leaseproposal/{id}/cancel`

#### Create Lease Proposal
- `POST /api/leaseproposal`
- Pre-fill property ID from property detail page
- Fields (all optional except propertyId): start date, end date, proposed monthly rent, upfront, security deposit

#### My Leases
- `GET /api/lease/my-leases`
- Show lease status: Draft | PendingSignature | TenantSigned | Active | Rejected | Terminated | Expired
- For leases in `PendingSignature`: show "Sign Lease" CTA

#### Sign Lease Page
- `GET /api/lease/{id}` — view agreement document URL
- Tenant uploads signed copy
- `PUT /api/lease/{id}/sign` with `signedAgreementDocumentUrl`

#### Lease Detail (Active)
- `GET /api/lease/{id}` — lease details
- `GET /api/lease/{leaseId}/charges` — list all charges with balance due
- `GET /api/lease/{leaseId}/payments` — payment history
- CTA: "Make Payment" → Record Payment or Pay via Stripe

#### Make Payment Page
- `GET /api/lease/{leaseId}/charges` — show pending/overdue charges
- Select charges and amounts to pay
- Select payment method
- If Stripe: `POST /api/stripe/lease/{leaseId}/payments/intent` → use `clientSecret` with Stripe.js
- If manual: `POST /api/lease/{leaseId}/payments` with transaction ref

#### Bank Accounts
- `GET /api/bankaccount` — list
- `POST /api/bankaccount` — add new
- `PUT /api/bankaccount/{id}` — edit
- `DELETE /api/bankaccount/{id}` — delete

---

### Owner Dashboard Pages

#### My Properties
- `GET /api/property/my`
- Show verification status, availability status, document count
- Draft / Rejected: "Submit for Verification" → `PUT /api/property/{id}/submit`
  - **Disable this button** (and show a tooltip/inline hint) if `documents` on the property contains no entry with `documentTypeId === 2` (Property Deed). Direct the owner to "Manage Documents" first.
- CTA: "Add New Property", "Edit", "Delete", "Manage Documents"

#### Create/Edit Property Page
- `POST /api/property` / `PUT /api/property/{id}`
- **Image upload flow:**
  1. Owner picks one or more images (JPEG/PNG/GIF/WebP, max 5 MB each)
  2. POST to `POST /api/property/upload-image` (multipart, field: `files`) → receive `{ urls: [...] }`
  3. For each URL, set `imageUrl`, an optional `description`, and a `displayOrder` integer
  4. Include the full `propertyImages[]` array in the Create/Update body
- Image gallery manager (add/reorder/remove images by `displayOrder`; existing images include an `id` field in the update request)
- City selector (fetched via separate lookup if available)

#### Property Documents Page (Owner)
- `GET /api/property/{id}/documents` — list existing documents
- "Upload & Add Document":
  1. Upload PDF → `POST /api/property/upload-document` (multipart, field: `file`) → get `url`
  2. Save record → `POST /api/property/{id}/documents` with `documentTypeId`, `documentNumber`, `documentUrl`
- `DELETE /api/property/{id}/documents/{documentId}` — remove a document

#### Property Verification Queue (Admin)
- `GET /api/property/pending-verification` — list all Submitted properties
- View property details and attached documents
- "Approve" / "Reject" with optional remarks → `PUT /api/property/{id}/verify?approve=true/false`

#### Received Lease Proposals
- `GET /api/leaseproposal/received-requests`
- Group by property
- Show tenant info (name, email, phone, occupation, income)
- Per proposal: "Accept" / "Reject" actions
- On Accept: show "Create Lease" CTA

#### Create Lease
- `POST /api/lease`
- Pre-fill from approved proposal
- Fields: tenant ID (pre-filled), property ID, proposal ID, start/end date, rent terms
- Optional: upload agreement document URL
- Submit immediately or save as draft

#### Lease Management
- `GET /api/lease/my-leases`
- Filter by status
- Active leases: "Apply Charge" CTA

#### Apply Charge Page
- `POST /api/lease/{leaseId}/charges`
- Fields: charge type (dropdown from enum), amount, due date, optional description
- List existing charges with status

#### Stripe Onboarding
- `GET /api/stripe/connect/status` — show current status
- If not onboarded: "Set Up Stripe Payouts" CTA
- `POST /api/stripe/connect/onboard` — get URL, redirect owner to Stripe

---

### Admin Dashboard Pages

#### Pending User Verifications
- `GET /api/userverification/pending`
- List with user name, submission date, document count
- Click to expand: view documents (Pan Card, Salary Slip etc.)
- Actions: "Approve" / "Reject" with optional remarks

#### Lease Template Verification Queue
- `GET /api/lease/pending-templates` — lists all Submitted (`statusId: 2`) templates awaiting verification
- View agreement document URL
- `PUT /api/lease/{id}/verify-template?approve=true/false`

#### Signed Lease Activation Queue
- `GET /api/lease/pending-signed` — lists all TenantSigned (`statusId: 4`) leases awaiting verification
- View both agreement and signed agreement URLs
- `PUT /api/lease/{id}/verify-signed?approve=true/false`

#### All Complaints (Admin)
- `GET /api/complaint` — every complaint in the system, paginated
- Filter/sort client-side by status, category, priority
- Click through to complaint detail (same view as owner/tenant, with full comment thread)

#### Finance Dashboard (Admin)
- `GET /api/admin/finance-summary?from=&to=` — headline stat tiles (company revenue, gross volume, pending amount, payment counts)
- `GET /api/admin/payments?from=&to=` (paginated) — full payment ledger table with lease/property/owner/tenant columns
- `GET /api/admin/charges?from=&to=` (paginated) — full charge ledger table
- Date range picker drives `from`/`to` on all three calls

---

### Complaints Pages (Tenant/Owner)

#### My Complaints (Tenant)
- `GET /api/complaint/my` (paginated)
- "Raise Complaint" CTA → `POST /api/complaint` against an Active lease
- Status badge: Open | InProgress | Resolved | Closed | Cancelled

#### Received Complaints (Owner)
- `GET /api/complaint/received` (paginated)
- Actions per status (see §10 state machine): "Start Work" (→ InProgress), "Mark Resolved", "Cancel" — via `PUT /api/complaint/{id}/status`

#### Complaint Detail (shared by tenant/owner/admin)
- `GET /api/complaint/{id}` — full thread
- `POST /api/complaint/{id}/comments` — reply box, disabled if status is Closed/Cancelled
- Attachment upload via `POST /api/complaint/upload-document` before create

---

### Notifications

- Connect to SignalR hub `/hubs/notifications` on login (see §12); render toasts/badge count from `"ReceiveNotification"` pushes in real time
- `GET /api/notification` (paginated) to backfill the notification bell dropdown on page load
- `PUT /api/notification/{id}/read` when a notification is opened/dismissed

---

### Shared Components Needed

| Component | Data Source | Notes |
|-----------|-------------|-------|
| Status Badge | Various statusId enums | Color-coded by status type |
| Document Upload | External CDN (not API) | API only stores URLs |
| Image Gallery | `propertyImages[]` | Ordered by `displayOrder` |
| Charge Summary Card | `ChargeResponseDto` | Show amount, amountPaid, balanceDue |
| Payment History List | `PaymentResponseDto[]` | With charge allocations |
| Tenant Info Card | `TenantDetailsDto` | In proposal received view |
| Verification Status Banner | `verificationStatusId` on user | Prompt if Unverified |
| Stripe.js Integration | `clientSecret` from intent API | For online payments |
| Pagination Control | `pageNumber`/`totalPages` from any `PagedResultDto<T>` | Reusable across every list page (see §13) |
| Complaint Comment Thread | `ComplaintResponseDto.comments[]` | Author name + role badge per comment |
| Notification Bell | `NotificationResponseDto` via REST + SignalR | Unread count from `isRead === false` |

---

### Critical Business Rules to Enforce in UI

1. **Cannot create property** unless user `verificationStatusId === 3` (Verified)
2. **Cannot submit lease proposal** unless user is Verified
3. **Cannot accept proposal** unless you own the property (`ownerId === currentUserId`)
4. **Cannot create lease** without an Approved proposal (`proposalStatusId === 3`)
5. **Cannot apply charge** unless lease is Active (`statusId === 5`)
6. **Cannot record payment** unless you are the tenant of that lease
7. **Cannot sign lease** unless lease is PendingSignature (`statusId === 3`)
8. **Stripe payment** requires owner to have completed Stripe onboarding (`isOnboarded === true`)
9. **Property must be Verified** (`verificationStatusId === 3`) and Available (`availabilityStatusId === 1`) for proposals to make sense
10. **At least one document** required when submitting for user verification
11. **Cannot submit property for verification** unless at least one non-deleted document with `documentTypeId === 2` (Property Deed) is attached — gate the "Submit" button on `GET /api/property/{id}/documents` containing a deed
12. **Cannot log in** unless `emailVerified === true` — surface the `EMAIL_NOT_VERIFIED` errorCode with a resend link (see §2)
13. **Cannot raise a complaint** unless the referenced lease is Active
14. **Cannot comment on or transition** a Closed or Cancelled complaint
15. **All list views must read `.items`** from the `PagedResultDto<T>` envelope and drive pagers off `totalCount`/`totalPages`, not `items.length` (see §13)

---

*Last updated: 2026-07-09*
