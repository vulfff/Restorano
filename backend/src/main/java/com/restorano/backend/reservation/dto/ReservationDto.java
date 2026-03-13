package com.restorano.backend.reservation.dto;

import java.time.Instant;
import java.util.List;

public record ReservationDto(
    Long id,
    List<Long> tableIds,
    String guestName,
    int partySize,
    Instant startsAt,
    Instant endsAt,
    String notes,
    Instant createdAt
) {}
