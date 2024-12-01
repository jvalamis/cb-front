class DockerService {
  constructor() {
    console.log("Initializing DockerService...");
    this.doApiToken = CONFIG.doApiToken;
    this.dropletId = CONFIG.dropletId;
  }

  async init() {
    console.log("Initializing dashboard...");
    if (!isAuthenticated()) {
      console.log("Not authenticated, redirecting to login...");
      window.location.href = "/cb-front/login.html";
      return;
    }

    const containersDiv = document.getElementById("containers");
    if (!containersDiv) {
      console.error("Container div not found!");
      return;
    }
    console.log("Found containers div, fetching containers...");

    try {
      const containers = await this.getContainers();
      console.log("Successfully fetched containers, rendering...");
      containersDiv.innerHTML = this.renderContainers(containers);
      console.log("Containers rendered to DOM");
    } catch (error) {
      console.error("Dashboard init error:", error);
      containersDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
      console.error("Error displayed to user");
    }
  }

  async getContainers() {
    try {
      console.log("Fetching containers from Digital Ocean...");
      const response = await fetch(
        `https://api.digitalocean.com/v2/droplets/${this.dropletId}/containers`,
        {
          headers: {
            Authorization: `Bearer ${this.doApiToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`DO API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Raw container data:", data);
      return data.containers;
    } catch (error) {
      console.error("DO API Error:", error);
      throw error;
    }
  }

  async getContainerLogs(containerId) {
    try {
      console.log(`Fetching logs for container ${containerId}...`);
      const response = await fetch(
        `https://api.digitalocean.com/v2/droplets/${this.dropletId}/containers/${containerId}/logs`,
        {
          headers: {
            Authorization: `Bearer ${this.doApiToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`DO API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Raw log data:", data);
      return data.logs;
    } catch (error) {
      console.error("DO API Error:", error);
      throw error;
    }
  }

  renderContainers(containers) {
    console.log(
      "Rendering container HTML for",
      containers.length,
      "containers"
    );
    const html = containers
      .map(
        (container) => `
      <div class="container-item">
        <h3>${container.Names}</h3>
        <p>ID: ${container.ID}</p>
        <p>Status: ${container.Status}</p>
        <p>Image: ${container.Image}</p>
        <button onclick="showLogs('${container.ID}')">View Logs</button>
      </div>
    `
      )
      .join("");
    console.log("Generated HTML length:", html.length);
    return html;
  }

  async showLogs(containerId) {
    const logs = await this.getContainerLogs(containerId);
    const logsDiv = document.getElementById("logs");
    logsDiv.innerHTML = `
      <div class="logs-container">
        <h3>Logs for ${containerId}</h3>
        <pre>${logs}</pre>
      </div>
    `;
  }
}

// Initialize dashboard when page loads
console.log("Setting up DOMContentLoaded listener...");
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, creating DockerService...");
  const docker = new DockerService();
  docker.init();
});
