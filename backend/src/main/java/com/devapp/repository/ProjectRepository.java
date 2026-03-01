package com.devapp.repository;

import com.devapp.model.Project;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {

    Optional<Project> findBySlug(String slug);

    @Query("""
        SELECT DISTINCT p FROM Project p
        LEFT JOIN ProjectMember pm ON pm.project = p
        WHERE (p.owner.email = :email OR pm.user.email = :email)
        AND p.isDeleted = false
        ORDER BY p.updatedAt DESC
        """)
    Page<Project> findAllForUser(@Param("email") String email, Pageable pageable);
}
