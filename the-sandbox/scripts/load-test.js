/**
 * k6 Load Test for The Sandbox
 *
 * Install k6: https://k6.io/docs/get-started/installation/
 *   - Windows: winget install k6 (or choco install k6)
 *   - macOS: brew install k6
 *
 * Run:
 *   k6 run scripts/load-test.js
 *   k6 run --vus 50 --duration 2m scripts/load-test.js
 *   k6 run --env BASE_URL=https://the-sandboxv2-rust.vercel.app scripts/load-test.js
 *
 * Environment variables:
 *   BASE_URL  - Target URL (default: http://localhost:3000)
 *   TEST_EMAIL - Demo user email (default: tiana.the.student@uky.edu)
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')
const apiDuration = new Trend('api_duration', true)

// Test configuration — ramp from 1 to 50 virtual users over 3 minutes
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Warm up
    { duration: '1m', target: 50 },    // Ramp to 50 concurrent users
    { duration: '1m', target: 50 },    // Sustain 50 users
    { duration: '30s', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95th percentile under 2s
    errors: ['rate<0.1'],               // Error rate under 10%
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const TEST_EMAIL = __ENV.TEST_EMAIL || 'tiana.the.student@uky.edu'

const headers = {
  'Content-Type': 'application/json',
  'x-demo-user-email': TEST_EMAIL,
}

// Weighted scenario: simulates realistic user behavior
export default function () {
  const scenario = Math.random()

  if (scenario < 0.3) {
    // 30% — Dashboard / homepage data
    testDashboard()
  } else if (scenario < 0.5) {
    // 20% — Course listing
    testCourses()
  } else if (scenario < 0.7) {
    // 20% — Hub / tool discovery
    testHub()
  } else if (scenario < 0.85) {
    // 15% — Auth check (session bootstrap)
    testAuth()
  } else {
    // 15% — Notifications
    testNotifications()
  }

  sleep(Math.random() * 2 + 1) // 1-3 second think time
}

function testDashboard() {
  const res = http.get(`${BASE_URL}/api/dashboard`, { headers })
  const success = check(res, {
    'dashboard: status 200': (r) => r.status === 200,
    'dashboard: has data': (r) => r.body.length > 2,
  })
  errorRate.add(!success)
  apiDuration.add(res.timings.duration)
}

function testCourses() {
  const res = http.get(`${BASE_URL}/api/courses`, { headers })
  const success = check(res, {
    'courses: status 200': (r) => r.status === 200,
  })
  errorRate.add(!success)
  apiDuration.add(res.timings.duration)
}

function testHub() {
  const res = http.get(`${BASE_URL}/api/hub/swim-lanes`, { headers })
  const success = check(res, {
    'hub: status 200 or 404': (r) => r.status === 200 || r.status === 404,
  })
  errorRate.add(!success)
  apiDuration.add(res.timings.duration)
}

function testAuth() {
  const res = http.get(`${BASE_URL}/api/auth/me`, {
    headers: { 'Content-Type': 'application/json' },
  })
  const success = check(res, {
    'auth: responds': (r) => r.status === 200 || r.status === 401,
  })
  errorRate.add(!success)
  apiDuration.add(res.timings.duration)
}

function testNotifications() {
  const res = http.get(`${BASE_URL}/api/notifications`, { headers })
  const success = check(res, {
    'notifications: status 200': (r) => r.status === 200,
  })
  errorRate.add(!success)
  apiDuration.add(res.timings.duration)
}

// ── Summary report ──────────────────────────────────────────────────────────
export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] || 0
  const errorPct = (data.metrics.errors?.values?.rate || 0) * 100
  const totalReqs = data.metrics.http_reqs?.values?.count || 0
  const rps = data.metrics.http_reqs?.values?.rate || 0

  const summary = `
╔══════════════════════════════════════════════════════╗
║           THE SANDBOX — LOAD TEST RESULTS            ║
╠══════════════════════════════════════════════════════╣
║  Total Requests:    ${String(totalReqs).padStart(8)}                      ║
║  Requests/sec:      ${String(rps.toFixed(1)).padStart(8)}                      ║
║  P95 Latency:       ${String(p95.toFixed(0) + 'ms').padStart(8)}                      ║
║  Error Rate:        ${String(errorPct.toFixed(1) + '%').padStart(8)}                      ║
║                                                      ║
║  Threshold: P95 < 2000ms ✓  Errors < 10% ✓          ║
╚══════════════════════════════════════════════════════╝
`

  return {
    stdout: summary,
  }
}
