const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());

// 🔥 Serve frontend (IMPORTANT)
app.use(express.static(path.join(__dirname, "../")));

// 🔥 Root route (frontend)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../index.html"));
});

// 🔥 Aircraft API
app.get("/aircraft", async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: "Missing lat/lon" });
    }

    const range = 2; // ~200km

    const lamin = parseFloat(lat) - range;
    const lamax = parseFloat(lat) + range;
    const lomin = parseFloat(lon) - range;
    const lomax = parseFloat(lon) + range;

    const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;

    console.log("Fetching:", url);

    const response = await fetch(url);
    const data = await response.json();

    res.json(data);

  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Failed to fetch aircraft" });
  }
});

// 🔥 Start server
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
}); 