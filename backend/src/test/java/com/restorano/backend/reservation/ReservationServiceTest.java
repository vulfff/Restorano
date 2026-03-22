package com.restorano.backend.reservation;

import com.restorano.backend.layout.models.RestaurantTable;
import com.restorano.backend.layout.repositories.RestaurantTableRepository;
import com.restorano.backend.reservation.dto.CreateReservationRequest;
import com.restorano.backend.reservation.dto.UpdateReservationRequest;
import com.restorano.backend.reservation.dto.ReservationDto;
import com.restorano.backend.reservation.models.Reservation;
import com.restorano.backend.reservation.repositories.ReservationRepository;
import com.restorano.backend.util.exceptions.ConflictException;
import com.restorano.backend.util.exceptions.NotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReservationServiceTest {

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private RestaurantTableRepository tableRepository;

    @InjectMocks
    private ReservationService service;

    private final Instant STARTS_AT = Instant.parse("2026-06-01T18:00:00Z");
    private final Instant ENDS_AT = STARTS_AT.plusSeconds((long)(2.5 * 3600)); // +2.5h

    private RestaurantTable table(long id, String label) {
        RestaurantTable t = new RestaurantTable();
        t.setId(id);
        t.setLabel(label);
        t.setCapacity(4);
        t.setCol(1); t.setRow(1); t.setWidthCells(1); t.setHeightCells(1);
        return t;
    }

    private CreateReservationRequest req(List<Long> tableIds) {
        return new CreateReservationRequest(tableIds, "Alice", 2, STARTS_AT, null, null);
    }

    @Test
    void creates_reservation_when_no_overlap() {
        RestaurantTable t = table(1L, "T1");
        when(tableRepository.findById(1L)).thenReturn(Optional.of(t));
        when(reservationRepository.existsOverlap(eq(1L), eq(STARTS_AT), eq(ENDS_AT)))
            .thenReturn(false);

        Reservation saved = new Reservation();
        saved.setId(42L);
        saved.setGuestName("Alice");
        saved.setPartySize(2);
        saved.setStartsAt(STARTS_AT);
        saved.setEndsAt(ENDS_AT);
        saved.setTables(List.of(t));
        when(reservationRepository.save(any())).thenReturn(saved);

        ReservationDto dto = service.createReservation(req(List.of(1L)));
        assertThat(dto.id()).isEqualTo(42L);
        assertThat(dto.tableIds()).containsExactly(1L);
        verify(reservationRepository, times(1)).save(any());
    }

    @Test
    void throws_ConflictException_when_table_is_already_booked() {
        RestaurantTable t = table(1L, "T1");
        when(tableRepository.findById(1L)).thenReturn(Optional.of(t));
        when(reservationRepository.existsOverlap(eq(1L), eq(STARTS_AT), eq(ENDS_AT)))
            .thenReturn(true);

        assertThatThrownBy(() -> service.createReservation(req(List.of(1L))))
            .isInstanceOf(ConflictException.class)
            .satisfies(ex -> {
                ConflictException ce = (ConflictException) ex;
                assertThat(ce.getConflicts()).hasSize(1);
                assertThat(ce.getConflicts().get(0).toString()).contains("T1");
            });
        verify(reservationRepository, never()).save(any());
    }

    @Test
    void throws_ConflictException_listing_only_the_conflicting_table_when_multiple_tables() {
        RestaurantTable t1 = table(1L, "T1");
        RestaurantTable t2 = table(2L, "T2");
        when(tableRepository.findById(1L)).thenReturn(Optional.of(t1));
        when(tableRepository.findById(2L)).thenReturn(Optional.of(t2));
        when(reservationRepository.existsOverlap(eq(1L), any(), any())).thenReturn(false);
        when(reservationRepository.existsOverlap(eq(2L), any(), any())).thenReturn(true);

        assertThatThrownBy(() -> service.createReservation(req(List.of(1L, 2L))))
            .isInstanceOf(ConflictException.class)
            .satisfies(ex -> {
                ConflictException ce = (ConflictException) ex;
                assertThat(ce.getConflicts()).hasSize(1);
                assertThat(ce.getConflicts().get(0).toString()).contains("T2");
                assertThat(ce.getConflicts().get(0).toString()).doesNotContain("T1");
            });
    }

    private UpdateReservationRequest updateReq() {
        return new UpdateReservationRequest("Bob", 3, STARTS_AT, "window seat");
    }

    private Reservation existingReservation(long id, RestaurantTable... tables) {
        Reservation r = new Reservation();
        r.setId(id);
        r.setGuestName("Alice");
        r.setPartySize(2);
        r.setStartsAt(STARTS_AT);
        r.setEndsAt(ENDS_AT);
        r.setNotes(null);
        r.setTables(new java.util.ArrayList<>(java.util.Arrays.asList(tables)));
        return r;
    }

    @Test
    void updates_reservation_when_no_overlap() {
        RestaurantTable t = table(1L, "T1");
        Reservation existing = existingReservation(10L, t);
        when(reservationRepository.findById(10L)).thenReturn(Optional.of(existing));
        when(reservationRepository.existsOverlapExcluding(eq(1L), eq(STARTS_AT), eq(ENDS_AT), eq(10L)))
            .thenReturn(false);
        when(reservationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ReservationDto dto = service.updateReservation(10L, updateReq());

        assertThat(dto.guestName()).isEqualTo("Bob");
        assertThat(dto.partySize()).isEqualTo(3);
        assertThat(dto.notes()).isEqualTo("window seat");
        verify(reservationRepository).save(existing);
    }

    @Test
    void throws_ConflictException_on_update_when_time_overlaps_another_reservation() {
        RestaurantTable t = table(1L, "T1");
        Reservation existing = existingReservation(10L, t);
        when(reservationRepository.findById(10L)).thenReturn(Optional.of(existing));
        when(reservationRepository.existsOverlapExcluding(eq(1L), eq(STARTS_AT), eq(ENDS_AT), eq(10L)))
            .thenReturn(true);

        assertThatThrownBy(() -> service.updateReservation(10L, updateReq()))
            .isInstanceOf(ConflictException.class);
        verify(reservationRepository, never()).save(any());
    }

    @Test
    void throws_NotFoundException_on_update_when_reservation_does_not_exist() {
        when(reservationRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateReservation(99L, updateReq()))
            .isInstanceOf(NotFoundException.class);
        verify(reservationRepository, never()).save(any());
    }

    @Test
    void throws_NotFoundException_when_table_does_not_exist() {
        when(tableRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createReservation(req(List.of(99L))))
            .isInstanceOf(NotFoundException.class);
        // existsOverlap must never be called — table lookup threw first
        verify(reservationRepository, never()).existsOverlap(anyLong(), any(), any());
    }
}
