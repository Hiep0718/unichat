package com.unichat.core.workspace.service;

import java.awt.Color;
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

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.document.storage.StoragePort;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceRole;
import com.unichat.core.workspace.domain.WorkspaceVisibility;

/**
 * Cover pictures for groups.
 *
 * <p>An upload is never stored as it arrived. It is decoded, cropped to the
 * card's banner shape and re-encoded, which caps what a huge file costs to
 * serve and drops every metadata chunk the original carried — a photo taken on
 * a phone otherwise ships GPS coordinates to everyone who can see the group.
 *
 * <p>Re-encoded as JPEG rather than PNG, unlike avatars: a cover is a wide
 * photograph, and the same picture as a lossless PNG is several megabytes on a
 * screen that lists twenty of them.
 */
@Service
public class WorkspaceCoverService {

    /** 3:1, drawn at 2x for the ~600x200 slot the card gives it. */
    private static final int WIDTH_PX = 1200;
    private static final int HEIGHT_PX = 400;

    private static final long MAX_UPLOAD_BYTES = 5L * 1024 * 1024;
    private static final float JPEG_QUALITY = 0.82f;
    private static final List<String> ACCEPTED_TYPES =
            List.of("image/png", "image/jpeg", "image/webp");

    /** What the endpoint serves, whatever the upload was. */
    public static final String STORED_MEDIA_TYPE = "image/jpeg";

    private static final Logger log = LoggerFactory.getLogger(WorkspaceCoverService.class);

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final StoragePort storagePort;
    private final Clock clock;

    public WorkspaceCoverService(WorkspaceRepository workspaceRepository,
                                 WorkspaceMemberRepository memberRepository,
                                 StoragePort storagePort,
                                 Clock clock) {
        this.workspaceRepository = workspaceRepository;
        this.memberRepository = memberRepository;
        this.storagePort = storagePort;
        this.clock = clock;
    }

    /**
     * Stores a new cover for the group.
     *
     * @throws AuthorizationError when the caller may not edit the group
     * @throws ValidationError    when the file is empty, too large, not an
     *                            accepted type, or not a decodable image
     */
    @Transactional
    public void upload(UUID userId, UUID workspaceId, MultipartFile file) {
        validate(file);
        Workspace workspace = requireEditor(userId, workspaceId);

        byte[] banner = toBannerJpeg(file);
        String storageKey = "covers/" + workspaceId + "/" + UUID.randomUUID() + ".jpg";
        storagePort.store(storageKey, new ByteArrayInputStream(banner), banner.length);

        String previous = workspace.replaceCover(storageKey);
        workspace.setUpdatedAt(Instant.now(clock));
        workspaceRepository.save(workspace);

        deleteQuietly(previous);
    }

    /** Removes the cover, leaving the gradient derived from the group id. */
    @Transactional
    public void remove(UUID userId, UUID workspaceId) {
        Workspace workspace = requireEditor(userId, workspaceId);
        String previous = workspace.replaceCover(null);
        workspace.setUpdatedAt(Instant.now(clock));
        workspaceRepository.save(workspace);
        deleteQuietly(previous);
    }

    /**
     * Reads a group's cover.
     *
     * <p>Readable by anyone who can see the group, which includes non-members
     * for a PUBLIC one — those appear in Khám phá, and a card there needs its
     * picture.
     *
     * @throws NotFoundError when the group has no cover, which is also the
     *                       answer for a group the caller may not see
     */
    @Transactional(readOnly = true)
    public byte[] read(UUID userId, UUID workspaceId) {
        Workspace workspace = requireVisible(userId, workspaceId);
        if (!workspace.hasCoverImage()) {
            throw new NotFoundError("Nhóm chưa có ảnh bìa");
        }
        return storagePort.retrieve(workspace.getCoverStorageKey());
    }

    /* ---------- Access ---------- */

    /** Owners and editors may change how the group presents itself. */
    private Workspace requireEditor(UUID userId, UUID workspaceId) {
        Workspace workspace = requireWorkspace(workspaceId);
        WorkspaceMember member = memberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));

        if (!WorkspaceRole.OWNER.equals(member.getRole())
                && !WorkspaceRole.EDITOR.equals(member.getRole())) {
            throw new AuthorizationError("Chỉ chủ sở hữu và người biên tập mới đổi được ảnh bìa");
        }
        return workspace;
    }

    private Workspace requireVisible(UUID userId, UUID workspaceId) {
        Workspace workspace = requireWorkspace(workspaceId);
        if (WorkspaceVisibility.PUBLIC.equals(workspace.getVisibility())) {
            return workspace;
        }
        memberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));
        return workspace;
    }

    private Workspace requireWorkspace(UUID workspaceId) {
        return workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));
    }

    /* ---------- Image handling ---------- */

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationError("Ảnh bìa không được để trống");
        }
        if (file.getSize() > MAX_UPLOAD_BYTES) {
            throw new ValidationError("Ảnh bìa vượt quá 5 MiB");
        }
        if (!ACCEPTED_TYPES.contains(file.getContentType())) {
            throw new ValidationError("Chỉ hỗ trợ ảnh PNG, JPEG hoặc WebP");
        }
    }

    /**
     * Decodes the upload and redraws it at the banner size.
     *
     * <p>Decoding is also the real check that this is an image: a declared
     * content type is only what the client claimed.
     */
    private byte[] toBannerJpeg(MultipartFile file) {
        try {
            BufferedImage source = ImageIO.read(file.getInputStream());
            if (source == null) {
                throw new ValidationError("Không đọc được ảnh, vui lòng thử tệp khác");
            }
            return encodeJpeg(drawBanner(source));
        } catch (IOException e) {
            throw new ValidationError("Không đọc được ảnh, vui lòng thử tệp khác");
        }
    }

    /**
     * Crops to the widest centred 3:1 region, then scales, so nothing is
     * stretched and the middle of the picture is what survives.
     */
    private static BufferedImage drawBanner(BufferedImage source) {
        BufferedImage cropped = cropToRatio(source);

        // TYPE_INT_RGB with a white fill first: JPEG carries no alpha, and a
        // transparent PNG written straight out comes back with black edges.
        BufferedImage target = new BufferedImage(WIDTH_PX, HEIGHT_PX, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = target.createGraphics();
        graphics.setColor(Color.WHITE);
        graphics.fillRect(0, 0, WIDTH_PX, HEIGHT_PX);
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        graphics.drawImage(cropped, 0, 0, WIDTH_PX, HEIGHT_PX, null);
        graphics.dispose();
        return target;
    }

    /** Picks the centred sub-rectangle already matching the banner ratio. */
    private static BufferedImage cropToRatio(BufferedImage source) {
        int width = source.getWidth();
        int height = source.getHeight();
        int byWidth = Math.round(width * (float) HEIGHT_PX / WIDTH_PX);

        if (byWidth <= height) {
            return source.getSubimage(0, (height - byWidth) / 2, width, byWidth);
        }
        int cropWidth = Math.round(height * (float) WIDTH_PX / HEIGHT_PX);
        return source.getSubimage((width - cropWidth) / 2, 0, cropWidth, height);
    }

    private static byte[] encodeJpeg(BufferedImage image) throws IOException {
        var writers = ImageIO.getImageWritersByFormatName("jpeg");
        if (!writers.hasNext()) {
            throw new IOException("No JPEG writer available");
        }
        var writer = writers.next();
        try (ByteArrayOutputStream out = new ByteArrayOutputStream();
             var stream = ImageIO.createImageOutputStream(out)) {
            writer.setOutput(stream);
            var params = writer.getDefaultWriteParam();
            params.setCompressionMode(javax.imageio.ImageWriteParam.MODE_EXPLICIT);
            params.setCompressionQuality(JPEG_QUALITY);
            writer.write(null, new javax.imageio.IIOImage(image, null, null), params);
            stream.flush();
            return out.toByteArray();
        } finally {
            writer.dispose();
        }
    }

    /**
     * Removes the cover this one replaced. A failure here leaves an orphaned
     * blob, which costs storage but must not fail the upload that just
     * succeeded — the new cover is already saved.
     */
    private void deleteQuietly(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            return;
        }
        try {
            storagePort.delete(storageKey);
        } catch (RuntimeException e) {
            log.warn("Could not delete the replaced cover blob; it is now orphaned", e);
        }
    }
}
