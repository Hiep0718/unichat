package com.unichat.core.user.service;

import java.io.ByteArrayInputStream;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.document.storage.StoragePort;
import com.unichat.core.shared.image.SquareImageEncoder;
import com.unichat.core.user.domain.AvatarColor;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;

/**
 * Profile pictures.
 *
 * <p>An upload is never stored as it arrived: {@link SquareImageEncoder}
 * redraws it, which caps what a huge file can cost to serve and drops the
 * metadata a phone photo carries. This class owns only where the key is kept
 * and whose picture it is.
 */
@Service
public class AvatarService {

    /** What a picture is called in the messages a member reads. */
    private static final String SUBJECT = "Ảnh đại diện";

    /** What the endpoint serves, whatever the upload was. */
    public static final String STORED_MEDIA_TYPE = SquareImageEncoder.STORED_MEDIA_TYPE;

    private static final Logger log = LoggerFactory.getLogger(AvatarService.class);

    private final UserRepository userRepository;
    private final StoragePort storagePort;
    private final Clock clock;

    public AvatarService(UserRepository userRepository, StoragePort storagePort, Clock clock) {
        this.userRepository = userRepository;
        this.storagePort = storagePort;
        this.clock = clock;
    }

    /**
     * Stores a new profile picture for the caller.
     *
     * @throws ValidationError when the file is empty, too large, not an
     *                         accepted type, or not a decodable image
     */
    @Transactional
    public void upload(UUID userId, MultipartFile file) {
        User user = requireUser(userId);

        byte[] square = SquareImageEncoder.encode(file, SUBJECT);
        String storageKey = "avatars/" + userId + "/" + UUID.randomUUID() + ".png";
        storagePort.store(storageKey, new ByteArrayInputStream(square), square.length);

        String previous = user.replaceAvatar(storageKey);
        user.setUpdatedAt(Instant.now(clock));
        userRepository.save(user);

        deleteQuietly(previous);
    }

    /** Removes the picture, leaving the letter avatar. */
    @Transactional
    public void remove(UUID userId) {
        User user = requireUser(userId);
        String previous = user.replaceAvatar(null);
        user.setUpdatedAt(Instant.now(clock));
        userRepository.save(user);
        deleteQuietly(previous);
    }

    /** Sets the letter-avatar colour; a null key returns to the derived one. */
    @Transactional
    public void chooseColour(UUID userId, String colourKey) {
        User user = requireUser(userId);
        if (colourKey == null || colourKey.isBlank()) {
            user.setAvatarColor(null);
        } else {
            user.setAvatarColor(AvatarColor.fromKey(colourKey)
                    .orElseThrow(() -> new ValidationError("Màu không hợp lệ")));
        }
        user.setUpdatedAt(Instant.now(clock));
        userRepository.save(user);
    }

    /**
     * Reads a member's picture.
     *
     * @throws NotFoundError when that member has no picture, which is also the
     *                       answer for a user id that does not exist
     */
    public byte[] read(UUID userId) {
        User user = requireUser(userId);
        if (!user.hasAvatarImage()) {
            throw new NotFoundError("Người dùng chưa có ảnh đại diện");
        }
        return storagePort.retrieve(user.getAvatarStorageKey());
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundError("Người dùng không tồn tại"));
    }

    /**
     * Removes the picture this one replaced. A failure here leaves an orphaned
     * blob, which costs storage but must not fail the upload the member just
     * made — their new picture is already saved.
     */
    private void deleteQuietly(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            return;
        }
        try {
            storagePort.delete(storageKey);
        } catch (RuntimeException e) {
            log.warn("Could not delete the replaced avatar blob; it is now orphaned", e);
        }
    }
}
