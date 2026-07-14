package com.unichat.core.common.web;

import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

class RequestIdFilterTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = standaloneSetup(new ProbeController())
            .addFilters(new RequestIdFilter())
            .build();
    }

    @Test
    void shouldEchoSafeRequestIdWhenHeaderIsValid() throws Exception {
        // Arrange and Act
        var result = mockMvc.perform(get("/test/request-id")
            .header(RequestIdFilter.REQUEST_ID_HEADER, "safe-request_123"));

        // Assert
        result
            .andExpect(status().isOk())
            .andExpect(header().string(
                RequestIdFilter.REQUEST_ID_HEADER,
                "safe-request_123"));
    }

    @Test
    void shouldGenerateRequestIdWhenHeaderContainsUnsafeCharacters() throws Exception {
        // Arrange and Act
        var result = mockMvc.perform(get("/test/request-id")
            .header(RequestIdFilter.REQUEST_ID_HEADER, "unsafe request id"));

        // Assert
        result
            .andExpect(status().isOk())
            .andExpect(header().string(
                RequestIdFilter.REQUEST_ID_HEADER,
                not("unsafe request id")))
            .andExpect(header().string(
                RequestIdFilter.REQUEST_ID_HEADER,
                matchesPattern("[0-9a-f-]{36}")));
    }

    @Test
    void shouldGenerateRequestIdWhenHeaderIsMissing() throws Exception {
        // Arrange and Act
        var result = mockMvc.perform(get("/test/request-id"));

        // Assert
        result
            .andExpect(status().isOk())
            .andExpect(header().string(
                RequestIdFilter.REQUEST_ID_HEADER,
                matchesPattern("[0-9a-f-]{36}")));
    }

    @RestController
    private static final class ProbeController {

        @GetMapping("/test/request-id")
        String probe() {
            return "ok";
        }
    }
}
