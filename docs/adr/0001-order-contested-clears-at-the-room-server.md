# Order contested clears at the room server

For private shared-board matches, the first valid selection received by the authoritative room server wins contested fruit. We chose this over an arbitration window because immediate, deterministic results suit short matches between friends in Singapore; the trade-off is that lower network latency can help a player win a close conflict. Client timestamps do not decide priority, and reconnects or retries must not award the same clear twice.
