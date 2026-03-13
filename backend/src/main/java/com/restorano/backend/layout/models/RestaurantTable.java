package com.restorano.backend.layout.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(schema = "restorano", name = "restaurant_table")
@Getter
@Setter
@NoArgsConstructor
public class RestaurantTable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "floor_plan_id", nullable = false)
    private FloorPlan floorPlan;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "area_id")
    private Area area;

    @Column(name = "label", nullable = false, length = 20)
    private String label;

    @Column(name = "capacity", nullable = false)
    private int capacity;

    @Column(name = "col", nullable = false)
    private int col;

    @Column(name = "row", nullable = false)
    private int row;

    @Column(name = "width_cells", nullable = false)
    private int widthCells = 1;

    @Column(name = "height_cells", nullable = false)
    private int heightCells = 1;

    @Column(name = "is_fused", nullable = false)
    private boolean isFused = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_fused_id")
    private RestaurantTable parentFused;
}
