package com.unichat.core.common.error;

import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.ProblemDetail;
import org.springframework.stereotype.Component;

import com.unichat.core.common.web.RequestIdFilter;

/**
 * Builds the stable RFC 7807 response contract for Core API failures.
 */
@Component
public final class ProblemDetailFactory {

    private final Clock clock;

    /**
     * Creates a factory using the application clock.
     *
     * @param clock application clock
     */
    public ProblemDetailFactory(Clock clock) {
        this.clock = clock;
    }

    /**
     * Builds a problem response for an expected application error.
     *
     * @param error expected application error
     * @param request current HTTP request
     * @param fieldErrors optional validation errors grouped by field
     * @return safe RFC 7807 problem response
     */
    public ProblemDetail create(
        AppError error,
        HttpServletRequest request,
        Map<String, List<String>> fieldErrors
    ) {
        var problem = ProblemDetail.forStatusAndDetail(error.getStatus(), error.getMessage());
        problem.setType(problemType(error.getCode()));
        problem.setTitle(error.getTitle());
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("code", error.getCode());
        problem.setProperty("requestId", requestId(request));
        problem.setProperty("timestamp", Instant.now(clock));
        if (!fieldErrors.isEmpty()) {
            problem.setProperty("fieldErrors", fieldErrors);
        }
        return problem;
    }

    private URI problemType(String code) {
        return URI.create("urn:unichat:problem:" + code.toLowerCase(Locale.ROOT));
    }

    private String requestId(HttpServletRequest request) {
        var requestId = request.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE);
        return requestId instanceof String value ? value : "unknown";
    }
}
