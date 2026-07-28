package com.unichat.core.document.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import com.unichat.core.config.RabbitMqConfig;

/**
 * Producer for publishing document ingestion messages to RabbitMQ.
 */
@Component
public class DocumentIngestionProducer {

    private static final Logger log = LoggerFactory.getLogger(DocumentIngestionProducer.class);

    private final RabbitTemplate rabbitTemplate;

    public DocumentIngestionProducer(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    /**
     * Publishes a document ingestion event to the RabbitMQ exchange.
     */
    public void sendIngestionMessage(DocumentIngestionMessage message) {
        log.info("Sending document ingestion message for documentId: {}", message.documentId());
        try {
            rabbitTemplate.convertAndSend(
                    RabbitMqConfig.INGESTION_EXCHANGE,
                    RabbitMqConfig.INGESTION_ROUTING_KEY,
                    message
            );
        } catch (Exception e) {
            log.error("Failed to publish RabbitMQ ingestion message for documentId: {}", message.documentId(), e);
            // Non-blocking fallback: exception logged, document status remains PENDING for retry
        }
    }
}
