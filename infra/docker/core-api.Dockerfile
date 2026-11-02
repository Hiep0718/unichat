# syntax=docker/dockerfile:1
# -----------------------------------------------------------------------------
# UniChat Core API: Maven build + non-root JRE runtime (build context = repo root).
# -----------------------------------------------------------------------------
FROM eclipse-temurin:21-jdk-jammy AS builder
WORKDIR /workspace

# dos2unix: mvnw may be checked out with CRLF on Windows; curl: wrapper download.
RUN apt-get update \
    && apt-get install -y --no-install-recommends dos2unix curl \
    && rm -rf /var/lib/apt/lists/*

COPY core-api/.mvn/ .mvn/
COPY core-api/mvnw core-api/pom.xml ./
RUN dos2unix mvnw && chmod +x mvnw \
    && ./mvnw -B -q dependency:go-offline

COPY core-api/src ./src
RUN ./mvnw -B -q clean package -DskipTests \
    && cp target/core-api-*.jar /workspace/app.jar

# -----------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-jammy AS runner
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r -g 10001 unichat \
    && useradd -r -u 10001 -g unichat -d /home/unichat -m -s /usr/sbin/nologin unichat \
    && mkdir -p /app/data/storage /app/.service-keys \
    && chown -R unichat:unichat /app

COPY --from=builder --chown=unichat:unichat /workspace/app.jar /app/app.jar

USER unichat
EXPOSE 8082

# X-Forwarded-Proto keeps the probe valid when the production profile forces HTTPS.
HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=5 \
  CMD curl -fsS -H "X-Forwarded-Proto: https" http://127.0.0.1:8082/actuator/health || exit 1

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=70.0", "-XX:+ExitOnOutOfMemoryError", "-jar", "/app/app.jar"]
