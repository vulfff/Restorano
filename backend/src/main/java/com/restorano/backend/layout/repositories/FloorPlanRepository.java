package com.restorano.backend.layout.repositories;

import com.restorano.backend.layout.models.FloorPlan;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FloorPlanRepository extends JpaRepository<FloorPlan, Long> {
    @EntityGraph(attributePaths = {"areas", "tables", "tables.area", "tables.parentFused"})
    Optional<FloorPlan> findWithAllById(Long id);
}
