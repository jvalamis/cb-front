const AUTH_CONFIG = {
  clientId: "Ov23li5ACAhyeVMIJD4S", // Your GitHub OAuth App client ID
  redirectUri:
    window.location.hostname === "localhost"
      ? "http://localhost:3000/callback.html"
      : "https://jvalamis.github.io/cb-front/callback.html",
  scope: "user:email",
};

function login() {
  window.location.href = `https://github.com/login/oauth/authorize?client_id=${AUTH_CONFIG.clientId}&redirect_uri=${AUTH_CONFIG.redirectUri}&scope=${AUTH_CONFIG.scope}`;
}

// Simple check if user has authenticated
function isAuthenticated() {
  return sessionStorage.getItem("github_token") !== null;
}

// Handle the OAuth callback
async function handleCallback() {
  const code = new URLSearchParams(window.location.search).get("code");
  if (code) {
    // Store the code temporarily
    sessionStorage.setItem("github_token", code);
    window.location.href = "/index.html";
  }
}
