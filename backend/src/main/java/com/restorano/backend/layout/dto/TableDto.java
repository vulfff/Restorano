package com.restorano.backend.layout.dto;

import java.util.List;

public record TableDto(
    Long id,
    String label,
    int capacity,
    int col,
    int row,
    int widthCells,
    int heightCells,
    Long areaId,
    boolean isFused,
    List<Long> fusedTableIds,   // derived: tables whose parentFusedId == this.id; null if not fused
    Long parentFusedId
) {}
