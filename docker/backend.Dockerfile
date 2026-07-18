# syntax=docker/dockerfile:1.7

# Build the Spring Boot backend with Java 21 and cached Maven dependencies.
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /workspace/backend

# Copy Maven files first to maximize Docker layer cache reuse.
COPY backend/mvnw backend/pom.xml ./
COPY backend/.mvn ./.mvn
RUN chmod +x ./mvnw

# Download dependencies in a Docker layer so rebuilds can reuse Maven artifacts without BuildKit.
RUN ./mvnw -B dependency:go-offline

# CI runs the ratcheted Spotless check with Git history. Image packaging only needs to compile and package.
COPY backend/src ./src
RUN ./mvnw -B package -DskipTests -Dspotless.check.skip=true

# Run the packaged application with a smaller JRE image and a non-root user.
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

# Create a dedicated user and writable upload directory for product images.
RUN addgroup -S lembas && \
    adduser -S lembas -G lembas && \
    mkdir -p /app/uploads /tmp && \
    chown -R lembas:lembas /app /tmp

COPY --from=build --chown=lembas:lembas /workspace/backend/target/*.jar /app/app.jar

USER lembas
EXPOSE 8080

# JAVA_OPTS allows memory limits or GC settings to be injected from Compose.
# exec makes the JVM PID 1 so Docker stop signals are handled gracefully.
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
