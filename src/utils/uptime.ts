/**
 * UPTIME TRACKER
 * Tracks application availability and health check history
 *
 * Resume metrics you can get from this:
 * - "Maintained 99.9% uptime over 30 days"
 * - "Achieved 99.95% SLA compliance"
 */

type HealthCheckResult = {
  timestamp: number;
  healthy: boolean;
  responseTimeMs: number;
  checks: {
    api: boolean;
    memory: boolean;
  };
};

class UptimeTracker {
  private readonly startTime = Date.now();
  private healthChecks: HealthCheckResult[] = [];
  private readonly maxChecks = 8640; // 24 hours at 10-second intervals
  private totalDowntimeMs = 0;
  private lastCheckTime = Date.now();
  private lastHealthy = true;

  /**
   * Record a health check result
   */
  recordHealthCheck(result: HealthCheckResult) {
    // Track downtime
    const timeSinceLastCheck = result.timestamp - this.lastCheckTime;
    if (!this.lastHealthy) {
      this.totalDowntimeMs += timeSinceLastCheck;
    }
    this.lastCheckTime = result.timestamp;
    this.lastHealthy = result.healthy;

    this.healthChecks.push(result);
    if (this.healthChecks.length > this.maxChecks) {
      this.healthChecks = this.healthChecks.slice(-this.maxChecks);
    }
  }

  /**
   * Calculate uptime percentage
   * This is the big number for your resume: "99.9% uptime"
   */
  getUptimePercentage(windowMs: number = 86400000): number {
    const totalTime = Date.now() - this.startTime;
    if (totalTime === 0) return 100;

    const uptimeMs = totalTime - this.totalDowntimeMs;
    return (uptimeMs / totalTime) * 100;
  }

  /**
   * Get uptime in human-readable format
   */
  getUptime() {
    const uptimeMs = Date.now() - this.startTime;
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    return {
      startTime: new Date(this.startTime).toISOString(),
      uptimeMs,
      formatted: `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`,
      uptimePercentage: Math.round(this.getUptimePercentage() * 1000) / 1000,
      totalDowntimeMs: this.totalDowntimeMs,
      healthChecksRecorded: this.healthChecks.length,
    };
  }

  /**
   * Get SLA compliance status
   * Use this to show you understand SLAs in interviews
   */
  getSLACompliance() {
    const uptime = this.getUptimePercentage();
    return {
      currentUptime: uptime.toFixed(3) + "%",
      slaStatus: {
        "99.0%": uptime >= 99.0 ? "✅ COMPLIANT" : "❌ VIOLATION",
        "99.9%": uptime >= 99.9 ? "✅ COMPLIANT" : "❌ VIOLATION",
        "99.95%": uptime >= 99.95 ? "✅ COMPLIANT" : "❌ VIOLATION",
        "99.99%": uptime >= 99.99 ? "✅ COMPLIANT" : "❌ VIOLATION",
      },
      // Allowed downtime per month for each SLA level
      allowedDowntime: {
        "99.0%": "7h 18m/month",
        "99.9%": "43m 50s/month",
        "99.95%": "21m 55s/month",
        "99.99%": "4m 23s/month",
      },
    };
  }

  /**
   * Get recent health check history
   */
  getRecentChecks(count: number = 10): HealthCheckResult[] {
    return this.healthChecks.slice(-count);
  }

  /**
   * Perform a health check and record it
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const start = performance.now();

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryHealthy = memoryUsage.heapUsed < memoryUsage.heapTotal * 0.9; // Less than 90% heap used

    const result: HealthCheckResult = {
      timestamp: Date.now(),
      healthy: memoryHealthy,
      responseTimeMs: performance.now() - start,
      checks: {
        api: true, // If this code runs, API is up
        memory: memoryHealthy,
      },
    };

    this.recordHealthCheck(result);
    return result;
  }
}

// Singleton instance
export const uptime = new UptimeTracker();

// Start automatic health checks every 30 seconds
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      uptime.performHealthCheck();
    },
    30 * 1000
  );
}




