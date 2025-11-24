module bullz::user_accounts {
    use std::string::String;
    use sui::table::{Self, Table};
    use sui::dynamic_field;
    use sui::event;
    use bullz::error;
 
    use bullz::admin::AdminCap;

  
    public struct UserRegistry has key {
        id: UID,
        users: Table<address, UserData>,  
        total_users: u64,
    }

  
    public struct UserData has store {
        alpha_points: u64,
        shill_points: u64,
        owned_assets: vector<String>,
        squad_ids: vector<ID>,
    }
    
    /// Key for dynamic field storing owned pack IDs (user address + marker)
    public struct OwnedPacksKey has copy, drop, store {
        user: address,
    }

   

    public struct AccountCreated has copy, drop {
        owner: address,
    }

    public struct AlphaPointsAwarded has copy, drop {
        owner: address,
        amount: u64,
        new_balance: u64,
        reason: String, 
    }

    public struct AlphaPointsSpent has copy, drop {
        owner: address,
        amount: u64,
        remaining: u64,
        purpose: String, 
    }

    public struct ShillPointsAwarded has copy, drop {
        owner: address,
        amount: u64,
        new_balance: u64,
        reason: String,
    }

    public struct ShillPointsSpent has copy, drop {
        owner: address,
        amount: u64,
        remaining: u64,
        purpose: String, 
    }



    fun init(ctx: &mut TxContext) {
        let registry = UserRegistry {
            id: object::new(ctx),
            users: table::new(ctx),
            total_users: 0,
        };
        
        transfer::share_object(registry);
    }


   
    public(package) fun create_account(registry: &mut UserRegistry, ctx: &TxContext) {
        let user = tx_context::sender(ctx);
        assert!(!table::contains(&registry.users, user), error::EAccountAlreadyExists());

        let user_data = UserData {
            alpha_points: 0,
            shill_points: 1000,
            owned_assets: vector::empty(),
            squad_ids: vector::empty(),
        };

        table::add(&mut registry.users, user, user_data);
        registry.total_users = registry.total_users + 1;

        event::emit(AccountCreated {
            owner: user,
        });
    }

   
    public(package) fun add_squad(registry: &mut UserRegistry, user: address, squad_id: ID) {
        assert!(table::contains(&registry.users, user), error::EAccountNotFound());
        let user_data = table::borrow_mut(&mut registry.users, user);
        if (!vector::contains(&user_data.squad_ids, &squad_id)) {
            vector::push_back(&mut user_data.squad_ids, squad_id);
        }
    }

    public(package) fun remove_squad(registry: &mut UserRegistry, user: address, squad_id: ID) {
        assert!(table::contains(&registry.users, user), error::EAccountNotFound());
        let user_data = table::borrow_mut(&mut registry.users, user);
        let (found, idx) = vector::index_of(&user_data.squad_ids, &squad_id);
        if (found) {
            vector::remove(&mut user_data.squad_ids, idx);
        }
    }

   
    public fun get_squads_count(registry: &UserRegistry, user: address): u64 {
        if (!table::contains(&registry.users, user)) {
            return 0
        };
        vector::length(&table::borrow(&registry.users, user).squad_ids)
    }

   
    public(package) fun award_alpha_points(
        registry: &mut UserRegistry,
        user: address,
        amount: u64,
        reason: String,
    ) {
    assert!(table::contains(&registry.users, user), error::EAccountNotFound());
        let user_data = table::borrow_mut(&mut registry.users, user);
        user_data.alpha_points = user_data.alpha_points + amount;
        
        event::emit(AlphaPointsAwarded {
            owner: user,
            amount,
            new_balance: user_data.alpha_points,
            reason,
        });
    }

    
    public(package) fun spend_alpha_points(
        registry: &mut UserRegistry,
        user: address,
        amount: u64,
        purpose: String,
    ) {
    assert!(table::contains(&registry.users, user), error::EAccountNotFound());
        let user_data = table::borrow_mut(&mut registry.users, user);
    assert!(user_data.alpha_points >= amount, error::EInsufficientAlphaPoints());
        user_data.alpha_points = user_data.alpha_points - amount;
        
        event::emit(AlphaPointsSpent {
            owner: user,
            amount,
            remaining: user_data.alpha_points,
            purpose,
        });
    }

    public(package) fun award_shill_points(
        registry: &mut UserRegistry,
        user: address,
        amount: u64,
        reason: String,
    ) {
    assert!(table::contains(&registry.users, user), error::EAccountNotFound());
        let user_data = table::borrow_mut(&mut registry.users, user);
        user_data.shill_points = user_data.shill_points + amount;
        
        event::emit(ShillPointsAwarded {
            owner: user,
            amount,
            new_balance: user_data.shill_points,
            reason,
        });
    }

    public(package) fun spend_shill_points(
        registry: &mut UserRegistry,
        user: address,
        amount: u64,
        purpose: String,
    ) {
    assert!(table::contains(&registry.users, user), error::EAccountNotFound());
        let user_data = table::borrow_mut(&mut registry.users, user);
    assert!(user_data.shill_points >= amount, error::EInsufficientShillPoints());
        user_data.shill_points = user_data.shill_points - amount;
        
        event::emit(ShillPointsSpent {
            owner: user,
            amount,
            remaining: user_data.shill_points,
            purpose,
        });
    }

    public fun can_compete(registry: &UserRegistry, user: address): bool {
        if (!table::contains(&registry.users, user)) {
            return false
        };
        let user_data = table::borrow(&registry.users, user);
        user_data.shill_points > 0
    }

    public(package) fun assert_can_compete(registry: &UserRegistry, user: address) {
        assert!(table::contains(&registry.users, user), error::EAccountNotFound());
        let user_data = table::borrow(&registry.users, user);
        assert!(user_data.shill_points > 0, error::ENoShillPointsCannotCompete());
    }

   
    entry fun grant_alpha_points(
        _admin_cap: &AdminCap,
        registry: &mut UserRegistry,
        user: address,
        amount: u64,
    ) {
        assert!(table::contains(&registry.users, user), error::EAccountNotFound());
        let user_data = table::borrow_mut(&mut registry.users, user);
        user_data.alpha_points = user_data.alpha_points + amount;
        
        event::emit(AlphaPointsAwarded {
            owner: user,
            amount,
            new_balance: user_data.alpha_points,
            reason: b"Admin Grant".to_string(),
        });
    }

    entry fun grant_shill_points(
        _admin_cap: &AdminCap,
        registry: &mut UserRegistry,
        user: address,
        amount: u64,
    ) {
        assert!(table::contains(&registry.users, user), error::EAccountNotFound());
        let user_data = table::borrow_mut(&mut registry.users, user);
        user_data.shill_points = user_data.shill_points + amount;
        
        event::emit(ShillPointsAwarded {
            owner: user,
            amount,
            new_balance: user_data.shill_points,
            reason: b"Admin Grant".to_string(),
        });
    }

   
    public(package) fun track_asset_ownership(
        registry: &mut UserRegistry,
        user: address,
        symbol: String,
    ) {
        assert!(table::contains(&registry.users, user), error::EAccountNotFound());
        let user_data = table::borrow_mut(&mut registry.users, user);
        
        // Only add if not already in the list
        if (!vector::contains(&user_data.owned_assets, &symbol)) {
            vector::push_back(&mut user_data.owned_assets, symbol);
        };
    }

    
    public(package) fun untrack_asset_ownership(
        registry: &mut UserRegistry,
        user: address,
        symbol: String,
    ) {
        assert!(table::contains(&registry.users, user), error::EAccountNotFound());
        let user_data = table::borrow_mut(&mut registry.users, user);
        
        let (has_asset, index) = vector::index_of(&user_data.owned_assets, &symbol);
        if (has_asset) {
            vector::remove(&mut user_data.owned_assets, index);
        };
    }

   
   
    public(package) fun add_pack(
        registry: &mut UserRegistry,
        user: address,
        pack_id: ID,
    ) {
        assert!(table::contains(&registry.users, user), error::EAccountNotFound());
        
        let key = OwnedPacksKey { user };
       
        if (!dynamic_field::exists_(&registry.id, key)) {
            dynamic_field::add(&mut registry.id, key, vector::singleton(pack_id));
        } else {
            // Otherwise, add to existing vector
            let packs = dynamic_field::borrow_mut<OwnedPacksKey, vector<ID>>(&mut registry.id, key);
            vector::push_back(packs, pack_id);
        };
    }

    public(package) fun remove_pack(
        registry: &mut UserRegistry,
        user: address,
        pack_id: ID,
    ) {
        assert!(table::contains(&registry.users, user), error::EAccountNotFound());
        
        let key = OwnedPacksKey { user };
        assert!(dynamic_field::exists_(&registry.id, key), error::EPackNotFound());
        
        let packs = dynamic_field::borrow_mut<OwnedPacksKey, vector<ID>>(&mut registry.id, key);
        let (found, index) = vector::index_of(packs, &pack_id);
        assert!(found, error::EPackNotFound());
        vector::remove(packs, index);
        
        // If user has no more packs, remove the dynamic field entirely to save storage
        if (vector::is_empty(packs)) {
            let empty_packs = dynamic_field::remove<OwnedPacksKey, vector<ID>>(&mut registry.id, key);
            vector::destroy_empty(empty_packs);
        };
    }



    // === View Functions ===

    public fun has_account(registry: &UserRegistry, user: address): bool {
        table::contains(&registry.users, user)
    }

    public fun get_alpha_points(registry: &UserRegistry, user: address): u64 {
        if (!table::contains(&registry.users, user)) {
            return 0
        };
        table::borrow(&registry.users, user).alpha_points
    }

    
    public fun get_shill_points(registry: &UserRegistry, user: address): u64 {
        if (!table::contains(&registry.users, user)) {
            return 0
        };
        table::borrow(&registry.users, user).shill_points
    }


    public fun get_point_balances(registry: &UserRegistry, user: address): (u64, u64) {
        if (!table::contains(&registry.users, user)) {
            return (0, 0)
        };
        let user_data = table::borrow(&registry.users, user);
        (user_data.alpha_points, user_data.shill_points)
    }

  
    public fun get_total_users(registry: &UserRegistry): u64 {
        registry.total_users
    }

    public fun get_owned_assets(registry: &UserRegistry, user: address): vector<String> {
        if (!table::contains(&registry.users, user)) {
            return vector::empty()
        };
        *&table::borrow(&registry.users, user).owned_assets
    }


    /// Get list of pack IDs owned by user (from dynamic field)
    public fun get_owned_packs(registry: &UserRegistry, user: address): vector<ID> {
        if (!table::contains(&registry.users, user)) {
            return vector::empty()
        };
        
        let key = OwnedPacksKey { user };
        
        // Check if user has the dynamic field for packs
        if (!dynamic_field::exists_(&registry.id, key)) {
            return vector::empty()
        };
        
        *dynamic_field::borrow<OwnedPacksKey, vector<ID>>(&registry.id, key)
    }

   

    // === Test Functions ===
    
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }

    #[test_only]
    public fun track_asset_ownership_for_testing(
        registry: &mut UserRegistry,
        user: address,
        symbol: String,
    ) {
        track_asset_ownership(registry, user, symbol);
    }
}
