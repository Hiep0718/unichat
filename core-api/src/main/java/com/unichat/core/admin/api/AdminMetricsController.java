package com.unichat.core.admin.api;

import java.util.Map;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.unichat.core.admin.service.AdminMetricsService;

/** Metadata-only system metrics within the selected reporting window. */
@RestController
@RequestMapping("/api/v1/admin/metrics")
@PreAuthorize("hasAuthority('SCOPE_ADMIN')")
public class AdminMetricsController {
    private final AdminMetricsService metrics;
    /** Receives durable auth/chat aggregation. */
    public AdminMetricsController(AdminMetricsService metrics) { this.metrics = metrics; }
    /** Returns measured counters/timing and explicit NO_DATA/partial coverage. */
    @GetMapping
    public Map<String, Object> get(@RequestParam(defaultValue = "28") @Min(1) @Max(45) int days) {
        return metrics.getMetrics(days);
    }
}
