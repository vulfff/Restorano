package com.restorano.backend.util.integrations;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/meals")
public class MealController {

    private final MealDbService mealDbService;

    public MealController(MealDbService mealDbService) {
        this.mealDbService = mealDbService;
    }

    @GetMapping("/suggest")
    public List<MealDbService.MealSummary> suggest(@RequestParam String keyword) {
        return mealDbService.suggest(keyword);
    }
}
