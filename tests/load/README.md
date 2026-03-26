# Load Testing with k6

Generate real, impressive performance metrics for your resume.

## Installation

### macOS
```bash
brew install k6
```

### Windows
```bash
choco install k6
```

### Linux
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Running Tests

### 1. Start your services

```bash
# Start Redis
docker-compose up redis -d

# Start the dev server
npm run dev
```

### 2. Run Load Test (Normal)

```bash
k6 run tests/load/k6-load-test.js
```

### 3. Run Stress Test (Extreme)

```bash
k6 run tests/load/k6-stress-test.js
```

### 4. Custom Configuration

```bash
# More users, longer duration
k6 run --vus 100 --duration 5m tests/load/k6-load-test.js

# With environment variable for different URL
k6 run -e BASE_URL=https://your-production-url.com tests/load/k6-load-test.js
```

## Understanding Results

### Key Metrics

| Metric | What It Means | Resume Target |
|--------|---------------|---------------|
| `http_req_duration p(95)` | 95% of requests faster than this | < 500ms |
| `http_req_duration p(99)` | 99% of requests faster than this | < 1000ms |
| `http_reqs` | Requests per second | Higher is better |
| `http_req_failed` | Error rate | < 1% |
| `cache_hit_rate` | Cache effectiveness | > 70% |

### Sample Output

```
📊 LOAD TEST RESULTS
========================================

Total Requests: 1547
Requests/sec: 25.78

Latency:
  P50: 45ms
  P95: 380ms
  P99: 520ms

Error Rate: 0.13%
Cache Hit Rate: 87.30%

📝 Resume Statements:
  • Load tested API handling 26 requests/second
  • Achieved P95 latency of 380ms under load
  • Maintained 99.87% success rate with 1547 requests
```

## Tips for Better Metrics

1. **Run Redis first** - Cache hits dramatically improve latency
2. **Use consistent test URLs** - Higher cache hit rate
3. **Run longer tests** - More data = more accurate metrics
4. **Test in production-like environment** - More realistic numbers

## Exporting Results

Results are saved to:
- `tests/load/results.json` - Load test results
- `tests/load/stress-results.json` - Stress test results

Use these JSON files as proof for your resume!




