var SpotifyApi = {

  // Resolves to a valid token or throws — callers don't need to know about refresh
  _getToken: async function() {
    var token = Config.getValidToken();
    if (token) return token;

    // Access token expired — attempt a silent refresh before giving up
    if (Config.getRefreshToken()) {
      return await Auth.refreshToken();
    }

    throw new Error('unauthorised');
  },

  sendRequest: async function(url, callback) {
    var accessToken;

    try {
      accessToken = await this._getToken();
    } catch (e) {
      callback('unauthorised');
      return;
    }

    try {
      var response = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + accessToken }
      });

      if (response.status === 401) {
        // Token was valid locally but rejected by Spotify (e.g. revoked)
        Config.clearAuth();
        callback('unauthorised');
        return;
      }

      if (!response.ok) {
        callback('Error: ' + response.status);
        return;
      }

      var data = await response.json();
      callback(null, data);

    } catch (e) {
      callback(e.message);
    }
  }
};
