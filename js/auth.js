var Auth = {

  _generateCodeVerifier: function() {
    var array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  },

  _generateCodeChallenge: async function(verifier) {
    var data = new TextEncoder().encode(verifier);
    var digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  },

  getAuthUrl: async function(siteUrl) {
    var clientId    = '98a44d68e8014e909151e9960791499d';
    var redirectUri = 'https://freakedoutgamer.github.io/albums-availability?auth_callback';

    var verifier  = this._generateCodeVerifier();
    var challenge = await this._generateCodeChallenge(verifier);
    var state     = this._generateCodeVerifier();

    sessionStorage.setItem('pkce_code_verifier', verifier);
    sessionStorage.setItem('pkce_state', state);

    var authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.search = new URLSearchParams({
      response_type:         'code',
      client_id:             clientId,
      code_challenge_method: 'S256',
      code_challenge:        challenge,
      redirect_uri:          redirectUri,
      state:                 state,
    }).toString();

    return authUrl.toString();
  },

  parseResponse: async function(url) {
    var params = new URLSearchParams(url.search);
    var code   = params.get('code');
    var state  = params.get('state');

    var savedState = sessionStorage.getItem('pkce_state');
    if (!state || state !== savedState) {
      throw new Error('State mismatch – possible CSRF attack');
    }
    sessionStorage.removeItem('pkce_state');

    if (code) {
      await this._exchangeCodeForToken(code, url.href);
    }
  },

  _exchangeCodeForToken: async function(code, currentUrl) {
    var clientId    = '98a44d68e8014e909151e9960791499d';
    // Strip query string – redirect_uri must match exactly what was registered
    var redirectUri = currentUrl.split('?')[0] + '?auth_callback';
    var verifier    = sessionStorage.getItem('pkce_code_verifier');

    if (!verifier) throw new Error('Missing PKCE code verifier');

    var response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        code:          code,
        redirect_uri:  redirectUri,
        client_id:     clientId,
        code_verifier: verifier,
      }),
    });

    if (!response.ok) {
      throw new Error('Token exchange failed: ' + response.status);
    }

    var data = await response.json();
    sessionStorage.removeItem('pkce_code_verifier');

    Config.setToken(data.access_token);
    Config.setExpiresAt(data.expires_in);
    if (data.refresh_token) {
      Config.setRefreshToken(data.refresh_token);
    }
  },

  refreshToken: async function() {
    var clientId      = '54e0e5bde5be499a94ecf7b31c1da2f1';
    var refreshToken  = Config.getRefreshToken();

    if (!refreshToken) throw new Error('No refresh token available');

    var response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token: refreshToken,
        client_id:     clientId,
      }),
    });

    if (!response.ok) {
      // Refresh token revoked – force re-login
      Config.clearAuth();
      throw new Error('Token refresh failed: ' + response.status);
    }

    var data = await response.json();
    Config.setToken(data.access_token);
    Config.setExpiresAt(data.expires_in);
    // Spotify may rotate the refresh token
    if (data.refresh_token) {
      Config.setRefreshToken(data.refresh_token);
    }
    return data.access_token;
  }
};
