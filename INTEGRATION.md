# Integration Guide

This guide explains how to integrate your application with the Dobrunia OAuth / SSO service.

## Table of Contents

1. [Overview](#overview)
2. [OAuth 2.0 Flow](#oauth-20-flow)
3. [Quick Start](#quick-start)
4. [Backend Integration](#backend-integration)
5. [Frontend Integration](#frontend-integration)
6. [API Reference](#api-reference)
7. [SDK Helpers](#sdk-helpers)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Dobrunia Auth service provides centralized authentication using OAuth 2.0 and OpenID Connect protocols.

**Base URL:** `http://localhost:3000` (development)

**Supported Protocols:**
- OAuth 2.0 Authorization Code Flow with PKCE
- OpenID Connect

**Supported Scopes:**
- `openid` - Required for OIDC
- `profile` - User profile information
- `email` - User email address
- `offline_access` - Refresh token support

---

## OAuth 2.0 Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Your App  │     │ Dobrunia Auth│     │   Database  │
└──────┬──────┘     └──────┬───────┘     └──────┬──────┘
       │                   │                    │
       │ 1. Authorize      │                    │
       │──────────────────>│                    │
       │                   │                    │
       │ 2. Login Screen   │                    │
       │<──────────────────│                    │
       │                   │                    │
       │ 3. Auth Code      │                    │
       │<──────────────────│                    │
       │                   │                    │
       │ 4. Exchange Code  │                    │
       │──────────────────>│                    │
       │                   │                    │
       │ 5. Access Token   │                    │
       │<──────────────────│                    │
       │                   │                    │
       │ 6. User Info      │                    │
       │──────────────────>│                    │
       │                   │                    │
       │ 7. User Data      │                    │
       │<──────────────────│                    │
       │                   │                    │
```

---

## Quick Start

### Step 1: Register Your Application

Contact the admin to create an OAuth client. You'll receive:
- `client_id`
- `client_secret` (for confidential clients)
- Allowed redirect URIs

### Step 2: Configure Your Application

Set these environment variables:

```bash
AUTH_SERVER_URL=http://localhost:3000
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret  # Backend only
OAUTH_REDIRECT_URI=http://yourapp.com/callback
```

### Step 3: Implement Authorization

See [Backend Integration](#backend-integration) or [Frontend Integration](#frontend-integration).

---

## Backend Integration

### Node.js Example

```javascript
const express = require('express');
const axios = require('axios');

const app = express();

const config = {
  authServerUrl: process.env.AUTH_SERVER_URL,
  clientId: process.env.OAUTH_CLIENT_ID,
  clientSecret: process.env.OAUTH_CLIENT_SECRET,
  redirectUri: process.env.OAUTH_REDIRECT_URI,
};

// Step 1: Redirect to auth server
app.get('/login', (req, res) => {
  const authUrl = new URL(`${config.authServerUrl}/oauth/authorize`);
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', config.redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid profile email');
  
  res.redirect(authUrl.toString());
});

// Step 2: Handle callback
app.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  try {
    // Exchange code for tokens
    const tokenResponse = await axios.post(`${config.authServerUrl}/oauth/token`, {
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
    });
    
    const { access_token, refresh_token } = tokenResponse.data.data;
    
    // Get user info
    const userResponse = await axios.get(`${config.authServerUrl}/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    
    // Create session
    req.session.user = userResponse.data;
    req.session.tokens = { access_token, refresh_token };
    
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).send('Authentication failed');
  }
});

// Step 3: Protect routes
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

app.get('/dashboard', requireAuth, (req, res) => {
  res.json({ user: req.session.user });
});
```

### Token Refresh

```javascript
async function refreshAccessToken(refreshToken) {
  const response = await axios.post(`${config.authServerUrl}/oauth/token`, {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });
  
  return response.data.data;
}
```

---

## Frontend Integration

### Vanilla JavaScript with PKCE

```javascript
class OAuthClient {
  constructor(config) {
    this.authServerUrl = config.authServerUrl;
    this.clientId = config.clientId;
    this.redirectUri = config.redirectUri;
  }

  // Generate PKCE parameters
  generatePKCE() {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    
    return { codeVerifier, codeChallenge };
  }

  generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64UrlEncode(array);
  }

  async generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return this.base64UrlEncode(new Uint8Array(hash));
  }

  base64UrlEncode(buffer) {
    let binary = '';
    for (let i = 0; i < buffer.byteLength; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // Start authorization
  login() {
    const pkce = this.generatePKCE();
    localStorage.setItem('pkce_code_verifier', pkce.codeVerifier);
    
    const authUrl = new URL(`${this.authServerUrl}/oauth/authorize`);
    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('redirect_uri', this.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('code_challenge', pkce.codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    
    window.location.href = authUrl.toString();
  }

  // Handle callback
  async handleCallback(code) {
    const codeVerifier = localStorage.getItem('pkce_code_verifier');
    localStorage.removeItem('pkce_code_verifier');
    
    const response = await fetch(`${this.authServerUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        redirect_uri: this.redirectUri,
        code_verifier: codeVerifier,
      }),
    });
    
    const data = await response.json();
    
    // Store tokens
    localStorage.setItem('access_token', data.data.access_token);
    localStorage.setItem('refresh_token', data.data.refresh_token);
    
    return data.data;
  }

  // Get user info
  async getUserInfo() {
    const token = localStorage.getItem('access_token');
    
    const response = await fetch(`${this.authServerUrl}/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    return response.json();
  }

  // Logout
  async logout() {
    const token = localStorage.getItem('access_token');
    
    await fetch(`${this.authServerUrl}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
}

// Usage
const oauth = new OAuthClient({
  authServerUrl: 'http://localhost:3000',
  clientId: 'your-client-id',
  redirectUri: 'http://localhost:5173/callback',
});

// Login button
document.getElementById('login-btn').addEventListener('click', () => {
  oauth.login();
});

// Handle callback
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
if (code) {
  oauth.handleCallback(code).then(() => {
    window.location.href = '/dashboard';
  });
}
```

---

## API Reference

### Authorization Endpoint

**GET** `/oauth/authorize`

| Parameter | Required | Description |
|-----------|----------|-------------|
| client_id | Yes | Your client ID |
| redirect_uri | Yes | Registered redirect URI |
| response_type | Yes | Must be `code` |
| scope | No | Space-separated scopes |
| state | No | CSRF protection value |
| code_challenge | No | PKCE code challenge |
| code_challenge_method | No | `S256` or `plain` |

### Token Endpoint

**POST** `/oauth/token`

**Authorization Code Grant:**

```json
{
  "grant_type": "authorization_code",
  "code": "auth_code_here",
  "client_id": "your-client-id",
  "client_secret": "your-client-secret",
  "redirect_uri": "http://yourapp.com/callback",
  "code_verifier": "pkce_verifier"  // If PKCE was used
}
```

**Refresh Token Grant:**

```json
{
  "grant_type": "refresh_token",
  "refresh_token": "refresh_token_here",
  "client_id": "your-client-id",
  "client_secret": "your-client-secret"
}
```

### User Info Endpoint

**GET** `/oauth/userinfo`

Headers:
```
Authorization: Bearer <access_token>
```

Response:
```json
{
  "sub": "123",
  "name": "John Doe",
  "email": "john@example.com",
  "email_verified": true,
  "picture": "https://..."
}
```

### Logout Endpoint

**POST** `/auth/logout`

Headers:
```
Authorization: Bearer <access_token>
```

---

## SDK Helpers

### Node.js Middleware

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

async function validateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authorization header required',
    });
  }
  
  const token = authHeader.substring(7);
  
  try {
    // Fetch JWKS from auth server
    const jwksResponse = await fetch('http://localhost:3000/.well-known/jwks.json');
    const jwks = await jwksResponse.json();
    
    // Verify token (implementation depends on your JWT library)
    const decoded = jwt.verify(token, jwks.keys[0].k);
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Invalid or expired token',
    });
  }
}

module.exports = { validateToken };
```

### Vue 3 Composable

```javascript
// composables/useAuth.js
import { ref, computed } from 'vue';

export function useAuth() {
  const user = ref(null);
  const loading = ref(true);

  const isAuthenticated = computed(() => !!user.value);

  async function login() {
    // Redirect to auth server
    window.location.href = `${AUTH_SERVER_URL}/oauth/authorize?...`;
  }

  async function handleCallback(code) {
    const response = await fetch(`${AUTH_SERVER_URL}/oauth/token`, {
      method: 'POST',
      body: JSON.stringify({ /* ... */ }),
    });
    
    const data = await response.json();
    localStorage.setItem('access_token', data.data.access_token);
    await loadUser();
  }

  async function loadUser() {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      loading.value = false;
      return;
    }
    
    try {
      const response = await fetch(`${AUTH_SERVER_URL}/oauth/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      user.value = await response.json();
    } catch (error) {
      user.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    await fetch(`${AUTH_SERVER_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    
    localStorage.removeItem('access_token');
    user.value = null;
  }

  return {
    user,
    loading,
    isAuthenticated,
    login,
    handleCallback,
    logout,
  };
}
```

---

## Troubleshooting

### Common Errors

**`invalid_client`**
- Check your `client_id` and `client_secret`
- Ensure client is active in admin panel

**`invalid_redirect_uri`**
- Redirect URI must exactly match registered URI
- Check for trailing slashes

**`invalid_grant`**
- Authorization code expired (10 minute TTL)
- Code already used
- Redirect URI mismatch

**`invalid_token`**
- Token expired (15 minute TTL for access token)
- Token malformed
- Wrong signing key

### Debug Mode

Enable debug logging on the auth server:

```bash
DEBUG=auth:* npm start
```

### Support

For issues and questions:
- Check server logs
- Review [AGENT.md](./AGENT.md) for feature status
- Contact the development team
