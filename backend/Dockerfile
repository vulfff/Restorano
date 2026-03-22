# Stage 1: build
FROM eclipse-temurin:25-jdk-alpine AS build
WORKDIR /app

# Cache dependency layer
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -q

# Build jar
COPY src src
RUN ./mvnw package -DskipTests -q

# Stage 2: run
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
