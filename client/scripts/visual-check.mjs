import { execFileSync, spawn } from "node:child_process";
import { access, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(scriptDir, "..");
const rootDir = resolve(clientDir, "..");
const screenshotDir = resolve(rootDir, "docs", "screenshots");
const apiUrl = "http://127.0.0.1:4010";
const appUrl = "http://127.0.0.1:4173";
const adminAccessKey = process.env.ADMIN_ACCESS_KEY || "VKU-ADMIN-2026";
const temporaryServerDir = await mkdtemp(resolve(tmpdir(), "vku-survey-e2e-"));
const children = [];
let browser;

try {
  execFileSync("npm", ["run", "build", "-w", "server"], {
    cwd: rootDir,
    stdio: "inherit"
  });
  execFileSync("npm", ["run", "build", "-w", "client"], {
    cwd: rootDir,
    env: { ...process.env, VITE_API_URL: apiUrl },
    stdio: "inherit"
  });

  children.push(
    spawn("node", [resolve(rootDir, "server", "dist", "index.js")], {
      cwd: temporaryServerDir,
      env: { ...process.env, PORT: "4010" },
      stdio: "ignore"
    })
  );
  children.push(
    spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", "4173"], {
      cwd: clientDir,
      stdio: "ignore"
    })
  );

  await Promise.all([waitForUrl(`${apiUrl}/health`), waitForUrl(appUrl)]);
  await mkdir(screenshotDir, { recursive: true });

  browser = await chromium.launch({
    executablePath: await findChromium(),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    geolocation: { latitude: 16.0544, longitude: 108.2022 },
    permissions: ["geolocation"],
    acceptDownloads: true
  });
  const page = await context.newPage();

  await page.goto(`${appUrl}/profile`);
  await page.getByLabel("Full name").fill("Nguyen Van An");
  await page.getByLabel("Student / staff ID").fill("24IT001");
  await page.getByLabel("Class / unit").fill("24IT1");
  await page.getByLabel("Phone").fill("0905000000");
  await page.getByLabel("Inspection group").fill("Group 03");
  await page.waitForTimeout(700);
  await page.reload();
  await page.getByLabel("Full name").waitFor();
  if ((await page.getByLabel("Full name").inputValue()) !== "Nguyen Van An") {
    throw new Error("Inspector profile was not restored after refresh.");
  }
  await page.screenshot({
    path: resolve(screenshotDir, "profile.png")
  });

  await page.goto(`${appUrl}/new`);
  await page.getByText("Assignment snapshot is ready").waitFor();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Building").selectOption("V");
  await page.getByLabel("Floor").selectOption("3");
  await page.getByLabel("Room number / custom room").fill("V301");
  await page.getByLabel("Room type").selectOption("Classroom");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Projector" }).click();
  await page.getByRole("button", { name: "OK" }).first().click();
  await page.getByRole("button", { name: "Issue" }).nth(1).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByTitle("2 star rating").click();
  await page.getByLabel("Severity").selectOption("High");
  await page.getByLabel("Priority").selectOption("Urgent");
  await page.getByLabel("Issue type").selectOption("Performance");
  await page.getByLabel("Recommended action").selectOption("Repair");
  await page.getByRole("button", { name: "Next" }).click();
  await page
    .getByLabel("Defect notes")
    .fill("Projector image is dim and flickers during operation.");
  await page.locator('input[type="file"]').setInputFiles({
    name: "evidence.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2jZsAAAAASUVORK5CYII=",
      "base64"
    )
  });
  await page.getByText("Photo attached").waitFor();
  await page.getByRole("button", { name: "Capture GPS" }).click();
  await page.getByText("GPS evidence captured.").waitFor();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByText("Ready to submit.").waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  await page.screenshot({
    path: resolve(screenshotDir, "new-survey.png")
  });
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByText("Submitted and synced successfully.").waitFor();
  await page.getByText("Needs Action").waitFor();
  await page.waitForTimeout(600);
  await page.getByRole("status", { name: "Synced" }).waitFor();

  await page.getByRole("link", { name: "Edit inspection" }).click();
  await page.getByTitle("Location").click();
  await page.getByLabel("Room number / custom room").fill("V302");
  await page.getByTitle("Review").click();
  await page
    .getByLabel("Reason for change")
    .fill("Corrected room after verification.");
  await page.waitForTimeout(700);
  await page.reload();
  await page.getByText("Edit inspection").waitFor();
  await page.getByTitle("Review").click();
  if ((await page.getByLabel("Reason for change").inputValue()) !== "Corrected room after verification.") {
    throw new Error("Survey edit draft was not restored after refresh.");
  }
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByText("Version 2 saved.").waitFor();
  await page.getByText("v2").waitFor();

  await page.goto(`${appUrl}/admin`);
  await page.getByLabel("Admin access key").fill("wrong-admin-key");
  await page.getByRole("button", { name: "Unlock admin" }).click();
  await page.getByRole("alert").waitFor();
  await page.getByLabel("Admin access key").fill(adminAccessKey);
  await page.getByRole("button", { name: "Unlock admin" }).click();
  await page.getByText("V302").first().waitFor();
  await page.getByRole("button", { name: /V302/ }).click();
  const adminDetail = page.locator("aside");
  await adminDetail.getByLabel("Review status").selectOption("IN_REVIEW");
  await adminDetail.getByLabel("Assigned to").fill("Facilities Team");
  await adminDetail.getByLabel("Admin note").fill("Projector lamp scheduled for inspection.");
  await adminDetail.getByRole("button", { name: "Save review" }).click();
  await page.getByText("updated to In Review").waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  await page.screenshot({
    path: resolve(screenshotDir, "admin.png")
  });

  await page.goto(`${appUrl}/surveys`);
  await page.getByText("V302").waitFor();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  await downloadPromise;
  await page.reload();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: resolve(screenshotDir, "history.png")
  });

  await page.goto(`${appUrl}/new`);
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Building").selectOption("A");
  await page.getByLabel("Floor").selectOption("2");
  await page.getByLabel("Room number / custom room").fill("A201");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByTitle("4 star rating").click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Defect notes").fill("Hardware is operational.");
  await page.getByRole("button", { name: "Next" }).click();
  await context.setOffline(true);
  await page.waitForTimeout(250);
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByText("Saved locally. It will sync when the network returns.").waitFor();
  await page.getByText("Pending Sync").waitFor();

  await context.setOffline(false);
  await page.getByRole("status", { name: "Synced" }).waitFor({ timeout: 15000 });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.goto(appUrl);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: resolve(screenshotDir, "home.png")
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await context.setOffline(true);
  await page.close();
  const offlinePage = await context.newPage();
  await offlinePage.goto(appUrl);
  await offlinePage.getByText("VKU Field Survey").waitFor();
  await context.setOffline(false);

  console.log("E2E checks passed: profile persistence, edit versioning, admin review, online/offline submit, auto-sync, export, GPS and offline boot.");
} finally {
  if (browser) await browser.close();
  for (const child of children) child.kill("SIGTERM");
  await rm(temporaryServerDir, { recursive: true, force: true });
}

async function waitForUrl(url) {
  const timeoutAt = Date.now() + 20000;

  while (Date.now() < timeoutAt) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The local process may still be starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function findChromium() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    "/snap/bin/chromium",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome"
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Continue to the next known browser path.
    }
  }

  throw new Error("Chromium was not found. Set CHROMIUM_PATH and retry.");
}
