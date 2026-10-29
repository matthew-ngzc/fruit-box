# Confirm clears and permit rejoin until match finish

Status: **Accepted**. Date: **29 October 2026 (Asia/Singapore)**.

The owner accepted both recommendations after comparing immediate speculative removal with pending highlights and fixed reconnect windows with until-finish recovery. Keep selected fruit visible and highlighted while waiting for server confirmation. Remove fruit and update scores only from authoritative state; rejection clears the highlight with feedback. This avoids visible rollback during contested clears.

Reserve an active participant's identity and seat through disconnection until the match ends, preserving score. The clock continues. Both disconnecting also leaves the clock running; automatic pause expiry still applies. Reconnection is not persistence across server restarts. After match finish, a new match uses a new room; a rematch policy remains undecided.

These choices complement first-valid-server-arrival ordering in ADR 0001. The [gameplay contract](../versus-gameplay.md) owns implementation details and verification. [Media folder](../assets/adr-0004/). [Issue 13](https://github.com/matthew-ngzc/fruit-box/issues/13).
