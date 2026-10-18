package com.unichat.core.workchat.ws;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import com.unichat.core.shared.config.AllowedOrigins;

/**
 * STOMP over WebSocket for Work Chat.
 *
 * <p>Uses the in-memory broker rather than Redis or a broker relay. That keeps
 * delivery to a single process, which is a deliberate trade-off for the
 * deadline and is recorded as a limitation: running two instances would leave
 * each seeing only the clients connected to it.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompAuthChannelInterceptor authInterceptor;
    private final AllowedOrigins allowedOrigins;

    public WebSocketConfig(StompAuthChannelInterceptor authInterceptor,
                           AllowedOrigins allowedOrigins) {
        this.authInterceptor = authInterceptor;
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // An allowlist rather than a wildcard: a socket that any origin may open
        // is a socket any page the user visits can open on their behalf.
        //
        // The same list CORS uses. It used to be a separate single-valued
        // setting, so opening the app on a LAN address or a tunnel let HTTP
        // through and refused the socket — which reads as live delivery being
        // broken rather than as one more origin to configure.
        registry.addEndpoint("/ws/work-chat").setAllowedOrigins(allowedOrigins.asArray());
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Only user destinations are used: every message belongs to one
        // recipient, so there is no topic anyone else could subscribe to.
        registry.enableSimpleBroker("/queue");
        registry.setUserDestinationPrefix("/user");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(authInterceptor);
    }
}
