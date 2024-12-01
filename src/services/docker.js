const { NodeSSH } = require("node-ssh");
const fs = require("fs");

class DockerService {
  constructor() {
    this.ssh = new NodeSSH();
  }

  async connect() {
    try {
      await this.ssh.connect({
        host: process.env.DROPLET_IP,
        username: process.env.DROPLET_USER,
        privateKey: fs.readFileSync(process.env.DROPLET_SSH_KEY, "utf8"),
      });
    } catch (error) {
      console.error("SSH Connection error:", error);
      throw new Error("Failed to connect to server");
    }
  }

  async getContainers() {
    try {
      const { stdout, stderr } = await this.ssh.execCommand(
        'docker ps -a --format "{{.ID}}\t{{.Image}}\t{{.Status}}\t{{.Names}}\t{{.State}}"'
      );

      if (stderr) {
        console.error("Docker command error:", stderr);
        return [];
      }

      return stdout
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [id, image, status, name, state] = line.split("\t");
          const isOffline = state !== "running";
          const downtime = isOffline ? this.parseDowntime(status) : null;

          return {
            id,
            image,
            status,
            name,
            state,
            isOffline,
            downtime,
          };
        })
        .filter((container) => !container.name.includes("portainer"));
    } catch (error) {
      console.error("Get containers error:", error);
      return [];
    }
  }

  parseDowntime(status) {
    // Status format example: "Exited (0) 2 hours ago"
    const match = status.match(/Exited \(\d+\) (.*) ago/);
    return match ? match[1] : "unknown time";
  }

  async getContainerLogs(containerId, lines = 10) {
    try {
      const { stdout, stderr } = await this.ssh.execCommand(
        `docker logs --tail ${lines} --timestamps ${containerId}`
      );
      return stdout || stderr;
    } catch (error) {
      console.error("Get logs error:", error);
      return "Failed to fetch logs";
    }
  }
}

module.exports = new DockerService();
