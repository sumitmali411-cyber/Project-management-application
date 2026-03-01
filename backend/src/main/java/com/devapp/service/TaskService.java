package com.devapp.service;

import com.devapp.dto.AuthDtos.UserDto;
import com.devapp.dto.TaskDtos.*;
import com.devapp.exception.ResourceNotFoundException;
import com.devapp.model.*;
import com.devapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepo;
    private final ProjectRepository projectRepo;
    private final UserRepository userRepo;
    private final SprintRepository sprintRepo;
    private final TaskCommentRepository commentRepo;

    @Transactional(readOnly = true)
    public Page<TaskDto> getTasks(Long projectId, String status, Long assigneeId, Long sprintId, Pageable pageable) {
        Task.TaskStatus taskStatus = status != null ? Task.TaskStatus.valueOf(status) : null;
        return taskRepo.findByFilters(projectId, taskStatus, assigneeId, sprintId, pageable)
            .map(this::toDto);
    }

    @Transactional(readOnly = true)
    public KanbanBoardDto getKanbanBoard(Long projectId) {
        List<Task> tasks = taskRepo.findByProjectIdAndIsDeletedFalse(projectId);
        return KanbanBoardDto.builder()
            .backlog(filter(tasks, Task.TaskStatus.BACKLOG))
            .todo(filter(tasks, Task.TaskStatus.TODO))
            .inProgress(filter(tasks, Task.TaskStatus.IN_PROGRESS))
            .inReview(filter(tasks, Task.TaskStatus.IN_REVIEW))
            .done(filter(tasks, Task.TaskStatus.DONE))
            .cancelled(filter(tasks, Task.TaskStatus.CANCELLED))
            .build();
    }

    @Transactional(readOnly = true)
    public TaskDetailDto getTaskDetail(Long projectId, Long taskId) {
        Task task = findTask(taskId);
        List<CommentDto> comments = commentRepo.findByTaskIdAndIsDeletedFalseOrderByCreatedAtAsc(taskId)
            .stream().map(this::toCommentDto).collect(Collectors.toList());
        return TaskDetailDto.builder()
            .id(task.getId())
            .title(task.getTitle())
            .descriptionMd(task.getDescriptionMd())
            .status(task.getStatus().name())
            .priority(task.getPriority().name())
            .taskType(task.getTaskType().name())
            .assignee(task.getAssignee() != null ? toUserDto(task.getAssignee()) : null)
            .reporter(task.getReporter() != null ? toUserDto(task.getReporter()) : null)
            .dueDate(task.getDueDate())
            .storyPoints(task.getStoryPoints())
            .projectId(task.getProject().getId())
            .sprintId(task.getSprint() != null ? task.getSprint().getId() : null)
            .comments(comments)
            .createdAt(task.getCreatedAt())
            .updatedAt(task.getUpdatedAt())
            .build();
    }

    @Transactional
    public TaskDto create(Long projectId, CreateTaskRequest req, String reporterEmail) {
        Project project = projectRepo.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        User reporter = userRepo.findByEmail(reporterEmail).orElse(null);
        User assignee = req.getAssigneeId() != null
            ? userRepo.findById(req.getAssigneeId()).orElse(null) : null;
        Sprint sprint = req.getSprintId() != null
            ? sprintRepo.findById(req.getSprintId()).orElse(null) : null;

        Task task = Task.builder()
            .project(project)
            .title(req.getTitle())
            .descriptionMd(req.getDescriptionMd())
            .status(req.getStatus() != null ? Task.TaskStatus.valueOf(req.getStatus()) : Task.TaskStatus.BACKLOG)
            .priority(req.getPriority() != null ? Task.Priority.valueOf(req.getPriority()) : Task.Priority.MEDIUM)
            .taskType(req.getTaskType() != null ? Task.TaskType.valueOf(req.getTaskType()) : Task.TaskType.TASK)
            .reporter(reporter)
            .assignee(assignee)
            .sprint(sprint)
            .dueDate(req.getDueDate())
            .storyPoints(req.getStoryPoints())
            .build();
        return toDto(taskRepo.save(task));
    }

    @Transactional
    public TaskDto update(Long projectId, Long taskId, UpdateTaskRequest req) {
        Task task = findTask(taskId);
        if (req.getTitle() != null) task.setTitle(req.getTitle());
        if (req.getDescriptionMd() != null) task.setDescriptionMd(req.getDescriptionMd());
        if (req.getStatus() != null) task.setStatus(Task.TaskStatus.valueOf(req.getStatus()));
        if (req.getPriority() != null) task.setPriority(Task.Priority.valueOf(req.getPriority()));
        if (req.getTaskType() != null) task.setTaskType(Task.TaskType.valueOf(req.getTaskType()));
        if (req.getDueDate() != null) task.setDueDate(req.getDueDate());
        if (req.getStoryPoints() != null) task.setStoryPoints(req.getStoryPoints());
        if (req.getAssigneeId() != null) {
            task.setAssignee(userRepo.findById(req.getAssigneeId()).orElse(null));
        }
        return toDto(taskRepo.save(task));
    }

    @Transactional
    public TaskDto updateStatus(Long taskId, String status) {
        Task task = findTask(taskId);
        task.setStatus(Task.TaskStatus.valueOf(status));
        return toDto(taskRepo.save(task));
    }

    @Transactional
    public void delete(Long taskId) {
        Task task = findTask(taskId);
        task.setIsDeleted(true);
        taskRepo.save(task);
    }

    @Transactional
    public CommentDto addComment(Long taskId, CreateCommentRequest req, String authorEmail) {
        Task task = findTask(taskId);
        User author = userRepo.findByEmail(authorEmail)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        TaskComment comment = TaskComment.builder()
            .task(task)
            .author(author)
            .contentMd(req.getContentMd())
            .build();
        return toCommentDto(commentRepo.save(comment));
    }

    @Transactional(readOnly = true)
    public List<CommentDto> getComments(Long taskId) {
        return commentRepo.findByTaskIdAndIsDeletedFalseOrderByCreatedAtAsc(taskId)
            .stream().map(this::toCommentDto).collect(Collectors.toList());
    }

    private List<TaskDto> filter(List<Task> tasks, Task.TaskStatus status) {
        return tasks.stream().filter(t -> t.getStatus() == status).map(this::toDto).collect(Collectors.toList());
    }

    private Task findTask(Long id) {
        return taskRepo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Task", id));
    }

    private TaskDto toDto(Task t) {
        return TaskDto.builder()
            .id(t.getId())
            .title(t.getTitle())
            .status(t.getStatus().name())
            .priority(t.getPriority().name())
            .taskType(t.getTaskType().name())
            .assignee(t.getAssignee() != null ? toUserDto(t.getAssignee()) : null)
            .reporter(t.getReporter() != null ? toUserDto(t.getReporter()) : null)
            .dueDate(t.getDueDate())
            .storyPoints(t.getStoryPoints())
            .projectId(t.getProject().getId())
            .sprintId(t.getSprint() != null ? t.getSprint().getId() : null)
            .createdAt(t.getCreatedAt())
            .updatedAt(t.getUpdatedAt())
            .build();
    }

    private CommentDto toCommentDto(TaskComment c) {
        return CommentDto.builder()
            .id(c.getId())
            .contentMd(c.getContentMd())
            .author(toUserDto(c.getAuthor()))
            .isEdited(c.getIsEdited())
            .createdAt(c.getCreatedAt())
            .build();
    }

    private UserDto toUserDto(User u) {
        return UserDto.builder()
            .id(u.getId()).username(u.getUsername()).email(u.getEmail())
            .fullName(u.getFullName()).avatarUrl(u.getAvatarUrl()).role(u.getRole().name())
            .build();
    }
}
