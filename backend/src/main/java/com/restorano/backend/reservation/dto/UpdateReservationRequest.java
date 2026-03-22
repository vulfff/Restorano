package com.restorano.backend.reservation.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public record UpdateReservationRequest(
    @NotBlank String guestName,
    @Min(1) int partySize,
    @NotNull Instant startsAt,
    String notes
) {}
