package com.restorano.backend.reservation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.Instant;
import java.util.List;

public record CreateReservationRequest(
    @NotEmpty List<Long> tableIds,
    @NotBlank String guestName,
    @Positive int partySize,
    @NotNull Instant startsAt,
    String notes,
    Double durationHours   // null → defaults to 2.5h in service
) {}
