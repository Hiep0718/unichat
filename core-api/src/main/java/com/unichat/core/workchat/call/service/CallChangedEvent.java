package com.unichat.core.workchat.call.service;

import java.util.UUID;

import com.unichat.core.workchat.call.domain.Call;

/**
 * A call reached a state one person needs to be told about.
 *
 * <p>Carries the recipient rather than letting the broadcaster work it out,
 * because who needs telling depends on what happened: the callee learns a call
 * is incoming, the caller learns it was answered or refused, and whoever did
 * not hang up learns that the other side did.
 *
 * @param recipientId the one person this is for
 * @param call        the call as it now stands
 */
public record CallChangedEvent(UUID recipientId, Call call) {
}
