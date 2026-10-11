package com.unichat.core.admin.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Pure chart projection; unknown usage/rates stay null rather than measured zero. */
public final class ProviderMetricCharts {
    private ProviderMetricCharts() { }
    /** Builds one point per requested UTC day from database aggregates. */
    public static Map<String, Object> build(List<Map<String, Object>> rows, List<String> models, LocalDate first, int days) {
        List<Map<String, Object>> requests = new ArrayList<>(), errors = new ArrayList<>();
        List<Map<String, Object>> input = new ArrayList<>(), output = new ArrayList<>(), byModel = new ArrayList<>();
        for (int index = 0; index < days; index++) {
            String date = first.plusDays(index).toString();
            List<Map<String, Object>> daily = rows.stream().filter(row -> date.equals(row.get("day"))).toList();
            requests.add(requests(date, daily)); errors.add(errors(date, daily));
            input.add(usage(date, daily, models, "input_tokens"));
            output.add(usage(date, daily, models, "output_tokens"));
            byModel.add(usage(date, daily, models, "requests"));
        }
        return Map.of("chartRequestsSuccess", requests, "chartErrors", errors, "chartInputTokens", input,
                "chartOutputTokens", output, "chartRequestsPerModel", byModel);
    }
    /** Sums observed counts, without converting missing usage to a count. */
    public static long count(List<Map<String, Object>> rows, String field) {
        return rows.stream().map(row -> row.get(field)).filter(Number.class::isInstance)
                .map(Number.class::cast).mapToLong(Number::longValue).sum();
    }
    private static Map<String, Object> requests(String date, List<Map<String, Object>> rows) {
        long count = count(rows, "requests");
        Map<String, Object> point = new LinkedHashMap<>();
        point.put("date", date); point.put("requests", count);
        point.put("successRate", count == 0 ? null : count(rows, "successes") * 100.0 / count);
        return point;
    }
    private static Map<String, Object> errors(String date, List<Map<String, Object>> rows) {
        long total = count(rows, "errors"), limited = count(rows, "error429"), unavailable = count(rows, "error503");
        return Map.of("date", date, "error429", limited, "error503", unavailable,
                "errorOther", total - limited - unavailable, "totalErrors", total);
    }
    private static Map<String, Object> usage(String date, List<Map<String, Object>> rows, List<String> models, String field) {
        Map<String, Object> point = new LinkedHashMap<>(); point.put("date", date);
        for (String model : models) {
            Object value = rows.stream().filter(row -> model.equals(row.get("model")))
                    .findFirst().map(row -> row.get(field)).orElse(null);
            point.put(model, value);
        }
        return point;
    }
}
