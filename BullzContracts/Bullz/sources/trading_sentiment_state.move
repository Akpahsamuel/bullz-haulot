module bullz::trading_sentiment_state {
    use std::string::{Self, String};
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::table::{Self, Table};
    
    use bullz::admin::AdminCap;
    use bullz::subscription::{Self as subscription, SubscriptionRegistry, SubscriptionConfig};
    use bullz::error;

    /// Trading sentiment state storing encrypted blob references
    public struct TradingSentimentState has key {
        id: UID,
        /// Latest blob ID from Walrus
        latest_blob_id: String,
        /// Encryption metadata: Seal identity ID
        encryption_id: String,
        /// Encryption threshold (number of approvals needed)
        encryption_threshold: u8,
        /// Timestamp of last update
        last_update_ts_ms: u64,
        /// Version number (increments with each update)
        version: u64,
        /// Historical blob IDs (keeps last N blob IDs)
        blob_history: Table<u64, BlobMetadata>,
    }

    /// Metadata for each blob snapshot
    public struct BlobMetadata has copy, drop, store {
        blob_id: String,
        encryption_id: String,
        encryption_threshold: u8,
        timestamp_ms: u64,
        week_start_time_ms: u64,
    }

    /// Event emitted when new sentiment snapshot is stored
    public struct SentimentSnapshotStored has copy, drop {
        blob_id: String,
        version: u64,
        timestamp_ms: u64,
    }

    /// Initialize trading sentiment state
    fun init(ctx: &mut TxContext) {
        let state = TradingSentimentState {
            id: object::new(ctx),
            latest_blob_id: string::utf8(b""),
            encryption_id: string::utf8(b""),
            encryption_threshold: 1,
            last_update_ts_ms: 0,
            version: 0,
            blob_history: table::new(ctx),
        };
        
        transfer::share_object(state);
    }

    /// Store new encrypted sentiment snapshot
    /// Only callable by admin
    public fun store_encrypted_sentiment(
        _admin: &AdminCap,
        state: &mut TradingSentimentState,
        blob_id: vector<u8>,
        encryption_id: vector<u8>,
        encryption_threshold: u8,
        week_start_time_ms: u64,
        clock: &Clock,
    ) {
        let now = clock::timestamp_ms(clock);
        let blob_id_str = string::utf8(blob_id);
        let encryption_id_str = string::utf8(encryption_id);

        // Update latest blob ID
        state.latest_blob_id = blob_id_str;
        state.encryption_id = encryption_id_str;
        state.encryption_threshold = encryption_threshold;
        state.last_update_ts_ms = now;
        state.version = state.version + 1;

        // Store in history
        let metadata = BlobMetadata {
            blob_id: blob_id_str,
            encryption_id: encryption_id_str,
            encryption_threshold,
            timestamp_ms: now,
            week_start_time_ms,
        };
        table::add(&mut state.blob_history, state.version, metadata);

        // Emit event
        event::emit(SentimentSnapshotStored {
            blob_id: blob_id_str,
            version: state.version,
            timestamp_ms: now,
        });
    }

    /// Get latest blob ID (public view function)
    public fun get_latest_blob_id(state: &TradingSentimentState): String {
        state.latest_blob_id
    }

    /// Get latest encryption metadata
    public fun get_latest_encryption_metadata(
        state: &TradingSentimentState
    ): (String, u8) {
        (state.encryption_id, state.encryption_threshold)
    }

    /// Get blob metadata by version
    public fun get_blob_metadata(
        state: &TradingSentimentState,
        version: u64
    ): (String, String, u8, u64, u64) {
        assert!(table::contains(&state.blob_history, version), error::EInvalidQuantity());
        let metadata = table::borrow(&state.blob_history, version);
        (
            metadata.blob_id,
            metadata.encryption_id,
            metadata.encryption_threshold,
            metadata.timestamp_ms,
            metadata.week_start_time_ms,
        )
    }

    /// Verify if user has access to sentiment data
    /// Checks subscription status
    public fun verify_access(
        _state: &TradingSentimentState,
        subscription_registry: &SubscriptionRegistry,
        subscription_config: &SubscriptionConfig,
        user: address,
        clock: &Clock,
    ): bool {
        // Check subscription access
        subscription::has_access(
            subscription_registry,
            subscription_config,
            user,
            clock
        )
    }

    /// Get latest state info (version, timestamp)
    public fun get_state_info(
        state: &TradingSentimentState
    ): (u64, u64, String) {
        (state.version, state.last_update_ts_ms, state.latest_blob_id)
    }

    // === Test Functions ===
    
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}

