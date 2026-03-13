package com.restorano.backend.reservation;

import com.restorano.backend.layout.models.RestaurantTable;
import com.restorano.backend.layout.repositories.RestaurantTableRepository;
import com.restorano.backend.reservation.dto.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reservations")
public class ReservationController {

    private final ReservationService reservationService;
    private final TableRecommenderService recommenderService;
    private final RestaurantTableRepository tableRepository;

    public ReservationController(ReservationService reservationService,
                                 TableRecommenderService recommenderService,
                                 RestaurantTableRepository tableRepository) {
        this.reservationService = reservationService;
        this.recommenderService = recommenderService;
        this.tableRepository = tableRepository;
    }

    @GetMapping
    public List<ReservationDto> getReservations(
            @RequestParam(required = false) String date,
            @RequestParam(required = false) Integer partySize,
            @RequestParam(required = false) Long areaId) {
        return reservationService.getReservations(date, partySize, areaId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReservationDto createReservation(@RequestBody @Valid CreateReservationRequest req) {
        return reservationService.createReservation(req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteReservation(@PathVariable Long id) {
        reservationService.deleteReservation(id);
    }

    @GetMapping("/table/{tableId}")
    public List<ReservationDto> getReservationsForTable(@PathVariable Long tableId) {
        return reservationService.getReservationsForTable(tableId);
    }

    @PostMapping("/recommend")
    public List<ScoredTableDto> recommend(@RequestBody @Valid RecommendRequest req) {
        // Load all non-constituent tables for scoring
        List<RestaurantTable> allTables = tableRepository.findByFloorPlanId(1L);
        return recommenderService.recommend(req, allTables);
    }
}
