package com.restorano.backend.layout.dto;

import java.util.List;

public record FloorPlanDto(
    Long id,
    int gridCols,
    int gridRows,
    List<AreaDto> areas,
    List<TableDto> tables
) {}
