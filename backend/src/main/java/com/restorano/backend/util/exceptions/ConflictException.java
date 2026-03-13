package com.restorano.backend.util.exceptions;

import java.util.List;

public class ConflictException extends RuntimeException {
    private final List<?> conflicts;

    public ConflictException(String message) {
        this(message, List.of());
    }

    public ConflictException(String message, List<?> conflicts) {
        super(message);
        this.conflicts = conflicts;
    }

    public List<?> getConflicts() {
        return conflicts;
    }
}
