package com.unichat.core.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;

/**
 * Guards the migration directory against two files claiming one version.
 *
 * <p>Flyway only reports that collision when the application starts, so a merge
 * that introduces one passes compilation and the whole unit suite and fails on
 * the developer's machine minutes later. It has happened three times on this
 * project: version 29, then 32 and 33, then 30 and 31 when Plan V2 merged into
 * the Work Chat branch. This test moves the discovery back to the build.
 */
class MigrationVersionTest {

    private static final Path MIGRATIONS = Path.of("src/main/resources/db/migration");
    private static final Pattern VERSIONED = Pattern.compile("^V([\\d.]+)__.+\\.sql$");

    @Test
    void shouldNotLetTwoMigrationsClaimTheSameVersion() throws IOException {
        // Arrange
        Map<String, List<String>> byVersion = indexFilenamesByVersion();

        // Act
        List<String> collisions = byVersion.entrySet().stream()
                .filter(e -> e.getValue().size() > 1)
                .map(e -> "version " + e.getKey() + ": " + e.getValue())
                .toList();

        // Assert
        assertEquals(List.of(), collisions,
                "Two migrations claim one version; renumber the one whose statements "
                        + "are idempotent, above every version already applied");
    }

    @Test
    void shouldFindTheMigrationsItClaimsToCheck() throws IOException {
        // Arrange and Act: a wrong path would make the collision test vacuous.
        Map<String, List<String>> byVersion = indexFilenamesByVersion();

        // Assert
        assertTrue(byVersion.size() > 20,
                "Expected the migration directory at " + MIGRATIONS.toAbsolutePath());
    }

    /** Groups migration filenames by the version each one claims. */
    private Map<String, List<String>> indexFilenamesByVersion() throws IOException {
        Map<String, List<String>> byVersion = new HashMap<>();
        try (Stream<Path> files = Files.list(MIGRATIONS)) {
            for (Path file : files.toList()) {
                Matcher matcher = VERSIONED.matcher(file.getFileName().toString());
                if (!matcher.matches()) {
                    continue;
                }
                byVersion.computeIfAbsent(matcher.group(1), v -> new ArrayList<>())
                        .add(file.getFileName().toString());
            }
        }
        return byVersion;
    }
}
