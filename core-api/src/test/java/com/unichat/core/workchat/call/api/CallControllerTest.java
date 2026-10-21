package com.unichat.core.workchat.call.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import com.unichat.core.common.error.GlobalErrorHandler;
import com.unichat.core.common.error.ProblemDetailFactory;
import com.unichat.core.workchat.call.domain.Call;
import com.unichat.core.workchat.call.domain.CallMedia;
import com.unichat.core.workchat.call.service.CallService;
import com.unichat.core.workchat.call.service.IceServerProvider;

/**
 * The URLs the call endpoints answer on.
 *
 * <p>Written after every one of them returned 500 in the browser while the
 * whole suite was green. The controller carried no class-level mapping, so it
 * registered {@code /conversations/{id}/calls} while every other controller —
 * and the frontend's {@code fetchJson}, which prepends {@code /api/v1} to each
 * path — assumed the versioned prefix. Nothing caught it because the feature's
 * tests all stopped at the service layer, and a mapping that is never
 * requested over HTTP is a mapping nobody has checked.
 */
class CallControllerTest {

    private static final UUID CALLER = UUID.fromString("019f83b4-71a3-7253-afbe-8979c3762e97");
    private static final UUID CONVERSATION = UUID.fromString("01a0c512-d8a5-75f7-87fe-df243846c25d");
    private static final UUID CALL = UUID.fromString("01a13000-0000-7000-8000-000000000001");

    private MockMvc mockMvc;
    private CallService callService;
    private IceServerProvider iceServers;

    /** Supplies the {@code @AuthenticationPrincipal Jwt} that standalone setup cannot. */
    private static final class StubJwtResolver implements HandlerMethodArgumentResolver {
        @Override
        public boolean supportsParameter(MethodParameter parameter) {
            return Jwt.class.equals(parameter.getParameterType());
        }

        @Override
        public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mav,
                                      NativeWebRequest request, WebDataBinderFactory binder) {
            return Jwt.withTokenValue("stub")
                    .header("alg", "none")
                    .subject(CALLER.toString())
                    .build();
        }
    }

    @BeforeEach
    void setUp() {
        callService = mock(CallService.class);
        iceServers = mock(IceServerProvider.class);

        mockMvc = standaloneSetup(new CallController(callService, iceServers))
                .setCustomArgumentResolvers(new StubJwtResolver())
                .setControllerAdvice(new GlobalErrorHandler(new ProblemDetailFactory(Clock.systemUTC())))
                .build();
    }

    private static Call ringing() {
        return Call.ring(CONVERSATION, CALLER, UUID.randomUUID(), CallMedia.AUDIO, Instant.now());
    }

    @Test
    @DisplayName("Starting a call answers under the versioned prefix the clients use")
    void shouldStartCallOnVersionedPath() throws Exception {
        when(callService.start(eq(CALLER), eq(CONVERSATION), eq(CallMedia.AUDIO))).thenReturn(ringing());

        mockMvc.perform(post("/api/v1/conversations/{id}/calls", CONVERSATION)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"media\":\"AUDIO\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("RINGING"));
    }

    @Test
    @DisplayName("Answering, refusing, hanging up and reporting failure all sit under the prefix")
    void shouldExposeLifecycleOnVersionedPaths() throws Exception {
        when(callService.answer(eq(CALLER), eq(CALL))).thenReturn(ringing());
        when(callService.decline(eq(CALLER), eq(CALL))).thenReturn(ringing());
        when(callService.hangUp(eq(CALLER), eq(CALL))).thenReturn(ringing());
        when(callService.reportFailed(eq(CALLER), eq(CALL))).thenReturn(ringing());

        for (String action : List.of("accept", "decline", "end", "failed")) {
            mockMvc.perform(post("/api/v1/calls/{id}/{action}", CALL, action))
                    .andExpect(status().isOk());
        }
    }

    @Test
    @DisplayName("The ICE server list sits under the prefix")
    void shouldExposeIceServersOnVersionedPath() throws Exception {
        when(iceServers.forCaller()).thenReturn(new IceServersResponse(List.of(), 600));

        mockMvc.perform(get("/api/v1/calls/ice-servers"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Call history sits under the prefix")
    void shouldExposeHistoryOnVersionedPath() throws Exception {
        when(callService.history(eq(CALLER), eq(CONVERSATION), any(Pageable.class)))
                .thenReturn(Page.empty());

        mockMvc.perform(get("/api/v1/conversations/{id}/calls", CONVERSATION));

        // Asserting the handler ran rather than the status: serialising a Page
        // needs the Spring Data web configuration the running application has
        // and a standalone MockMvc does not, so a status assertion here would
        // fail on the harness rather than on the routing this test is for.
        verify(callService).history(eq(CALLER), eq(CONVERSATION), any(Pageable.class));
    }
}
