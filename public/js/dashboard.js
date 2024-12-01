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
  }

  async getContainers() {
    const ssh = new SSH2Client();
    await ssh.connect(this.config);
    const result = await ssh.exec('docker ps --format "{{json .}}"');
    ssh.disconnect();
    return JSON.parse(`[${result.split("\n").filter(Boolean).join(",")}]`);
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
