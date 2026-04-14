const express = require("express");
const app = express();

async function getAccountValue(userId) {
  let totalValue = 0;
  let cursor = "";
  let pages = 0;

  do {
    const url = `https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?limit=100&sortOrder=Asc${cursor ? "&cursor=" + cursor : ""}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "RobloxAccountValueProxy/1.0" }
    });

    if (!res.ok) throw new Error(`Roblox API returned ${res.status}`);

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
  } while (cursor && pages < 20);

  return totalValue;
}

app.get("/value", async (req, res) => {
  const userId = req.query.userid;
  if (!userId) return res.status(400).json({ error: "Missing userid" });

  try {
    const value = await getAccountValue(userId);
    res.json({ value });
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: "Failed to fetch" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
