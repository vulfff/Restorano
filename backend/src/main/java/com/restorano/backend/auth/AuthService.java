package com.restorano.backend.auth;

import com.restorano.backend.auth.dto.LoginRequest;
import com.restorano.backend.auth.dto.LoginResponse;
import com.restorano.backend.auth.dto.SignupRequest;
import com.restorano.backend.util.exceptions.ConflictException;
import com.restorano.backend.util.security.JwtUtils;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    public AuthService(AdminRepository adminRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtils jwtUtils) {
        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
    }

    public void signup(SignupRequest req) {
        if (adminRepository.existsByUsername(req.username())) {
            throw new ConflictException("Username already taken");
        }
        if (adminRepository.existsByEmail(req.email())) {
            throw new ConflictException("Email already registered");
        }
        Admin admin = new Admin();
        admin.setUsername(req.username());
        admin.setEmail(req.email());
        admin.setPassword(passwordEncoder.encode(req.password()));
        adminRepository.save(admin);
    }

    public LoginResponse login(LoginRequest req) {
        Admin admin = adminRepository.findByUsername(req.username())
            .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));
        if (!passwordEncoder.matches(req.password(), admin.getPassword())) {
            throw new BadCredentialsException("Invalid credentials");
        }
        String token = jwtUtils.generateToken(admin.getUsername());
        return new LoginResponse(token, admin.getUsername());
    }
}
