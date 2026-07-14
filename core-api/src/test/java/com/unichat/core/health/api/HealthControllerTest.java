package com.unichat.core.health.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;


class HealthControllerTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        var clock = Clock.fixed(Instant.parse("2026-07-13T00:00:00Z"), ZoneOffset.UTC);
        mockMvc = standaloneSetup(new HealthController(clock)).build();
    }

    @Test
    void shouldReturnHealthWhenRequestIsAnonymous() throws Exception {
        // Arrange and Act
        var result = mockMvc.perform(get("/api/v1/health"));

        // Assert
        result
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("ok"))
            .andExpect(jsonPath("$.service").value("core-api"))
            .andExpect(jsonPath("$.timestamp").value("2026-07-13T00:00:00Z"));
    }

}