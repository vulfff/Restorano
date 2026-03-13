package com.restorano.backend.layout.repositories;

import com.restorano.backend.layout.models.FloorPlan;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FloorPlanRepository extends JpaRepository<FloorPlan, Long> {
}
