
const express = require("express");
const cors = require("cors");

require("./database");

const apiRoutes = require("./routes/apiRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Backend health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CalibraTrack Backend API is running!",
    database: "SQLite"
  });
});

// All application APIs
app.use("/api", apiRoutes);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found"
  });
});

// Start server
const PORT = 5000;

app.listen(PORT, () => {
  console.log("--------------------------------");
  console.log("CalibraTrack Backend Started");
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
  console.log("--------------------------------");
});
