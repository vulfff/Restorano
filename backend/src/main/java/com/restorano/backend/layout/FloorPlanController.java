package com.restorano.backend.layout;

import com.restorano.backend.layout.dto.FloorPlanDto;
import com.restorano.backend.layout.dto.SaveLayoutRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/layout")
public class FloorPlanController {

    private final FloorPlanService floorPlanService;

    public FloorPlanController(FloorPlanService floorPlanService) {
        this.floorPlanService = floorPlanService;
    }

    @GetMapping
    public FloorPlanDto getLayout() {
        return floorPlanService.getLayout();
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public FloorPlanDto saveLayout(@RequestBody @Valid SaveLayoutRequest req) {
        return floorPlanService.saveLayout(req);
    }
}
