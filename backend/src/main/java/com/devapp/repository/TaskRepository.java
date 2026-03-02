package com.devapp.repository;

import com.devapp.model.Task;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    Page<Task> findByProjectId(Long projectId, Pageable pageable);

    @Query("""
        SELECT t FROM Task t WHERE t.project.id = :projectId
        AND (:status IS NULL OR t.status = :status)
        AND (:assigneeId IS NULL OR t.assignee.id = :assigneeId)
        AND (:sprintId IS NULL OR t.sprint.id = :sprintId)
        AND t.isDeleted = false
        """)
    Page<Task> findByFilters(@Param("projectId") Long projectId,
                             @Param("status") Task.TaskStatus status,
                             @Param("assigneeId") Long assigneeId,
                             @Param("sprintId") Long sprintId,
                             Pageable pageable);

    List<Task> findByProjectIdAndIsDeletedFalse(Long projectId);

    long countByProjectIdAndStatusAndIsDeletedFalse(Long projectId, Task.TaskStatus status);
}
