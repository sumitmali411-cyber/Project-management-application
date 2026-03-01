package com.devapp.dto;

import jakarta.validation.constraints.*;
import lombok.*;

public class AuthDtos {

    @Data
    public static class RegisterRequest {
        @NotBlank @Size(min = 3, max = 20, message = "Username must be 3-20 chars")
        @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Username: alphanumeric and underscores only")
        private String username;

        @NotBlank @Email
        private String email;

        @NotBlank @Size(min = 8, message = "Password must be at least 8 chars")
        private String password;

        @NotBlank
        private String fullName;
    }

    @Data
    public static class LoginRequest {
        @NotBlank @Email
        private String email;

        @NotBlank
        private String password;
    }

    @Data
    public static class RefreshRequest {
        @NotBlank
        private String refreshToken;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AuthResponse {
        private String token;
        private String refreshToken;
        private UserDto user;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UserDto {
        private Long id;
        private String username;
        private String email;
        private String fullName;
        private String avatarUrl;
        private String role;
    }
}
