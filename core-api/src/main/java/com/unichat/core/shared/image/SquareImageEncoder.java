package com.unichat.core.shared.image;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

import javax.imageio.ImageIO;

import org.springframework.web.multipart.MultipartFile;

import com.unichat.core.common.error.ValidationError;

/**
 * Turns an uploaded image into the square PNG this product stores.
 *
 * <p>An upload is never stored as it arrived. It is decoded, redrawn at a fixed
 * square size and re-encoded as PNG, which caps what a huge file can cost to
 * serve and drops every metadata chunk the original carried — a phone photo
 * otherwise ships GPS coordinates to everyone who can see the picture.
 *
 * <p>Shared by profile pictures and group pictures. The two differ only in
 * where the key is stored and who may set it, which is their services' job;
 * duplicating the decode-and-redraw would mean one of them silently keeping
 * EXIF data the day the other was fixed.
 */
public final class SquareImageEncoder {

    /** Served at 2x for dense screens; the UI shows avatars at 34–96px. */
    private static final int SIZE_PX = 256;
    private static final long MAX_UPLOAD_BYTES = 2L * 1024 * 1024;
    private static final List<String> ACCEPTED_TYPES =
            List.of("image/png", "image/jpeg", "image/webp");

    /** What the endpoints serve, whatever the upload was. */
    public static final String STORED_MEDIA_TYPE = "image/png";

    private SquareImageEncoder() {}

    /**
     * Validates the upload and returns it as a centred square PNG.
     *
     * @param file    the uploaded file
     * @param subject what the picture is, for the error messages a member
     *                reads — "Ảnh đại diện", "Ảnh nhóm"
     * @throws ValidationError when the file is empty, too large, not an
     *                         accepted type, or not a decodable image
     */
    public static byte[] encode(MultipartFile file, String subject) {
        validate(file, subject);
        return toSquarePng(file);
    }

    private static void validate(MultipartFile file, String subject) {
        if (file == null || file.isEmpty()) {
            throw new ValidationError(subject + " không được để trống");
        }
        if (file.getSize() > MAX_UPLOAD_BYTES) {
            throw new ValidationError(subject + " vượt quá 2 MiB");
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
    private static byte[] toSquarePng(MultipartFile file) {
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
}
