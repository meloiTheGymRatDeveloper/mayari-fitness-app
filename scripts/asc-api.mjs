// App Store Connect API helper — uses ES256 JWT (Node built-in crypto, no deps).
//
// Usage:
//   node scripts/asc-api.mjs <command> [args...]
//
// Commands:
//   ping                                  - verify auth works (lists apps)
//   list-apps                             - list all apps
//   list-iaps <appId>                     - list in-app purchases (consumables/etc)
//   list-subs <appId>                     - list subscription groups + subscriptions
//   list-versions <appId>                 - list app store versions
//   list-submissions <appId>              - list review submissions
//   get <path>                            - arbitrary GET (e.g. /v1/apps)
//   post <path> <jsonFile>                - arbitrary POST with body from JSON file
//   delete <path>                         - arbitrary DELETE

import { readFileSync, writeFileSync } from "node:fs";
import { createSign } from "node:crypto";

const KEY_ID = "675583KFM7";
const ISSUER_ID = "514e7f11-e6c2-4dfc-bd78-e18d869b0a7f";
const KEY_PATH = "C:\\Users\\Julie Arceta\\Downloads\\AuthKey_675583KFM7.p8";

function base64UrlEncode(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function generateToken() {
  const privateKey = readFileSync(KEY_PATH, "utf8");
  const header = { alg: "ES256", kid: KEY_ID, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: ISSUER_ID,
    iat: now,
    exp: now + 20 * 60, // 20 min
    aud: "appstoreconnect-v1",
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signer = createSign("SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign({
    key: privateKey,
    dsaEncoding: "ieee-p1363", // App Store Connect requires raw r||s, not DER
  });
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

async function apiRequest(method, path, body) {
  const token = generateToken();
  const url = path.startsWith("http")
    ? path
    : `https://api.appstoreconnect.apple.com${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, ok: res.ok, body: parsed };
}

function pretty(obj) {
  return JSON.stringify(obj, null, 2);
}

async function main() {
  const [, , cmd, ...args] = process.argv;

  if (!cmd) {
    console.log("Usage: node scripts/asc-api.mjs <command> [args...]");
    process.exit(1);
  }

  switch (cmd) {
    case "ping":
    case "list-apps": {
      const r = await apiRequest("GET", "/v1/apps");
      console.log(`Status: ${r.status}`);
      if (r.ok && r.body?.data) {
        console.log(
          `Found ${r.body.data.length} app(s):`,
        );
        for (const app of r.body.data) {
          console.log(`  - ${app.attributes.name} (${app.attributes.bundleId}) → id: ${app.id}`);
        }
      } else {
        console.log(pretty(r.body));
      }
      break;
    }

    case "list-subs": {
      const appId = args[0];
      if (!appId) throw new Error("appId required");
      const groups = await apiRequest("GET", `/v1/apps/${appId}/subscriptionGroups`);
      console.log(`Subscription Groups: ${groups.status}`);
      if (!groups.ok) {
        console.log(pretty(groups.body));
        break;
      }
      for (const g of groups.body.data) {
        console.log(`\nGroup: ${g.attributes.referenceName} → id: ${g.id}`);
        const subs = await apiRequest(
          "GET",
          `/v1/subscriptionGroups/${g.id}/subscriptions?include=appStoreReviewScreenshot&fields[subscriptions]=productId,name,state,subscriptionPeriod`,
        );
        if (!subs.ok) {
          console.log(pretty(subs.body));
          continue;
        }
        for (const s of subs.body.data) {
          console.log(
            `  - ${s.attributes.productId} | state: ${s.attributes.state} | period: ${s.attributes.subscriptionPeriod} → id: ${s.id}`,
          );
        }
      }
      break;
    }

    case "list-iaps": {
      const appId = args[0];
      if (!appId) throw new Error("appId required");
      const r = await apiRequest("GET", `/v1/apps/${appId}/inAppPurchasesV2?limit=200`);
      console.log(`Status: ${r.status}`);
      if (r.ok && r.body?.data) {
        for (const i of r.body.data) {
          console.log(
            `  - ${i.attributes.productId} | type: ${i.attributes.inAppPurchaseType} | state: ${i.attributes.state} → id: ${i.id}`,
          );
        }
      } else {
        console.log(pretty(r.body));
      }
      break;
    }

    case "list-versions": {
      const appId = args[0];
      if (!appId) throw new Error("appId required");
      const r = await apiRequest(
        "GET",
        `/v1/apps/${appId}/appStoreVersions?limit=10`,
      );
      console.log(`Status: ${r.status}`);
      if (r.ok && r.body?.data) {
        for (const v of r.body.data) {
          console.log(
            `  - ${v.attributes.versionString} | platform: ${v.attributes.platform} | state: ${v.attributes.appStoreState} → id: ${v.id}`,
          );
        }
      } else {
        console.log(pretty(r.body));
      }
      break;
    }

    case "list-submissions": {
      const appId = args[0];
      if (!appId) throw new Error("appId required");
      // First find the app store version submissions
      const r = await apiRequest(
        "GET",
        `/v1/reviewSubmissions?filter[app]=${appId}&filter[platform]=IOS&include=items&limit=10`,
      );
      console.log(`Status: ${r.status}`);
      console.log(pretty(r.body));
      break;
    }

    case "get": {
      const path = args[0];
      const r = await apiRequest("GET", path);
      console.log(`Status: ${r.status}`);
      console.log(pretty(r.body));
      break;
    }

    case "post": {
      const path = args[0];
      const bodyFile = args[1];
      const body = JSON.parse(readFileSync(bodyFile, "utf8"));
      const r = await apiRequest("POST", path, body);
      console.log(`Status: ${r.status}`);
      console.log(pretty(r.body));
      break;
    }

    case "delete": {
      const path = args[0];
      const r = await apiRequest("DELETE", path);
      console.log(`Status: ${r.status}`);
      console.log(pretty(r.body));
      break;
    }

    case "patch": {
      const path = args[0];
      const bodyFile = args[1];
      const body = JSON.parse(readFileSync(bodyFile, "utf8"));
      const r = await apiRequest("PATCH", path, body);
      console.log(`Status: ${r.status}`);
      console.log(pretty(r.body));
      break;
    }

    default:
      console.log(`Unknown command: ${cmd}`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
