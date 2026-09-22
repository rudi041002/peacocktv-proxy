const express = require("express");
const request = require("request");

const app = express();
const PORT = process.env.PORT || 4000;

const TARGETS = {
  akam: "https://akam.stream.peacocktv.com/",
  cfrt: "https://cfrt.stream.peacocktv.com/",
  fsly: "https://fsly.stream.peacocktv.com/"
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";

app.use((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, Content-Type, Accept, Range"
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Content-Length, Content-Range, Accept-Ranges, Content-Type"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  if (req.path === "/") {
    return res.status(200).send("Multi Domain Proxy berjalan dengan baik.");
  }

  if (!["GET", "HEAD"].includes(req.method)) {
    return res.status(405).send("Method tidak dibenarkan.");
  }

  const parts = req.originalUrl.replace(/^\/+/, "").split("/");

  const source = parts.shift();
  const targetPrefix = TARGETS[source];

  if (!targetPrefix) {
    return res.status(400).send("Domain target tidak valid.");
  }

  const pathAndQuery = parts.join("/");
  const url = targetPrefix + pathAndQuery;

  console.log("Source:", source);
  console.log("Target:", url);

  const headers = {
    "User-Agent": USER_AGENT,
    "Accept": req.headers.accept || "*/*",
    "Accept-Encoding": "identity"
  };

  if (req.headers.range) {
    headers["Range"] = req.headers.range;
  }

  if (req.headers["accept-language"]) {
    headers["Accept-Language"] =
      req.headers["accept-language"];
  }

  const proxyReq = request({
    url,
    method: req.method,
    headers,
    followRedirect: true,
    gzip: false,
    timeout: 20000
  });

  proxyReq.on("response", proxyRes => {
    console.log("Status:", proxyRes.statusCode);
    console.log(
      "Content-Type:",
      proxyRes.headers["content-type"] || "-"
    );
    console.log(
      "Content-Length:",
      proxyRes.headers["content-length"] || "-"
    );

    const responseHeaders = {
      ...proxyRes.headers
    };

    delete responseHeaders["access-control-allow-origin"];
    delete responseHeaders["access-control-allow-methods"];
    delete responseHeaders["access-control-allow-headers"];
    delete responseHeaders["access-control-expose-headers"];

    res.status(proxyRes.statusCode);
    res.set(responseHeaders);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, HEAD, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, Content-Type, Accept, Range"
    );
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Length, Content-Range, Accept-Ranges, Content-Type"
    );
  });

  proxyReq.on("error", error => {
    console.error("Proxy error:", error.message);

    if (!res.headersSent) {
      res.status(502).send("Proxy gagal: " + error.message);
    }
  });

  proxyReq.pipe(res);
});

app.listen(PORT, () => {
  console.log(`Multi Domain Proxy berjalan di port ${PORT}`);
});