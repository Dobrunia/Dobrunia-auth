# OAuth SSO Feature Plan

This file is the corrected feature list aligned with the latest project rules.

## What was corrected

Compared to the previous draft, this version now matches the agreed constraints:

- **MySQL only**
- **No Redis**
- **Frontend is Vue 3**
- **Frontend UI must use `DobruniaUI-vue`**
- **All shared non-env constants must live in `src/constants`**
- **All reusable types must live in `src/types`**
- **All tests must live in `src/tests`** on both frontend and backend
- **All test names must start with `should`**
- feature order remains **strictly dependency-safe**

---

## Global rules for all features

### Backend structure
- `src/modules/auth`
- `src/modules/users`
- `src/modules/oauth`
- `src/modules/sessions`
- `src/modules/tokens`
- `src/modules/email`
- `src/modules/clients`
- `src/modules/audit`
- `src/constants`
- `src/types`
- `src/tests`

### Frontend structure
- `src/features/auth`
- `src/features/account`
- `src/features/oauth`
- `src/features/admin`
- `src/shared/api`
- `src/shared/lib`
- `src/constants`
- `src/types`
- `src/tests`

### Frontend UI rules
- frontend must use **Vue 3**
- frontend UI must use **DobruniaUI-vue**
- shared styles import should be done once:
  - `import "dobruniaui-vue/styles.css";`
- prefer named imports from `dobruniaui-vue`
- reuse library primitives instead of creating custom UI from scratch

### Constants rules
All project constants that are not env variables must be moved to `src/constants`.

Examples:
- token TTL values
- cookie names
- route names
- supported scopes
- password policy values
- validation limits
- error codes

### Types rules
All reusable project types must be placed in `src/types`.

Examples:
- auth DTO types
- API response contracts
- session types
- OAuth client types
- token payload types

### Test rules
All tests must live inside `src/tests`.

Examples:
- backend: `src/tests/modules/auth/login.service.test.ts`
- frontend: `src/tests/features/auth/login-form.test.ts`

All test names must start with `should`.

---

## Feature 1. Service scaffold and health endpoint

### Purpose
Create the minimal backend foundation so all next features can be implemented on top of a stable base.

### Requires
Nothing. This is the starting feature.

### Implement

#### Backend
- create auth backend project
- connect MySQL
- set up migrations
- create base module structure
- add env configuration:
  - `DATABASE_URL`
  - `JWT_ACCESS_SECRET` or signing key config
  - `JWT_REFRESH_SECRET` or refresh signing config
  - `APP_URL`
  - `AUTH_ISSUER`
  - `FRONTEND_URL`
- implement `GET /health`

#### Frontend
- no required UI yet

#### Constants
Create initial constants files in `src/constants` for:
- app names
- default routes
- health-related static values if needed

#### Types
Create basic shared response types in `src/types` if needed.

### Notes
This feature must leave the project with:
- a working app startup
- a working MySQL connection
- a working migration system
- a working health endpoint

### Tests

#### Backend
- `should return ok from health endpoint`
- `should fail to start when required env variables are missing`

#### Frontend
- not required

---

## Feature 2. Base MySQL schema: users, sessions, refresh_tokens, oauth_clients

### Purpose
Define the core persistent entities used by almost every next feature.

### Requires
- feature 1
- MySQL connection
- migration setup

### Implement

#### Database
Create tables:

##### `users`
- `id`
- `email` unique
- `email_verified`
- `password_hash`
- `name` nullable
- `avatar` nullable
- `status`
- `created_at`
- `updated_at`

##### `sessions`
- `id`
- `user_id`
- `user_agent` nullable
- `ip` nullable
- `created_at`
- `last_seen_at`
- `revoked_at` nullable

##### `refresh_tokens`
- `id`
- `user_id`
- `session_id`
- `token_hash`
- `expires_at`
- `revoked_at` nullable
- `created_at`

##### `oauth_clients`
- `id`
- `client_id` unique
- `client_secret_hash` nullable
- `name`
- `redirect_uris`
- `allowed_scopes`
- `grant_types`
- `is_active`
- `created_at`

#### Backend
- create repositories/models for these tables

#### Constants
Add constants in `src/constants` for:
- default user status
- token TTL values
- default client grant types
- default scopes if needed

#### Types
Add shared types in `src/types` for:
- user entity shape
- session entity shape
- refresh token entity shape
- oauth client entity shape

### Notes
All later auth and OAuth flows depend on these tables.
Any schema change must go through migrations only.

### Tests

#### Backend
- `should create users table with required fields`
- `should create sessions table with required relations`
- `should create refresh_tokens table with required relations`
- `should create oauth_clients table with required fields`

#### Frontend
- not required

---

## Feature 3. User registration

### Purpose
Allow creation of a single shared account for all future services.

### Requires
- `users` table
- DB repositories/models
- hashing utility setup
- feature 2 completed

### Implement

#### Backend
- implement `POST /auth/register`
- validate email
- validate password strength
- reject duplicate email
- hash password
- create user with `email_verified = false`

#### Frontend
- create register page in `src/features/auth`
- use `DobruniaUI-vue` inputs and buttons
- submit email and password
- render API and form validation errors

#### Constants
Move to `src/constants`:
- password policy values
- auth route paths
- register form field limits

#### Types
Move to `src/types`:
- register request type
- register response type
- validation error type

### Notes
At this stage email verification is not implemented yet, but `email_verified` must already exist and default correctly.

### Tests

#### Backend
- `should register a new user with valid email and password`
- `should reject registration when email is already taken`
- `should reject registration when email is invalid`
- `should reject registration when password is too weak`
- `should store hashed password instead of plain password`

#### Frontend
- `should submit registration form with valid values`
- `should show validation errors for invalid form fields`
- `should show api error when registration fails`

---

## Feature 4. User login

### Purpose
Allow users to sign in and create a real session.

### Requires
- `users`
- `sessions`
- `refresh_tokens`
- registration flow
- password hashing utility

### Implement

#### Backend
- implement `POST /auth/login`
- verify email + password
- validate user status
- create session row
- issue access token
- issue refresh token
- store hashed refresh token in MySQL

#### Frontend
- create login page in `src/features/auth`
- use `DobruniaUI-vue`
- store auth state
- handle login errors

#### Constants
Move to `src/constants`:
- login route
- cookie/storage keys
- auth error codes

#### Types
Move to `src/types`:
- login request type
- login response type
- auth state type

### Notes
This is the first feature that creates real user sessions.
Later logout and session management rely on `session_id` and `refresh_tokens`.

### Tests

#### Backend
- `should login user with valid credentials`
- `should reject login with invalid password`
- `should reject login when user does not exist`
- `should create session on successful login`
- `should create refresh token record on successful login`
- `should return access token and refresh token on successful login`

#### Frontend
- `should submit login form with valid credentials`
- `should show error when login fails`
- `should store auth state after successful login`

---

## Feature 5. Access token generation and validation

### Purpose
Standardize the access token format used by all current and future projects.

### Requires
- login flow
- session creation
- signing secret or signing keys

### Implement

#### Backend
- create token service in `src/modules/tokens`
- generate JWT access token
- include claims:
  - `sub`
  - `iss`
  - `aud`
  - `exp`
  - `iat`
  - `scope`
  - `client_id` when applicable
- implement auth guard / middleware for access token validation
- implement current user extraction helper

#### Frontend
- no major UI feature required yet
- prepare API client to send access token later

#### Constants
Move to `src/constants`:
- access token TTL
- auth header names
- claim-related constants if reused

#### Types
Move to `src/types`:
- access token payload type
- authenticated request context type

### Notes
All protected endpoints added later must reuse the same token validation mechanism.

### Tests

#### Backend
- `should generate access token with required claims`
- `should validate access token with valid signature`
- `should reject access token with invalid signature`
- `should reject expired access token`

#### Frontend
- not required

---

## Feature 6. Refresh token flow

### Purpose
Allow clients to obtain a new access token without forcing the user to log in again.

### Requires
- login flow
- `refresh_tokens`
- token service

### Implement

#### Backend
- implement `POST /auth/refresh`
- find refresh token by hash
- reject revoked token
- reject expired token
- issue new access token
- implement refresh token rotation
- revoke old refresh token
- save new refresh token record

#### Frontend
- add refresh logic to auth client
- on 401, try refresh once
- redirect to login if refresh fails

#### Constants
Move to `src/constants`:
- refresh token TTL
- refresh endpoint path
- retry limits

#### Types
Move to `src/types`:
- refresh request type
- refresh response type

### Notes
This feature must be rotation-based.
Do not use Redis. Refresh state is stored in MySQL.

### Tests

#### Backend
- `should issue new access token for valid refresh token`
- `should rotate refresh token on refresh request`
- `should revoke previous refresh token after rotation`
- `should reject expired refresh token`
- `should reject revoked refresh token`
- `should reject refresh token that is not found`

#### Frontend
- `should request token refresh when access token expires`
- `should update auth state after successful refresh`
- `should redirect to login when refresh fails`

---

## Feature 7. Current user endpoint `/me`

### Purpose
Provide a stable authenticated endpoint for the current user profile.

### Requires
- access token guard
- `users`
- login flow

### Implement

#### Backend
- implement `GET /me`
- return:
  - `id`
  - `email`
  - `email_verified`
  - `name`
  - `avatar`
  - `status`
  - `created_at`

#### Frontend
- load current user after app bootstrap
- render current user block in account/authenticated views

#### Types
Move to `src/types`:
- current user response type

### Notes
Later UI flows should prefer `/me` instead of manually decoding token payload.

### Tests

#### Backend
- `should return current user for valid access token`
- `should reject me request without access token`
- `should reject me request with invalid access token`

#### Frontend
- `should load current user on authenticated app start`
- `should show current user data after successful request`

---

## Feature 8. Logout current session

### Purpose
Allow the user to end the current session safely.

### Requires
- sessions
- refresh tokens
- auth guard
- current session identification

### Implement

#### Backend
- implement `POST /auth/logout`
- identify current session
- revoke current session
- revoke refresh tokens for current session

#### Frontend
- add logout action
- clear local auth state
- redirect after logout

#### Types
Move to `src/types`:
- logout response type

### Notes
This endpoint must affect only the current session.

### Tests

#### Backend
- `should logout current session`
- `should revoke refresh tokens for current session on logout`
- `should reject logout for unauthenticated user`

#### Frontend
- `should clear auth state on logout`
- `should redirect user after logout`

---

## Feature 9. Logout all sessions

### Purpose
Allow the user to revoke access from all devices.

### Requires
- sessions
- refresh tokens
- `/me`
- logout current session logic

### Implement

#### Backend
- implement `POST /auth/logout-all`
- revoke all user sessions
- revoke all user refresh tokens

#### Frontend
- add action in account/security settings

### Notes
Must only affect the current authenticated user.

### Tests

#### Backend
- `should revoke all sessions for current user`
- `should revoke all refresh tokens for current user`
- `should not revoke sessions of another user`

#### Frontend
- `should trigger logout from all devices action`
- `should redirect to login after logout from all devices`

---

## Feature 10. Session list

### Purpose
Allow the user to inspect active and past sessions.

### Requires
- sessions
- auth guard
- `/me`

### Implement

#### Backend
- implement `GET /me/sessions`
- return:
  - `id`
  - `user_agent`
  - `ip`
  - `created_at`
  - `last_seen_at`
  - `is_current`
  - `revoked_at`

#### Frontend
- add account/security page
- render sessions list

#### Types
Move to `src/types`:
- session item response type

### Notes
Keep current session identification explicit.

### Tests

#### Backend
- `should return sessions for current user only`
- `should mark current session in sessions response`
- `should reject sessions request without authentication`

#### Frontend
- `should render current user sessions list`
- `should show current session marker`

---

## Feature 11. Revoke one session

### Purpose
Allow the user to sign out a single device or browser session.

### Requires
- session list
- logout logic
- auth guard

### Implement

#### Backend
- implement `DELETE /me/sessions/:id`
- ensure ownership
- revoke selected session
- revoke related refresh tokens

#### Frontend
- add “sign out this device” action in sessions list

### Notes
Do not allow cross-user session revocation.

### Tests

#### Backend
- `should revoke selected session for current user`
- `should revoke refresh tokens for selected session`
- `should reject deleting session that belongs to another user`

#### Frontend
- `should remove selected session from the list after revoke`
- `should show error when session revoke fails`

---

## Feature 12. Email verification

### Purpose
Support verified email ownership for account security and future flows.

### Requires
- users
- registration
- email module or stub
- base app URL configuration

### Implement

#### Database
Create `email_verification_tokens`:
- `id`
- `user_id`
- `token_hash`
- `expires_at`
- `used_at`
- `created_at`

#### Backend
- implement `POST /auth/send-verification-email`
- implement `POST /auth/verify-email`
- generate one-time token
- send verification link
- mark user email as verified after successful confirmation

#### Frontend
- create verify email page
- add resend verification action

#### Constants
Move to `src/constants`:
- email token TTL
- email verification routes

#### Types
Move to `src/types`:
- verify email request/response types

### Notes
After this feature, future flows may start enforcing `email_verified` where needed.

### Tests

#### Backend
- `should create email verification token for user`
- `should verify email with valid token`
- `should reject invalid email verification token`
- `should reject expired email verification token`
- `should mark email as verified after successful verification`

#### Frontend
- `should show email verification success state`
- `should show error for invalid verification token`
- `should resend verification email`

---

## Feature 13. Password reset

### Purpose
Provide the required recovery flow for lost passwords.

### Requires
- users
- email sending
- token table pattern from email verification

### Implement

#### Database
Create `password_reset_tokens`:
- `id`
- `user_id`
- `token_hash`
- `expires_at`
- `used_at`
- `created_at`

#### Backend
- implement `POST /auth/forgot-password`
- implement `POST /auth/reset-password`
- send reset link
- replace password hash
- revoke existing sessions and refresh tokens after successful reset

#### Frontend
- create forgot password page
- create reset password page

#### Constants
Move to `src/constants`:
- password reset TTL
- password reset routes

#### Types
Move to `src/types`:
- forgot password request/response types
- reset password request/response types

### Notes
The forgot-password response must not reveal whether the user exists.

### Tests

#### Backend
- `should create password reset token for existing user`
- `should not reveal whether user exists in forgot password flow`
- `should reset password with valid token`
- `should reject invalid password reset token`
- `should reject expired password reset token`
- `should revoke existing sessions after password reset`

#### Frontend
- `should submit forgot password form`
- `should submit reset password form with valid token`
- `should show success state after password reset`

---

## Feature 14. OAuth clients admin API

### Purpose
Allow creation and management of OAuth clients used by internal and future apps.

### Requires
- `oauth_clients`
- base auth system
- simple admin protection

### Implement

#### Backend
- implement:
  - `POST /admin/oauth/clients`
  - `GET /admin/oauth/clients`
  - `GET /admin/oauth/clients/:id`
  - `PATCH /admin/oauth/clients/:id`
  - `POST /admin/oauth/clients/:id/regenerate-secret`
- support fields:
  - `client_id`
  - `client_secret` on create/regenerate only
  - `name`
  - `redirect_uris`
  - `allowed_scopes`
  - `grant_types`
  - `is_active`
- hash client secret before storage

#### Frontend
- UI not required yet

#### Constants
Move to `src/constants`:
- supported grant types
- default scopes
- admin route names

#### Types
Move to `src/types`:
- oauth client DTOs
- admin API response types

### Notes
This feature should allow creation of the first real client, for example the dashboard client.

### Tests

#### Backend
- `should create oauth client with valid configuration`
- `should return oauth clients list`
- `should update oauth client configuration`
- `should regenerate oauth client secret`
- `should reject inactive oauth client in protected flows`

#### Frontend
- not required

---

## Feature 15. Authorization code storage

### Purpose
Prepare persistence for the OAuth authorization code flow.

### Requires
- oauth clients
- users/auth
- migrations

### Implement

#### Database
Create `oauth_authorization_codes`:
- `id`
- `code_hash`
- `user_id`
- `client_id`
- `redirect_uri`
- `scope`
- `code_challenge` nullable
- `code_challenge_method` nullable
- `expires_at`
- `used_at`
- `created_at`

#### Backend
- create authorization code repository
- create secure code generator and hash handling

#### Types
Move to `src/types`:
- authorization code model types

### Notes
Codes must be one-time and short-lived.

### Tests

#### Backend
- `should store authorization code with required oauth metadata`
- `should mark authorization code as used`
- `should reject reused authorization code`

#### Frontend
- not required

---

## Feature 16. OAuth authorize endpoint

### Purpose
Start the real OAuth browser flow.

### Requires
- login
- sessions
- oauth clients
- authorization code storage

### Implement

#### Backend
- implement `GET /oauth/authorize`
- validate `client_id`
- validate `redirect_uri`
- validate `response_type=code`
- validate requested scopes
- if user is not authenticated, redirect to login
- if user is authenticated, issue authorization code
- redirect back with `code` and `state`

#### Frontend
- reuse login page flow
- separate consent screen is not required for MVP if all clients are yours

#### Constants
Move to `src/constants`:
- oauth route names
- authorize param names

#### Types
Move to `src/types`:
- authorize query type
- authorize redirect result type

### Notes
Consent screen may be added later, but not required in MVP.

### Tests

#### Backend
- `should issue authorization code for valid authorize request`
- `should redirect to login when user is not authenticated`
- `should reject authorize request with invalid client id`
- `should reject authorize request with invalid redirect uri`
- `should reject authorize request with unsupported response type`
- `should include state in redirect when provided`

#### Frontend
- `should continue oauth flow after successful login`

---

## Feature 17. OAuth token endpoint

### Purpose
Allow a client to exchange authorization code for tokens.

### Requires
- authorization codes
- token service
- refresh flow
- oauth clients

### Implement

#### Backend
- implement `POST /oauth/token`
- support:
  - `grant_type=authorization_code`
  - `grant_type=refresh_token`
- validate authorization code
- validate redirect URI
- validate client credentials when required
- validate PKCE when present
- issue access token and refresh token

#### Frontend
- no auth-frontend UI required here
- later used by dashboard client

#### Types
Move to `src/types`:
- token endpoint request type
- token endpoint response type

### Notes
Refresh token support in this endpoint must reuse the existing refresh token logic.

### Tests

#### Backend
- `should exchange authorization code for tokens`
- `should reject expired authorization code`
- `should reject reused authorization code`
- `should reject authorization code with mismatched redirect uri`
- `should reject authorization code with invalid client credentials`
- `should validate pkce code verifier when challenge is present`
- `should return refresh token when offline access scope is granted`

#### Frontend
- not required

---

## Feature 18. PKCE support

### Purpose
Support secure OAuth flow for browser and public clients.

### Requires
- authorize endpoint
- token endpoint
- authorization code fields for PKCE

### Implement

#### Backend
- support:
  - `code_challenge`
  - `code_challenge_method=S256`
  - `code_verifier`
- store challenge on authorize
- verify challenge on token exchange

#### Frontend
- later client integration must generate verifier and challenge

#### Constants
Move to `src/constants`:
- PKCE method values

#### Types
Move to `src/types`:
- PKCE-related request helper types

### Notes
PKCE is mandatory for browser clients.

### Tests

#### Backend
- `should accept valid pkce verifier for authorization code flow`
- `should reject invalid pkce verifier`
- `should reject missing pkce verifier for public client when required`

#### Frontend
- not required

---

## Feature 19. OIDC userinfo endpoint

### Purpose
Provide a standard OIDC-compatible profile endpoint for clients.

### Requires
- access token validation
- users
- basic scopes support

### Implement

#### Backend
- implement `GET /oauth/userinfo`
- return:
  - `sub`
  - `email`
  - `email_verified`
  - `name`
  - `picture`
- make response scope-aware

#### Types
Move to `src/types`:
- userinfo response type

### Notes
This endpoint should be used by clients that need a standard profile source.

### Tests

#### Backend
- `should return userinfo for valid access token`
- `should reject userinfo request without valid access token`
- `should include fields according to granted scopes`

#### Frontend
- not required

---

## Feature 20. OIDC discovery and JWKS

### Purpose
Expose provider metadata and public signing keys in standard OIDC format.

### Requires
- issuer
- token service
- stable oauth endpoints

### Implement

#### Backend
- implement `GET /.well-known/openid-configuration`
- implement `GET /.well-known/jwks.json`
- expose public signing keys

#### Constants
Move to `src/constants`:
- well-known route names
- issuer metadata values

#### Types
Move to `src/types`:
- discovery document type
- JWKS response type

### Notes
This feature prepares the provider for standards-based integration.

### Tests

#### Backend
- `should return openid configuration with correct endpoints`
- `should return jwks document with public signing keys`

#### Frontend
- not required

---

## Feature 21. Dashboard as the first OAuth client

### Purpose
Validate the full auth flow against a real internal client application.

### Requires
- dashboard OAuth client created
- authorize endpoint
- token endpoint
- PKCE
- `/oauth/userinfo`

### Implement

#### Frontend client
- implement login redirect to auth service
- implement callback page
- exchange code for tokens
- load current user
- handle refresh
- handle logout redirect behavior

#### Backend auth service
- configure the dashboard client
- ensure dashboard redirect URIs are valid

#### Constants
Move to `src/constants`:
- dashboard auth endpoints
- callback route names

#### Types
Move to `src/types`:
- oauth callback result types
- dashboard auth session types

### Notes
This is the first proof that the auth service works for external projects.

### Tests

#### Frontend
- `should redirect user to oauth authorize endpoint on login`
- `should handle oauth callback and complete login`
- `should fetch current user after successful oauth login`
- `should refresh tokens when session is still valid`

#### Backend
- `should authorize dashboard client with configured redirect uri`

---

## Feature 22. Scopes and client restrictions

### Purpose
Restrict clients to the access levels they are allowed to request.

### Requires
- oauth clients
- authorize and token flows
- userinfo

### Implement

#### Backend
- parse requested scopes
- validate scopes against client allowed scopes
- persist granted scopes
- include granted scopes in tokens
- use scopes in userinfo response

#### Constants
Move to `src/constants`:
- supported scope names

#### Types
Move to `src/types`:
- scope types
- granted scope payload types

### Notes
Do not allow clients to self-request unsupported scopes.

### Tests

#### Backend
- `should grant only scopes allowed for oauth client`
- `should reject request with unsupported scope`
- `should include granted scopes in issued token`

#### Frontend
- not required

---

## Feature 23. Token revoke endpoint

### Purpose
Allow clients to explicitly revoke tokens.

### Requires
- refresh tokens
- oauth token flows

### Implement

#### Backend
- implement `POST /oauth/revoke`
- revoke refresh tokens
- return success without leaking token existence
- access token revocation is optional for MVP

#### Frontend
- client may call revoke during logout

#### Types
Move to `src/types`:
- revoke request/response types

### Notes
MVP only requires reliable refresh token revocation.

### Tests

#### Backend
- `should revoke valid refresh token`
- `should return success for unknown token without leaking existence`
- `should prevent revoked token from being used again`

#### Frontend
- not required

---

## Feature 24. Audit log

### Purpose
Track important auth and OAuth events for debugging and security review.

### Requires
- core auth flows
- oauth flows

### Implement

#### Database
Create `audit_logs`:
- `id`
- `user_id` nullable
- `event_type`
- `ip`
- `user_agent`
- `metadata`
- `created_at`

#### Backend
Log:
- register
- login success
- login failure
- refresh
- logout
- logout all
- password reset
- email verify
- oauth code issue
- token issue
- token revoke

#### Types
Move to `src/types`:
- audit log types

### Notes
Use audit logs for observability, not as the source of truth for current auth state.

### Tests

#### Backend
- `should create audit log for successful login`
- `should create audit log for failed login`
- `should create audit log for refresh token rotation`
- `should create audit log for oauth token issuance`

#### Frontend
- not required

---

## Feature 25. Rate limiting and brute force protection

### Purpose
Protect production auth flows from abuse.

### Requires
- login
- register
- forgot password
- refresh
- verification resend

### Implement

#### Backend
- add rate limiting for:
  - register
  - login
  - forgot-password
  - refresh
  - send-verification-email
- add temporary block logic for excessive login attempts by email or IP
- implement without Redis
- use MySQL-backed or simple in-process strategy suitable for this project

#### Frontend
- show rate-limit errors in UI

#### Constants
Move to `src/constants`:
- rate limit windows
- max attempts
- lock durations

#### Types
Move to `src/types`:
- rate-limit error response types

### Notes
This feature was corrected from the earlier draft:
**do not use Redis here**.

### Tests

#### Backend
- `should rate limit repeated login attempts`
- `should rate limit repeated registration attempts`
- `should block excessive refresh requests`
- `should allow requests again after rate limit window expires`

#### Frontend
- `should show rate limit error message when api returns too many requests`

---

## Feature 26. OAuth clients admin UI

### Purpose
Manage OAuth clients from UI instead of editing database records manually.

### Requires
- admin API for OAuth clients

### Implement

#### Frontend
- create admin client list page
- create client creation form
- create client editing form
- support redirect URIs, allowed scopes, and secret regeneration
- use `DobruniaUI-vue`

#### Backend
- only small support additions if needed, for example filtering or pagination

#### Types
Move to `src/types`:
- admin client form types

### Notes
This is UI on top of the already existing admin API, not a replacement for it.

### Tests

#### Frontend
- `should render oauth clients list`
- `should create oauth client from admin panel`
- `should update oauth client redirect uris`
- `should regenerate oauth client secret from admin panel`

#### Backend
- not required unless support changes are added

---

## Feature 27. JWT key-based signing and rotation basis

### Purpose
Prepare the provider for safer signing key management.

### Requires
- JWKS
- token issuing

### Implement

#### Backend
- support signing with key pairs
- include `kid` in JWT header
- expose active public keys in JWKS
- prepare basis for future key rotation

#### Constants
Move to `src/constants`:
- key identifiers
- key status values if needed

#### Types
Move to `src/types`:
- signing key metadata types

### Notes
This feature may start with a single active key pair, but the structure must be rotation-ready.

### Tests

#### Backend
- `should sign jwt with active key id`
- `should expose active public keys in jwks`
- `should validate tokens signed with current active key`

#### Frontend
- not required

---

## Feature 28. Integration docs and SDK helpers

### Purpose
Make new project integration predictable and repeatable.

### Requires
- dashboard as first working client

### Implement

#### Documentation
- create integration guide
- list env variables
- describe login flow
- describe callback handling
- describe refresh flow
- describe logout flow

#### Optional SDK
- create lightweight client helpers for authorize URL creation and callback parsing

#### Types
Move to `src/types` if SDK exists:
- SDK helper option types

### Notes
If this feature is docs-only, code tests are optional.

### Tests

#### SDK
- `should build authorize url with required params`
- `should parse oauth callback params correctly`

---

## Final execution order

Implement features strictly in this order:

1. Service scaffold and health endpoint  
2. Base MySQL schema  
3. User registration  
4. User login  
5. Access token generation and validation  
6. Refresh token flow  
7. Current user endpoint `/me`  
8. Logout current session  
9. Logout all sessions  
10. Session list  
11. Revoke one session  
12. Email verification  
13. Password reset  
14. OAuth clients admin API  
15. Authorization code storage  
16. OAuth authorize endpoint  
17. OAuth token endpoint  
18. PKCE support  
19. OIDC userinfo endpoint  
20. OIDC discovery and JWKS  
21. Dashboard as the first OAuth client  
22. Scopes and client restrictions  
23. Token revoke endpoint  
24. Audit log  
25. Rate limiting and brute force protection  
26. OAuth clients admin UI  
27. JWT key-based signing and rotation basis  
28. Integration docs and SDK helpers  

