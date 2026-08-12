import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  selectComposition,
  openBrowser,
} from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function start() {
  console.log("Iniciando renderizado...");
  
  const bundled = await bundle({
    entryPoint: path.resolve(__dirname, "../src/index.tsx"),
    webpackOverride: (config) => config,
  });

  const browser = await openBrowser("chrome", {
    browserExecutable: "/bin/chromium",
    chromiumOptions: {
      args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    },
    chromeMode: "chrome-for-testing",
  });

  const composition = await selectComposition({
    serveUrl: bundled,
    id: "main",
    puppeteerInstance: browser,
  });

  console.log("Renderizando frames...");

  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: "/mnt/documents/iamax_promo.mp4",
    puppeteerInstance: browser,
    muted: true,
    concurrency: 1,
  });

  console.log("Video guardado en /mnt/documents/iamax_promo.mp4");
  await browser.close({ silent: false });
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});