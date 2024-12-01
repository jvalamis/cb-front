class DockerService {
  constructor() {
    console.log("Initializing DockerService...");
    if (!isAuthenticated()) {
      console.log("Not authenticated, redirecting to login...");
      window.location.href = "/cb-front/login.html";
      return;
    }

    console.log("User authenticated, setting up SSH config...");
    this.config = {
      host: CONFIG.host,
      username: CONFIG.username,
      privateKey: CONFIG.sshKey,
    };

    // Initialize SSH client
    console.log("Initializing SSH client...");
    this.ssh = new window.SSH2.Client();
  }

  async getContainers() {
    try {
      console.log("Attempting SSH connection...");
      await this.ssh.connect(this.config);
      console.log("SSH connected, executing docker ps...");

      const result = await this.ssh.exec('docker ps --format "{{json .}}"');
      console.log("Raw docker ps result:", result);

      this.ssh.disconnect();
      console.log("SSH disconnected");

      const containers = JSON.parse(
        `[${result.split("\n").filter(Boolean).join(",")}]`
      );
      console.log("Parsed containers:", containers);
      return containers;
    } catch (error) {
      console.error("SSH Error:", error);
      console.error("Error stack:", error.stack);
      throw error;
    }
  }

  async init() {
    console.log("Initializing dashboard...");
    const containersDiv = document.getElementById("containers");
    try {
      const containers = await this.getContainers();
      console.log("Rendering containers:", containers);
      containersDiv.innerHTML = this.renderContainers(containers);
    } catch (error) {
      console.error("Dashboard init error:", error);
      containersDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
  }

  renderContainers(containers) {
    console.log("Rendering container HTML...");
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
    console.log("Generated HTML:", html);
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
