package com.restorano.backend.layout.dto;

public record AreaDto(
    Long id,
    String name,
    String color,
    int topLeftCol,
    int topLeftRow,
    int bottomRightCol,
    int bottomRightRow
) {}
