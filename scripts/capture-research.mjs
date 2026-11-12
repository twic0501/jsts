import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const browserPath =
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

const browserExists = await fs
  .access(browserPath)
  .then(() => true)
  .catch(() => false);

if (!browserExists) {
  throw new Error("Không tìm thấy Microsoft Edge tại: " + browserPath);
}

const browser = await chromium.launch({
  headless: true,
  executablePath: browserPath,
  args: ["--enable-unsafe-swiftshader"],
});

try {
  const page = await browser.newPage({
    viewport: {
      width: 1440,
      height: 1000,
    },
    reducedMotion: "reduce",
  });

  const errors = [];

  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  // Chỉ giảm số lượng kết quả để phục vụ QA.
  // API, provider và model vẫn được chạy thực tế.
  await page.route("**/api/v3/research", async (route) => {
    const body = route.request().postDataJSON();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("Request research có body không hợp lệ.");
    }

    await route.continue({
      postData: JSON.stringify({
        ...body,
        topK: 6,
      }),
    });
  });

  await page.goto("http://127.0.0.1:8080");

  await page
    .getByLabel("Tìm bài báo", {
      exact: true,
    })
    .fill("Tôi muốn tìm phương pháp nhận diện vùng bệnh trong ảnh y tế");

  // Đăng ký chờ response trước khi gửi request.
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/v3/research"),
    {
      timeout: 120000,
    },
  );

  await page
    .getByRole("button", {
      name: "Tìm trong sách",
      exact: true,
    })
    .click();

  const apiResponse = await responsePromise;

  if (!apiResponse.ok()) {
    throw new Error("Research API trả về HTTP " + apiResponse.status());
  }

  const response = await apiResponse.json();

  const panel = page.getByRole("region", {
    name: "Dẫn chứng ngữ nghĩa",
  });

  await panel.waitFor({
    state: "visible",
    timeout: 120000,
  });

  // Chờ dẫn chứng thực sự xuất hiện.
  await panel.locator(".research-evidence").first().waitFor({
    state: "visible",
    timeout: 120000,
  });

  await fs.mkdir(path.join(root, ".local/screenshots"), { recursive: true });

  // Desktop screenshot.
  await page.screenshot({
    path: ".local/screenshots/research-desktop.png",
  });

  const desktopOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );

  // Evidence screenshot.
  await panel.locator(".research-evidence").first().scrollIntoViewIfNeeded();

  await page.screenshot({
    path: ".local/screenshots/research-evidence.png",
  });

  // Mobile screenshot.
  await page.setViewportSize({
    width: 390,
    height: 844,
  });

  await panel.evaluate((element) => {
    element.scrollTop = 0;
  });

  await page.waitForTimeout(400);

  await page.screenshot({
    path: ".local/screenshots/research-mobile.png",
  });

  const mobileOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );

  const research = response.research;

  const report = {
    date: new Date().toISOString(),

    realApi: true,
    requestedTopK: 6,

    status: apiResponse.status(),

    errors,

    desktopOverflow,
    mobileOverflow,

    mode: research?.mode,
    plan: research?.plan,
    claims: research?.claims,
    traceId: research?.traceId,

    quotes: await panel.locator("blockquote").count(),

    evidenceCount: await panel.locator(".research-evidence").count(),
  };

  await fs.writeFile(
    ".local/research-browser.json",
    JSON.stringify(report, null, 2),
  );

  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
