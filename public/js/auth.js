// AUTH_CONFIG is loaded from auth-config.js

function login() {
  window.location.href = `https://github.com/login/oauth/authorize?client_id=${AUTH_CONFIG.clientId}&redirect_uri=${AUTH_CONFIG.redirectUri}&scope=${AUTH_CONFIG.scope}`;
}

function isAuthenticated() {
  return sessionStorage.getItem("github_token") !== null;
}

async function handleCallback() {
  const code = new URLSearchParams(window.location.search).get("code");
  if (code) {
    sessionStorage.setItem("github_token", code);
    window.location.href = "/index.html";
  }
}
