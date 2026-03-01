package com.devapp.repository;

import com.devapp.model.WikiPage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WikiPageRepository extends JpaRepository<WikiPage, Long> {
    List<WikiPage> findByProjectIdAndIsDeletedFalseOrderBySortOrderAsc(Long projectId);
    Optional<WikiPage> findByProjectIdAndSlugAndIsDeletedFalse(Long projectId, String slug);
}
