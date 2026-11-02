package com.unichat.core.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Spring AMQP RabbitMQ Configuration for Document Ingestion and Delete Saga.
 */
@Configuration
@EnableScheduling
public class RabbitMqConfig {

    public static final String INGESTION_EXCHANGE = "unichat.ingestion.exchange";
    public static final String INGESTION_QUEUE = "unichat.ingestion.queue";
    public static final String INGESTION_ROUTING_KEY = "document.uploaded";

    public static final String INGESTION_RESULT_QUEUE = "unichat.ingestion.result.queue";
    public static final String INGESTION_RESULT_ROUTING_KEY = "document.ingestion.result";

    public static final String DLQ_EXCHANGE = "unichat.dlq.exchange";
    public static final String DLQ_QUEUE = "unichat.dlq.queue";
    public static final String DLQ_ROUTING_KEY = "document.dlq";
    public static final String WORKSPACE_SUMMARY_EXCHANGE = "unichat.workspace-summary.exchange";
    public static final String WORKSPACE_SUMMARY_QUEUE = "unichat.workspace-summary.queue";
    public static final String WORKSPACE_SUMMARY_ROUTING_KEY = "workspace.summary.requested";
    public static final String WORKSPACE_SUMMARY_DLQ = "unichat.workspace-summary.dlq";
    public static final String WORKSPACE_SUMMARY_RETRY_10 = "unichat.workspace-summary.retry.10s";
    public static final String WORKSPACE_SUMMARY_RETRY_60 = "unichat.workspace-summary.retry.60s";
    public static final String WORKSPACE_SUMMARY_RETRY_300 = "unichat.workspace-summary.retry.300s";

    @Bean
    public TopicExchange workspaceSummaryExchange() {
        return new TopicExchange(WORKSPACE_SUMMARY_EXCHANGE, true, false);
    }

    @Bean
    public Queue workspaceSummaryQueue() {
        return QueueBuilder.durable(WORKSPACE_SUMMARY_QUEUE).build();
    }

    @Bean
    public Binding workspaceSummaryBinding() {
        return BindingBuilder.bind(workspaceSummaryQueue()).to(workspaceSummaryExchange())
                .with(WORKSPACE_SUMMARY_ROUTING_KEY);
    }

    /** Holds failed summary jobs for operator inspection after retry exhaustion. */
    @Bean
    public Queue workspaceSummaryDeadLetterQueue() {
        return QueueBuilder.durable(WORKSPACE_SUMMARY_DLQ).build();
    }

    /** First delayed retry after ten seconds. */
    @Bean
    public Queue workspaceSummaryRetryTenSeconds() {
        return summaryRetryQueue(WORKSPACE_SUMMARY_RETRY_10, 10_000);
    }

    /** Second delayed retry after one minute. */
    @Bean
    public Queue workspaceSummaryRetrySixtySeconds() {
        return summaryRetryQueue(WORKSPACE_SUMMARY_RETRY_60, 60_000);
    }

    /** Third delayed retry after five minutes. */
    @Bean
    public Queue workspaceSummaryRetryFiveMinutes() {
        return summaryRetryQueue(WORKSPACE_SUMMARY_RETRY_300, 300_000);
    }

    private Queue summaryRetryQueue(String name, int milliseconds) {
        return QueueBuilder.durable(name).ttl(milliseconds)
                .deadLetterExchange(WORKSPACE_SUMMARY_EXCHANGE)
                .deadLetterRoutingKey(WORKSPACE_SUMMARY_ROUTING_KEY).build();
    }

    @Bean
    public TopicExchange ingestionExchange() {
        return new TopicExchange(INGESTION_EXCHANGE, true, false);
    }

    @Bean
    public TopicExchange dlqExchange() {
        return new TopicExchange(DLQ_EXCHANGE, true, false);
    }

    @Bean
    public Queue dlqQueue() {
        return QueueBuilder.durable(DLQ_QUEUE).build();
    }

    @Bean
    public Binding dlqBinding() {
        return BindingBuilder.bind(dlqQueue()).to(dlqExchange()).with(DLQ_ROUTING_KEY);
    }

    @Bean
    public Queue ingestionQueue() {
        return QueueBuilder.durable(INGESTION_QUEUE).build();
    }

    @Bean
    public Binding ingestionBinding() {
        return BindingBuilder.bind(ingestionQueue()).to(ingestionExchange()).with(INGESTION_ROUTING_KEY);
    }

    @Bean
    public Queue ingestionResultQueue() {
        return QueueBuilder.durable(INGESTION_RESULT_QUEUE).build();
    }

    @Bean
    public Binding ingestionResultBinding() {
        return BindingBuilder.bind(ingestionResultQueue()).to(ingestionExchange()).with(INGESTION_RESULT_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
