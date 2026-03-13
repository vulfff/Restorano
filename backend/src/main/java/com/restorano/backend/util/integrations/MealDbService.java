package com.restorano.backend.util.integrations;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;

@Service
public class MealDbService {

    private static final String BASE_URL = "https://www.themealdb.com/api/json/v1/1";

    private final WebClient webClient;

    public MealDbService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.baseUrl(BASE_URL).build();
    }

    public List<MealSummary> suggest(String keyword) {
        MealDbResponse response = webClient.get()
            .uri("/search.php?s={kw}", keyword)
            .retrieve()
            .bodyToMono(MealDbResponse.class)
            .block();
        return (response != null && response.meals() != null) ? response.meals() : List.of();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MealSummary(
        String idMeal,
        String strMeal,
        String strMealThumb,
        String strCategory,
        String strArea
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record MealDbResponse(List<MealSummary> meals) {}
}
