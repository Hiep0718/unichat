package com.unichat.core.communitychat.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Configures WebSocket and STOMP messaging for real-time community chat.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Use in-memory simple broker for now. 
        // In a multi-node environment, this can be switched to StompBrokerRelay (e.g. RabbitMQ).
        // We will use Redis separately for presence tracking and distributed state.
        config.enableSimpleBroker("/topic", "/queue");
        
        // Prefix for messages sent from client to server (e.g. /app/chat)
        config.setApplicationDestinationPrefixes("/app");
        
        // Prefix for targeting specific users
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // The endpoint clients will connect to. Uses SockJS fallback if needed.
        registry.addEndpoint("/ws/community")
                .setAllowedOriginPatterns("*") // In production, restrict to FRONTEND_ORIGIN
                .withSockJS();
    }
}
