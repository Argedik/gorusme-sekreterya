// ============================================================
//  Küçük yerel sunucu — siteyi bilgisayarda denemek için.
//  Kullanım:  node dev-server.mjs     → http://localhost:8000
//  (Aynı ağdaki telefondan da açılabilir: http://<bilgisayar-ip>:8000)
// ============================================================

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const KOK = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8000;

const TIP = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
};

createServer(async (istek, cevap) => {
  let yol = decodeURIComponent(istek.url.split("?")[0]);
  if (yol === "/" || yol.endsWith("/")) yol += "index.html";

  try {
    const veri = await readFile(join(KOK, normalize(yol)));
    cevap.writeHead(200, {
      "Content-Type": TIP[extname(yol)] || "application/octet-stream",
      "Cache-Control": "no-store", // düzenlemeler anında görünsün
    });
    cevap.end(veri);
  } catch {
    cevap.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    cevap.end("Bulunamadı: " + yol);
  }
}).listen(PORT, () => {
  console.log(`Görüşme sitesi hazır → http://localhost:${PORT}`);
});
