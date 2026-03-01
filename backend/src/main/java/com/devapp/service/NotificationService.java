package com.devapp.service;

import com.devapp.dto.AuthDtos.UserDto;
import com.devapp.exception.ResourceNotFoundException;
import com.devapp.model.Notification;
import com.devapp.model.User;
import com.devapp.repository.NotificationRepository;
import com.devapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepo;
    private final UserRepository userRepo;

    @Transactional(readOnly = true)
    public List<NotificationDto> getForUser(String email) {
        User user = userRepo.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return notificationRepo.findByUserIdOrderByCreatedAtDesc(user.getId())
            .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public NotificationDto markRead(Long notificationId) {
        Notification n = notificationRepo.findById(notificationId)
            .orElseThrow(() -> new ResourceNotFoundException("Notification", notificationId));
        n.setIsRead(true);
        return toDto(notificationRepo.save(n));
    }

    @Transactional
    public void markAllRead(String email) {
        User user = userRepo.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        notificationRepo.markAllReadByUserId(user.getId());
    }

    public record NotificationDto(
        Long id, String title, String message, String type,
        Boolean isRead, String entityType, Long entityId,
        java.time.LocalDateTime createdAt) {}

    private NotificationDto toDto(Notification n) {
        return new NotificationDto(n.getId(), n.getTitle(), n.getMessage(),
            n.getType().name(), n.getIsRead(), n.getEntityType(), n.getEntityId(), n.getCreatedAt());
    }
}
