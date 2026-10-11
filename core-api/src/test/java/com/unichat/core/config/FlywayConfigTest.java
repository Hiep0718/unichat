package com.unichat.core.config;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;

class FlywayConfigTest {
    @Test
    void shouldMigrateWithoutChangingExistingHistory() {
        Flyway flyway = mock(Flyway.class);

        new FlywayConfig().flywayMigrationStrategy().migrate(flyway);

        verify(flyway).migrate();
        verifyNoMoreInteractions(flyway);
    }
}
