package com.restorano.backend.reservation.repositories;

import com.restorano.backend.reservation.models.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    @Query("""
        SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END
        FROM Reservation r JOIN r.tables t
        WHERE t.id = :tableId
          AND r.startsAt < :endsAt
          AND r.endsAt   > :startsAt
        """)
    boolean existsOverlap(@Param("tableId") Long tableId,
                          @Param("startsAt") Instant startsAt,
                          @Param("endsAt") Instant endsAt);

    @Query("""
        SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END
        FROM Reservation r JOIN r.tables t
        WHERE t.id = :tableId
          AND r.id <> :excludeId
          AND r.startsAt < :endsAt
          AND r.endsAt   > :startsAt
        """)
    boolean existsOverlapExcluding(@Param("tableId") Long tableId,
                                    @Param("startsAt") Instant startsAt,
                                    @Param("endsAt") Instant endsAt,
                                    @Param("excludeId") Long excludeId);

    @Query("""
        SELECT r FROM Reservation r JOIN r.tables t
        WHERE t.id = :tableId
          AND r.startsAt > :now
        """)
    List<Reservation> findFutureByTableId(@Param("tableId") Long tableId,
                                          @Param("now") Instant now);

    @Query("""
        SELECT DISTINCT r FROM Reservation r
        JOIN FETCH r.tables t
        WHERE r.endsAt > :threshold
        """)
    List<Reservation> findActiveAfter(@Param("threshold") Instant threshold);

    @Query("""
        SELECT r FROM Reservation r
        JOIN FETCH r.tables t
        WHERE t.id = :tableId
          AND r.endsAt > :now
        ORDER BY r.startsAt ASC
        """)
    List<Reservation> findUpcomingForTable(@Param("tableId") Long tableId,
                                           @Param("now") Instant now);
}
