var Config = {

  // --- Search state ---

  setLastSearch: function(id) {
    localStorage.setItem('lastSearch', id);
    // Keep hash in sync for bookmarkable URLs
    window.location.hash = id;
  },

  getLastSearch: function() {
    // Hash takes priority (bookmarked/shared URL), fall back to localStorage
    return window.location.hash.substring(1) || localStorage.getItem('lastSearch');
  },

  // --- UI preferences ---

  setExactSearch: function(useExact) {
    localStorage.setItem('exactSearch', useExact); // was: 'mode' bug — fixed
  },

  getExactSearch: function() {
    return localStorage.getItem('exactSearch') === 'true';
  },

  // --- Token management ---

  getValidToken: function() {
    var expiresAt = parseInt(localStorage.getItem('token_expires_at'), 10);
    var token     = localStorage.getItem('token');
    var now       = Date.now();
    return (token && expiresAt && expiresAt > now) ? token : null;
  },

  setToken: function(accessToken) {
    localStorage.setItem('token', accessToken);
  },

  setExpiresAt: function(expiresIn) {
    var expiresAt = Date.now() + parseInt(expiresIn, 10) * 1000;
    localStorage.setItem('token_expires_at', expiresAt);
  },

  // --- Refresh token (new – PKCE provides one, implicit flow did not) ---

  setRefreshToken: function(refreshToken) {
    localStorage.setItem('refresh_token', refreshToken);
  },

  getRefreshToken: function() {
    return localStorage.getItem('refresh_token');
  },

  clearAuth: function() {
    localStorage.removeItem('token');
    localStorage.removeItem('token_expires_at');
    localStorage.removeItem('refresh_token');
  }
};
