package com.unichat.core.communitychat.service;

import java.util.List;

import com.unichat.core.common.error.ValidationError;

/**
 * The rules for putting a colour behind a post.
 *
 * <p>Two of them, and both exist because the feature stops working outside
 * them. A gradient is only readable behind a line or two, so a long body loses
 * it; and a photo grid over a gradient is noise, so attaching a file clears it
 * (see {@code PostAttachmentService}).
 *
 * <p>Only the key is stored. The gradients themselves live in the frontend, so
 * restyling the set never needs a migration and never strands rows holding
 * colours the design no longer has. The names are validated here anyway: an
 * unknown key would render as no background at all, silently losing what the
 * author chose.
 */
public final class PostBackground {

    /**
     * Longest body that may carry a background.
     *
     * <p>Mirrored by {@code MAX_BACKGROUND_BODY} in the frontend's
     * {@code post-background.ts}, which hides the picker past this length so
     * the limit is met before the request is sent rather than as an error.
     */
    public static final int MAX_BODY_LENGTH = 280;

    /** Must match the presets the frontend can actually draw. */
    private static final List<String> KEYS = List.of(
            "dusk", "ocean", "sunrise", "forest", "grape", "ember", "mint", "slate");

    private PostBackground() {}

    /**
     * Checks a requested background against both rules.
     *
     * @param key  the chosen preset, or null/blank for an ordinary post
     * @param body the post body the background would sit behind
     * @return the key to store, null when the post should have no background
     * @throws ValidationError when the key is unknown or the body is too long
     */
    public static String validate(String key, String body) {
        if (key == null || key.isBlank()) {
            return null;
        }
        if (!KEYS.contains(key)) {
            throw new ValidationError("Nền bài viết không hợp lệ");
        }
        if (body != null && body.length() > MAX_BODY_LENGTH) {
            throw new ValidationError(
                    "Bài viết có nền chỉ được tối đa " + MAX_BODY_LENGTH + " ký tự");
        }
        return key;
    }
}
