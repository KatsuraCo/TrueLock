import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
const ordersPath = path.join(dataDir, "orders.json");

const port = Number(process.env.PORT || 8788);
const adminToken = process.env.ADMIN_TOKEN || "";
const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || "";
const corsOrigin = process.env.CORS_ORIGIN || "*";
const privateSeedPath = process.env.TRUELOCK_LICENSE_PRIVATE_SEED_PATH || "";
const privateSeedBase64 = process.env.TRUELOCK_LICENSE_PRIVATE_SEED_B64 || "";

function jsonResponse(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": corsOrigin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,x-admin-token,x-webhook-secret",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body, null, 2));
}

function fail(res, status, code, message) {
  jsonResponse(res, status, { ok: false, code, message });
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeOrderId(orderId) {
  return String(orderId || "").trim();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 64_000) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });
    req.on("error", reject);
  });
}

function loadOrders() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(ordersPath)) {
    return { orders: [] };
  }
  return JSON.parse(fs.readFileSync(ordersPath, "utf8"));
}

function saveOrders(state) {
  fs.mkdirSync(dataDir, { recursive: true });
  const tempPath = `${ordersPath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(state, null, 2));
  fs.renameSync(tempPath, ordersPath);
}

function findOrder(state, email, orderId) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedOrderId = normalizeOrderId(orderId);
  return state.orders.find(
    (order) =>
      normalizeEmail(order.email) === normalizedEmail &&
      normalizeOrderId(order.orderId) === normalizedOrderId,
  );
}

function requireAdmin(req) {
  return Boolean(adminToken) && req.headers["x-admin-token"] === adminToken;
}

function requireWebhook(req) {
  return Boolean(webhookSecret) && req.headers["x-webhook-secret"] === webhookSecret;
}

function base64Url(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function activationCodeFromSignedLicense(signedLicense) {
  return `CF${base64Url(Buffer.from(signedLicense, "utf8")).match(/.{1,4}/g).join("-")}`;
}

function stripBase64(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.privateKeyBase64 === "string") {
      return parsed.privateKeyBase64.trim();
    }
  } catch {
    // Continue with plain text formats.
  }
  const lines = text.split(/\r?\n/);
  const matchingLine = lines.find((line) => /private|seed/i.test(line));
  const candidates = [];
  if (matchingLine) {
    const afterSeparator = matchingLine.split(/[:=]/).pop();
    if (afterSeparator) candidates.push(afterSeparator);
    candidates.push(matchingLine);
  }
  candidates.push(text);
  for (const candidate of candidates) {
    const matches = candidate.match(/[A-Za-z0-9+/_=-]{40,}/g);
    if (matches?.length) {
      return matches.at(-1);
    }
  }
  return "";
}

function readPrivateSeed() {
  const raw = privateSeedBase64 || (privateSeedPath ? fs.readFileSync(privateSeedPath, "utf8") : "");
  const cleaned = stripBase64(raw).replaceAll("-", "+").replaceAll("_", "/").replaceAll("=", "");
  const padded = cleaned + "=".repeat((4 - (cleaned.length % 4)) % 4);
  const seed = Buffer.from(padded, "base64");
  if (seed.length !== 32) {
    throw new Error("TRUELOCK license private seed must be 32 bytes in base64.");
  }
  return seed;
}

function privateKeyFromSeed(seed) {
  const pkcs8Prefix = Buffer.from("302e020100300506032b657004220420", "hex");
  return crypto.createPrivateKey({
    key: Buffer.concat([pkcs8Prefix, seed]),
    format: "der",
    type: "pkcs8",
  });
}

function signLicense({ email, orderId, deviceId = "", plan = "pro" }) {
  const privateKey = privateKeyFromSeed(readPrivateSeed());
  const safeOrder = normalizeOrderId(orderId)
    .replace(/^TL[-_]?/i, "")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .slice(0, 28);
  const payload = {
    licenseId: `TL-${safeOrder || crypto.randomBytes(4).toString("hex").toUpperCase()}`,
    plan,
    deviceLimit: 1,
    issuedAt: new Date().toISOString(),
  };
  if (deviceId) payload.deviceId = String(deviceId).trim();

  const payloadJson = JSON.stringify(payload);
  const signature = crypto.sign(null, Buffer.from(payloadJson, "utf8"), privateKey).toString("base64");
  const signedLicense = JSON.stringify({ payload, signature });
  return {
    licenseId: payload.licenseId,
    activationCode: activationCodeFromSignedLicense(signedLicense),
    signedLicense,
    payload,
    emailHash: crypto.createHash("sha256").update(normalizeEmail(email)).digest("hex").slice(0, 16),
  };
}

function orderView(order) {
  return {
    email: order.email,
    orderId: order.orderId,
    paid: order.paid,
    plan: order.plan,
    maxActivations: order.maxActivations,
    activationCount: order.activations?.length || 0,
    createdAt: order.createdAt,
  };
}

async function createOrder(req, res, body, source) {
  if (source === "admin" && !requireAdmin(req)) {
    fail(res, 401, "admin_required", "Admin token is required.");
    return;
  }
  if (source === "webhook" && !requireWebhook(req)) {
    fail(res, 401, "webhook_required", "Webhook secret is required.");
    return;
  }

  const email = normalizeEmail(body.email);
  const orderId = normalizeOrderId(body.orderId || body.providerPaymentId);
  if (!email || !orderId) {
    fail(res, 400, "missing_order_fields", "Email and orderId are required.");
    return;
  }

  const state = loadOrders();
  let order = findOrder(state, email, orderId);
  if (!order) {
    order = {
      email,
      orderId,
      paid: true,
      plan: body.plan || "pro",
      maxActivations: Number(body.maxActivations || 1),
      provider: body.provider || source,
      providerPaymentId: body.providerPaymentId || "",
      amountUsd: body.amountUsd ?? 10,
      createdAt: new Date().toISOString(),
      activations: [],
    };
    state.orders.push(order);
  } else {
    order.paid = true;
    order.plan = body.plan || order.plan || "pro";
    order.maxActivations = Number(body.maxActivations || order.maxActivations || 1);
    order.provider = body.provider || order.provider || source;
    order.providerPaymentId = body.providerPaymentId || order.providerPaymentId || "";
    order.updatedAt = new Date().toISOString();
  }
  saveOrders(state);
  jsonResponse(res, 200, { ok: true, order: orderView(order) });
}

async function redeemLicense(res, body) {
  const email = normalizeEmail(body.email);
  const orderId = normalizeOrderId(body.orderId);
  const deviceId = String(body.deviceId || "").trim();
  if (!email || !orderId) {
    fail(res, 400, "missing_redeem_fields", "Email and order ID are required.");
    return;
  }

  const state = loadOrders();
  const order = findOrder(state, email, orderId);
  if (!order || !order.paid) {
    fail(res, 404, "order_not_found", "Paid order was not found.");
    return;
  }

  order.activations = Array.isArray(order.activations) ? order.activations : [];
  const existing = order.activations.find((activation) => (activation.deviceId || "") === deviceId);
  if (existing) {
    jsonResponse(res, 200, {
      ok: true,
      licenseId: existing.licenseId,
      activationCode: existing.activationCode,
      reused: true,
    });
    return;
  }

  if (order.activations.length >= Number(order.maxActivations || 1)) {
    fail(res, 409, "activation_limit_reached", "Activation limit reached for this order.");
    return;
  }

  const license = signLicense({
    email,
    orderId,
    deviceId,
    plan: order.plan || "pro",
  });
  order.activations.push({
    licenseId: license.licenseId,
    activationCode: license.activationCode,
    deviceId,
    createdAt: new Date().toISOString(),
  });
  order.updatedAt = new Date().toISOString();
  saveOrders(state);

  jsonResponse(res, 200, {
    ok: true,
    licenseId: license.licenseId,
    activationCode: license.activationCode,
    reused: false,
  });
}

async function issueDirect(req, res, body) {
  if (!requireAdmin(req)) {
    fail(res, 401, "admin_required", "Admin token is required.");
    return;
  }
  const license = signLicense({
    email: body.email || "manual@truelock.local",
    orderId: body.orderId || `MANUAL-${Date.now()}`,
    deviceId: body.deviceId || "",
    plan: body.plan || "pro",
  });
  jsonResponse(res, 200, {
    ok: true,
    licenseId: license.licenseId,
    activationCode: license.activationCode,
    payload: license.payload,
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    jsonResponse(res, 204, {});
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      jsonResponse(res, 200, { ok: true, service: "truelock-license", time: new Date().toISOString() });
      return;
    }

    if (req.method !== "POST") {
      fail(res, 404, "not_found", "Endpoint not found.");
      return;
    }

    const body = await readBody(req);
    if (url.pathname === "/api/orders/create") {
      await createOrder(req, res, body, "admin");
      return;
    }
    if (url.pathname === "/api/webhooks/payment") {
      await createOrder(req, res, body, "webhook");
      return;
    }
    if (url.pathname === "/api/licenses/redeem") {
      await redeemLicense(res, body);
      return;
    }
    if (url.pathname === "/api/licenses/issue") {
      await issueDirect(req, res, body);
      return;
    }

    fail(res, 404, "not_found", "Endpoint not found.");
  } catch (error) {
    fail(res, 500, "server_error", error.message || "Server error.");
  }
});

server.listen(port, () => {
  console.log(`TrueLock license backend listening on http://localhost:${port}`);
});
