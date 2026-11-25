import { check, sleep } from "k6";
import http from "k6/http";
import { Rate, Trend } from "k6/metrics";

/**
 * StackScout AI load test.
 *
 * Usage:
 *   k6 run loadtest/k6-script.js
 *   k6 run --vus 50 --duration 2m loadtest/k6-script.js   # heavier test
 *
 * Requires k6: https://k6.io/docs/get-started/installation/
 * Point BASE_URL at staging/production — never run heavy load against prod casually.
 */

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

const errorRate = new Rate("errors");
const pageDuration = new Trend("page_duration", true);

export const options = {
  stages: [
    { duration: "30s", target: 10 },   // ramp up
    { duration: "1m", target: 10 },    // steady
    { duration: "30s", target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"], // 95% under 2s
    errors: ["rate<0.05"],            // <5% errors
  },
};

const PAGES = [
  "/",
  "/features",
  "/pricing",
  "/how-it-works",
  "/auth/signin",
  "/auth/signup",
];

export default function stackscoutLoadTest() {
  // 1. Public pages should be fast (static/prerendered)
  const page = PAGES[Math.floor(Math.random() * PAGES.length)];
  const res = http.get(`${BASE_URL}${page}`);
  const ok = check(res, {
    "status 200": (r) => r.status === 200,
    "has html": (r) => r.body && r.body.length > 500,
  });
  errorRate.add(!ok);
  pageDuration.add(res.timings.duration);

  // 2. Health endpoint
  const health = http.get(`${BASE_URL}/api/health`);
  check(health, {
    "health 200/503": (r) => r.status === 200 || r.status === 503,
  });

  sleep(1);
}
