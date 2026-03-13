package com.restorano.backend.reservation.dto;

import com.restorano.backend.layout.dto.TableDto;

public record ScoredTableDto(
    TableDto table,
    double score,
    double efficiencyScore,
    double areaPreferenceScore,
    String reason
) {}
