package com.restorano.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignupRequest(
    @NotBlank String username,
    @Email @NotBlank String email,
    @Size(min = 8) @NotBlank String password
) {}
