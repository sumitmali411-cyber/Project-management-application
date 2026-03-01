package com.devapp.repository;

import com.devapp.model.Commit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CommitRepository extends JpaRepository<Commit, Long> {
    Page<Commit> findByProjectIdAndIsDeletedFalseOrderByCommittedAtDesc(Long projectId, Pageable pageable);
    Optional<Commit> findByCommitHash(String commitHash);
    boolean existsByCommitHash(String commitHash);
}
