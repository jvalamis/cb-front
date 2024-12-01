const express = require("express");
const router = express.Router();
const dockerService = require("../services/docker");

// Connect when the router is first used
let isConnected = false;
async function ensureConnection(req, res, next) {
  if (!isConnected) {
    try {
      await dockerService.connect();
      isConnected = true;
    } catch (error) {
      console.error("Failed to connect to Docker service:", error);
      return res
        .status(500)
        .json({ error: "Failed to connect to Docker service" });
    }
  }
  next();
}

router.use(ensureConnection);

router.get("/containers", async (req, res) => {
  try {
    const containers = await dockerService.getContainers();
    res.json(containers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/logs/:containerId", async (req, res) => {
  try {
    const logs = await dockerService.getContainerLogs(req.params.containerId);
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/execute", async (req, res) => {
  try {
    const { command } = req.body;
    const result = await dockerService.executeCommand(command);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
