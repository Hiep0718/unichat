package com.unichat.core.testing;

import java.time.Clock;
import javax.sql.DataSource;
import jakarta.persistence.EntityManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.SharedEntityManagerCreator;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import com.unichat.core.admin.domain.AuditEventRepository;
import com.unichat.core.admin.service.AuditService;
import com.unichat.core.auth.domain.RefreshTokenRepository;
import com.unichat.core.auth.domain.RefreshFamilyRepository;
import com.unichat.core.auth.service.RefreshTransactions;
import com.unichat.core.auth.service.LoginTransactions;
import com.unichat.core.auth.service.TokenService;
import com.unichat.core.auth.service.SessionStateService;
import com.unichat.core.user.domain.UserRepository;

/** Exercises real JPA repositories and transaction commits without starting mail/provider adapters. */
public final class AuthPersistenceFixture implements AutoCloseable {
    public final UserRepository users;
    public final RefreshFamilyRepository families;
    public final RefreshTransactions refresh;
    public final LoginTransactions login;
    public final SessionStateService sessions;
    public final TransactionTemplate transaction;
    private final LocalContainerEntityManagerFactoryBean factory;
    /** Uses the migrated disposable data source only. */
    public AuthPersistenceFixture(DataSource source, Clock clock) {
        factory = new LocalContainerEntityManagerFactoryBean();
        factory.setDataSource(source); factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        factory.setPackagesToScan("com.unichat.core.auth.domain","com.unichat.core.user.domain","com.unichat.core.admin.domain");
        factory.afterPropertiesSet();
        var entityManagerFactory = java.util.Objects.requireNonNull(factory.getObject());
        EntityManager manager = SharedEntityManagerCreator.createSharedEntityManager(entityManagerFactory);
        var repositories = new JpaRepositoryFactory(manager);
        users = repositories.getRepository(UserRepository.class); families = repositories.getRepository(RefreshFamilyRepository.class);
        var tokens = repositories.getRepository(RefreshTokenRepository.class);
        var audit = new AuditService(repositories.getRepository(AuditEventRepository.class),clock);
        refresh = new RefreshTransactions(tokens,families,users,audit,clock,manager);
        // Failure-path tests never issue an access token; codec integration is covered by AccessSecurityChainTest.
        var issuer = org.mockito.Mockito.mock(TokenService.class);
        login = new LoginTransactions(users,new BCryptPasswordEncoder(4),issuer,audit,clock);
        sessions = new SessionStateService(users,families,clock);
        transaction = new TransactionTemplate(new JpaTransactionManager(entityManagerFactory));
    }
    /** Releases the local persistence factory, without cleaning shared resources. */
    @Override public void close() { factory.destroy(); }
}
