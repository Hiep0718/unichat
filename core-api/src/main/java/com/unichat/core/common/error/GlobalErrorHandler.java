package com.unichat.core.common.error;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.context.MessageSourceResolvable;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.validation.method.ParameterValidationResult;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Converts Core API failures into safe RFC 7807 responses and structured logs.
 */
@RestControllerAdvice
public final class GlobalErrorHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(GlobalErrorHandler.class);
    private static final String VALIDATION_DETAIL = "Dữ liệu yêu cầu không hợp lệ.";

    private final ProblemDetailFactory problemDetailFactory;

    /**
     * Creates the global handler with the shared problem response factory.
     *
     * @param problemDetailFactory problem response factory
     */
    public GlobalErrorHandler(ProblemDetailFactory problemDetailFactory) {
        this.problemDetailFactory = problemDetailFactory;
    }

    /**
     * Handles expected typed application failures.
     *
     * @param error   typed application failure
     * @param request current request
     * @return safe problem response
     */
    @ExceptionHandler(AppError.class)
    public ResponseEntity<ProblemDetail> handleAppError(
            AppError error,
            HttpServletRequest request) {
        logExpected(error, request);
        return response(error, request, Map.of());
    }

    /**
     * Handles request body validation failures.
     *
     * @param error   Spring validation failure
     * @param request current request
     * @return validation problem response
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleMethodValidation(
            MethodArgumentNotValidException error,
            HttpServletRequest request) {
        var validationError = new ValidationError(VALIDATION_DETAIL);
        logExpected(validationError, request);
        return response(validationError, request, fieldErrors(error));
    }

    /**
     * Handles validation failures for request parameters and path variables.
     *
     * @param error   Spring method validation failure
     * @param request current request
     * @return validation problem response
     */
    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ProblemDetail> handleHandlerMethodValidation(
            HandlerMethodValidationException error,
            HttpServletRequest request) {
        var validationError = new ValidationError(VALIDATION_DETAIL);
        logExpected(validationError, request);
        return response(validationError, request, methodErrors(error));
    }

    /**
     * Handles constraint validation failures outside request bodies.
     *
     * @param error   constraint validation failure
     * @param request current request
     * @return validation problem response
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ProblemDetail> handleConstraintViolation(
            ConstraintViolationException error,
            HttpServletRequest request) {
        var validationError = new ValidationError(VALIDATION_DETAIL);
        logExpected(validationError, request);
        return response(validationError, request, constraintErrors(error));
    }

    /**
     * Handles malformed JSON without exposing parser internals.
     *
     * @param error   malformed request failure
     * @param request current request
     * @return validation problem response
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ProblemDetail> handleUnreadableMessage(
            HttpMessageNotReadableException error,
            HttpServletRequest request) {
        var validationError = new ValidationError("Nội dung JSON không hợp lệ.");
        logExpected(validationError, request);
        return response(validationError, request, Map.of());
    }

    /**
     * Handles unexpected failures with a safe response and detailed server log.
     *
     * @param error   unexpected failure
     * @param request current request
     * @return internal problem response
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleUnexpectedError(
            Exception error,
            HttpServletRequest request) {
        var internalError = new InternalError();
        logUnexpected(internalError, error, request);
        return response(internalError, request, Map.of());
    }

    private ResponseEntity<ProblemDetail> response(
            AppError error,
            HttpServletRequest request,
            Map<String, List<String>> fieldErrors) {
        var problem = problemDetailFactory.create(error, request, fieldErrors);
        return ResponseEntity.status(error.getStatus()).body(problem);
    }

    private Map<String, List<String>> fieldErrors(MethodArgumentNotValidException error) {
        return error.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.groupingBy(
                        FieldError::getField,
                        LinkedHashMap::new,
                        Collectors.mapping(this::message, Collectors.toList())));
    }

    private String message(MessageSourceResolvable error) {
        return Objects.requireNonNullElse(error.getDefaultMessage(), "Giá trị không hợp lệ.");
    }

    private Map<String, List<String>> methodErrors(
            HandlerMethodValidationException error) {
        var errors = new LinkedHashMap<String, List<String>>();
        for (var result : error.getParameterValidationResults()) {
            var messages = result.getResolvableErrors().stream()
                    .map(this::message)
                    .toList();
            errors.computeIfAbsent(parameterName(result), ignored -> new ArrayList<>())
                    .addAll(messages);
        }
        return errors;
    }

    private String parameterName(ParameterValidationResult result) {
        var parameter = result.getMethodParameter();
        var name = parameter.getParameterName();
        return name != null ? name : "argument" + parameter.getParameterIndex();
    }

    private Map<String, List<String>> constraintErrors(ConstraintViolationException error) {
        return error.getConstraintViolations().stream()
                .collect(Collectors.groupingBy(
                        violation -> violation.getPropertyPath().toString(),
                        LinkedHashMap::new,
                        Collectors.mapping(violation -> violation.getMessage(), Collectors.toList())));
    }

    private void logExpected(AppError error, HttpServletRequest request) {
        try (var operation = MDC.putCloseable("operation", operation(request));
                var code = MDC.putCloseable("errorCode", error.getCode());
                var status = MDC.putCloseable("status", String.valueOf(error.getStatus().value()))) {
            LOGGER.warn("request_failed");
        }
    }

    private void logUnexpected(
            AppError appError,
            Exception cause,
            HttpServletRequest request) {
        try (var operation = MDC.putCloseable("operation", operation(request));
                var code = MDC.putCloseable("errorCode", appError.getCode());
                var status = MDC.putCloseable("status", String.valueOf(appError.getStatus().value()))) {
            LOGGER.error("request_failed", sanitized(cause));
        }
    }

    private Throwable sanitized(Exception cause) {
        var sanitized = new RuntimeException(cause.getClass().getName());
        sanitized.setStackTrace(cause.getStackTrace());
        return sanitized;
    }

    private String operation(HttpServletRequest request) {
        return request.getMethod() + " " + request.getRequestURI();
    }
}
