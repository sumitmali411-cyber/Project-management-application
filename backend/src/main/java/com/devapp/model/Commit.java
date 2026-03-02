package com.devapp.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Where;

import java.time.LocalDateTime;

@Entity
@Table(name = "commits")
@Where(clause = "is_deleted = 0")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Commit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_task_id")
    private Task linkedTask;

    @Column(name = "commit_hash", nullable = false, length = 40)
    private String commitHash;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "author_name", length = 200)
    private String authorName;

    @Column(name = "author_email")
    private String authorEmail;

    @Column(name = "committed_at")
    private LocalDateTime committedAt;

    @Column(name = "repo_url", length = 1000)
    private String repoUrl;

    @Column(length = 200)
    private String branch;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
