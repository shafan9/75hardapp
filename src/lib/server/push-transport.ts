import "server-only";

import type { ClientRequest, IncomingMessage } from "node:http";
import { request } from "node:https";
import { parse } from "node:url";
import webpush from "web-push";

const PUSH_DEADLINE_MS = 10_000;
const MAX_RESPONSE_BYTES = 16 * 1024;

// Both reminder and test delivery use this boundary, including stored subscriptions.
export async function sendBoundedPush(subscription: webpush.PushSubscription, payload: string): Promise<void> {
  const details = webpush.generateRequestDetails(subscription, payload);
  // Preserve web-push's endpoint parsing, encryption and VAPID behavior.
  const endpoint = parse(details.endpoint);

  await new Promise<void>((resolve, reject) => {
    let outgoing: ClientRequest | undefined;
    let incoming: IncomingMessage | undefined;
    let settled = false;

    function fail(message: string) {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      // Keep the status used by the caller to retire 404/410 subscriptions.
      const error = Object.assign(new Error(message), { statusCode: incoming?.statusCode });
      incoming?.destroy();
      outgoing?.destroy();
      reject(error);
    }

    // This deadline includes DNS, connect, TLS, headers and body. Activity cannot reset it.
    const deadline = setTimeout(() => fail("Push delivery deadline exceeded."), PUSH_DEADLINE_MS);

    try {
      outgoing = request({
        hostname: endpoint.hostname,
        port: endpoint.port,
        path: endpoint.path,
        method: details.method,
        headers: details.headers,
        maxHeaderSize: MAX_RESPONSE_BYTES,
      }, (response) => {
        incoming = response;
        if (settled) {
          response.destroy();
          return;
        }
        let receivedBytes = 0;
        response.on("data", (chunk: Buffer) => {
          receivedBytes += chunk.length;
          if (receivedBytes > MAX_RESPONSE_BYTES) {
            fail("Push response exceeded the byte limit.");
          }
          // The application never consumes provider response bodies; do not retain them.
        });
        response.on("error", () => fail("Push response failed."));
        response.on("aborted", () => fail("Push response aborted."));
        response.on("close", () => {
          if (!response.complete) fail("Push response closed before completion.");
        });
        response.on("end", () => {
          if (settled) return;
          const status = response.statusCode ?? 0;
          if (status < 200 || status > 299) {
            fail("Push provider rejected the delivery.");
            return;
          }
          settled = true;
          clearTimeout(deadline);
          resolve();
        });
      });
      outgoing.on("error", () => fail("Push request failed."));
      outgoing.on("close", () => {
        if (!incoming) fail("Push request closed before a response.");
      });
      outgoing.end(details.body ?? undefined);
    } catch {
      fail("Push request could not be created.");
    }
  });
}
