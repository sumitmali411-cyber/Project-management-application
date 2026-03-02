package com.devapp.repository;

import com.devapp.model.WikiPageVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WikiPageVersionRepository extends JpaRepository<WikiPageVersion, Long> {
    List<WikiPageVersion> findByWikiPageIdOrderByVersionNumberDesc(Long wikiPageId);
    int countByWikiPageId(Long wikiPageId);
}
