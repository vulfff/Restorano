package com.restorano.backend.layout;

import com.restorano.backend.layout.dto.AreaDto;
import com.restorano.backend.layout.dto.FloorPlanDto;
import com.restorano.backend.layout.dto.SaveLayoutRequest;
import com.restorano.backend.layout.dto.TableDto;
import com.restorano.backend.layout.models.Area;
import com.restorano.backend.layout.models.FloorPlan;
import com.restorano.backend.layout.models.RestaurantTable;
import com.restorano.backend.layout.repositories.FloorPlanRepository;
import com.restorano.backend.reservation.repositories.ReservationRepository;
import com.restorano.backend.util.exceptions.ConflictException;
import com.restorano.backend.util.exceptions.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class FloorPlanService {

    private static final long FLOOR_PLAN_ID = 1L;

    private final FloorPlanRepository floorPlanRepository;
    private final ReservationRepository reservationRepository;

    public FloorPlanService(FloorPlanRepository floorPlanRepository,
                            ReservationRepository reservationRepository) {
        this.floorPlanRepository = floorPlanRepository;
        this.reservationRepository = reservationRepository;
    }

    public FloorPlanDto getLayout() {
        FloorPlan fp = floorPlanRepository.findWithAllById(FLOOR_PLAN_ID)
            .orElseThrow(() -> new NotFoundException("Floor plan not found"));
        return toDto(fp);
    }

    @Transactional
    public FloorPlanDto saveLayout(SaveLayoutRequest req) {
        FloorPlan fp = floorPlanRepository.findWithAllById(FLOOR_PLAN_ID)
            .orElseThrow(() -> new NotFoundException("Floor plan not found"));

        // --- Fuse/split safety check ---
        validateFusionChanges(fp, req);

        // --- Update dimensions ---
        fp.setGridCols(req.gridCols());
        fp.setGridRows(req.gridRows());
        fp.setUpdatedAt(Instant.now());

        // --- Replace areas ---
        fp.getAreas().clear();
        List<AreaDto> areaDtos = req.areas() != null ? req.areas() : List.of();
        for (AreaDto dto : areaDtos) {
            Area area = new Area();
            area.setFloorPlan(fp);
            area.setName(dto.name());
            area.setColor(dto.color());
            area.setTopLeftCol(dto.topLeftCol());
            area.setTopLeftRow(dto.topLeftRow());
            area.setBottomRightCol(dto.bottomRightCol());
            area.setBottomRightRow(dto.bottomRightRow());
            fp.getAreas().add(area);
        }

        // --- Replace tables (two-pass: build entities, then wire FKs) ---
        fp.getTables().clear();
        floorPlanRepository.saveAndFlush(fp); // flush so orphan-removed tables are deleted

        List<TableDto> tableDtos = req.tables() != null ? req.tables() : List.of();
        // First pass: create entities without parentFused wired
        List<RestaurantTable> newTables = new ArrayList<>();
        for (TableDto dto : tableDtos) {
            RestaurantTable t = new RestaurantTable();
            t.setFloorPlan(fp);
            t.setLabel(dto.label());
            t.setCapacity(dto.capacity());
            t.setCol(dto.col());
            t.setRow(dto.row());
            t.setWidthCells(dto.widthCells());
            t.setHeightCells(dto.heightCells());
            t.setFused(dto.isFused());
            // Area: match by position in the saved areas list (areas were flushed above)
            if (dto.areaId() != null) {
                fp.getAreas().stream()
                    .filter(a -> a.getId() != null && a.getId().equals(dto.areaId()))
                    .findFirst()
                    // Area id may be a "new" negative id from frontend — match by order fallback handled below
                    .ifPresent(t::setArea);
            }
            fp.getTables().add(t);
            newTables.add(t);
        }
        floorPlanRepository.saveAndFlush(fp); // assign IDs to new entities

        // Second pass: wire parentFused references using the DTO's parentFusedId
        // After save, match new entities by their position in the list (same order as tableDtos)
        for (int i = 0; i < tableDtos.size(); i++) {
            TableDto dto = tableDtos.get(i);
            if (dto.parentFusedId() != null) {
                RestaurantTable constituent = newTables.get(i);
                // Find the fused parent in the new table list by matching the DTO id
                for (int j = 0; j < tableDtos.size(); j++) {
                    if (tableDtos.get(j).id() != null &&
                        tableDtos.get(j).id().equals(dto.parentFusedId())) {
                        constituent.setParentFused(newTables.get(j));
                        break;
                    }
                }
            }
        }
        floorPlanRepository.saveAndFlush(fp);

        return toDto(fp);
    }

    // --- DTO conversion ---

    public FloorPlanDto toDto(FloorPlan fp) {
        List<RestaurantTable> allTables = fp.getTables();
        return new FloorPlanDto(
            fp.getId(),
            fp.getGridCols(),
            fp.getGridRows(),
            fp.getAreas().stream().map(this::toAreaDto).toList(),
            allTables.stream().map(t -> toTableDto(t, allTables)).toList()
        );
    }

    private AreaDto toAreaDto(Area a) {
        return new AreaDto(
            a.getId(), a.getName(), a.getColor(),
            a.getTopLeftCol(), a.getTopLeftRow(),
            a.getBottomRightCol(), a.getBottomRightRow()
        );
    }

    public TableDto toTableDto(RestaurantTable t, List<RestaurantTable> allTables) {
        // Build fusedTableIds: tables whose parentFused == this table
        List<Long> fusedIds = null;
        if (t.isFused()) {
            List<Long> children = allTables.stream()
                .filter(other -> other.getParentFused() != null
                              && other.getParentFused().getId().equals(t.getId()))
                .map(RestaurantTable::getId)
                .collect(Collectors.toList());
            fusedIds = children.isEmpty() ? null : children;
        }
        return new TableDto(
            t.getId(),
            t.getLabel(),
            t.getCapacity(),
            t.getCol(),
            t.getRow(),
            t.getWidthCells(),
            t.getHeightCells(),
            t.getArea() != null ? t.getArea().getId() : null,
            t.isFused(),
            fusedIds,
            t.getParentFused() != null ? t.getParentFused().getId() : null
        );
    }

    // --- Fuse/split safety ---

    private void validateFusionChanges(FloorPlan existingFp, SaveLayoutRequest req) {
        Map<Long, RestaurantTable> existingById = existingFp.getTables().stream()
            .filter(t -> t.getId() != null)
            .collect(Collectors.toMap(RestaurantTable::getId, t -> t));

        List<TableDto> incomingTables = req.tables() != null ? req.tables() : List.of();
        Set<Long> incomingIds = incomingTables.stream()
            .filter(dto -> dto.id() != null)
            .map(TableDto::id)
            .collect(Collectors.toSet());

        List<String> conflicts = new ArrayList<>();
        Instant now = Instant.now();
        Set<Long> checkedFusedParents = new HashSet<>();

        for (TableDto dto : incomingTables) {
            if (dto.id() == null) continue;
            RestaurantTable existing = existingById.get(dto.id());
            if (existing == null) continue;

            Long oldParentId = existing.getParentFused() != null ? existing.getParentFused().getId() : null;
            Long newParentId = dto.parentFusedId();

            // Table is being fused (constituent): check it for future reservations
            if (oldParentId == null && newParentId != null) {
                List<?> future = reservationRepository.findFutureByTableId(dto.id(), now);
                if (!future.isEmpty()) {
                    conflicts.add("Table '" + existing.getLabel() + "' has future reservations");
                }
            }

            // Table is being unfused (split): check the old fused parent
            if (oldParentId != null && newParentId == null && !checkedFusedParents.contains(oldParentId)) {
                checkedFusedParents.add(oldParentId);
                List<?> future = reservationRepository.findFutureByTableId(oldParentId, now);
                if (!future.isEmpty()) {
                    RestaurantTable fusedParent = existingById.get(oldParentId);
                    String label = fusedParent != null ? fusedParent.getLabel() : "fused table";
                    conflicts.add("Fused table '" + label + "' has future reservations — cancel them before splitting");
                }
            }
        }

        // Fused tables existing in DB but absent from incoming → being deleted/split
        for (RestaurantTable existing : existingFp.getTables()) {
            if (existing.isFused() && !incomingIds.contains(existing.getId())
                    && !checkedFusedParents.contains(existing.getId())) {
                checkedFusedParents.add(existing.getId());
                List<?> future = reservationRepository.findFutureByTableId(existing.getId(), now);
                if (!future.isEmpty()) {
                    conflicts.add("Fused table '" + existing.getLabel() + "' has future reservations — cancel them before splitting");
                }
            }
        }

        if (!conflicts.isEmpty()) {
            throw new ConflictException("Cannot save layout: tables have future reservations", conflicts);
        }
    }
}
