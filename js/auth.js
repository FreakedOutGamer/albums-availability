var Auth = {
  clientId: '8d43aeb72ec942b08b5957e09cb20f15',

  // =========================
  // STEP 1: Build Auth URL
  // =========================
  getAuthUrl: async function(siteUrl) {
    var redirectUri = encodeURIComponent(siteUrl + '?auth_callback');

    var codeVerifier = this._generateRandomString(64);
    var hashed = await this._sha256(codeVerifier);
    var codeChallenge = this._base64urlencode(hashed);

    sessionStorage.setItem('code_verifier', codeVerifier);

    var state = this._generateRandomString(16);
    sessionStorage.setItem('auth_state', state);

    return 'https://accounts.spotify.com/authorize?' +
      'client_id=' + this.clientId +
      '&response_type=code' +
      '&redirect_uri=' + redirectUri +
      '&code_challenge_method=S256' +
      '&code_challenge=' + codeChallenge +
      '&state=' + state;
  },

  // =========================
  // STEP 2: Handle Redirect
  // =========================
  parseResponse: async function(url, siteUrl) {
    var params = new URLSearchParams(url.search);
    var code = params.get('code');
    var state = params.get('state');
    var storedState = sessionStorage.getItem('auth_state');

    if (!code) return;

    if (state !== storedState) {
      console.error('Invalid state');
      return;
    }

    await this._exchangeCodeForToken(code, siteUrl);
  },

  // =========================
  // STEP 3: Exchange Code
  // =========================
  _exchangeCodeForToken: async function(code, siteUrl) {
    var codeVerifier = sessionStorage.getItem('code_verifier');
    var redirectUri = siteUrl + '?auth_callback';

    var response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
      })
    });

    var data = await response.json();

    if (data.error) {
      console.error('Token error:', data);
      return;
    }

    Config.setToken(data.access_token);
    Config.setRefreshToken(data.refresh_token);
    Config.setExpiresAt(data.expires_in);
  },

  // =========================
  // STEP 4: Refresh Token
  // =========================
  refreshToken: async function() {
    var refreshToken = Config.getRefreshToken();
    if (!refreshToken) return;

    var response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    var data = await response.json();

    if (data.access_token) {
      Config.setToken(data.access_token);
      Config.setExpiresAt(data.expires_in);
    }
  },

  // =========================
  // HELPERS
  // =========================
  _generateRandomString: function(length) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var result = '';
    for (var i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  _sha256: async function(plain) {
    var encoder = new TextEncoder();
    var data = encoder.encode(plain);
    return crypto.subtle.digest('SHA-256', data);
  },

  _base64urlencode: function(buffer) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
};
