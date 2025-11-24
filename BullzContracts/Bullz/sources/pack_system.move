#[allow(lint(self_transfer))]
module bullz::pack_system {
    use std::string::String;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use sui::random::{Self, Random};
    use sui::vec_map::{Self, VecMap};
    use sui::clock::{Self, Clock};
    use sui::table::{Self, Table};

    use bullz::error::{EInvalidPayment, 
    EInvalidQuantity,
    ENotEnoughAssets,
    ENotPackOwner,
    EPackAlreadyOpened, 
    ETemplateMismatch, 
    ETemplateNotFound, 
    ETemplateNotRegistered};
    
    use bullz::admin::AdminCap;
    use bullz::asset_registry::{Self, AssetRegistry, AssetVault};
    use bullz::fee_management::{Self, Treasury};
    use bullz::user_accounts::{Self, UserRegistry};
    use bullz::math;

    
    public struct PackRegistry has key {
        id: UID,
        templates: VecMap<String, ID>, 
        packs: Table<ID, Pack>, 
        purchase_analytics: Table<address, UserPurchaseStats>, 
        total_revenue: u64,
        pending_mints: Table<address, vector<PendingMint>>, 
    }

    public struct PendingMint has store, drop, copy {
        asset_symbol: String,
        quantity: u64,
        timestamp_ms: u64,
    }

   
    public struct UserPurchaseStats has store, drop {
        total_packs_purchased: u64,
        total_spent: u64,
        first_purchase_timestamp: u64,
        last_purchase_timestamp: u64,
        packs_by_template: VecMap<String, u64>,
    }

   
    public struct PackTemplate has key, store {
        id: UID,
        name: String,
        price_usdc: u64,
        target_total_shares: u64,
        num_assets_per_pack: u64, 
        max_winning_packs: u64, 
        total_packs_sold: u64, 
    }

   
    public struct Pack has key, store {
        id: UID,
        template_name: String,
        owner: address,
        opened: bool,
        purchase_timestamp_ms: u64,
    }

    // === Events ===

    public struct PackTemplateCreated has copy, drop {
        template_id: ID,
        name: String,
        price_usdc: u64,
        target_total_shares: u64,
        max_winning_packs: u64,
    }

    public struct PackPurchased has copy, drop {
        pack_id: ID,
        buyer: address,
        template_name: String,
        price_paid: u64,
    }

    public struct PackOpened has copy, drop {
        pack_id: ID,
        owner: address,
        template_name: String,
        assets_received: vector<String>,
        quantities_received: vector<u64>,
        is_winner: bool, 
    }

    public struct PackOpenedEmpty has copy, drop {
        pack_id: ID,
        owner: address,
        template_name: String,
    }

    

    fun init(ctx: &mut TxContext) {
        let registry = PackRegistry {
            id: object::new(ctx),
            templates: vec_map::empty(),
            packs: table::new(ctx),
            purchase_analytics: table::new(ctx),
            total_revenue: 0,
            pending_mints: table::new(ctx),
        };
        transfer::share_object(registry);
    }

   

   
    entry fun create_pack_template(
        _admin_cap: &AdminCap,
        registry: &mut PackRegistry,
        name: String,
        price_usdc: u64,
        target_total_shares: u64,
        num_assets_per_pack: u64,
        max_winning_packs: u64,
        ctx: &mut TxContext
    ) {
        let template = PackTemplate {
            id: object::new(ctx),
            name,
            price_usdc,
            target_total_shares,
            num_assets_per_pack,
            max_winning_packs,
            total_packs_sold: 0,
        };

        let template_id = object::id(&template);

        event::emit(PackTemplateCreated {
            template_id,
            name,
            price_usdc,
            target_total_shares,
            max_winning_packs,
        });

        vec_map::insert(&mut registry.templates, name, template_id);
        transfer::share_object(template);
    }

   
    entry fun update_pack_template(
        _admin_cap: &AdminCap,
        template: &mut PackTemplate,
        price_usdc: u64,
        target_total_shares: u64,
        max_winning_packs: u64,
    ) {
        template.price_usdc = price_usdc;
        template.target_total_shares = target_total_shares;
        template.max_winning_packs = max_winning_packs;
    }

  

    

    /// Buy a pack with USDC (goes to user inventory) im using sui for now 
    public fun buy_pack(
        registry: &mut PackRegistry,
        user_registry: &mut UserRegistry,
        template: &mut PackTemplate,
        mut payment: Coin<SUI>,
        treasury: &mut Treasury,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let buyer = tx_context::sender(ctx);
       
        // Create user account if it doesn't exist
        if (!user_accounts::has_account(user_registry, buyer)) {
            user_accounts::create_account(user_registry, ctx);
        };
       
        let template_id = object::id(template);
    assert!(vec_map::contains(&registry.templates, &template.name), ETemplateNotRegistered());
        let registered_id = *vec_map::get(&registry.templates, &template.name);
    assert!(template_id == registered_id, ETemplateMismatch());

      
        let payment_amount = coin::value(&payment);
    assert!(payment_amount >= template.price_usdc, EInvalidPayment());

        let exact_payment = coin::split(&mut payment, template.price_usdc, ctx);
        
       
        transfer::public_transfer(payment, buyer);

        let pack = Pack {
            id: object::new(ctx),
            template_name: template.name,
            owner: buyer,
            opened: false,
            purchase_timestamp_ms: clock::timestamp_ms(clock),
        };

        let pack_id = object::id(&pack);

        event::emit(PackPurchased {
            pack_id,
            buyer,
            template_name: template.name,
            price_paid: template.price_usdc,
        });

      
        fee_management::collect_payment(treasury, exact_payment, ctx);

       
        template.total_packs_sold = template.total_packs_sold + 1;

        // Update purchase analytics
        let current_time = clock::timestamp_ms(clock);
        
        if (!table::contains(&registry.purchase_analytics, buyer)) {
            // First purchase by this user
            let mut stats = UserPurchaseStats {
                total_packs_purchased: 1,
                total_spent: template.price_usdc,
                first_purchase_timestamp: current_time,
                last_purchase_timestamp: current_time,
                packs_by_template: vec_map::empty(),
            };
            vec_map::insert(&mut stats.packs_by_template, template.name, 1);
            table::add(&mut registry.purchase_analytics, buyer, stats);
        } else {
            // Update existing stats
            let stats = table::borrow_mut(&mut registry.purchase_analytics, buyer);
            stats.total_packs_purchased = stats.total_packs_purchased + 1;
            stats.total_spent = stats.total_spent + template.price_usdc;
            stats.last_purchase_timestamp = current_time;
            
            // Update template-specific count
            if (vec_map::contains(&stats.packs_by_template, &template.name)) {
                let count = vec_map::get_mut(&mut stats.packs_by_template, &template.name);
                *count = *count + 1;
            } else {
                vec_map::insert(&mut stats.packs_by_template, template.name, 1);
            };
        };

      
        registry.total_revenue = registry.total_revenue + template.price_usdc;
        table::add(&mut registry.packs, pack_id, pack);
        user_accounts::add_pack(user_registry, buyer, pack_id);
    }

  
  
    entry fun open_pack(
        pack_id: ID,
        pack_registry: &mut PackRegistry,
        user_registry: &mut UserRegistry,
        template: &PackTemplate,
        asset_registry: &AssetRegistry,
        random: &Random,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let caller = tx_context::sender(ctx);
        
        
        assert!(table::contains(&pack_registry.packs, pack_id), ENotPackOwner());
        let pack = table::remove(&mut pack_registry.packs, pack_id);
        
    assert!(!pack.opened, EPackAlreadyOpened());
    assert!(pack.owner == caller, ENotPackOwner());
        
      
        user_accounts::remove_pack(user_registry, caller, pack_id);
      
    assert!(pack.template_name == template.name, ETemplateNotFound());
        let template_id = object::id(template);
    assert!(vec_map::contains(&pack_registry.templates, &template.name), ETemplateNotRegistered());
        let registered_id = *vec_map::get(&pack_registry.templates, &template.name);
    assert!(template_id == registered_id, ETemplateMismatch());

        let owner = pack.owner;
        let template_name = pack.template_name;

        // Raffle logic: determine if this pack is a winner
        let mut generator = random::new_generator(random, ctx);
        let win_probability_bp = if (template.total_packs_sold == 0) {
            10000 
        } else {
            math::percentage_scaled(template.max_winning_packs, template.total_packs_sold)
        };
        let win_probability_bp = math::min(win_probability_bp, 10000);
        let roll = random::generate_u64_in_range(&mut generator, 0, 9999);
        let is_winner = roll < win_probability_bp;

        if (is_winner) {
           
            let asset_symbols = asset_registry::get_asset_symbols(asset_registry);
            let asset_count = vector::length(&asset_symbols);
        assert!(asset_count >= template.num_assets_per_pack, ENotEnoughAssets());

            let (selected_symbol_indices, quantities) = randomize_pack_contents_indices(
                &mut generator,
                asset_count,
                template.num_assets_per_pack,
                template.target_total_shares
            );

            let mut selected_symbols = vector::empty<String>();
            let mut i = 0;
            while (i < vector::length(&selected_symbol_indices)) {
                let idx = *vector::borrow(&selected_symbol_indices, i);
                let symbol = *vector::borrow(&asset_symbols, idx);
                vector::push_back(&mut selected_symbols, symbol);
                i = i + 1;
            };

            // Store pending mints for user to claim later
            let mut pending_mints = vector::empty<PendingMint>();
            i = 0;
            let current_time = clock::timestamp_ms(clock);
            while (i < vector::length(&selected_symbols)) {
                let mint = PendingMint {
                    asset_symbol: *vector::borrow(&selected_symbols, i),
                    quantity: *vector::borrow(&quantities, i),
                    timestamp_ms: current_time,
                };
                vector::push_back(&mut pending_mints, mint);
                i = i + 1;
            };

            // Add to user's pending mints in registry
            if (!table::contains(&pack_registry.pending_mints, owner)) {
                table::add(&mut pack_registry.pending_mints, owner, pending_mints);
            } else {
                let user_pending = table::borrow_mut(&mut pack_registry.pending_mints, owner);
                vector::append(user_pending, pending_mints);
            };

            event::emit(PackOpened {
                pack_id,
                owner,
                template_name,
                assets_received: selected_symbols,
                quantities_received: quantities,
                is_winner: true,
            });
        } else {
           
            event::emit(PackOpenedEmpty {
                pack_id,
                owner,
                template_name,
            });

            event::emit(PackOpened {
                pack_id,
                owner,
                template_name,
                assets_received: vector::empty<String>(),
                quantities_received: vector::empty<u64>(),
                is_winner: false,
            });
        };

      
        let Pack { id, template_name: _, owner: _, opened: _, purchase_timestamp_ms: _ } = pack;
        object::delete(id);
    }

    /// Mint pack assets from pending mints
    /// Users must call this after opening a pack to actually receive their assets
    /// Pass the vault objects corresponding to the assets you won
    entry fun mint_pack_assets(
        pack_registry: &mut PackRegistry,
        user_registry: &mut UserRegistry,
        asset_symbol: String,
        vault: &mut AssetVault,
        ctx: &TxContext
    ) {
        let caller = tx_context::sender(ctx);
        
     
        assert!(table::contains(&pack_registry.pending_mints, caller), ENotPackOwner());
        
        let user_pending = table::borrow_mut(&mut pack_registry.pending_mints, caller);
        
     
        let mut found = false;
        let mut mint_quantity = 0u64;
        let mut idx = 0;
        let len = vector::length(user_pending);
        
        while (idx < len) {
            let mint = vector::borrow(user_pending, idx);
            if (mint.asset_symbol == asset_symbol) {
                mint_quantity = mint.quantity;
                found = true;
                vector::remove(user_pending, idx);
                break
            };
            idx = idx + 1;
        };
        
        assert!(found, ENotEnoughAssets());
        let (vault_symbol, _, _, _, _, _, _, _, _, _, _) = asset_registry::get_vault_info(vault);
        assert!(vault_symbol == asset_symbol, ETemplateMismatch());
        
        
        asset_registry::mint_from_treasury(vault, user_registry, caller, mint_quantity, ctx);
        
     
        if (vector::is_empty(user_pending)) {
            let empty_vec = table::remove(&mut pack_registry.pending_mints, caller);
            vector::destroy_empty(empty_vec);
        };
    }

   
    entry fun mint_all_pack_assets(
        pack_registry: &mut PackRegistry,
        user_registry: &mut UserRegistry,
        vault1: &mut AssetVault,
        vault2: &mut AssetVault,
        vault3: &mut AssetVault,
        vault4: &mut AssetVault,
        ctx: &TxContext
    ) {
        let caller = tx_context::sender(ctx);
        
        
        assert!(table::contains(&pack_registry.pending_mints, caller), ENotPackOwner());
        
     
        let mut user_pending = table::remove(&mut pack_registry.pending_mints, caller);
        
        while (!vector::is_empty(&user_pending)) {
            let mint = vector::pop_back(&mut user_pending);
            let symbol = mint.asset_symbol;
            let quantity = mint.quantity;
            
          
            let (vault_symbol, _, _, _, _, _, _, _, _, _, _) = asset_registry::get_vault_info(vault1);
            if (vault_symbol == symbol) {
                asset_registry::mint_from_treasury(vault1, user_registry, caller, quantity, ctx);
            } else {
                let (vault_symbol, _, _, _, _, _, _, _, _, _, _) = asset_registry::get_vault_info(vault2);
                if (vault_symbol == symbol) {
                    asset_registry::mint_from_treasury(vault2, user_registry, caller, quantity, ctx);
                } else {
                    let (vault_symbol, _, _, _, _, _, _, _, _, _, _) = asset_registry::get_vault_info(vault3);
                    if (vault_symbol == symbol) {
                        asset_registry::mint_from_treasury(vault3, user_registry, caller, quantity, ctx);
                    } else {
                        let (vault_symbol, _, _, _, _, _, _, _, _, _, _) = asset_registry::get_vault_info(vault4);
                        if (vault_symbol == symbol) {
                            asset_registry::mint_from_treasury(vault4, user_registry, caller, quantity, ctx);
                        };
                    };
                };
            };
        };
        
      
        vector::destroy_empty(user_pending);
    }


    fun randomize_pack_contents_indices(
        generator: &mut random::RandomGenerator,
        total_assets: u64,
        num_assets_to_select: u64,
        target_total_shares: u64,
    ): (vector<u64>, vector<u64>) {
    assert!(total_assets >= num_assets_to_select, ENotEnoughAssets());

      
        let mut selected_indices = vector::empty<u64>();
        let mut i = 0;
        while (i < num_assets_to_select) {
            let mut idx = random::generate_u64_in_range(generator, 0, total_assets - 1);
        
            while (vector::contains(&selected_indices, &idx)) {
                idx = (idx + 1) % total_assets;
            };
            vector::push_back(&mut selected_indices, idx);
            i = i + 1;
        };

      
        let mut quantities = vector::empty<u64>();
        let mut remaining = target_total_shares;
        i = 0;
        while (i < num_assets_to_select) {
            let quantity = if (i == num_assets_to_select - 1) {
               
                remaining
            } else {
                // Random percentage between 10% and 40%
                let min_pct = 10;
                let max_pct = 40;
                let pct = random::generate_u64_in_range(generator, min_pct, max_pct);
                
                // Use math module for precise calculation
                let qty = math::mul_div(remaining, pct, 100);
                
                // Ensure we don't allocate more than remaining
                let qty = math::min(qty, remaining);
                
                remaining = remaining - qty;
                qty
            };

            assert!(quantity > 0, EInvalidQuantity());
            vector::push_back(&mut quantities, quantity);
            i = i + 1;
        };

        (selected_indices, quantities)
    }



     


    public fun get_template_info(template: &PackTemplate): (String, u64, u64, u64, u64, u64) {
        (
            template.name, 
            template.price_usdc, 
            template.target_total_shares, 
            template.num_assets_per_pack,
            template.max_winning_packs,
            template.total_packs_sold
        )
    }


    public fun get_pack_info(pack: &Pack): (address, String, bool, u64) {
        (pack.owner, pack.template_name, pack.opened, pack.purchase_timestamp_ms)
    }

    public fun get_user_packs(user_registry: &UserRegistry, user: address): vector<ID> {
        user_accounts::get_owned_packs(user_registry, user)
    }

    public fun get_user_pack_count(user_registry: &UserRegistry, user: address): u64 {
        vector::length(&user_accounts::get_owned_packs(user_registry, user))
    }

    public fun get_pending_mints(registry: &PackRegistry, user: address): vector<PendingMint> {
        if (table::contains(&registry.pending_mints, user)) {
            *table::borrow(&registry.pending_mints, user)
        } else {
            vector::empty<PendingMint>()
        }
    }

    public fun get_pending_mints_count(registry: &PackRegistry, user: address): u64 {
        if (table::contains(&registry.pending_mints, user)) {
            vector::length(table::borrow(&registry.pending_mints, user))
        } else {
            0
        }
    }

    public fun get_pending_mint_info(mint: &PendingMint): (String, u64, u64) {
        (mint.asset_symbol, mint.quantity, mint.timestamp_ms)
    }

    // === Analytics View Functions ===

    public fun get_user_stats(registry: &PackRegistry, user: address): (u64, u64, u64, u64) {
        if (table::contains(&registry.purchase_analytics, user)) {
            let stats = table::borrow(&registry.purchase_analytics, user);
            (
                stats.total_packs_purchased,
                stats.total_spent,
                stats.first_purchase_timestamp,
                stats.last_purchase_timestamp
            )
        } else {
            (0, 0, 0, 0)
        }
    }

    public fun get_user_template_purchases(registry: &PackRegistry, user: address, template_name: String): u64 {
        if (table::contains(&registry.purchase_analytics, user)) {
            let stats = table::borrow(&registry.purchase_analytics, user);
            if (vec_map::contains(&stats.packs_by_template, &template_name)) {
                *vec_map::get(&stats.packs_by_template, &template_name)
            } else {
                0
            }
        } else {
            0
        }
    }

    public fun get_total_revenue(registry: &PackRegistry): u64 {
        registry.total_revenue
    }

    public fun has_purchased(registry: &PackRegistry, user: address): bool {
        table::contains(&registry.purchase_analytics, user)
    }

    public fun get_user_purchased_templates(registry: &PackRegistry, user: address): vector<String> {
        if (table::contains(&registry.purchase_analytics, user)) {
            let stats = table::borrow(&registry.purchase_analytics, user);
            let mut templates = vector::empty<String>();
            let mut i = 0;
            let size = vec_map::length(&stats.packs_by_template);
            
            while (i < size) {
                let (template_name, _) = vec_map::get_entry_by_idx(&stats.packs_by_template, i);
                vector::push_back(&mut templates, *template_name);
                i = i + 1;
            };
            
            templates
        } else {
            vector::empty<String>()
        }
    }

    // === Test Functions ===
    
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}

