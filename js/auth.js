var Auth = {
  clientId: '8d43aeb72ec942b08b5957e09cb20f15',

  getAuthUrl: async function(siteUrl) {
    const redirectUri = siteUrl + '?auth_callback';

    // 1. Generate code_verifier
    const codeVerifier = this._generateRandomString(64);

    // 2. Create code_challenge
    const codeChallenge = await this._generateCodeChallenge(codeVerifier);

    // 3. Store verifier for later
    localStorage.setItem('code_verifier', codeVerifier);

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  },

  // ✅ NEW: handle query params instead of hash
  parseResponse: function(url) {
    const params = new URLSearchParams(url.search);
    const code = params.get('code');

    if (code) {
      this.exchangeCodeForToken(code);
    }
  },

  // ✅ NEW: exchange code → token
  exchangeCodeForToken: async function(code) {
    const codeVerifier = localStorage.getItem('code_verifier');

    const body = new URLSearchParams({
      client_id: this.clientId,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: window.location.origin + '?auth_callback',
      code_verifier: codeVerifier
    });

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });

    const data = await response.json();

    if (data.access_token) {
      Config.setToken(data.access_token);
      Config.setExpiresAt(data.expires_in);

      // ✅ NEW: store refresh token
      if (data.refresh_token) {
        Config.setRefreshToken(data.refresh_token);
      }
    }
  },

  // 🔐 PKCE helpers
  _generateRandomString: function(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from(crypto.getRandomValues(new Uint8Array(length)))
      .map(x => possible[x % possible.length])
      .join('');
  },

  _generateCodeChallenge: async function(verifier) {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);

    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
};
