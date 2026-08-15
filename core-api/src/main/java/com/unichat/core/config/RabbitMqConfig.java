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

/**
 * Spring AMQP RabbitMQ Configuration for Document Ingestion and Delete Saga.
 */
@Configuration
public class RabbitMqConfig {

    public static final String INGESTION_EXCHANGE = "unichat.ingestion.exchange";
    public static final String INGESTION_QUEUE = "unichat.ingestion.queue";
    public static final String INGESTION_ROUTING_KEY = "document.uploaded";

    public static final String INGESTION_RESULT_QUEUE = "unichat.ingestion.result.queue";
    public static final String INGESTION_RESULT_ROUTING_KEY = "document.ingestion.result";

    public static final String DLQ_EXCHANGE = "unichat.dlq.exchange";
    public static final String DLQ_QUEUE = "unichat.dlq.queue";
    public static final String DLQ_ROUTING_KEY = "document.dlq";

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
