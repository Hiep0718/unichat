package com.unichat.core.user.service;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import javax.imageio.ImageIO;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.document.storage.StoragePort;
import com.unichat.core.user.domain.AvatarColor;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;

/**
 * Profile pictures.
 *
 * <p>An upload is never stored as it arrived. It is decoded, redrawn at a fixed
 * square size and re-encoded as PNG, which caps what a huge file can cost to
 * serve and drops every metadata chunk the original carried — a phone photo
 * otherwise ships GPS coordinates to everyone in the member's groups.
 */
@Service
public class AvatarService {

    /** Served at 2x for dense screens; the UI shows avatars at 34–96px. */
    private static final int SIZE_PX = 256;
    private static final long MAX_UPLOAD_BYTES = 2L * 1024 * 1024;
    private static final List<String> ACCEPTED_TYPES =
            List.of("image/png", "image/jpeg", "image/webp");

    /** What the endpoint serves, whatever the upload was. */
    public static final String STORED_MEDIA_TYPE = "image/png";

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
        validate(file);
        User user = requireUser(userId);

        byte[] square = toSquarePng(file);
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

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationError("Ảnh đại diện không được để trống");
        }
        if (file.getSize() > MAX_UPLOAD_BYTES) {
            throw new ValidationError("Ảnh đại diện vượt quá 2 MiB");
        }
        if (!ACCEPTED_TYPES.contains(file.getContentType())) {
            throw new ValidationError("Chỉ hỗ trợ ảnh PNG, JPEG hoặc WebP");
        }
    }

    /**
     * Decodes the upload and redraws it as a centred square.
     *
     * <p>Decoding is also the real check that this is an image: a declared
     * content type is only what the client claimed.
     */
    private byte[] toSquarePng(MultipartFile file) {
        try {
            BufferedImage source = ImageIO.read(file.getInputStream());
            if (source == null) {
                throw new ValidationError("Không đọc được ảnh, vui lòng thử tệp khác");
            }
            BufferedImage square = drawSquare(source);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(square, "png", out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new ValidationError("Không đọc được ảnh, vui lòng thử tệp khác");
        }
    }

    /** Crops to the centre square, then scales, so nothing is stretched. */
    private static BufferedImage drawSquare(BufferedImage source) {
        int edge = Math.min(source.getWidth(), source.getHeight());
        int left = (source.getWidth() - edge) / 2;
        int top = (source.getHeight() - edge) / 2;
        BufferedImage cropped = source.getSubimage(left, top, edge, edge);

        BufferedImage target = new BufferedImage(SIZE_PX, SIZE_PX, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = target.createGraphics();
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        graphics.drawImage(cropped, 0, 0, SIZE_PX, SIZE_PX, null);
        graphics.dispose();
        return target;
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
