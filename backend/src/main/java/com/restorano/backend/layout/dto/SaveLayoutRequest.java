package com.restorano.backend.layout.dto;

import jakarta.validation.constraints.Positive;

import java.util.List;

public record SaveLayoutRequest(
    @Positive int gridCols,
    @Positive int gridRows,
    List<AreaDto> areas,
    List<TableDto> tables
) {}
