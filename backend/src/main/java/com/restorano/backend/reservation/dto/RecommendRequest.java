package com.restorano.backend.reservation.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.Instant;

public record RecommendRequest(
    @Positive int partySize,
    Long preferredAreaId,
    @NotNull Instant startsAt,
    Double durationHours   // null → defaults to 2.5h
) {}
