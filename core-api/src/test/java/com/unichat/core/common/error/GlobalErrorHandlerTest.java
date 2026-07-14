package com.unichat.core.common.error;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.unichat.core.common.web.RequestIdFilter;

class GlobalErrorHandlerTest {

    private static final String REQUEST_ID = "request-test-123";

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        var clock = Clock.fixed(Instant.parse("2026-07-13T00:00:00Z"), ZoneOffset.UTC);
        var validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        var advice = new GlobalErrorHandler(new ProblemDetailFactory(clock));
        mockMvc = standaloneSetup(new FailureController())
            .setControllerAdvice(advice)
            .setValidator(validator)
            .addFilters(new RequestIdFilter())
            .build();
    }

    @Test
    void shouldReturnProblemDetailWhenResourceIsMissing() throws Exception {
        // Arrange and Act
        var result = mockMvc.perform(get("/test/missing")
            .header(RequestIdFilter.REQUEST_ID_HEADER, REQUEST_ID));

        // Assert
        result
            .andExpect(status().isNotFound())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
            .andExpect(header().string(RequestIdFilter.REQUEST_ID_HEADER, REQUEST_ID))
            .andExpect(jsonPath("$.code").value("NOT_FOUND"))
            .andExpect(jsonPath("$.requestId").value(REQUEST_ID))
            .andExpect(jsonPath("$.timestamp").value("2026-07-13T00:00:00Z"));
    }

    @Test
    void shouldReturnFieldErrorsWhenRequestBodyIsInvalid() throws Exception {
        // Arrange and Act
        var result = mockMvc.perform(post("/test/validated")
            .header(RequestIdFilter.REQUEST_ID_HEADER, REQUEST_ID)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"\"}"));

        // Assert
        result
            .andExpect(status().isUnprocessableContent())
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.fieldErrors.name[0]").value("Tên không được để trống."));
    }

    @Test
    void shouldReturnForbiddenProblemWhenActorLacksPermission() throws Exception {
        // Arrange and Act
        var result = mockMvc.perform(get("/test/forbidden")
            .header(RequestIdFilter.REQUEST_ID_HEADER, REQUEST_ID));

        // Assert
        result
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("FORBIDDEN"))
            .andExpect(jsonPath("$.detail").value(
                "Bạn không có quyền thực hiện thao tác này."));
    }

    @Test
    void shouldReturnFieldErrorsWhenRequestParameterIsInvalid() throws Exception {
        // Arrange and Act
        var result = mockMvc.perform(get("/test/parameter")
            .header(RequestIdFilter.REQUEST_ID_HEADER, REQUEST_ID)
            .param("limit", "0"));

        // Assert
        result
            .andExpect(status().isUnprocessableContent())
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.fieldErrors.limit[0]").value(
                "Giới hạn phải ít nhất là 1."));
    }

    @Test
    void shouldReturnValidationProblemWhenJsonIsMalformed() throws Exception {
        // Arrange and Act
        var result = mockMvc.perform(post("/test/validated")
            .header(RequestIdFilter.REQUEST_ID_HEADER, REQUEST_ID)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{"));

        // Assert
        result
            .andExpect(status().isUnprocessableContent())
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.detail").value("Nội dung JSON không hợp lệ."));
    }

    @Test
    void shouldHideUnexpectedErrorDetailsWhenServerFails() throws Exception {
        // Arrange and Act
        var result = mockMvc.perform(get("/test/unexpected")
            .header(RequestIdFilter.REQUEST_ID_HEADER, REQUEST_ID));

        // Assert
        result
            .andExpect(status().isInternalServerError())
            .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
            .andExpect(jsonPath("$.detail").value(
                "Hệ thống không thể xử lý yêu cầu lúc này."))
            .andExpect(content().string(org.hamcrest.Matchers.not(
                org.hamcrest.Matchers.containsString("database-password"))));
    }

    @RestController
    @RequestMapping("/test")
    private static final class FailureController {

        @GetMapping("/missing")
        String missing() {
            throw new NotFoundError("Không tìm thấy tài nguyên được yêu cầu.");
        }

        @PostMapping("/validated")
        String validated(@Valid @RequestBody TestRequest request) {
            return request.name();
        }

        @GetMapping("/parameter")
        String parameter(
            @RequestParam
            @Min(
                value = 1,
                message = "Giới hạn phải ít nhất là 1."
            )
            int limit
        ) {
            return String.valueOf(limit);
        }

        @GetMapping("/forbidden")
        String forbidden() {
            throw new AuthorizationError(
                "Bạn không có quyền thực hiện thao tác này.");
        }

        @GetMapping("/unexpected")
        String unexpected() {
            throw new IllegalStateException("database-password must stay server-side");
        }
    }

    private record TestRequest(
        @NotBlank(message = "Tên không được để trống.") String name
    ) {
    }
}
