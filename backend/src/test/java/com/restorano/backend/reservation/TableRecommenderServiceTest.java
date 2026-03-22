package com.restorano.backend.reservation;

import com.restorano.backend.layout.FloorPlanService;
import com.restorano.backend.layout.dto.TableDto;
import com.restorano.backend.layout.models.Area;
import com.restorano.backend.layout.models.RestaurantTable;
import com.restorano.backend.reservation.dto.RecommendRequest;
import com.restorano.backend.reservation.dto.ScoredTableDto;
import com.restorano.backend.reservation.repositories.ReservationRepository;
import org.assertj.core.data.Offset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TableRecommenderServiceTest {

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private FloorPlanService floorPlanService;

    @InjectMocks
    private TableRecommenderService service;

    private final Instant NOW = Instant.parse("2026-01-01T18:00:00Z");

    @BeforeEach
    void setUp() {
        // By default no table is occupied
        when(reservationRepository.existsOverlap(anyLong(), any(), any())).thenReturn(false);
    }

    private RestaurantTable table(long id, int capacity, Long areaId) {
        RestaurantTable t = new RestaurantTable();
        t.setId(id);
        t.setLabel("T" + id);
        t.setCapacity(capacity);
        t.setCol(1);
        t.setRow(1);
        t.setWidthCells(1);
        t.setHeightCells(1);
        if (areaId != null) {
            Area area = new Area();
            area.setId(areaId);
            t.setArea(area);
        }
        // stub toTableDto for this table — lenient because some tests exclude the table before toTableDto is called
        TableDto dto = new TableDto(id, "T" + id, capacity, 1, 1, 1, 1,
                areaId, false, null, null);
        lenient().when(floorPlanService.toTableDto(eq(t), anyCollection())).thenReturn(dto);
        return t;
    }

    private RecommendRequest req(int partySize, Long preferredAreaId) {
        return new RecommendRequest(partySize, preferredAreaId, NOW, null);
    }

    @Test
    void excludes_table_smaller_than_partySize() {
        List<RestaurantTable> tables = List.of(table(1, 2, null));
        List<ScoredTableDto> results = service.recommend(req(4, null), tables);
        assertThat(results).isEmpty();
    }

    @Test
    void excludes_table_beyond_hard_cutoff_waste_gt_partySize_times_2() {
        // partySize=2, capacity=7 → waste=5 > 4 → excluded
        List<RestaurantTable> tables = List.of(table(1, 7, null));
        List<ScoredTableDto> results = service.recommend(req(2, null), tables);
        assertThat(results).isEmpty();
    }

    @Test
    void perfect_fit_no_preference_produces_expected_scores() {
        List<RestaurantTable> tables = List.of(table(1, 4, null));
        List<ScoredTableDto> results = service.recommend(req(4, null), tables);
        assertThat(results).hasSize(1);
        ScoredTableDto r = results.get(0);
        assertThat(r.efficiencyScore()).isEqualTo(1.0);
        assertThat(r.areaPreferenceScore()).isEqualTo(0.5);
        assertThat(r.score()).isCloseTo(1.0 * 0.65 + 0.5 * 0.35, Offset.offset(1e-9));
    }

    @Test
    void preferred_area_match_gives_areaScore_1() {
        List<RestaurantTable> tables = List.of(table(1, 4, 10L));
        ScoredTableDto r = service.recommend(req(4, 10L), tables).get(0);
        assertThat(r.areaPreferenceScore()).isEqualTo(1.0);
    }

    @Test
    void preferred_area_mismatch_gives_areaScore_0() {
        List<RestaurantTable> tables = List.of(table(1, 4, 99L));
        ScoredTableDto r = service.recommend(req(4, 10L), tables).get(0);
        assertThat(r.areaPreferenceScore()).isEqualTo(0.0);
    }

    @Test
    void occupied_table_is_excluded() {
        RestaurantTable t = table(1, 4, null);
        when(reservationRepository.existsOverlap(eq(1L), any(), any())).thenReturn(true);
        List<ScoredTableDto> results = service.recommend(req(4, null), List.of(t));
        assertThat(results).isEmpty();
    }

    @Test
    void table_with_parentFused_is_excluded() {
        RestaurantTable t = table(1, 4, null);
        RestaurantTable parent = new RestaurantTable();
        parent.setId(99L);
        t.setParentFused(parent); // marks it as a hidden constituent
        List<ScoredTableDto> results = service.recommend(req(4, null), List.of(t));
        assertThat(results).isEmpty();
    }

    @Test
    void returns_at_most_5_results_sorted_descending() {
        List<RestaurantTable> tables = new ArrayList<>();
        for (int i = 1; i <= 8; i++) {
            tables.add(table(i, 4, null));
        }
        List<ScoredTableDto> results = service.recommend(req(4, null), tables);
        assertThat(results).hasSize(5);
        for (int i = 0; i < results.size() - 1; i++) {
            assertThat(results.get(i).score())
                .isGreaterThanOrEqualTo(results.get(i + 1).score());
        }
    }

    @Test
    void custom_durationHours_is_respected() {
        // With durationHours=1.0, endsAt = startsAt + 3600s
        RecommendRequest r = new RecommendRequest(4, null, NOW, 1.0);
        List<RestaurantTable> tables = List.of(table(1, 4, null));
        Instant expectedEndsAt = NOW.plusSeconds(3600);
        when(reservationRepository.existsOverlap(eq(1L), eq(NOW), eq(expectedEndsAt)))
            .thenReturn(false);
        List<ScoredTableDto> results = service.recommend(r, tables);
        assertThat(results).hasSize(1);
    }
}
