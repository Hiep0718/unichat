package com.unichat.core.document.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import com.unichat.core.config.RabbitMqConfig;
import com.unichat.core.document.domain.DocumentStatus;
import com.unichat.core.document.service.DocumentService;

/**
 * Consumer for document ingestion result messages published by AI Service over RabbitMQ.
 */
@Component
public class IngestionResultConsumer {

    private static final Logger log = LoggerFactory.getLogger(IngestionResultConsumer.class);

    private final DocumentService documentService;

    public IngestionResultConsumer(DocumentService documentService) {
        this.documentService = documentService;
    }

    @RabbitListener(queues = RabbitMqConfig.INGESTION_RESULT_QUEUE)
    public void handleIngestionResult(IngestionResultMessage message) {
        log.info("Received ingestion result for documentId={}: success={}, chunkCount={}",
                message.documentId(), message.success(), message.chunkCount());
        DocumentStatus newStatus = message.success() ? DocumentStatus.PROCESSED : DocumentStatus.FAILED;
        try {
            documentService.updateIngestionResult(message.documentId(), newStatus, message.chunkCount());
        } catch (Exception e) {
            log.error("Failed to update ingestion result for documentId={}", message.documentId(), e);
        }
    }
}
