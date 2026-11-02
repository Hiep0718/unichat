package com.unichat.core.user.domain;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Stores an {@link AvatarColor} in the lowercase form the column accepts.
 *
 * <p>{@code @Enumerated(EnumType.STRING)} writes the enum's name, so picking a
 * colour tried to store {@code "NAVY"} while {@code chk_users_avatar_color}
 * (migration V24) admits only {@code 'navy'}, {@code 'teal'}, {@code 'plum'},
 * {@code 'moss'}, {@code 'clay'} and {@code 'slate'}. Every attempt to choose
 * a colour therefore failed on the constraint, and nothing in the test suite
 * covered the path, so the letter avatars silently fell back to the colour
 * derived from the name everywhere.
 *
 * <p>A converter rather than a migration: {@link AvatarColor#key()} already
 * documents lowercase as the stored form, and no row can hold an uppercase
 * value — the constraint refused them all — so there is nothing to rewrite.
 *
 * <p>Reading accepts either case, so a value written before this converter
 * existed would still load rather than failing the whole query.
 */
@Converter(autoApply = false)
public class AvatarColorConverter implements AttributeConverter<AvatarColor, String> {

    @Override
    public String convertToDatabaseColumn(AvatarColor attribute) {
        return attribute == null ? null : attribute.key();
    }

    @Override
    public AvatarColor convertToEntityAttribute(String dbData) {
        return dbData == null ? null : AvatarColor.fromKey(dbData).orElse(null);
    }
}
