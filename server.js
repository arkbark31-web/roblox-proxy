const express = require("express");
const app = express();

const cache = new Map();
const CACHE_TIME = 5 * 60 * 1000; // cache for 5 minutes

async function getAccountValue(userId) {
  const now = Date.now();
  const cached = cache.get(userId);
  if (cached && now - cached.time < CACHE_TIME) {
    return cached.value;
  }

  let totalValue = 0;
  let cursor = "";
  let pages = 0;
  let retries = 3;

  do {
    const url = `https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?limit=100&sortOrder=Asc${cursor ? "&cursor=" + cursor : ""}`;
    
    let res;
    let attempts = 0;
    while (attempts < retries) {
      res = await fetch(url, {
        headers: { "User-Agent": "RobloxAccountValue/1.0" }
      });
      if (res.status === 429) {
        attempts++;
        await new Promise(r => setTimeout(r, 2000 * attempts));
      } else {
        break;
      }
    }

    if (!res.ok) throw new Error("Roblox API " + res.status);

    const data = await res.json();
    if (Array.isArray(data.data)) {
      for (const item of data.data) {
        if (typeof item.recentAveragePrice === "number") {
          totalValue += item.recentAveragePrice;
        }
      }
    }

    cursor = data.nextPageCursor || "";
    pages++;
    await new Promise(r => setTimeout(r, 500));
  } while (cursor && pages < 20);

  cache.set(userId, { value: totalValue, time: now });
  return totalValue;
}

app.get("/value", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const userId = req.query.userid;
  if (!userId) return res.status(400).json({ error: "Missing userid" });

  try {
    const value = await getAccountValue(userId);
    res.json({ value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.json({ status: "running" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Proxy running on port " + PORT));
