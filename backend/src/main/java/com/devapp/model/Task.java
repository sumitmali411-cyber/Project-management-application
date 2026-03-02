package com.devapp.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Where;

import java.time.LocalDate;

@Entity
@Table(name = "tasks")
@Where(clause = "is_deleted = 0")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Task extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sprint_id")
    private Sprint sprint;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_task_id")
    private Task parentTask;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(name = "description_md", columnDefinition = "LONGTEXT")
    private String descriptionMd;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status = TaskStatus.BACKLOG;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priority priority = Priority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_type", nullable = false)
    private TaskType taskType = TaskType.TASK;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id")
    private User reporter;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "story_points")
    private Integer storyPoints;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    public enum TaskStatus { BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED }
    public enum Priority   { CRITICAL, HIGH, MEDIUM, LOW, NONE }
    public enum TaskType   { STORY, BUG, TASK, EPIC, SUBTASK }
}
