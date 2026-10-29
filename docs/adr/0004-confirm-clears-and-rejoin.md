# Confirm clears and permit rejoin until match finish

Status: **Accepted**. Date: **29 October 2026 (Asia/Singapore)**.

The owner accepted both recommendations after comparing immediate speculative removal with pending highlights and fixed reconnect windows with until-finish recovery. Keep selected fruit visible and highlighted while waiting for server confirmation. Remove fruit and update scores only from authoritative state; rejection clears the highlight with feedback. This avoids visible rollback during contested clears.

Reserve an active participant's identity and seat through disconnection until the match ends, preserving score. The clock continues. Both disconnecting also leaves the clock running; automatic pause expiry still applies. Reconnection is not persistence across server restarts. No new rejoin is admitted after finish. The initial preview required a new room for another match; [ADR 0005](0005-rematch-in-the-same-room.md) now settles same-room rematches for guests who remain connected. The confirmation and until-finish recovery decisions here remain accepted.

These choices complement first-valid-server-arrival ordering in ADR 0001. The [gameplay contract](../versus-gameplay.md) owns implementation details and verification. [Media folder](../assets/adr-0004/). [Issue 13](https://github.com/matthew-ngzc/fruit-box/issues/13).
