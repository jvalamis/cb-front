class DockerService {
  constructor() {
    console.log("Initializing DockerService...");

    this.config = {
      host: CONFIG.host,
      username: CONFIG.username,
      privateKey: CONFIG.sshKey,
    };
    console.log("SSH Config (excluding private key):", {
      host: this.config.host,
      username: this.config.username,
    });

    // Initialize SSH client with error checking
    console.log("Checking SSH2 library...");
    if (!window.SSH2) {
      console.error("SSH2 library not loaded!");
      throw new Error("SSH2 library not loaded. Check script includes.");
    }
    console.log("SSH2 library found:", window.SSH2);
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
      console.log("Attempting SSH connection...");
      const ssh = new NodeSSH();
      await ssh.connect(this.config);
      console.log("SSH connected successfully!");

      console.log("Executing docker ps command...");
      const command = 'docker ps --format "{{json .}}"';
      console.log("Command:", command);

      const result = await ssh.execCommand(command);
      console.log("Raw docker ps result:", result);

      await ssh.dispose();
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
