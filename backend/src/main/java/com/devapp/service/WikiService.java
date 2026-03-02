package com.devapp.service;

import com.devapp.dto.AuthDtos.UserDto;
import com.devapp.dto.WikiDtos.*;
import com.devapp.exception.ResourceNotFoundException;
import com.devapp.model.User;
import com.devapp.model.WikiPage;
import com.devapp.model.WikiPageVersion;
import com.devapp.repository.ProjectRepository;
import com.devapp.repository.UserRepository;
import com.devapp.repository.WikiPageRepository;
import com.devapp.repository.WikiPageVersionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WikiService {

    private final WikiPageRepository wikiRepo;
    private final WikiPageVersionRepository versionRepo;
    private final ProjectRepository projectRepo;
    private final UserRepository userRepo;

    @Transactional(readOnly = true)
    public List<WikiPageTreeDto> getPageTree(Long projectId) {
        List<WikiPage> pages = wikiRepo.findByProjectIdAndIsDeletedFalseOrderBySortOrderAsc(projectId);
        return pages.stream()
            .filter(p -> p.getParentPage() == null)
            .map(p -> toTreeDto(p, pages))
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public WikiPageDto getPageBySlug(Long projectId, String slug) {
        return toDto(wikiRepo.findByProjectIdAndSlugAndIsDeletedFalse(projectId, slug)
            .orElseThrow(() -> new ResourceNotFoundException("Wiki page not found: " + slug)));
    }

    @Transactional
    public WikiPageDto createPage(Long projectId, CreateWikiPageRequest req, String authorEmail) {
        var project = projectRepo.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        User author = userRepo.findByEmail(authorEmail)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        WikiPage page = WikiPage.builder()
            .project(project)
            .title(req.getTitle())
            .slug(generateSlug(req.getTitle(), projectId))
            .contentMd(req.getContentMd())
            .author(author)
            .build();

        if (req.getParentPageId() != null) {
            wikiRepo.findById(req.getParentPageId()).ifPresent(page::setParentPage);
        }
        wikiRepo.save(page);
        saveVersion(page, author, 1);
        return toDto(page);
    }

    @Transactional
    public WikiPageDto updatePage(Long projectId, String slug, UpdateWikiPageRequest req, String editorEmail) {
        WikiPage page = wikiRepo.findByProjectIdAndSlugAndIsDeletedFalse(projectId, slug)
            .orElseThrow(() -> new ResourceNotFoundException("Wiki page not found: " + slug));
        User editor = userRepo.findByEmail(editorEmail)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (req.getTitle() != null) page.setTitle(req.getTitle());
        page.setContentMd(req.getContentMd());

        int nextVersion = versionRepo.countByWikiPageId(page.getId()) + 1;
        wikiRepo.save(page);
        saveVersion(page, editor, nextVersion);
        return toDto(page);
    }

    @Transactional
    public void deletePage(Long projectId, String slug) {
        WikiPage page = wikiRepo.findByProjectIdAndSlugAndIsDeletedFalse(projectId, slug)
            .orElseThrow(() -> new ResourceNotFoundException("Wiki page not found: " + slug));
        page.setIsDeleted(true);
        wikiRepo.save(page);
    }

    @Transactional(readOnly = true)
    public List<WikiVersionDto> getVersions(Long projectId, String slug) {
        WikiPage page = wikiRepo.findByProjectIdAndSlugAndIsDeletedFalse(projectId, slug)
            .orElseThrow(() -> new ResourceNotFoundException("Wiki page not found: " + slug));
        return versionRepo.findByWikiPageIdOrderByVersionNumberDesc(page.getId())
            .stream().map(this::toVersionDto).collect(Collectors.toList());
    }

    private void saveVersion(WikiPage page, User editor, int versionNumber) {
        versionRepo.save(WikiPageVersion.builder()
            .wikiPage(page)
            .contentMd(page.getContentMd())
            .versionNumber(versionNumber)
            .editedBy(editor)
            .build());
    }

    private String generateSlug(String title, Long projectId) {
        String base = title.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
        String slug = base;
        int i = 1;
        while (wikiRepo.findByProjectIdAndSlugAndIsDeletedFalse(projectId, slug).isPresent()) {
            slug = base + "-" + i++;
        }
        return slug;
    }

    private WikiPageTreeDto toTreeDto(WikiPage page, List<WikiPage> all) {
        List<WikiPageTreeDto> children = all.stream()
            .filter(p -> p.getParentPage() != null && p.getParentPage().getId().equals(page.getId()))
            .map(p -> toTreeDto(p, all))
            .collect(Collectors.toList());
        return WikiPageTreeDto.builder()
            .id(page.getId()).title(page.getTitle()).slug(page.getSlug())
            .sortOrder(page.getSortOrder()).children(children)
            .build();
    }

    private WikiPageDto toDto(WikiPage p) {
        return WikiPageDto.builder()
            .id(p.getId()).title(p.getTitle()).slug(p.getSlug())
            .contentMd(p.getContentMd()).contentHtml(p.getContentHtml())
            .author(toUserDto(p.getAuthor()))
            .parentPageId(p.getParentPage() != null ? p.getParentPage().getId() : null)
            .sortOrder(p.getSortOrder())
            .createdAt(p.getCreatedAt()).updatedAt(p.getUpdatedAt())
            .build();
    }

    private WikiVersionDto toVersionDto(WikiPageVersion v) {
        return WikiVersionDto.builder()
            .id(v.getId()).versionNumber(v.getVersionNumber())
            .editedBy(toUserDto(v.getEditedBy())).createdAt(v.getCreatedAt())
            .build();
    }

    private UserDto toUserDto(User u) {
        return UserDto.builder()
            .id(u.getId()).username(u.getUsername()).email(u.getEmail())
            .fullName(u.getFullName()).avatarUrl(u.getAvatarUrl()).role(u.getRole().name())
            .build();
    }
}
