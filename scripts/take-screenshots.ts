/**
 * Take screenshots of all app pages using real UI sign-in.
 */
import { chromium, type Browser } from "playwright";
import { prisma } from "../src/lib/prisma";

const BASE_URL = "http://localhost:3000";

async function screenshot(page: any, name: string, path: string, fullPage = true) {
  await page.screenshot({ path, fullPage });
  console.log(`✓ ${name} -> ${path}`);
}

async function signIn(page: any, email: string, password: string, targetUrl: string) {
  await page.goto(`${BASE_URL}/coach/sign-in`, { waitUntil: "load" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for session cookie to appear (HttpOnly — must check via context)
  let attempts = 0;
  while (attempts < 50) {
    const cookies = await page.context().cookies();
    if (cookies.some((c: any) => c.name === 'next-auth.session-token')) {
      break;
    }
    await page.waitForTimeout(100);
    attempts++;
  }
  
  // Navigate to target URL
  await page.goto(`${BASE_URL}${targetUrl}`, { waitUntil: "load" });
}

async function signOut(page: any) {
  await page.goto(`${BASE_URL}/`, { waitUntil: "load" });
  const signOutBtn = page.locator('text=התנתק');
  if (await signOutBtn.isVisible().catch(() => false)) {
    await signOutBtn.click();
    await page.waitForTimeout(1000);
  }
}

async function main() {
  const fs = require("fs");
  const outDir = "./screenshots";
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser: Browser = await chromium.launch({ headless: true });

  // ── 1. Landing Page (no auth) ──
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`${BASE_URL}/`, { waitUntil: "load" });
    await screenshot(page, "Landing Page", `${outDir}/01-landing.png`);
    await page.close();
  }

  // ── 2. Coach Sign-in (no auth) ──
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`${BASE_URL}/coach/sign-in`, { waitUntil: "load" });
    await screenshot(page, "Coach Sign-in", `${outDir}/08-coach-signin.png`);
    await page.close();
  }

  // ── Sign in as ATHLETE ──
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await signIn(page, "athlete@triforce.app", "demo1234", "/dashboard");
    await page.waitForTimeout(500);

    // 3. Athlete Dashboard
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await screenshot(page, "Athlete Dashboard", `${outDir}/02-athlete-dashboard.png`);

    // 4. Activities List
    await page.goto(`${BASE_URL}/activities`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await screenshot(page, "Activities List", `${outDir}/03-activities-list.png`);

    // 5. Activity Detail
    const activity = await prisma.activity.findFirst({
      where: { userId: "cmpwzoh6v0001tfvkourmy72b" },
      orderBy: { startDate: "desc" },
    });
    if (activity) {
      await page.goto(`${BASE_URL}/activities/${activity.id}`, { waitUntil: "load" });
      await page.waitForTimeout(2000);
      await screenshot(page, "Activity Detail", `${outDir}/04-activity-detail.png`);
    }

    // 6. Challenges List
    await page.goto(`${BASE_URL}/challenges`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await screenshot(page, "Challenges List", `${outDir}/05-challenges-list.png`);

    // 7. Challenge Detail
    const challenge = await prisma.challenge.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    if (challenge) {
      await page.goto(`${BASE_URL}/challenges/${challenge.id}`, { waitUntil: "load" });
      await page.waitForTimeout(1500);
      await screenshot(page, "Challenge Detail", `${outDir}/06-challenge-detail.png`);
    }

    // 8. Settings
    await page.goto(`${BASE_URL}/settings`, { waitUntil: "load" });
    await page.waitForTimeout(1000);
    await screenshot(page, "Settings", `${outDir}/07-settings.png`);

    await signOut(page);
    await page.close();
  }

  // ── Sign in as COACH ──
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await signIn(page, "demo@triforce.app", "demo1234", "/coach");
    await page.waitForTimeout(500);

    // 9. Coach Dashboard
    await page.goto(`${BASE_URL}/coach`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await screenshot(page, "Coach Dashboard", `${outDir}/09-coach-dashboard.png`);

    // 10. Coach Groups
    await page.goto(`${BASE_URL}/coach/groups`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await screenshot(page, "Coach Groups", `${outDir}/10-coach-groups.png`);

    await page.close();
  }

  await browser.close();
  console.log("\nAll screenshots saved to ./screenshots/");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
