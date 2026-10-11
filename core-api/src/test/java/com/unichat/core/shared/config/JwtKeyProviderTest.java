package com.unichat.core.shared.config;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;
import static org.junit.jupiter.api.Assertions.*;

/** Local startup compatibility without allowing incomplete production key pairs. */
class JwtKeyProviderTest {
    @Test void shouldUseEphemeralPairWhenLegacyLocalConfigHasOnlyPublicLocation() {
        var provider=new JwtKeyProvider("file:legacy-public.pem","",new DefaultResourceLoader(),"local");
        assertEquals(provider.getPrivateKey().getModulus(),provider.getPublicKey().getModulus());
    }
    @Test void shouldRejectPartialProductionKeyConfiguration() {
        assertThrows(IllegalStateException.class,() -> new JwtKeyProvider(
                "file:legacy-public.pem","",new DefaultResourceLoader(),"production"));
    }
}
