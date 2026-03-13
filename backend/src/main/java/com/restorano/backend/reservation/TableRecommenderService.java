package com.restorano.backend.reservation;

import com.restorano.backend.layout.FloorPlanService;
import com.restorano.backend.layout.dto.TableDto;
import com.restorano.backend.layout.models.RestaurantTable;
import com.restorano.backend.reservation.dto.RecommendRequest;
import com.restorano.backend.reservation.dto.ScoredTableDto;
import com.restorano.backend.reservation.repositories.ReservationRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TableRecommenderService {

    private final ReservationRepository reservationRepository;
    private final FloorPlanService floorPlanService;

    public TableRecommenderService(ReservationRepository reservationRepository,
                                   FloorPlanService floorPlanService) {
        this.reservationRepository = reservationRepository;
        this.floorPlanService = floorPlanService;
    }

    public List<ScoredTableDto> recommend(RecommendRequest req, List<RestaurantTable> allTables) {
        double duration = req.durationHours() != null ? req.durationHours() : 2.5;
        Instant endsAt = req.startsAt().plusSeconds((long) (duration * 3600));

        // Compute occupied table IDs
        Set<Long> occupiedIds = allTables.stream()
            .filter(t -> reservationRepository.existsOverlap(t.getId(), req.startsAt(), endsAt))
            .map(RestaurantTable::getId)
            .collect(Collectors.toSet());

        List<ScoredTableDto> results = new ArrayList<>();
        for (RestaurantTable table : allTables) {
            if (table.getParentFused() != null) continue;     // skip hidden constituents
            if (occupiedIds.contains(table.getId())) continue;
            if (table.getCapacity() < req.partySize()) continue;

            int waste = table.getCapacity() - req.partySize();
            if (waste > req.partySize() * 2) continue;       // hard cutoff

            double efficiencyScore = 1.0 - (waste / (double) table.getCapacity()) * 0.8;

            double areaScore;
            if (req.preferredAreaId() == null) {
                areaScore = 0.5;
            } else {
                areaScore = (table.getArea() != null
                             && table.getArea().getId().equals(req.preferredAreaId()))
                            ? 1.0 : 0.0;
            }

            double finalScore = efficiencyScore * 0.65 + areaScore * 0.35;
            if (finalScore < 0.1) continue;

            String reason = buildReason(table, req.partySize(), waste, req.preferredAreaId());
            TableDto tableDto = floorPlanService.toTableDto(table, allTables);
            results.add(new ScoredTableDto(tableDto, finalScore, efficiencyScore, areaScore, reason));
        }

        return results.stream()
            .sorted(Comparator.comparingDouble(ScoredTableDto::score).reversed())
            .limit(5)
            .toList();
    }

    private String buildReason(RestaurantTable table, int partySize, int waste, Long preferredAreaId) {
        String fit = waste == 0
            ? "Perfect fit for " + partySize
            : "Seats " + partySize + " of " + table.getCapacity() + " (" + waste + " spare)";

        String area = "";
        if (preferredAreaId != null) {
            boolean matches = table.getArea() != null
                           && table.getArea().getId().equals(preferredAreaId);
            area = matches ? " · Preferred area" : " · Different area";
        }

        return fit + area;
    }
}
