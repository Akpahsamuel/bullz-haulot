#[allow(lint(self_transfer))]
module bullz::squad_management {
    use std::string::String;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use sui::table::{Self, Table};
    
    use bullz::asset_registry::{Self, AssetRegistry};
    use bullz::user_accounts::UserRegistry;
    use bullz::fee_management::{Self, Treasury};
    use bullz::error;

    const MIN_BASSETS_FOR_SQUAD: u64 = 7;
    const SQUAD_CREATION_FEE: u64 = 1_000000000; 
    const MIN_BASSET_QUANTITY: u64 = 1;

    

 
    public struct SquadRegistry has key {
        id: UID,
        squads: Table<ID, Squad>,
        user_squads: Table<address, vector<ID>>, 
        all_squad_ids: vector<ID>,
        total_squads: u64,
    }

  
    public struct Squad has key, store {
        id: UID,
        name: String, 
        owner: address,
        basset_symbols: vector<String>, 
        formation: String,
        basset_quantities: vector<u64>,
        locked: bool,
        created_timestamp_ms: u64,
    }

  

    public struct SquadCreated has copy, drop {
        squad_id: ID,
        name: String,
        owner: address,
        basset_symbols: vector<String>,
        basset_quantities: vector<u64>,
    }

    public struct SquadEdited has copy, drop {
        squad_id: ID,
        name: String,
        basset_symbols: vector<String>,
        basset_quantities: vector<u64>,
    }

    public struct SquadLocked has copy, drop {
        squad_id: ID,
        owner: address,
    }

    public struct SquadDisbanded has copy, drop {
        squad_id: ID,
        owner: address,
    }

    

    fun init(ctx: &mut TxContext) {
        let registry = SquadRegistry {
            id: object::new(ctx),
            squads: table::new(ctx),
            user_squads: table::new(ctx),
            all_squad_ids: vector::empty<ID>(),
            total_squads: 0,
        };
        transfer::share_object(registry);
    }

   

   
    entry fun create_squad(
        registry: &mut SquadRegistry,
        user_registry: &UserRegistry,
        asset_registry: &AssetRegistry,
        name: String,
        basset_symbols: vector<String>,
        formation: String,
        basset_quantities: vector<u64>,
        mut payment: Coin<SUI>,
        treasury: &mut Treasury,
        clock: &sui::clock::Clock,
        ctx: &mut TxContext
    ) {
        let caller = tx_context::sender(ctx);
        
       
        let num_bassets = vector::length(&basset_symbols);
        assert!(num_bassets >= MIN_BASSETS_FOR_SQUAD, error::ENotEnoughAssets());
        assert!(num_bassets == vector::length(&basset_quantities), error::EInvalidQuantity());
        
     
        let payment_amount = coin::value(&payment);
        assert!(payment_amount >= SQUAD_CREATION_FEE, error::EInvalidPayment());
        
      
        let exact_payment = coin::split(&mut payment, SQUAD_CREATION_FEE, ctx);
        transfer::public_transfer(payment, caller);
        
     
        fee_management::collect_payment(treasury, exact_payment, ctx);

      
        let mut i = 0;
        while (i < num_bassets) {
            let quantity = *vector::borrow(&basset_quantities, i);
            assert!(quantity >= MIN_BASSET_QUANTITY, error::EInvalidQuantity());
            i = i + 1;
        };

   
        i = 0;
        let user_owned_assets = bullz::user_accounts::get_owned_assets(user_registry, caller);
        
        while (i < num_bassets) {
            let symbol = vector::borrow(&basset_symbols, i);
            
          
            let _vault_id = asset_registry::get_vault_id_by_symbol(asset_registry, *symbol);
            
          
            assert!(vector::contains(&user_owned_assets, symbol), error::EAssetNotOwned());
            
            i = i + 1;
        };

   
        let squad = Squad {
            id: object::new(ctx),
            name,
            owner: caller,
            basset_symbols,
            formation,
            basset_quantities,
            locked: false,
            created_timestamp_ms: sui::clock::timestamp_ms(clock),
        };

        let squad_id = object::id(&squad);

        event::emit(SquadCreated {
            squad_id,
            name: squad.name,
            owner: caller,
            basset_symbols: squad.basset_symbols,
            basset_quantities: squad.basset_quantities,
        });

  
        table::add(&mut registry.squads, squad_id, squad);
        
       
        vector::push_back(&mut registry.all_squad_ids, squad_id);
        
    
        if (!table::contains(&registry.user_squads, caller)) {
            let mut user_squad_ids = vector::empty<ID>();
            vector::push_back(&mut user_squad_ids, squad_id);
            table::add(&mut registry.user_squads, caller, user_squad_ids);
        } else {
            let user_squad_ids = table::borrow_mut(&mut registry.user_squads, caller);
            vector::push_back(user_squad_ids, squad_id);
        };

        registry.total_squads = registry.total_squads + 1;
    }

    
    entry fun edit_squad(
        registry: &mut SquadRegistry,
        user_registry: &UserRegistry,
        asset_registry: &AssetRegistry,
        squad_id: ID,
        new_name: Option<String>,
        new_basset_symbols: Option<vector<String>>,
        new_basset_quantities: Option<vector<u64>>,
        new_formation: Option<String>,
        ctx: &TxContext
    ) {
        let caller = tx_context::sender(ctx);
        
       
        assert!(table::contains(&registry.squads, squad_id), error::ENotSquadOwner());
        let squad = table::borrow_mut(&mut registry.squads, squad_id);
        
        assert!(squad.owner == caller, error::ENotSquadOwner());
        assert!(!squad.locked, error::ESquadLocked());
        
       
        if (option::is_some(&new_name)) {
            squad.name = option::destroy_some(new_name);
        };
        
       
        if (option::is_some(&new_formation)) {
            squad.formation = option::destroy_some(new_formation);
        };
        
       
        if (option::is_some(&new_basset_symbols)) {
            let symbols = option::destroy_some(new_basset_symbols);
            let quantities = option::destroy_some(new_basset_quantities);
            
            let num_bassets = vector::length(&symbols);
            
           
            assert!(num_bassets >= MIN_BASSETS_FOR_SQUAD, error::ENotEnoughAssets());
            assert!(num_bassets == vector::length(&quantities), error::EInvalidQuantity());
            
          
            let mut i = 0;
            while (i < num_bassets) {
                let quantity = *vector::borrow(&quantities, i);
                assert!(quantity >= MIN_BASSET_QUANTITY, error::EInvalidQuantity());
                i = i + 1;
            };
  
            i = 0;
            let user_owned_assets = bullz::user_accounts::get_owned_assets(user_registry, caller);
            
            while (i < num_bassets) {
                let symbol = vector::borrow(&symbols, i);
                
             
                let _vault_id = asset_registry::get_vault_id_by_symbol(asset_registry, *symbol);
                
          
                assert!(vector::contains(&user_owned_assets, symbol), error::EAssetNotOwned());
                
                i = i + 1;
            };

     
            squad.basset_symbols = symbols;
            squad.basset_quantities = quantities;
        };

        event::emit(SquadEdited {
            squad_id,
            name: squad.name,
            basset_symbols: squad.basset_symbols,
            basset_quantities: squad.basset_quantities,
        });
    }

   
    public(package) fun lock_squad(
        registry: &mut SquadRegistry,
        squad_id: ID,
        ctx: &TxContext
    ) {
        let caller = tx_context::sender(ctx);
        
        assert!(table::contains(&registry.squads, squad_id), error::ENotSquadOwner());
        let squad = table::borrow_mut(&mut registry.squads, squad_id);
        
    assert!(squad.owner == caller, error::ENotSquadOwner());
    assert!(!squad.locked, error::ESquadLocked());
        
        squad.locked = true;

        event::emit(SquadLocked {
            squad_id,
            owner: caller,
        });
    }

   
    public(package) fun admin_lock_squad(
        registry: &mut SquadRegistry,
        squad_id: ID,
    ) {
        assert!(table::contains(&registry.squads, squad_id), error::ENotSquadOwner());
        let squad = table::borrow_mut(&mut registry.squads, squad_id);
    assert!(!squad.locked, error::ESquadLocked());
        squad.locked = true;

        event::emit(SquadLocked {
            squad_id,
            owner: squad.owner,
        });
    }

    /// Unlock a squad after competition ends (only callable by other modules in package)
    public(package) fun unlock_squad(
        registry: &mut SquadRegistry,
        squad_id: ID,
    ) {
        assert!(table::contains(&registry.squads, squad_id), error::ENotSquadOwner());
        let squad = table::borrow_mut(&mut registry.squads, squad_id);
        assert!(squad.locked, error::ESquadNotLocked());
        
        squad.locked = false;

        event::emit(SquadLocked {
            squad_id,
            owner: squad.owner,
        });
    }

    /// Admin unlock squad (only callable by other modules in package)
    public(package) fun admin_unlock_squad(
        registry: &mut SquadRegistry,
        squad_id: ID,
    ) {
        assert!(table::contains(&registry.squads, squad_id), error::ENotSquadOwner());
        let squad = table::borrow_mut(&mut registry.squads, squad_id);
        assert!(squad.locked, error::ESquadNotLocked());
        
        squad.locked = false;

        event::emit(SquadLocked {
            squad_id,
            owner: squad.owner,
        });
    }

    entry fun delete_squad(
        registry: &mut SquadRegistry,
        squad_id: ID,
        ctx: &TxContext
    ) {
        let caller = tx_context::sender(ctx);
        
        assert!(table::contains(&registry.squads, squad_id), error::ENotSquadOwner());
        let squad = table::remove(&mut registry.squads, squad_id);
        
    assert!(squad.owner == caller, error::ENotSquadOwner());
    assert!(!squad.locked, error::ESquadLocked());
        
       
        let (found_global, global_idx) = vector::index_of(&registry.all_squad_ids, &squad_id);
        if (found_global) {
            vector::remove(&mut registry.all_squad_ids, global_idx);
        };
        
       
        let user_squad_ids = table::borrow_mut(&mut registry.user_squads, caller);
        let (contains, idx) = vector::index_of(user_squad_ids, &squad_id);
        if (contains) {
            vector::remove(user_squad_ids, idx);
        };

        event::emit(SquadDisbanded {
            squad_id,
            owner: caller,
        });

    
        let Squad { 
            id, 
            name: _,
            owner: _, 
            basset_symbols: _, 
            formation: _,
            basset_quantities: _, 
            locked: _, 
            created_timestamp_ms: _ 
        } = squad;
        object::delete(id);
    }



 
    public fun get_squad_info(squad: &Squad): (String, address, vector<String>, vector<u64>, bool, u64) {
        (squad.name, squad.owner, squad.basset_symbols, squad.basset_quantities, squad.locked, squad.created_timestamp_ms)
    }

    
    public fun get_all_squad_ids(registry: &SquadRegistry): &vector<ID> {
        &registry.all_squad_ids
    }

    public fun get_user_squads(registry: &SquadRegistry, user: address): vector<ID> {
        if (table::contains(&registry.user_squads, user)) {
            *table::borrow(&registry.user_squads, user)
        } else {
            vector::empty<ID>()
        }
    }

    public fun get_user_squad_count(registry: &SquadRegistry, user: address): u64 {
        if (table::contains(&registry.user_squads, user)) {
            vector::length(table::borrow(&registry.user_squads, user))
        } else {
            0
        }
    }

  
    public fun get_total_squads(registry: &SquadRegistry): u64 {
        registry.total_squads
    }


    public fun is_squad_locked(squad: &Squad): bool {
        squad.locked
    }

   
    public fun get_squad_info_by_id(
        registry: &SquadRegistry,
        squad_id: ID
    ): (String, address, vector<String>, vector<u64>, bool, u64) {
        let squad = table::borrow(&registry.squads, squad_id);
        (squad.name, squad.owner, squad.basset_symbols, squad.basset_quantities, squad.locked, squad.created_timestamp_ms)
    }

    // === Test Functions ===
    
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }

    #[test_only]
    public fun get_min_bassets_for_squad(): u64 {
        MIN_BASSETS_FOR_SQUAD
    }

    #[test_only]
    public fun get_squad_creation_fee(): u64 {
        SQUAD_CREATION_FEE
    }
}


