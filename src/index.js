require("dotenv").config();
const express = require("express");
const path = require("path");
const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;
const session = require("express-session");
const dockerRoutes = require("./routes/docker");

const app = express();
const PORT = process.env.PORT || 3000;

// Remove these auth logs
// console.log("Auth Client ID:", process.env.AUTH_CLIENT_ID);
// console.log("Callback URL:", process.env.CALLBACK_URL);

// Remove the fallback, require ALLOWED_GITHUB_USERS to be set
const ALLOWED_USERS = process.env.ALLOWED_GITHUB_USERS.split(",");

// Near the top with other constants
const TEMP_USERS = new Map(); // Store temporary users and their expiry times

// Add function to manage temporary access
function addTemporaryAccess(username, durationHours = 24) {
  const expiryTime = new Date();
  expiryTime.setHours(expiryTime.getHours() + durationHours);
  TEMP_USERS.set(username, expiryTime);
}

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      maxAge: 60 * 60 * 1000, // 1 hour
      httpOnly: true,
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// GitHub Strategy
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.AUTH_CLIENT_ID,
      clientSecret: process.env.AUTH_CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
    },
    function (accessToken, refreshToken, profile, done) {
      const username = profile.username;
      const tempAccess = TEMP_USERS.get(username);
      const hasTemporaryAccess = tempAccess && tempAccess > new Date();

      if (!ALLOWED_USERS.includes(username) && !hasTemporaryAccess) {
        return done(null, false, { message: "Unauthorized user" });
      }

      if (tempAccess && !hasTemporaryAccess) {
        TEMP_USERS.delete(username);
      }

      return done(null, profile);
    }
  )
);

// Auth middleware
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
};

// Serve static files - but only for the login page and assets
app.use("/styles.css", express.static("public/styles.css"));
app.use("/login", express.static("public/login.html"));

// Auth routes
app.get("/login", (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect("/");
  } else {
    res.sendFile(path.join(__dirname, "../public/login.html"));
  }
});

app.get(
  "/auth/github",
  passport.authenticate("github", { scope: ["user:email"] })
);

app.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/login" }),
  function (req, res) {
    res.redirect("/");
  }
);

app.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/login");
  });
});

// Protected routes
app.use("/", isAuthenticated, express.static("public"));

app.get("/", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.use(express.json());
app.use("/api/docker", isAuthenticated, dockerRoutes);

// Add an endpoint to grant temporary access (protected, only you can use it)
app.post("/api/grant-access", isAuthenticated, (req, res) => {
  const { username, duration } = req.body;

  if (!ALLOWED_USERS.includes(req.user.username)) {
    return res.status(403).json({ error: "Not authorized to grant access" });
  }

  addTemporaryAccess(username, duration);
  res.json({
    message: `Temporary access granted to ${username} for ${duration} hours`,
    expiresAt: TEMP_USERS.get(username),
  });
});

// Update the temp-access endpoint
app.get("/api/temp-access", isAuthenticated, (req, res) => {
  if (!ALLOWED_USERS.includes(req.user.username)) {
    return res
      .status(403)
      .json({ error: "Not authorized to view access list" });
  }

  const now = new Date();
  const activeAccess = Array.from(TEMP_USERS.entries())
    .filter(([_, expiry]) => {
      const expiryDate = new Date(expiry);
      return expiryDate.getTime() > now.getTime();
    })
    .map(([username, expiry]) => ({
      username,
      expiresAt: expiry,
    }));

  res.json(activeAccess);
});

// Add this with other routes
app.get("/api/current-user", isAuthenticated, (req, res) => {
  res.json({ username: req.user.username });
});

// Add revoke access endpoint
app.post("/api/revoke-access", isAuthenticated, (req, res) => {
  const { username } = req.body;

  if (!ALLOWED_USERS.includes(req.user.username)) {
    return res.status(403).json({ error: "Not authorized to revoke access" });
  }

  TEMP_USERS.delete(username);
  res.json({ message: `Access revoked for ${username}` });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
