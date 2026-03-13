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
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class FloorPlanService {

    private static final long FLOOR_PLAN_ID = 1L;

    @PersistenceContext
    private EntityManager em;

    private final FloorPlanRepository floorPlanRepository;
    private final ReservationRepository reservationRepository;

    public FloorPlanService(FloorPlanRepository floorPlanRepository,
                            ReservationRepository reservationRepository) {
        this.floorPlanRepository = floorPlanRepository;
        this.reservationRepository = reservationRepository;
    }

    @Transactional(readOnly = true)
    public FloorPlanDto getLayout() {
        FloorPlan fp = floorPlanRepository.findById(FLOOR_PLAN_ID)
            .orElseThrow(() -> new NotFoundException("Floor plan not found"));
        return toDto(fp);
    }

    @Transactional
    public FloorPlanDto saveLayout(SaveLayoutRequest req) {
        FloorPlan fp = floorPlanRepository.findById(FLOOR_PLAN_ID)
            .orElseThrow(() -> new NotFoundException("Floor plan not found"));

        validateFusionChanges(fp, req);

        fp.setGridCols(req.gridCols());
        fp.setGridRows(req.gridRows());
        fp.setUpdatedAt(Instant.now());

        List<AreaDto> areaDtos = req.areas() != null ? req.areas() : List.of();
        List<TableDto> tableDtos = req.tables() != null ? req.tables() : List.of();

        // --- Upsert areas (update in place, insert new, orphan-remove deleted) ---
        Map<Long, Area> existingAreaById = fp.getAreas().stream()
            .filter(a -> a.getId() != null)
            .collect(Collectors.toMap(Area::getId, a -> a));
        Set<Long> incomingAreaIds = areaDtos.stream()
            .filter(dto -> dto.id() != null).map(AreaDto::id).collect(Collectors.toSet());
        fp.getAreas().removeIf(a -> a.getId() == null || !incomingAreaIds.contains(a.getId()));

        // dtoAreaId → entity: handles both real DB IDs and temp frontend IDs for table wiring
        Map<Long, Area> dtoAreaIdToEntity = new HashMap<>();
        for (AreaDto dto : areaDtos) {
            Area area = (dto.id() != null && existingAreaById.containsKey(dto.id()))
                ? existingAreaById.get(dto.id())
                : new Area();
            area.setName(dto.name());
            area.setColor(dto.color());
            area.setTopLeftCol(dto.topLeftCol());
            area.setTopLeftRow(dto.topLeftRow());
            area.setBottomRightCol(dto.bottomRightCol());
            area.setBottomRightRow(dto.bottomRightRow());
            if (area.getId() == null) {
                area.setFloorPlan(fp);
                em.persist(area); // IDENTITY strategy fires INSERT immediately; fields must be set first
                fp.getAreas().add(area);
            }
            if (dto.id() != null) dtoAreaIdToEntity.put(dto.id(), area);
        }
        em.flush(); // assign DB IDs to new areas; same Java instances now have IDs

        // --- Upsert tables (first pass: fields + area; second pass: parentFused) ---
        Map<Long, RestaurantTable> existingTableById = fp.getTables().stream()
            .filter(t -> t.getId() != null)
            .collect(Collectors.toMap(RestaurantTable::getId, t -> t));
        Set<Long> incomingTableIds = tableDtos.stream()
            .filter(dto -> dto.id() != null).map(TableDto::id).collect(Collectors.toSet());
        fp.getTables().removeIf(t -> t.getId() == null || !incomingTableIds.contains(t.getId()));

        List<RestaurantTable> upsertedTables = new ArrayList<>();
        for (TableDto dto : tableDtos) {
            RestaurantTable t = (dto.id() != null && existingTableById.containsKey(dto.id()))
                ? existingTableById.get(dto.id())
                : new RestaurantTable();
            t.setLabel(dto.label());
            t.setCapacity(dto.capacity());
            t.setCol(dto.col());
            t.setRow(dto.row());
            t.setWidthCells(dto.widthCells());
            t.setHeightCells(dto.heightCells());
            t.setFused(dto.isFused());
            t.setArea(dto.areaId() != null ? dtoAreaIdToEntity.get(dto.areaId()) : null);
            if (t.getId() == null) {
                t.setFloorPlan(fp);
                em.persist(t); // IDENTITY strategy fires INSERT immediately; fields must be set first
                fp.getTables().add(t);
            }
            upsertedTables.add(t);
        }
        em.flush(); // assign DB IDs to new tables

        for (int i = 0; i < tableDtos.size(); i++) {
            TableDto dto = tableDtos.get(i);
            RestaurantTable parent = null;
            if (dto.parentFusedId() != null) {
                for (int j = 0; j < tableDtos.size(); j++) {
                    if (tableDtos.get(j).id() != null && tableDtos.get(j).id().equals(dto.parentFusedId())) {
                        parent = upsertedTables.get(j);
                        break;
                    }
                }
            }
            upsertedTables.get(i).setParentFused(parent);
        }
        em.flush();

        return toDto(fp);
    }

    // --- DTO conversion ---

    public FloorPlanDto toDto(FloorPlan fp) {
        Collection<RestaurantTable> allTables = fp.getTables();
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

    public TableDto toTableDto(RestaurantTable t, Collection<RestaurantTable> allTables) {
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
