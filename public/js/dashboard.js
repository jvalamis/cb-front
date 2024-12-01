class DockerService {
  constructor() {
    if (!isAuthenticated()) {
      window.location.href = "/cb-front/login.html";
      return;
    }

    this.config = {
      host: "165.227.19.34",
      username: "root",
      privateKey: CONFIG.sshKey,
    };

    // Initialize SSH client
    this.ssh = new window.SSH2.Client();
  }

  async getContainers() {
    try {
      await this.ssh.connect(this.config);
      const result = await this.ssh.exec('docker ps --format "{{json .}}"');
      this.ssh.disconnect();
      return JSON.parse(`[${result.split("\n").filter(Boolean).join(",")}]`);
    } catch (error) {
      console.error("SSH Error:", error);
      throw error;
    }
  }

  async init() {
    const containersDiv = document.getElementById("containers");
    try {
      const containers = await this.getContainers();
      containersDiv.innerHTML = this.renderContainers(containers);
    } catch (error) {
      containersDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
  }

  renderContainers(containers) {
    return containers
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
  }
}

// Initialize dashboard when page loads
document.addEventListener("DOMContentLoaded", () => {
  const docker = new DockerService();
  docker.init();
});
