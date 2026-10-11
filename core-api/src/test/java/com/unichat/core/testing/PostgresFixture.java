package com.unichat.core.testing;

import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** A disposable PostgreSQL with the complete migration chain; never accepts a shared DB URL. */
public final class PostgresFixture {
    private PostgresFixture() { }
    /** Prepares only this test container and the roles required by existing RLS migrations. */
    public static DataSource migrate(PostgreSQLContainer container) {
        DriverManagerDataSource source = new DriverManagerDataSource(container.getJdbcUrl(),container.getUsername(),container.getPassword());
        JdbcTemplate database = new JdbcTemplate(source);
        database.execute("CREATE ROLE anon NOLOGIN");
        database.execute("CREATE ROLE authenticated NOLOGIN");
        database.execute("CREATE ROLE service_role NOLOGIN");
        Flyway.configure().dataSource(source).locations("classpath:db/migration").load().migrate();
        return source;
    }
}
