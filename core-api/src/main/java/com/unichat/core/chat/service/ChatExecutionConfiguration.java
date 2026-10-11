package com.unichat.core.chat.service;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.TimeUnit;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Bounds operation, subscription and private-stream workers independently. */
@Configuration
public class ChatExecutionConfiguration {
    /** Queued operations still respect their absolute reserve-time deadline. */
    @Bean(destroyMethod="shutdown")
    public ExecutorService chatOperationExecutor() { return pool(8,64); }
    /** Reader/subscriber tasks cannot monopolize operation execution threads. */
    @Bean(destroyMethod="shutdown")
    public ExecutorService chatStreamExecutor() { return pool(16,64); }
    /** Heartbeats keep leases durable while a provider response is pending. */
    @Bean(destroyMethod="shutdown")
    public ScheduledExecutorService chatHeartbeatExecutor() { return Executors.newScheduledThreadPool(2); }
    private ExecutorService pool(int threads,int queueSize) {
        return new ThreadPoolExecutor(threads,threads,0,TimeUnit.MILLISECONDS,
                new ArrayBlockingQueue<>(queueSize),new ThreadPoolExecutor.AbortPolicy());
    }
}
