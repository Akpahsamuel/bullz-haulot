module bullz::weekly_competition {
    use std::string::String;
    use sui::event;
    use sui::clock::Clock;
    use sui::table::{Self, Table};


    use bullz::admin::AdminCap;
    use bullz::user_accounts::{Self as accounts, UserRegistry};
    use bullz::squad_management::{Self as squads, SquadRegistry};
    use bullz::asset_registry::AssetRegistry;
    use bullz::error;

    // Phase 1 weekly competition implementation
    // - Users must have Shill Points > 0 to enter (TEMPORARILY DISABLED - shill point check commented out)
    // - Entry locks a squad before the lock deadline
    // - Asset points are cumulatively updated during the week (e.g., +10 per +1%)
    // - A squad's score is the sum of its assets' points (quantities ignored)
    // - At the end, each user earns Shill Points = floor(total_score / 2)
    // - Alpha Points awarded in two ways:
    //   1. Top Asset Holders: Holders of top 3 performing assets in each category
    //   2. Top Squad Performers: Best-performing overall squads (% gains)

  

    public struct CompetitionState has key {
        id: UID,
        week_index: u64,
        start_ts_ms: u64,
        lock_ts_ms: u64,
        end_ts_ms: u64,
        active: bool,
        locked: bool,
        participants: vector<Participant>,
        user_scores: vector<UserScore>,
        asset_points: vector<AssetPoints>,
        asset_alpha_rewards: vector<AssetAlphaReward>,
        claimed_rewards: Table<address, ClaimedRewards>,
    }

    public struct Participant has copy, drop, store {
        owner: address,
        squad_id: ID,
        symbols: vector<String>,
        quantities: vector<u64>, 
        joined_ts_ms: u64,
    }

    public struct UserScore has copy, drop, store {
        owner: address,
        score: u64,
        shill_points: u64, 
        alpha_points: u64, 
        rank: u64,         
        redeemed: bool,   
    }

    public struct AssetPoints has copy, drop, store {
        symbol: String,
        points: u64,
    }

    // === Events ===

    public struct CompetitionStarted has copy, drop {
        week_index: u64,
        start_ts_ms: u64,
        lock_ts_ms: u64,
        end_ts_ms: u64,
    }

    public struct SquadEntered has copy, drop {
        week_index: u64,
        owner: address,
        squad_id: ID,
        num_assets: u64,
    }

    public struct AssetPointsUpdated has copy, drop {
        week_index: u64,
        symbol: String,
        new_total_points: u64,
    }

    public struct ScoresRecomputed has copy, drop {
        week_index: u64,
        users_scored: u64,
    }

    public struct CompetitionFinalized has copy, drop {
        week_index: u64,
        total_participants: u64,
        total_shill_available: u64,
        total_alpha_available: u64,
    }

    public struct ShillPointsRedeemed has copy, drop {
        week_index: u64,
        owner: address,
        shill_points: u64,
    }

    public struct AlphaPointsRedeemed has copy, drop {
        week_index: u64,
        owner: address,
        alpha_points: u64,
        rank: u64,
    }

    // public struct HourlyShillAwarded has copy, drop {
    //     week_index: u64,
    //     owner: address,
    //     shill_points: u64,
    //     timestamp: u64,
    // }

    // public struct HourlyShillDistribution has copy, drop {
    //     week_index: u64,
    //     total_participants: u64,
    //     total_shill_awarded: u64,
    //     timestamp: u64,
    // }


    // public struct AlphaPointsDistribution has copy, drop {
    //     week_index: u64,
    //     category: String,
    //     asset_symbol: String,
    //     rank: u64,
    //     total_alpha_points: u64,
    //     distributed_to_holders: u64,
    // }

    public struct CategoryAlphaAwarded has copy, drop {
        week_index: u64,
        category: String,
        asset_symbol: String,
        rank: u64,
        alpha_points: u64,
        owner: address,
    }

    public struct AssetAlphaReward has copy, drop, store {
        asset_symbol: String,
        category: String,
        rank: u64,
        total_alpha_points: u64,
    }

    public struct ClaimedRewards has copy, drop, store {
        week_index: u64,
        claimed_alpha_assets: vector<String>,
        claimed_shill_points: bool,
    }

    public struct AssetPerformance has copy, drop, store {
        symbol: String,
        points: u64,
    }


    fun init(ctx: &mut TxContext) {
        let state = CompetitionState {
            id: object::new(ctx),
            week_index: 0,
            start_ts_ms: 0,
            lock_ts_ms: 0,
            end_ts_ms: 0,
            active: false,
            locked: false,
            participants: vector::empty<Participant>(),
            user_scores: vector::empty<UserScore>(),
            asset_points: vector::empty<AssetPoints>(),
            asset_alpha_rewards: vector::empty<AssetAlphaReward>(),
            claimed_rewards: table::new(ctx),
        };
        transfer::share_object(state);
    }

    // === Internal helpers ===

    fun now_ms(clock: &Clock): u64 { sui::clock::timestamp_ms(clock) }

   
    fun get_top_3_assets_in_category(state: &CompetitionState, category_assets: &vector<String>): vector<String> {
        let mut asset_performances = vector::empty<AssetPerformance>();
        let mut i = 0;
        let num_assets = vector::length(category_assets);
        
       
        while (i < num_assets) {
            let asset_symbol = *vector::borrow(category_assets, i);
            let points = get_asset_points(&state.asset_points, &asset_symbol);
            let performance = AssetPerformance {
                symbol: asset_symbol,
                points: points,
            };
            vector::push_back(&mut asset_performances, performance);
            i = i + 1;
        };
        
       
        let mut k = 0;
        let len = vector::length(&asset_performances);
        while (k < len) {
            let mut l = 0;
            while (l < len - 1 - k) {
                let perf_a = vector::borrow(&asset_performances, l);
                let perf_b = vector::borrow(&asset_performances, l + 1);
                if (perf_a.points < perf_b.points) {
                   
                    vector::swap(&mut asset_performances, l, l + 1);
                };
                l = l + 1;
            };
            k = k + 1;
        };
        
     
        let mut top_3 = vector::empty<String>();
        let mut j = 0;
        while (j < 3 && j < vector::length(&asset_performances)) {
            let perf = vector::borrow(&asset_performances, j);
            vector::push_back(&mut top_3, perf.symbol);
            j = j + 1;
        };
        
        top_3
    }

   
   
    fun store_alpha_points_for_asset_holders(
        state: &mut CompetitionState,
        asset_symbol: &String,
        total_alpha_points: u64,
        rank: u64,
        category_name: &String,
    ) {
        let reward = AssetAlphaReward {
            asset_symbol: *asset_symbol,
            category: *category_name,
            rank,
            total_alpha_points,
        };
        
        vector::push_back(&mut state.asset_alpha_rewards, reward);
    }

    
    entry fun redeem_asset_alpha_points(
        state: &mut CompetitionState,
        user_registry: &mut UserRegistry,
        asset_symbol: String,
        ctx: &TxContext,
    ) {
        let caller = tx_context::sender(ctx);
        assert!(!state.active, error::EInvalidQuantity()); 
        
       
        let claimed_rewards = get_or_create_claimed_rewards(state, caller);
        let mut already_claimed = false;
        let mut i = 0;
        let claimed_len = vector::length(&claimed_rewards.claimed_alpha_assets);
        while (i < claimed_len) {
            if (*vector::borrow(&claimed_rewards.claimed_alpha_assets, i) == asset_symbol) {
                already_claimed = true;
                break
            };
            i = i + 1;
        };
        
        assert!(!already_claimed, error::EInvalidQuantity()); 
        
      
        let mut found = false;
        let mut alpha_share = 0u64;
        let mut reward_rank = 0u64;
        let mut reward_category = std::string::utf8(b"");
        
        let mut j = 0;
        let len = vector::length(&state.asset_alpha_rewards);
        
        while (j < len) {
            let reward = vector::borrow(&state.asset_alpha_rewards, j);
            if (reward.asset_symbol == asset_symbol) {
               
                let user_shares = get_user_asset_shares(state, caller, &asset_symbol);
                assert!(user_shares > 0, error::EInvalidQuantity()); 
                
                let total_shares = get_total_asset_shares(state, &asset_symbol);
                alpha_share = (reward.total_alpha_points * user_shares) / total_shares;
                
                assert!(alpha_share > 0, error::EInvalidQuantity()); 
                
                reward_rank = reward.rank;
                reward_category = reward.category;
                found = true;
                break
            };
            j = j + 1;
        };
        
        assert!(found, error::EAccountNotFound()); 
        
     
        accounts::award_alpha_points(
            user_registry,
            caller,
            alpha_share,
            std::string::utf8(b"Top Asset Holder")
        );
      
        let claimed_rewards = get_or_create_claimed_rewards(state, caller);
        vector::push_back(&mut claimed_rewards.claimed_alpha_assets, asset_symbol);
        
       
        event::emit(CategoryAlphaAwarded {
            week_index: state.week_index,
            category: reward_category,
            asset_symbol,
            rank: reward_rank,
            alpha_points: alpha_share,
            owner: caller,
        });
    }

   
    fun get_user_asset_shares(state: &CompetitionState, owner: address, asset_symbol: &String): u64 {
        let mut i = 0;
        let num_participants = vector::length(&state.participants);
        
        while (i < num_participants) {
            let participant = vector::borrow(&state.participants, i);
            if (participant.owner == owner) {
                let mut j = 0;
                let num_assets = vector::length(&participant.symbols);
                
                while (j < num_assets) {
                    let symbol = vector::borrow(&participant.symbols, j);
                    let quantity = *vector::borrow(&participant.quantities, j);
                    
                    if (symbol == asset_symbol) {
                        return quantity
                    };
                    j = j + 1;
                };
            };
            i = i + 1;
        };
        0
    }

    
    fun get_total_asset_shares(state: &CompetitionState, asset_symbol: &String): u64 {
        let mut total = 0u64;
        let mut i = 0;
        let num_participants = vector::length(&state.participants);
        
        while (i < num_participants) {
            let participant = vector::borrow(&state.participants, i);
            let mut j = 0;
            let num_assets = vector::length(&participant.symbols);
            
            while (j < num_assets) {
                let symbol = vector::borrow(&participant.symbols, j);
                let quantity = *vector::borrow(&participant.quantities, j);
                
                if (symbol == asset_symbol) {
                    total = total + quantity;
                    break
                };
                j = j + 1;
            };
            i = i + 1;
        };
        total
    }

    fun get_or_create_claimed_rewards(state: &mut CompetitionState, user: address): &mut ClaimedRewards {
        if (table::contains(&state.claimed_rewards, user)) {
            table::borrow_mut(&mut state.claimed_rewards, user)
        } else {
            let claimed_rewards = ClaimedRewards {
                week_index: state.week_index,
                claimed_alpha_assets: vector::empty<String>(),
                claimed_shill_points: false,
            };
            table::add(&mut state.claimed_rewards, user, claimed_rewards);
            table::borrow_mut(&mut state.claimed_rewards, user)
        }
    }

    fun find_user_score_mut(list: &mut vector<UserScore>, owner: address): (bool, &mut UserScore) {
        let mut i = 0;
        let len = vector::length(list);
        while (i < len) {
            let item = vector::borrow_mut(list, i);
            if (item.owner == owner) { return (true, item) };
            i = i + 1;
        };
        let new = UserScore { owner, score: 0, shill_points: 0, alpha_points: 0, rank: 0, redeemed: false };
        vector::push_back(list, new);
        let last = vector::length(list) - 1;
        (false, vector::borrow_mut(list, last))
    }

    fun get_asset_points(asset_points: &vector<AssetPoints>, symbol: &String): u64 {
        let mut i = 0;
        let len = vector::length(asset_points);
        while (i < len) {
            let ap = vector::borrow(asset_points, i);
            if (*&ap.symbol == *symbol) { return ap.points };
            i = i + 1;
        };
        0
    }

    fun set_asset_points(asset_points: &mut vector<AssetPoints>, symbol: String, points: u64) {
        let mut i = 0;
        let len = vector::length(asset_points);
        while (i < len) {
            let ap = vector::borrow_mut(asset_points, i);
            if (ap.symbol == symbol) { ap.points = points; return };
            i = i + 1;
        };
        vector::push_back(asset_points, AssetPoints { symbol, points });
    }

   
    fun sum_points_for_symbols_with_quantities(
        asset_points: &vector<AssetPoints>, 
        symbols: &vector<String>,
        quantities: &vector<u64>
    ): u64 {
        let mut total = 0u64;
        let mut i = 0;
        let n = vector::length(symbols);
        while (i < n) {
            let sym = vector::borrow(symbols, i);
            let qty = *vector::borrow(quantities, i);
            let pts = get_asset_points(asset_points, sym);
            total = total + (pts * qty);
            i = i + 1;
        };
        total
    }

   

   
    entry fun start_weekly_competition(
        _admin: &AdminCap,
        state: &mut CompetitionState,
        week_index: u64,
        lock_offset_ms: u64,
        end_offset_ms: u64,
        clock: &Clock,
    ) {
        let now = now_ms(clock);
        let lock_ts_ms = now + lock_offset_ms;
        let end_ts_ms = now + end_offset_ms;
        
        assert!(end_ts_ms > lock_ts_ms && lock_ts_ms > now, error::EInvalidQuantity());
        state.week_index = week_index;
        state.start_ts_ms = now;
        state.lock_ts_ms = lock_ts_ms;
        state.end_ts_ms = end_ts_ms;
        state.active = true;
        state.locked = false;
        state.participants = vector::empty<Participant>();
        state.user_scores = vector::empty<UserScore>();
        state.asset_points = vector::empty<AssetPoints>();
        event::emit(CompetitionStarted { week_index, start_ts_ms: now, lock_ts_ms, end_ts_ms });
    }

    
    entry fun lock_participants(
        _admin: &AdminCap,
        state: &mut CompetitionState,
        squad_registry: &mut SquadRegistry,
        user_registry: &UserRegistry,
        clock: &Clock,
    ) {
        assert!(state.active, error::EInvalidQuantity());
        assert!(!state.locked, error::EInvalidQuantity()); 
        
        let now = now_ms(clock);
        state.locked = true;
        
       
        let all_squad_ids = squads::get_all_squad_ids(squad_registry);
        let squad_ids = *all_squad_ids; 
        let mut i = 0;
        let len = vector::length(&squad_ids);
        
        while (i < len) {
            let squad_id = *vector::borrow(&squad_ids, i);
            
           
            let (_name, owner, symbols, quantities, locked, _created_ms) = squads::get_squad_info_by_id(squad_registry, squad_id);
            
           
           
            if (accounts::can_compete(user_registry, owner) && !locked) {
             
                squads::admin_lock_squad(squad_registry, squad_id);
                
              
                let participant = Participant { owner, squad_id, symbols, quantities, joined_ts_ms: now };
                vector::push_back(&mut state.participants, participant);
                
                event::emit(SquadEntered { 
                    week_index: state.week_index, 
                    owner, 
                    squad_id, 
                    num_assets: vector::length(&quantities) 
                });
            };
           
            i = i + 1;
        };
    }

  
    public fun push_asset_points(
        _admin: &AdminCap,
        state: &mut CompetitionState,
        symbol: String,
        points_delta: u64,
    ) {
        let current = get_asset_points(&state.asset_points, &symbol);
        let new_total = current + points_delta;
        set_asset_points(&mut state.asset_points, symbol, new_total);

       
        let mut i = 0; let len = vector::length(&state.asset_points);
        while (i < len) {
            let ap = vector::borrow(&state.asset_points, i);
            if (*&ap.symbol == symbol) {
                event::emit(AssetPointsUpdated { week_index: state.week_index, symbol: ap.symbol, new_total_points: ap.points });
                break
            };
            i = i + 1;
        };
    }

   
    public(package) fun recompute_scores(state: &mut CompetitionState) {
        state.user_scores = vector::empty<UserScore>();
        let mut i = 0; let n = vector::length(&state.participants);
        while (i < n) {
            let p = vector::borrow(&state.participants, i);
            let score = sum_points_for_symbols_with_quantities(&state.asset_points, &p.symbols, &p.quantities);
            let (_existed, us) = find_user_score_mut(&mut state.user_scores, p.owner);
            us.score = us.score + score;
          
            i = i + 1;
        };
        event::emit(ScoresRecomputed { week_index: state.week_index, users_scored: vector::length(&state.user_scores) });
    }

   
    entry fun finalize_competition(
        _admin: &AdminCap,
        state: &mut CompetitionState,
        squad_registry: &mut SquadRegistry,
        clock: &Clock,
    ) {
        assert!(state.active, error::EInvalidQuantity());
        let now = now_ms(clock);
        assert!(now >= state.end_ts_ms, error::EInvalidQuantity());

      
        recompute_scores(state);

        let users = vector::length(&state.user_scores);

        // Assign rankings and Alpha Points to top 3 squad performers
        // This implements the "Top Squad Performers" method (Secondary Alpha Points)
        // Top 3 users are determined by their overall squad performance (% gains)
        let mut picked = vector::empty<bool>();
        let mut j = 0; while (j < users) { vector::push_back(&mut picked, false); j = j + 1; };
        let mut rank = 1u64;
        let mut total_alpha_available = 0u64;
        
        while (rank <= 3 && rank <= users) {
            let mut best_idx = 0u64; let mut best_score = 0u64; let mut found = false;
            let mut k = 0; while (k < users) {
                if (!*vector::borrow(&picked, k)) {
                    let us = vector::borrow(&state.user_scores, k);
                  
                    if (!found || us.score > best_score) { best_idx = k; best_score = us.score; found = true; };
                };
                k = k + 1;
            };
            if (!found || best_score == 0) break;
            
            // Alpha Points for top 3 squad performers (not asset holders)
            let alpha = if (rank == 1) { 100 } else { if (rank == 2) { 60 } else { 40 } };
            let us = vector::borrow_mut(&mut state.user_scores, best_idx);
            us.rank = rank;
            us.alpha_points = alpha;
            total_alpha_available = total_alpha_available + alpha;
            *vector::borrow_mut(&mut picked, best_idx) = true;
            rank = rank + 1;
        };

        state.active = false;
        
      
        let mut i = 0;
        let num_participants = vector::length(&state.participants);
        while (i < num_participants) {
            let participant = vector::borrow(&state.participants, i);
            squads::admin_unlock_squad(squad_registry, participant.squad_id);
            i = i + 1;
        };
        
        event::emit(CompetitionFinalized { 
            week_index: state.week_index, 
            total_participants: vector::length(&state.participants),
            total_shill_available: 0, 
            total_alpha_available 
        });
    }

   
    fun get_assets_by_category(asset_registry: &AssetRegistry, category: &String): vector<String> {
      
        bullz::asset_registry::get_assets_by_category(asset_registry, category)
    }

    /// Admin computes Alpha Points for top 3 asset holders in each category (Primary Alpha Points)
    entry fun compute_category_alpha_points(
        _admin: &AdminCap,
        state: &mut CompetitionState,
        asset_registry: &AssetRegistry,
        categories: vector<String>,
        total_alpha_pool: u64,
        _ctx: &TxContext,
    ) {
        assert!(!state.active, error::EInvalidQuantity());
        
        let num_categories = vector::length(&categories);
        assert!(num_categories > 0, error::EInvalidQuantity());
       
        let category_alpha = total_alpha_pool / num_categories;
        
        let mut category_idx = 0;
        
        while (category_idx < num_categories) {
            let category_name = *vector::borrow(&categories, category_idx);
            
           
            let assets_in_category = get_assets_by_category(asset_registry, &category_name);
            
            
            let top_3_assets = get_top_3_assets_in_category(state, &assets_in_category);
            
           
            let mut rank = 0;
            while (rank < vector::length(&top_3_assets) && rank < 3) {
                let asset_symbol = *vector::borrow(&top_3_assets, rank);
                let alpha_points = if (rank == 0) {
                    category_alpha * 50 / 100  
                } else if (rank == 1) {
                    category_alpha * 30 / 100  
                } else {
                    category_alpha * 20 / 100  
                };
                
                
                store_alpha_points_for_asset_holders(
                    state,
                    &asset_symbol,
                    alpha_points,
                    rank + 1,
                    &category_name,
                );
                
                rank = rank + 1;
            };
            
            category_idx = category_idx + 1;
        };
    }


  
    entry fun claim_current_shill_points(
        state: &mut CompetitionState,
        user_registry: &mut UserRegistry,
        squad_registry: &SquadRegistry,
        ctx: &TxContext,
    ) {
        let caller = tx_context::sender(ctx);
        assert!(state.active, error::EInvalidQuantity()); 
        assert!(state.locked, error::EInvalidQuantity()); 
      
        let claimed_rewards = get_or_create_claimed_rewards(state, caller);
        assert!(!claimed_rewards.claimed_shill_points, error::EInvalidQuantity()); 
        
       
        let user_squads = squads::get_user_squads(squad_registry, caller);
        assert!(vector::length(&user_squads) > 0, error::EInvalidQuantity()); 
        
        let squad_id = *vector::borrow(&user_squads, 0); 
        let (_name, _owner, symbols, quantities, _locked, _created_ms) = squads::get_squad_info_by_id(squad_registry, squad_id);
        
       
        let shill_points = sum_points_for_symbols_with_quantities(
            &state.asset_points, 
            &symbols, 
            &quantities
        );
        
        assert!(shill_points > 0, error::EInvalidQuantity()); 
        
      
        accounts::award_shill_points(
            user_registry, 
            caller, 
            shill_points, 
            std::string::utf8(b"Competition Claim")
        );
        
 
        let claimed_rewards = get_or_create_claimed_rewards(state, caller);
        claimed_rewards.claimed_shill_points = true;
        
        event::emit(ShillPointsRedeemed {
            week_index: state.week_index,
            owner: caller,
            shill_points,
        });
    }

  
    entry fun redeem_alpha_points(
        state: &mut CompetitionState,
        user_registry: &mut UserRegistry,
        ctx: &TxContext,
    ) {
        let caller = tx_context::sender(ctx);
        assert!(!state.active, error::EInvalidQuantity()); 
        
    
        let mut found = false;
        let mut i = 0;
        let len = vector::length(&state.user_scores);
        
        while (i < len) {
            let us = vector::borrow_mut(&mut state.user_scores, i);
            if (us.owner == caller) {
                
                assert!(us.alpha_points > 0, error::EInvalidQuantity());
                  // Award Alpha Points
                let alpha_amount = us.alpha_points;
                accounts::award_alpha_points(
                    user_registry, 
                    caller, 
                    alpha_amount, 
                    std::string::utf8(b"Top Squad Bonus")
                );
                
               
                us.alpha_points = 0;
                found = true;
                
                event::emit(AlphaPointsRedeemed {
                    week_index: state.week_index,
                    owner: caller,
                    alpha_points: alpha_amount,
                    rank: us.rank,
                });
                
                break
            };
            i = i + 1;
        };
        
        assert!(found, error::EAccountNotFound()); 
    }

  
    public fun get_week_meta(state: &CompetitionState): (u64, u64, u64, u64, bool, bool) { (state.week_index, state.start_ts_ms, state.lock_ts_ms, state.end_ts_ms, state.active, state.locked) }
    public fun get_user_scores(state: &CompetitionState): vector<UserScore> { state.user_scores }
    public fun get_asset_points_list(state: &CompetitionState): vector<AssetPoints> { state.asset_points }
    public fun get_participants(state: &CompetitionState): vector<Participant> { state.participants }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) { init(ctx); }

    // Test-only 
    #[test_only]
    public fun set_end_time_for_testing(state: &mut CompetitionState, end_ts_ms: u64) { state.end_ts_ms = end_ts_ms }

    #[test_only]
    public fun set_lock_time_for_testing(state: &mut CompetitionState, lock_ts_ms: u64) { state.lock_ts_ms = lock_ts_ms }
}


