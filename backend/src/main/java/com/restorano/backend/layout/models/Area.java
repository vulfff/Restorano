package com.restorano.backend.layout.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(schema = "restorano", name = "area")
@Getter
@Setter
@NoArgsConstructor
public class Area {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "floor_plan_id", nullable = false)
    private FloorPlan floorPlan;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "color", nullable = false, length = 20)
    private String color;

    @Column(name = "top_left_col", nullable = false)
    private int topLeftCol;

    @Column(name = "top_left_row", nullable = false)
    private int topLeftRow;

    @Column(name = "bottom_right_col", nullable = false)
    private int bottomRightCol;

    @Column(name = "bottom_right_row", nullable = false)
    private int bottomRightRow;
}
