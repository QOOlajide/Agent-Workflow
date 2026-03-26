# Observability Guide

This document explains the observability stack for the Agent Workflow application, including Prometheus metrics collection and Grafana visualization.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Metrics Reference](#metrics-reference)
- [PromQL Examples](#promql-examples)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Agent Workflow application uses a production-grade observability stack:

| Component | Purpose | Port |
|-----------|---------|------|
| **Prometheus** | Metrics collection and storage | 9090 |
| **Grafana** | Metrics visualization and dashboards | 3001 |
| **Application** | Exposes `/api/prometheus` endpoint | 3000 |

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Network (monitoring)                   │
│                                                                  │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐   │
│  │   Next.js    │      │  Prometheus  │      │   Grafana    │   │
│  │     App      │◄─────│   (scrape)   │─────►│ (visualize)  │   │
│  │  :3000       │      │   :9090      │      │   :3001      │   │
│  └──────────────┘      └──────────────┘      └──────────────┘   │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────┐                                               │
│  │    Redis     │                                               │
│  │    :6379     │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Set Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env and set your Grafana password
# GRAFANA_ADMIN_PASSWORD=your-secure-password
```

### 2. Start the Stack

```bash
# Start all services
docker-compose up -d

# Check service health
docker-compose ps
```

### 3. Access the Dashboards

| Service | URL | Credentials |
|---------|-----|-------------|
| **Application** | http://localhost:3000 | - |
| **Grafana** | http://localhost:3001 | admin / (your password) |
| **Prometheus** | http://localhost:9090 | - |

### 4. View Metrics

- Open Grafana at http://localhost:3001
- Login with admin / (your GRAFANA_ADMIN_PASSWORD)
- Navigate to Dashboards → Agent Workflow - API Metrics

---

## Metrics Reference

### Metric Naming Conventions

| Suffix | Type | Description | Example |
|--------|------|-------------|---------|
| `_total` | Counter | Monotonically increasing count | `http_requests_total` |
| `_seconds` | Histogram | Duration in seconds | `http_request_duration_seconds` |
| `_bucket` | Histogram | Auto-generated bucket series | `http_request_duration_seconds_bucket` |
| `_sum` | Histogram | Auto-generated sum series | `http_request_duration_seconds_sum` |
| `_count` | Histogram | Auto-generated count series | `http_request_duration_seconds_count` |

### HTTP Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_requests_total` | Counter | method, route, status_code | Total HTTP requests |
| `http_request_errors_total` | Counter | method, route, status_code | HTTP 5xx errors |
| `http_request_duration_seconds` | Histogram | method, route | Request latency |

**Histogram buckets:** 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2s, 5s

### Agent/Workflow Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `agent_workflow_executions_total` | Counter | workflow_type, status | Workflow executions |
| `agent_workflow_duration_seconds` | Histogram | workflow_type | Workflow duration |
| `agent_queue_in_flight` | Gauge | workflow_type | Currently running workflows |

**Status values:** `success`, `failure`, `timeout`

**Workflow types:** `firecrawl`, `openai`

### Cache Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `cache_hit_total` | Counter | cache_name | Cache hits |
| `cache_miss_total` | Counter | cache_name | Cache misses |

**Cache names:** `scrape` (Firecrawl results)

### Default Node.js Metrics

The application also exposes default Node.js metrics via `prom-client`:

- `process_cpu_user_seconds_total` - CPU time in user mode
- `process_resident_memory_bytes` - Resident memory size
- `nodejs_eventloop_lag_seconds` - Event loop lag
- `nodejs_active_handles_total` - Active handles
- And more...

---

## PromQL Examples

### HTTP Latency

```promql
# P50 HTTP latency (aggregate by le FIRST, then compute quantile)
histogram_quantile(0.50, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))

# P95 HTTP latency
histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))

# P99 HTTP latency
histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))

# P99 HTTP latency by route
histogram_quantile(0.99, sum by (le, route) (rate(http_request_duration_seconds_bucket[5m])))
```

### Workflow Latency

```promql
# P95 workflow duration by type
histogram_quantile(0.95, sum by (le, workflow_type) (rate(agent_workflow_duration_seconds_bucket[5m])))
```

### Cache Metrics

```promql
# Cache hit ratio (computed via PromQL, NOT pre-computed in code)
sum(rate(cache_hit_total[5m])) / (sum(rate(cache_hit_total[5m])) + sum(rate(cache_miss_total[5m])))

# Cache hit ratio by cache name
sum by (cache_name) (rate(cache_hit_total[5m])) / 
  (sum by (cache_name) (rate(cache_hit_total[5m])) + sum by (cache_name) (rate(cache_miss_total[5m])))
```

### Error Rates

```promql
# Error rate percentage (5xx errors only)
sum(rate(http_request_errors_total[5m])) / sum(rate(http_requests_total[5m])) * 100
```

### Throughput

```promql
# Requests per second (overall)
sum(rate(http_requests_total[5m]))

# Requests per second by route
sum by (route) (rate(http_requests_total[5m]))
```

---

## Security Considerations

### 1. Internal-Only Metrics Endpoint

The `/api/prometheus` endpoint is designed for **internal use only**:

- Prometheus scrapes via Docker internal network (`app:3000`)
- Requests with `X-Forwarded-For` or `X-Real-IP` headers are rejected
- **Do NOT expose this endpoint through a public reverse proxy**

### 2. Low-Cardinality Labels

Labels are designed to keep cardinality low:

| Label | Values | Notes |
|-------|--------|-------|
| `method` | GET, POST, PUT, DELETE | HTTP methods |
| `route` | Static paths | e.g., `/api/firecrawl/scrape` |
| `status_code` | HTTP codes | e.g., 200, 400, 500 |
| `workflow_type` | firecrawl, openai | Workflow types |
| `cache_name` | scrape | Cache identifiers |

**Avoid:** User IDs, request IDs, prompts, URLs, or any dynamic values in labels.

### 3. Grafana Authentication

- Default admin password is set via `GRAFANA_ADMIN_PASSWORD` environment variable
- Never commit credentials to version control
- Change the default password in production

### 4. Prometheus Retention

- Data retention is set to 15 days (`--storage.tsdb.retention.time=15d`)
- This prevents unbounded disk usage

---

## Troubleshooting

### Metrics Not Appearing in Prometheus

1. Check if the app is running:
   ```bash
   curl http://localhost:3000/api/prometheus
   ```

2. Check Prometheus targets:
   - Go to http://localhost:9090/targets
   - Verify `agent-workflow-api` is UP

3. Check Prometheus logs:
   ```bash
   docker-compose logs prometheus
   ```

### Grafana Dashboard Empty

1. Wait 15-30 seconds for initial scrape
2. Make some API requests to generate metrics:
   ```bash
   curl -X POST http://localhost:3000/api/firecrawl/scrape \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com"}'
   ```
3. Check that Prometheus data source is configured correctly

### Cache Metrics Not Updating

1. Ensure Redis is running:
   ```bash
   docker-compose ps redis
   ```

2. Make requests that hit/miss cache:
   ```bash
   # First request = cache miss
   curl -X POST http://localhost:3000/api/firecrawl/scrape \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com"}'
   
   # Second request = cache hit
   curl -X POST http://localhost:3000/api/firecrawl/scrape \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com"}'
   ```

---

## Resume-Worthy Metrics

Once you have traffic flowing through the system, you can generate resume-worthy statements like:

- "Achieved P99 latency of **Xms** under load"
- "Maintained **X%** cache hit rate with Redis caching"
- "Reduced API response time by **X%** through caching (Xms → Xms)"
- "Built production observability with Prometheus + Grafana dashboards"
- "Implemented metrics instrumentation tracking P50/P95/P99 latencies"

---

## Further Reading

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [prom-client (Node.js)](https://github.com/siimon/prom-client)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)
