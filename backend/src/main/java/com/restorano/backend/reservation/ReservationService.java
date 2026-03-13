package com.restorano.backend.reservation;

import com.restorano.backend.layout.models.RestaurantTable;
import com.restorano.backend.layout.repositories.RestaurantTableRepository;
import com.restorano.backend.reservation.dto.CreateReservationRequest;
import com.restorano.backend.reservation.dto.ReservationDto;
import com.restorano.backend.reservation.models.Reservation;
import com.restorano.backend.reservation.repositories.ReservationRepository;
import com.restorano.backend.util.exceptions.ConflictException;
import com.restorano.backend.util.exceptions.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

@Service
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final RestaurantTableRepository tableRepository;

    public ReservationService(ReservationRepository reservationRepository,
                              RestaurantTableRepository tableRepository) {
        this.reservationRepository = reservationRepository;
        this.tableRepository = tableRepository;
    }

    public List<ReservationDto> getReservations(String date, Integer partySize, Long areaId) {
        Instant threshold = date != null
            ? LocalDate.parse(date).atStartOfDay(ZoneOffset.UTC).toInstant()
            : Instant.now();

        List<Reservation> reservations = reservationRepository.findActiveAfter(threshold);

        return reservations.stream()
            .filter(r -> partySize == null || r.getTables().stream()
                .anyMatch(t -> t.getCapacity() >= partySize))
            .filter(r -> areaId == null || r.getTables().stream()
                .anyMatch(t -> t.getArea() != null && t.getArea().getId().equals(areaId)))
            .map(this::toDto)
            .toList();
    }

    @Transactional
    public ReservationDto createReservation(CreateReservationRequest req) {
        double duration = req.durationHours() != null ? req.durationHours() : 2.5;
        Instant endsAt = req.startsAt().plusSeconds((long) (duration * 3600));

        List<String> conflicts = new ArrayList<>();
        List<RestaurantTable> tables = new ArrayList<>();

        for (Long tableId : req.tableIds()) {
            RestaurantTable table = tableRepository.findById(tableId)
                .orElseThrow(() -> new NotFoundException("Table not found: " + tableId));
            tables.add(table);
            if (reservationRepository.existsOverlap(tableId, req.startsAt(), endsAt)) {
                conflicts.add("Table '" + table.getLabel() + "' is already booked for this time");
            }
        }

        if (!conflicts.isEmpty()) {
            throw new ConflictException("Booking conflict", conflicts);
        }

        Reservation reservation = new Reservation();
        reservation.setGuestName(req.guestName());
        reservation.setPartySize(req.partySize());
        reservation.setStartsAt(req.startsAt());
        reservation.setEndsAt(endsAt);
        reservation.setNotes(req.notes());
        reservation.setTables(tables);

        return toDto(reservationRepository.save(reservation));
    }

    public void deleteReservation(Long id) {
        if (!reservationRepository.existsById(id)) {
            throw new NotFoundException("Reservation not found: " + id);
        }
        reservationRepository.deleteById(id);
    }

    public List<ReservationDto> getReservationsForTable(Long tableId) {
        return reservationRepository.findUpcomingForTable(tableId, Instant.now())
            .stream().map(this::toDto).toList();
    }

    private ReservationDto toDto(Reservation r) {
        List<Long> tableIds = r.getTables().stream()
            .map(RestaurantTable::getId)
            .toList();
        return new ReservationDto(
            r.getId(), tableIds, r.getGuestName(), r.getPartySize(),
            r.getStartsAt(), r.getEndsAt(), r.getNotes(), r.getCreatedAt()
        );
    }
}
