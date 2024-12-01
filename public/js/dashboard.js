class DockerService {
  constructor() {
    console.log("Initializing DockerService...");
    console.log("Available SSH libraries:", {
      IsomorphicSSH:
        typeof IsomorphicSSH !== "undefined" ? "loaded" : "not loaded",
      window: {
        IsomorphicSSH:
          typeof window.IsomorphicSSH !== "undefined" ? "loaded" : "not loaded",
        SSH: typeof window.SSH !== "undefined" ? "loaded" : "not loaded",
      },
    });

    this.config = {
      host: CONFIG.host,
      username: CONFIG.username,
      privateKey: CONFIG.sshKey,
    };
    console.log("SSH Config (excluding private key):", {
      host: this.config.host,
      username: this.config.username,
    });
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
      console.log("Creating SSH connection...");
      if (typeof IsomorphicSSH === "undefined") {
        throw new Error("SSH library not loaded properly!");
      }
      const ssh = new IsomorphicSSH();

      console.log("Attempting SSH connection...");
      await ssh.connect(this.config);
      console.log("SSH connected successfully!");

      console.log("Executing docker ps command...");
      const command = 'docker ps --format "{{json .}}"';
      console.log("Command:", command);

      const result = await ssh.executeCommand(command);
      console.log("Raw docker ps result:", result);

      await ssh.disconnect();
      console.log("SSH disconnected");

      const containers = JSON.parse(
        `[${result.stdout.split("\n").filter(Boolean).join(",")}]`
      );
      console.log("Parsed containers:", containers);
      console.log("Number of containers found:", containers.length);
      containers.forEach((container, index) => {
        console.log(`Container ${index + 1}:`, {
          name: container.Names,
          id: container.ID,
          status: container.Status,
          image: container.Image,
        });
      });
      return containers;
    } catch (error) {
      console.error("SSH Error:", error);
      console.error("Error stack:", error.stack);
      console.error("Error connecting to:", this.config.host);
      console.error("With username:", this.config.username);
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
      </div>
    `
      )
      .join("");
    console.log("Generated HTML length:", html.length);
    return html;
  }
}

// Initialize dashboard when page loads
console.log("Setting up DOMContentLoaded listener...");
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, creating DockerService...");
  const docker = new DockerService();
  docker.init();
});
