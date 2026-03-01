package com.devapp.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

public class WikiDtos {

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class WikiPageDto {
        private Long id;
        private String title;
        private String slug;
        private String contentMd;
        private String contentHtml;
        private AuthDtos.UserDto author;
        private Long parentPageId;
        private Integer sortOrder;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class WikiPageTreeDto {
        private Long id;
        private String title;
        private String slug;
        private Integer sortOrder;
        private List<WikiPageTreeDto> children;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class WikiVersionDto {
        private Long id;
        private Integer versionNumber;
        private AuthDtos.UserDto editedBy;
        private LocalDateTime createdAt;
    }

    @Data
    public static class CreateWikiPageRequest {
        @NotBlank
        private String title;
        @NotBlank
        private String contentMd;
        private Long parentPageId;
        private String contentType = "markdown";
    }

    @Data
    public static class UpdateWikiPageRequest {
        private String title;
        @NotBlank
        private String contentMd;
        private String contentType = "markdown";
    }
}
