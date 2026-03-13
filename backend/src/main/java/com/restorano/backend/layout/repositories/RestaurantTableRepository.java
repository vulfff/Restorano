package com.restorano.backend.layout.repositories;

import com.restorano.backend.layout.models.RestaurantTable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RestaurantTableRepository extends JpaRepository<RestaurantTable, Long> {
    List<RestaurantTable> findByFloorPlanId(Long floorPlanId);
}
