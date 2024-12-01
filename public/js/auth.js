// AUTH_CONFIG is loaded from auth-config.js

function login() {
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${AUTH_CONFIG.clientId}&redirect_uri=${AUTH_CONFIG.redirectUri}&scope=${AUTH_CONFIG.scope}`;
  console.log("Auth URL:", authUrl);
  window.location.href = authUrl;
}

function isAuthenticated() {
  return sessionStorage.getItem("github_token") !== null;
}

async function handleCallback() {
  const code = new URLSearchParams(window.location.search).get("code");
  if (code) {
    // Could add GitHub API call here to verify user is in allowedUsers list
    sessionStorage.setItem("github_token", code);
    window.location.href = "/cb-front/";
  }
}
