# Auth API Guide

This is the simplified auth contract for the app. Auth now uses a normal JWT flow only.

## Base URL

Call auth through the API gateway:

```text
http://localhost:8080
```

Auth prefix:

```text
/auth
```

## Roles

The backend can return these roles:

- `USER`
- `DIRECTOR`
- `BRANCH_ADMIN`
- `OPERATOR`
- `RIDER`

Public signup creates only `USER`.

## Response Format

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "message": "Some message",
    "details": null
  }
}
```

All frontend-facing auth and gateway errors use this same object shape. Frontend can always read `error.message`.

## Token Model

There is only one auth token now:

```json
{
  "token": "jwt-token"
}
```

Rules:

1. Send it as `Authorization: Bearer <token>`.
2. There is no refresh token flow.
3. There is no token rotation flow.
4. If the token expires, the user logs in again.

## User Object

```json
{
  "id": "auth-user-id",
  "name": "Raman Kumar",
  "email": "raman@example.com",
  "role": "USER",
  "isVerified": false,
  "isActive": true,
  "createdAt": "2026-05-05T12:00:00.000Z",
  "updatedAt": "2026-05-05T12:00:00.000Z"
}
```

## Auth Response Object

Register and login return:

```json
{
  "token": "jwt-token",
  "user": {
    "id": "auth-user-id",
    "name": "Raman Kumar",
    "email": "raman@example.com",
    "role": "USER",
    "isVerified": false,
    "isActive": true,
    "createdAt": "2026-05-05T12:00:00.000Z",
    "updatedAt": "2026-05-05T12:00:00.000Z"
  }
}
```

## Endpoint 1: Register

`POST /auth/register`

Auth: none.

Request:

```json
{
  "name": "Raman Kumar",
  "email": "raman@example.com",
  "password": "password123"
}
```

Validation:

- `name` must be at least 2 characters after trimming.
- `email` must be valid.
- `password` must be at least 8 characters.

Success `201`:

```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "user": {
      "id": "auth-user-id",
      "name": "Raman Kumar",
      "email": "raman@example.com",
      "role": "USER",
      "isVerified": false,
      "isActive": true,
      "createdAt": "2026-05-05T12:00:00.000Z",
      "updatedAt": "2026-05-05T12:00:00.000Z"
    }
  }
}
```

Common errors:

- `400` invalid input
- `409` email already exists
- `502` profile creation failed in downstream user service
- `504` user-service timeout during profile creation

Frontend behavior:

1. Save `token`.
2. Save `user`.
3. Route by role.

## Endpoint 2: Login

`POST /auth/login`

Auth: none.

Request:

```json
{
  "email": "raman@example.com",
  "password": "password123"
}
```

Success `200`:

```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "user": {
      "id": "auth-user-id",
      "name": "Raman Kumar",
      "email": "raman@example.com",
      "role": "USER",
      "isVerified": false,
      "isActive": true,
      "createdAt": "2026-05-05T12:00:00.000Z",
      "updatedAt": "2026-05-05T12:00:00.000Z"
    }
  }
}
```

Common errors:

- `400` invalid email format
- `401` invalid email or password
- `403` account deactivated

## Endpoint 3: Google Login

`POST /auth/google`

Auth: none.

Use this when the client already has a Google ID token from Google Sign-In.

Request body:

```json
{
  "idToken": "google-id-token"
}
```

Response `200`:

```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "user": {
      "id": "auth-user-id",
      "name": "Jane User",
      "email": "jane@example.com",
      "role": "USER",
      "isVerified": true,
      "isActive": true,
      "createdAt": "2026-05-06T10:00:00.000Z",
      "updatedAt": "2026-05-06T10:00:00.000Z"
    }
  }
}
```

Notes:

- If the email already exists, the auth service links that account to the Google identity.
- New Google sign-ins create only `USER` accounts.
- The backend validates the Google token using `GOOGLE_CLIENT_ID`.

Frontend behavior:

1. Save `token`.
2. Save `user`.
3. Route by `user.role`.

## Endpoint 3: Logout

`POST /auth/logout`

Auth: none.

This endpoint is only a convenience response for the app. JWT logout is client-side, so the app should simply clear local auth state.

Success `200`:

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully."
  }
}
```

Frontend behavior:

1. Delete stored `token`.
2. Delete stored `user`.
3. Redirect to login or landing screen.

## Endpoint 4: Current User

`GET /auth/me`

Auth: bearer token required.

Headers:

```http
Authorization: Bearer <token>
```

Success `200`:

```json
{
  "success": true,
  "data": {
    "id": "auth-user-id",
    "name": "Raman Kumar",
    "email": "raman@example.com",
    "role": "USER",
    "isVerified": false,
    "isActive": true,
    "createdAt": "2026-05-05T12:00:00.000Z",
    "updatedAt": "2026-05-05T12:00:00.000Z"
  }
}
```

Common errors:

- `401` missing bearer token
- `401` invalid or expired token
- `404` user not found

## Recommended App Flow

### Signup

1. Call `POST /auth/register`.
2. Save `token`.
3. Save `user`.
4. Route to the correct screen.

### Login

1. Call `POST /auth/login`.
2. Save `token`.
3. Save `user`.
4. Route to the correct screen.

### App Startup

1. Read stored `token`.
2. If there is no token, show login/signup.
3. If there is a token, call `GET /auth/me`.
4. If `/auth/me` returns `200`, continue boot.
5. If `/auth/me` returns `401`, clear local auth and show login.

### Logout

1. Optionally call `POST /auth/logout`.
2. Clear local auth state no matter what.
3. Redirect to login.

## Storage Guidance

Recommended local auth state:

```json
{
  "token": "jwt-token",
  "user": {
    "id": "auth-user-id",
    "name": "Raman Kumar",
    "email": "raman@example.com",
    "role": "USER",
    "isVerified": false,
    "isActive": true
  }
}
```

Recommended rules:

1. Store the JWT securely.
2. Send it on every protected request.
3. Clear it on logout.
4. Clear it if protected requests start returning `401`.

## Role Routing

Suggested routing:

- `USER` -> customer app
- `DIRECTOR` -> admin dashboard
- `BRANCH_ADMIN` -> branch admin dashboard
- `OPERATOR` -> operator app
- `RIDER` -> rider app

If your client supports only one role type, reject the others after login.

## Curl Examples

### Register

```bash
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Raman Kumar\",\"email\":\"raman@example.com\",\"password\":\"password123\"}"
```

### Login

```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"raman@example.com\",\"password\":\"password123\"}"
```

### Me

```bash
curl http://localhost:8080/auth/me \
  -H "Authorization: Bearer <token>"
```

### Logout

```bash
curl -X POST http://localhost:8080/auth/logout
```

## Frontend Summary

Minimum contract:

1. Signup returns `token` and `user`.
2. Login returns `token` and `user`.
3. Use `Authorization: Bearer <token>` for protected APIs.
4. No refresh token logic exists anymore.
5. On token expiry, force login again.
