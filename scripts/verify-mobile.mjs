import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, isAbsolute, join, resolve, sep } from "node:path";

const chromeCandidates = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];
const chrome = chromeCandidates.find(existsSync);
if (!chrome)
  throw new Error("Chrome or Edge is required for the mobile browser check");

const systemTemp = resolve(tmpdir());
const profile = mkdtempSync(join(systemTemp, "foamsales-mobile-cdp-"));
assert.ok(isAbsolute(profile) && profile.startsWith(`${systemTemp}${sep}`));

const browserProcess = spawn(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { stdio: "ignore", windowsHide: true },
);

const sleep = (milliseconds) =>
  new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
const activePortFile = join(profile, "DevToolsActivePort");
for (
  let attempt = 0;
  attempt < 100 && !existsSync(activePortFile);
  attempt += 1
)
  await sleep(50);
if (!existsSync(activePortFile))
  throw new Error("Browser debugging endpoint did not start");
const port = readFileSync(activePortFile, "utf8").split(/\r?\n/)[0];
const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(
  (response) => response.json(),
);
const target = targets.find((item) => item.type === "page");
if (!target?.webSocketDebuggerUrl)
  throw new Error("Browser page target was not found");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolvePromise, rejectPromise) => {
  socket.addEventListener("open", resolvePromise, { once: true });
  socket.addEventListener("error", rejectPromise, { once: true });
});
let nextId = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(String(event.data));
  if (!message.id) return;
  const callbacks = pending.get(message.id);
  if (!callbacks) return;
  pending.delete(message.id);
  if (message.error) callbacks.reject(new Error(message.error.message));
  else callbacks.resolve(message.result);
});
const command = (method, params = {}) =>
  new Promise((resolvePromise, rejectPromise) => {
    const id = ++nextId;
    pending.set(id, { resolve: resolvePromise, reject: rejectPromise });
    socket.send(JSON.stringify({ id, method, params }));
  });

await command("Page.enable");
await command("Runtime.enable");
const outputDirectory = process.env.MOBILE_TEST_OUTPUT
  ? resolve(process.env.MOBILE_TEST_OUTPUT)
  : null;
if (outputDirectory) mkdirSync(outputDirectory, { recursive: true });
const cases = [
  { width: 320, path: "/", name: "home" },
  { width: 375, path: "/sales/new", name: "sales-375" },
  { width: 390, path: "/", name: "home-390" },
  { width: 430, path: "/reports", name: "reports-430" },
];

const results = [];
for (const testCase of cases) {
  await command("Emulation.setDeviceMetricsOverride", {
    width: testCase.width,
    height: 900,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: testCase.width,
    screenHeight: 900,
  });
  await command("Page.navigate", {
    url: `http://localhost:3100${testCase.path}`,
  });
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const state = await command("Runtime.evaluate", {
      expression: `JSON.stringify({
        ready: document.readyState,
        path: location.pathname,
        hasText: document.body.innerText.trim().length > 0
      })`,
      returnByValue: true,
    });
    if (typeof state.result.value !== "string") {
      await sleep(50);
      continue;
    }
    const navigationState = JSON.parse(state.result.value);
    const expectedPath = testCase.path;
    if (navigationState.ready === "complete" && navigationState.path === expectedPath && navigationState.hasText) break;
    await sleep(50);
  }
  await sleep(500);
  await command("Runtime.evaluate", { expression: "window.scrollTo(0, 0)" });
  const evaluation = await command("Runtime.evaluate", {
    expression: `JSON.stringify({
      title: document.title,
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      text: document.body.innerText.slice(0, 120)
    })`,
    returnByValue: true,
  });
  const metrics = JSON.parse(evaluation.result.value);
  assert.equal(metrics.viewport, testCase.width, `${testCase.path} viewport`);
  assert.ok(
    metrics.documentWidth <= testCase.width,
    `${testCase.path} document width ${metrics.documentWidth} exceeds ${testCase.width}`,
  );
  assert.ok(
    metrics.bodyWidth <= testCase.width,
    `${testCase.path} body width ${metrics.bodyWidth} exceeds ${testCase.width}`,
  );
  assert.ok(metrics.text.length > 0, `${testCase.path} should render content`);
  results.push({ ...testCase, ...metrics });
  if (outputDirectory) {
    const shot = await command("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
      fromSurface: true,
    });
    writeFileSync(
      join(outputDirectory, `${testCase.width}-${basename(testCase.name)}.png`),
      Buffer.from(shot.data, "base64"),
    );
  }
}

console.log(JSON.stringify(results, null, 2));
console.log("✓ Public calculator and administration fit 320, 375, 390 and 430px");
const earlyBrowserExit = new Promise((resolvePromise) => {
  browserProcess.once("exit", resolvePromise);
});
try {
  await command("Browser.close");
} catch {
  browserProcess.kill();
}
await Promise.race([earlyBrowserExit, sleep(5000)]);
socket.close();
rmSync(profile, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
process.exit(0);

await command("Emulation.setDeviceMetricsOverride", {
  width: 320,
  height: 900,
  deviceScaleFactor: 1,
  mobile: true,
  screenWidth: 320,
  screenHeight: 900,
});
await command("Page.navigate", { url: "http://localhost:3100/sales/new" });
for (let attempt = 0; attempt < 200; attempt += 1) {
  const ready = await command("Runtime.evaluate", {
    expression: `location.pathname === "/sales/new" && document.readyState === "complete" && Boolean(document.querySelector("details"))`,
    returnByValue: true,
  });
  if (ready.result.value === true) break;
  await sleep(50);
}
await sleep(300);
const paymentSection = await command("Runtime.evaluate", {
  expression: `(() => {
    const details = document.querySelector("details");
    if (!details) return { error: "missing payment details" };
    details.open = true;
    const label = [...document.querySelectorAll("label")].find((item) => item.textContent.includes("حالة السداد"));
    const select = label ? document.getElementById(label.htmlFor) : null;
    if (!select) return { error: "missing payment mode" };
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(select, "partial");
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return { options: [...select.options].map((option) => option.textContent) };
  })()`,
  returnByValue: true,
});
assert.equal(paymentSection.result.value.error, undefined, paymentSection.result.value.error);
assert.deepEqual(paymentSection.result.value.options, [
  "بدون تسجيل دفعة",
  "آجل",
  "مدفوع جزئيًا",
  "مدفوع بالكامل",
]);
await sleep(300);
const paymentMobileMetrics = await command("Runtime.evaluate", {
  expression: `(() => {
    const label = [...document.querySelectorAll("label")].find((item) => item.textContent.includes("المبلغ المدفوع"));
    const input = label ? document.getElementById(label.htmlFor) : null;
    return {
      documentWidth: document.documentElement.scrollWidth,
      inputWidth: input?.getBoundingClientRect().width ?? 0,
      parentWidth: input?.parentElement?.getBoundingClientRect().width ?? 0,
      summaries: document.body.innerText.includes("إجمالي الفاتورة") && document.body.innerText.includes("المتبقي بعد الدفعة"),
    };
  })()`,
  returnByValue: true,
});
assert.ok(paymentMobileMetrics.result.value.documentWidth <= 320);
assert.ok(paymentMobileMetrics.result.value.inputWidth > 0);
assert.equal(paymentMobileMetrics.result.value.inputWidth, paymentMobileMetrics.result.value.parentWidth);
assert.equal(paymentMobileMetrics.result.value.summaries, true);
if (outputDirectory) {
  await command("Runtime.evaluate", {
    expression: `document.querySelector("details")?.scrollIntoView({ block: "start" })`,
  });
  await sleep(200);
  const paymentShot = await command("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    fromSurface: true,
  });
  writeFileSync(
    join(outputDirectory, "320-initial-payment.png"),
    Buffer.from(paymentShot.data, "base64"),
  );
}

if (process.env.RUN_LIVE_SUPABASE_UI_TESTS === "1") {
  await command("Runtime.evaluate", {
    expression: `localStorage.setItem("foam_sales_pressure_costs", JSON.stringify([{
    id: "mobile-test-pressure",
    pressure: 8,
    standardBlockCost: 200,
    createdAt: "2026-07-22T00:00:00.000Z",
    updatedAt: "2026-07-22T00:00:00.000Z"
  }]))`,
  });
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 900,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: 390,
    screenHeight: 900,
  });
  await command("Page.navigate", { url: "http://localhost:3100/sales/new" });
  await sleep(700);
  const fillResult = await command("Runtime.evaluate", {
    expression: `(() => {
    const control = (text) => {
      const label = [...document.querySelectorAll("label")].find((item) => item.textContent.includes(text));
      return label ? document.getElementById(label.htmlFor) : null;
    };
    const setValue = (text, value) => {
      const element = control(text);
      if (!element) throw new Error("Missing control: " + text);
      const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, value);
      element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
    };
    setValue("الطول", "100");
    setValue("العرض", "120");
    setValue("الارتفاع", "400");
    setValue("الضغط", "8");
    setValue("الكمية", "2");
    setValue("سعر بيع الوحدة", "500");
    return true;
  })()`,
    returnByValue: true,
  });
  assert.equal(fillResult.result.value, true);
  await sleep(500);
  const automaticCost = await command("Runtime.evaluate", {
    expression: `JSON.stringify({
    status: document.body.innerText.includes("تكلفة محسوبة تلقائيًا"),
    value: [...document.querySelectorAll("label")].find((item) => item.textContent.includes("تكلفة الوحدة"))?.nextElementSibling?.value
  })`,
    returnByValue: true,
  });
  const automaticState = JSON.parse(automaticCost.result.value);
  assert.equal(automaticState.status, true);
  assert.equal(automaticState.value, "200");
  await command("Runtime.evaluate", {
    expression: `(() => {
    const label = [...document.querySelectorAll("label")].find((item) => item.textContent.includes("تكلفة الوحدة"));
    const input = label.nextElementSibling;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, "150");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  })()`,
    returnByValue: true,
  });
  await sleep(400);
  const manualCost = await command("Runtime.evaluate", {
    expression: `JSON.stringify({
    status: document.body.innerText.includes("تكلفة معدلة يدويًا"),
    value: [...document.querySelectorAll("label")].find((item) => item.textContent.includes("تكلفة الوحدة"))?.nextElementSibling?.value,
    reset: [...document.querySelectorAll("button")].some((button) => button.textContent.includes("إعادة احتساب التكلفة"))
  })`,
    returnByValue: true,
  });
  const manualState = JSON.parse(manualCost.result.value);
  assert.deepEqual(manualState, { status: true, value: "150", reset: true });
  await command("Runtime.evaluate", {
    expression: `(() => {
    const label = [...document.querySelectorAll("label")].find((item) => item.textContent.includes("الطول"));
    const input = label.nextElementSibling;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, "50");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  })()`,
    returnByValue: true,
  });
  await sleep(300);
  const persistedManual = await command("Runtime.evaluate", {
    expression: `([...document.querySelectorAll("label")].find((item) => item.textContent.includes("تكلفة الوحدة"))?.nextElementSibling?.value)`,
    returnByValue: true,
  });
  assert.equal(persistedManual.result.value, "150");
  await command("Runtime.evaluate", {
    expression: `([...document.querySelectorAll("button")].find((button) => button.textContent.includes("إعادة احتساب التكلفة"))).click()`,
  });
  await sleep(300);
  const resetCost = await command("Runtime.evaluate", {
    expression: `JSON.stringify({
    status: document.body.innerText.includes("تكلفة محسوبة تلقائيًا"),
    value: [...document.querySelectorAll("label")].find((item) => item.textContent.includes("تكلفة الوحدة"))?.nextElementSibling?.value
  })`,
    returnByValue: true,
  });
  assert.deepEqual(JSON.parse(resetCost.result.value), {
    status: true,
    value: "100",
  });
  if (outputDirectory) {
    await command("Runtime.evaluate", {
      expression: `([...document.querySelectorAll("label")].find((item) => item.textContent.includes("تكلفة الوحدة"))).scrollIntoView({ block: "center" })`,
    });
    await sleep(200);
    const invoiceShot = await command("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
      fromSurface: true,
    });
    writeFileSync(
      join(outputDirectory, "390-invoice-cost.png"),
      Buffer.from(invoiceShot.data, "base64"),
    );
  }
}

await command("Page.navigate", { url: "http://localhost:3100/" });
await sleep(800);
const workerCheck = await command("Runtime.evaluate", {
  expression:
    "navigator.serviceWorker.getRegistration('/').then(registration => Boolean(registration && registration.active))",
  awaitPromise: true,
  returnByValue: true,
});
assert.equal(
  workerCheck.result.value,
  true,
  "Service worker should be active on localhost",
);

console.log(JSON.stringify(results, null, 2));
console.log(
  "✓ Mobile widths, required routes and active service worker verified",
);
const browserExited = new Promise((resolvePromise) => {
  browserProcess.once("exit", resolvePromise);
});
try {
  await command("Browser.close");
} catch {
  browserProcess.kill();
}
await Promise.race([browserExited, sleep(5000)]);
socket.close();
rmSync(profile, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
