import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";

const secretBytes = Buffer.from("foamsales-send-sms-hook-test-secret", "utf8");
const hookSecret = `v1,whsec_${secretBytes.toString("base64")}`;
const allowedPhone = "+966500000000";

async function randomPort(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return address.port;
}

function signedHeaders(rawBody) {
  const webhookId = "foamsales-hook-test";
  const webhookTimestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", secretBytes)
    .update(`${webhookId}.${webhookTimestamp}.${rawBody}`)
    .digest("base64");
  return {
    "content-type": "application/json",
    "webhook-id": webhookId,
    "webhook-timestamp": webhookTimestamp,
    "webhook-signature": `v1,${signature}`,
  };
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Next server exited with ${child.exitCode}`);
    try {
      const response = await fetch(url);
      if (response.status === 405) return;
    } catch {
      // Server is starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Timed out waiting for hook test server");
}

async function main() {
  let greenRequest = null;
  const greenServer = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      greenRequest = { url: request.url, body: JSON.parse(body) };
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ idMessage: "mock-message-id" }));
    });
  });
  const greenPort = await randomPort(greenServer);
  const probe = createServer();
  const nextPort = await randomPort(probe);
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", String(nextPort)],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ALLOWED_LOGIN_PHONE: allowedPhone,
        SUPABASE_SEND_SMS_HOOK_SECRET: hookSecret,
        GREEN_API_API_URL: `http://127.0.0.1:${greenPort}`,
        GREEN_API_ID_INSTANCE: "test-instance",
        GREEN_API_TOKEN_INSTANCE: "test-token",
      },
      stdio: "ignore",
      windowsHide: true,
    },
  );
  try {
    const hookUrl = `http://127.0.0.1:${nextPort}/api/auth/hooks/send-sms`;
    await waitForServer(hookUrl, child);
    const rawBody = JSON.stringify({ user: { phone: allowedPhone }, sms: { otp: "012345" } });
    const success = await fetch(hookUrl, { method: "POST", headers: signedHeaders(rawBody), body: rawBody });
    assert.equal(success.status, 200);
    assert.deepEqual(await success.json(), {});
    assert.equal(greenRequest?.url, "/waInstancetest-instance/sendMessage/test-token");
    assert.equal(greenRequest?.body.chatId, "966500000000@c.us");
    assert.match(greenRequest?.body.message ?? "", /012345/);

    const invalid = await fetch(hookUrl, {
      method: "POST",
      headers: { ...signedHeaders(rawBody), "webhook-signature": "v1,invalid" },
      body: rawBody,
    });
    assert.equal(invalid.status, 401);

    const otherBody = JSON.stringify({ user: { phone: "+966511111111" }, sms: { otp: "012345" } });
    const other = await fetch(hookUrl, { method: "POST", headers: signedHeaders(otherBody), body: otherBody });
    assert.equal(other.status, 403);
    console.log("✓ Signed Supabase Send SMS Hook invokes Green API mock and rejects invalid signature/phone");
  } finally {
    child.kill();
    await new Promise((resolve) => greenServer.close(resolve));
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Send SMS Hook mock failed");
  process.exitCode = 1;
});
