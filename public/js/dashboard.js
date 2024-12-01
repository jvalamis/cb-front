const API_BASE = "https://cb-front.ondigitalocean.app";

let term;
let currentContainers = new Map(); // Track current containers and their logs
let isFirstLoad = true;
let commandLine;
let commandInput;

async function initDashboard() {
  const containersDiv = document.getElementById("containers");

  if (isFirstLoad) {
    const loader = document.createElement("div");
    loader.className = "console-loader";
    loader.innerHTML = `
      <div class="console-line">
        <span class="console-timestamp">[${getTimestamp()}]</span> Connecting to Docker service
      </div>
      <div class="loading-dots">
        <span>.</span><span>.</span><span>.</span>
      </div>
    `;
    containersDiv.appendChild(loader);
  }

  await updateContainers();

  if (isFirstLoad) {
    const loader = document.querySelector(".console-loader");
    if (loader) {
      loader.remove();
    }
    isFirstLoad = false;
  }

  setInterval(updateContainers, 10000);

  // Set up command line
  commandLine = document.getElementById("command-line");
  commandInput = document.getElementById("command-input");

  // Only set up command line for allowed user
  const response = await fetch(`${API_BASE}/api/current-user`);
  const { username } = await response.json();

  if (username === "jvalamis") {
    // Global keydown for showing/hiding command line
    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        // If input is hidden, show it and focus
        if (commandLine.classList.contains("hidden")) {
          commandLine.classList.remove("hidden");
          commandInput.focus();
          return;
        }

        // If input is empty and focused, hide it
        if (document.activeElement === commandInput && !commandInput.value) {
          commandLine.classList.add("hidden");
        }
      }
    });

    // Command input specific handling
    commandInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        const command = commandInput.value.trim();
        commandInput.value = "";

        if (command) {
          await handleCommand(command);
          await updateAccessList(); // Make sure list updates after command
        } else {
          commandLine.classList.add("hidden");
        }
      } else if (e.key === "Escape") {
        commandLine.classList.add("hidden");
      }
    });

    await updateAccessList();
  }
}

function getTimestamp() {
  return new Date().toISOString().split("T")[1].split(".")[0];
}

function addConsoleLine(element, message, type = "normal") {
  const timestamp = getTimestamp();
  const line = document.createElement("div");
  line.className = `console-line ${
    type === "error" ? "console-error" : "console-success"
  }`;
  line.innerHTML = `<span class="console-timestamp">[${timestamp}]</span> ${message}`;
  element.appendChild(line);
  return line;
}

async function updateContainers() {
  const containersDiv = document.getElementById("containers");

  try {
    const response = await fetch(`${API_BASE}/api/docker/containers`);
    if (!response.ok) {
      throw new Error(`Connection failed: ${response.status}`);
    }

    const containers = await response.json();

    if (!Array.isArray(containers)) {
      if (!containersDiv.querySelector(".error")) {
        containersDiv.innerHTML = "";
        addConsoleLine(
          containersDiv,
          "Error: Invalid container data received",
          "error"
        );
      }
      return;
    }

    if (containers.length === 0) {
      if (!containersDiv.querySelector(".error")) {
        containersDiv.innerHTML = "";
        addConsoleLine(containersDiv, "No containers found", "error");
      }
      return;
    }

    // Update status line only if not already connected
    if (!containersDiv.querySelector(".console-line")) {
      addConsoleLine(containersDiv, "Connected to Docker service");
    }

    // Update each container
    for (const container of containers) {
      let containerSection = document.getElementById(
        `container-${container.id}`
      );
      let isNew = false;

      if (!containerSection) {
        isNew = true;
        containerSection = document.createElement("div");
        containerSection.id = `container-${container.id}`;
        containerSection.className = `container-section ${
          container.isOffline ? "offline" : ""
        }`;
        containersDiv.appendChild(containerSection);
      } else {
        // Update offline status
        containerSection.className = `container-section ${
          container.isOffline ? "offline" : ""
        }`;
      }

      // Update status only if changed or new
      const statusLine = containerSection.querySelector(".console-line");
      const statusType = container.isOffline ? "error" : "normal";
      const newStatus = container.isOffline
        ? `${container.name} (${container.id.slice(0, 12)}) - OFFLINE for ${
            container.downtime
          }`
        : `${container.name} (${container.id.slice(0, 12)}) - ${
            container.status
          }`;

      if (isNew || !statusLine || !statusLine.textContent.includes(newStatus)) {
        if (statusLine) statusLine.remove();
        addConsoleLine(containerSection, newStatus, statusType);
      }

      // Update logs
      let logsSection = containerSection.querySelector(".container-logs");
      if (!logsSection) {
        logsSection = document.createElement("div");
        logsSection.className = "container-logs";
        containerSection.appendChild(logsSection);
      }

      try {
        const logsResponse = await fetch(
          `${API_BASE}/api/docker/logs/${container.id}`
        );
        const { logs } = await logsResponse.json();

        if (logs) {
          const newLines = logs
            .split("\n")
            .filter((line) => line.trim())
            .slice(-5);

          // Only update if logs have changed
          const currentLines = Array.from(
            logsSection.querySelectorAll(".console-line")
          ).map((line) => line.textContent);

          if (JSON.stringify(newLines) !== JSON.stringify(currentLines)) {
            logsSection.innerHTML = "";
            newLines.forEach((line) => {
              addConsoleLine(logsSection, line);
            });
          }
        }
      } catch (error) {
        if (!logsSection.querySelector(".error")) {
          logsSection.innerHTML = "";
          addConsoleLine(
            logsSection,
            `Failed to fetch logs: ${error.message}`,
            "error"
          );
        }
      }

      currentContainers.set(container.id, container);
    }

    // Remove containers that no longer exist
    for (const [id, container] of currentContainers) {
      if (!containers.find((c) => c.id === id)) {
        const element = document.getElementById(`container-${id}`);
        if (element) element.remove();
        currentContainers.delete(id);
      }
    }
  } catch (error) {
    if (!containersDiv.querySelector(".error")) {
      containersDiv.innerHTML = "";
      addConsoleLine(
        containersDiv,
        `Unable to connect: ${error.message}`,
        "error"
      );
    }
  }
}

async function grantAccess(username, duration = 24) {
  try {
    const response = await fetch(`${API_BASE}/api/grant-access`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, duration }),
    });

    if (!response.ok) throw new Error("Failed to grant access");

    const result = await response.json();
    addConsoleLine(
      document.getElementById("containers"),
      `Granted access to ${username} until ${new Date(
        result.expiresAt
      ).toLocaleString()}`,
      "success"
    );
  } catch (error) {
    addConsoleLine(
      document.getElementById("containers"),
      `Failed to grant access: ${error.message}`,
      "error"
    );
  }
}

// Make it immediately invoked when called from console
async function listTemporaryAccess() {
  try {
    const response = await fetch(`${API_BASE}/api/temp-access`);
    const accessList = await response.json();

    if (accessList.length === 0) {
      return "No active access";
    }

    const activeUsers = [];
    accessList.forEach((access) => {
      const expiryTime = new Date(access.expiresAt);
      const now = new Date();
      const remaining = Math.round((expiryTime - now) / 60000);

      if (remaining > 0) {
        activeUsers.push({ username: access.username, remaining });
      }
    });
    return activeUsers;
  } catch (error) {
    return error;
  }
}

async function handleCommand(command) {
  const parts = command.toLowerCase().split(" ");
  const containersDiv = document.getElementById("containers");

  if (parts[0] === "remove") {
    const username = parts[1];
    if (!username) {
      addConsoleLine(containersDiv, "Usage: remove <username>", "error");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/revoke-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) throw new Error("Failed to revoke access");

      addConsoleLine(
        containersDiv,
        `Access revoked for ${username}`,
        "success"
      );
      await updateAccessList();
    } catch (error) {
      addConsoleLine(containersDiv, `Error: ${error.message}`, "error");
    }
  } else {
    // Grant access
    try {
      const response = await fetch(`${API_BASE}/api/grant-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: command, duration: 0.5 }), // 30 minutes
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to grant access");
      }

      const result = await response.json();
      addConsoleLine(
        containersDiv,
        `Temporary access granted to ${command} for 30 minutes`,
        "success"
      );
      await updateAccessList();
    } catch (error) {
      addConsoleLine(containersDiv, `Error: ${error.message}`, "error");
    }
  }
}

async function updateAccessList() {
  try {
    const response = await fetch(`${API_BASE}/api/temp-access`);
    const accessList = await response.json();

    let accessSection = document.querySelector(".access-list");
    if (!accessSection) {
      accessSection = document.createElement("div");
      accessSection.className = "access-list";
      document.getElementById("containers").appendChild(accessSection);
    }

    accessSection.innerHTML = "";

    // Only show the section if there's active access
    if (accessList.length > 0) {
      // Store the access list with timestamps
      window.temporaryAccess = accessList;
      // Update display
      updateAccessDisplay(accessSection);
    }
  } catch (error) {
    // Error handling
  }
}

function updateAccessDisplay(section) {
  if (!window.temporaryAccess) return;

  const now = new Date();
  const activeUsers = window.temporaryAccess.filter((access) => {
    const remaining = Math.round((new Date(access.expiresAt) - now) / 60000);
    return remaining > 0;
  });

  if (activeUsers.length > 0) {
    addConsoleLine(section, "Current Temporary Access:", "success");
    activeUsers.forEach((access) => {
      const remaining = Math.round((new Date(access.expiresAt) - now) / 60000);
      addConsoleLine(
        section,
        `${access.username} - ${remaining} minutes remaining`,
        remaining < 5 ? "error" : "normal"
      );
    });
  }
}

// Update the interval to only update if there's active access
setInterval(() => {
  if (window.temporaryAccess && window.temporaryAccess.length > 0) {
    const section = document.querySelector(".access-list");
    if (section) {
      section.innerHTML = "";
      updateAccessDisplay(section);
    }
  }
}, 1000);

// Only call once
initDashboard();
