package com.devapp.repository;

import com.devapp.model.Sprint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SprintRepository extends JpaRepository<Sprint, Long> {
    List<Sprint> findByProjectIdAndIsDeletedFalse(Long projectId);
    Optional<Sprint> findByProjectIdAndStatus(Long projectId, Sprint.SprintStatus status);
}
