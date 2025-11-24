module bullz::asset_registry {
    use std::string::{Self, String};
    use sui::table::{Self, Table};
    use sui::event;
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::coin;
    use bullz::error;
    
    use bullz::admin::AdminCap;
    use bullz::user_accounts::{Self, UserRegistry};
   // use bullz::analytics::{Self, AnalyticsVault};

   
    
    public struct AssetRegistry has key {
        id: UID,
        vaults: Table<String, ID>, // symbol -> AssetVault ID
        asset_symbols: vector<String>, // Vector of all asset symbols for random access
        asset_count: u64,
    }

   
    public struct Asset has key {
        id: UID,
        symbol: String,
        name: String,
        description: String,
        image_url: String,
        supply_cap: u64,
        vault_id: ID,
        category: String,
    }
 
    public struct AssetVault has key, store {
        id: UID,
        symbol: String,
        name: String,
        description: String,
        image_url: String,
        category: String,
        supply_cap: u64,
        circulating_supply: u64,        
        trading_supply: u64,            
        treasury_reserve: u64,       
        user_balances: Table<address, u64>, 
        minting_enabled: bool,
        
        // Price tracking
        current_price: u64,             // Current price (with 9 decimals precision)
        
        // AMM Liquidity (actual SUI balance stored here)
        usdc_balance: Balance<SUI>,    
        usdc_reserve: u64,            
      
        base_fee_bps: u64,            
        dump_threshold_bps: u64,      
        dump_slope_bps: u64,          
        max_dump_fee_bps: u64,        
        
       
        prize_pool_bps: u64,          
        team_bps: u64,                
        
    
        accumulated_prize_fees: u64,   
        accumulated_team_fees: u64,   
   
        surge_fee_bps: u64,           
        surge_fee_expiry: u64,         
        
    
        trading_enabled: bool,        
        
        total_volume_usdc: u64,       
        total_trades: u64,            
    }


    // === Events ===

    public struct AssetRegistered has copy, drop {
        symbol: String,
        supply_cap: u64,
        vault_id: ID,
        category: String,
        asset_nft: ID,
    }

  
    public struct BAssetMinted has copy, drop {
        symbol: String,
        recipient: address,
        amount: u64,
        new_circulating_supply: u64,
    }

    public struct MintingToggled has copy, drop {
        symbol: String,
        vault_id: ID,
        enabled: bool,
    }

    public struct FeeWithdrawn has copy, drop {
        symbol: String,
        fee_type: String,
        amount: u64,
        recipient: address,
    }

    public struct ASSET_REGISTRY has drop {}

  
    fun init(_otw: ASSET_REGISTRY, ctx: &mut TxContext) {
        let registry = AssetRegistry {
            id: object::new(ctx),
            vaults: table::new(ctx),
            asset_symbols: vector::empty(),
            asset_count: 0,
        };
        
        transfer::share_object(registry);
    }



   
    entry fun register_asset(
        _admin_cap: &AdminCap,
        registry: &mut AssetRegistry,
        symbol: String,
        name: String,
        description: String,
        image_url: String,
        supply_cap: u64,
        initial_circulating_supply: u64,
        category: String,
        ctx: &mut TxContext
    ) {
        assert!(supply_cap > 0, error::EInvalidSupplyCap());
        assert!(!table::contains(&registry.vaults, symbol), error::EAssetAlreadyExists());
        
       
        let max_circulating = supply_cap / 2;
        assert!(initial_circulating_supply <= max_circulating, error::EInsufficientSupply());
        assert!(initial_circulating_supply <= supply_cap, error::EInsufficientSupply());

        let vault = AssetVault {
            id: object::new(ctx),
            symbol,
            name,
            description,
            image_url,
            category,
            supply_cap,
            circulating_supply: initial_circulating_supply,
            trading_supply: initial_circulating_supply,  
            treasury_reserve: supply_cap - initial_circulating_supply, 
            user_balances: table::new(ctx),
            minting_enabled: true,
            
            // Price tracking
            current_price: 0, 
            
            usdc_balance: balance::zero<SUI>(), 
            usdc_reserve: 0,                    
            base_fee_bps: 500,                 
            dump_threshold_bps: 200,           
            dump_slope_bps: 20000,              
            max_dump_fee_bps: 2500,            
            prize_pool_bps: 8000,             
            team_bps: 2000,                     
            accumulated_prize_fees: 0,
            accumulated_team_fees: 0,
            surge_fee_bps: 0,                   
            surge_fee_expiry: 0,
            trading_enabled: false,             
            total_volume_usdc: 0,
            total_trades: 0,
        };

        let vault_id = object::id(&vault);
        
      
        let asset_nft = Asset {
            id: object::new(ctx),
            symbol,
            name,
            description,
            image_url,
            supply_cap,
            vault_id,
            category,
        };

      
        table::add(&mut registry.vaults, symbol, vault_id);
        vector::push_back(&mut registry.asset_symbols, symbol);
        registry.asset_count = registry.asset_count + 1;

        event::emit(AssetRegistered {
            symbol,
            supply_cap,
            vault_id,
            category,
            asset_nft: object::id(&asset_nft),
        });

      
        transfer::share_object(asset_nft);
        transfer::share_object(vault);
    }


   
    entry fun enable_minting(
        _admin_cap: &AdminCap,
        vault: &mut AssetVault,
    ) {
        vault.minting_enabled = true;
        
        event::emit(MintingToggled {
            symbol: vault.symbol,
            vault_id: object::id(vault),
            enabled: true,
        });
    }

  
    entry fun disable_minting(
        _admin_cap: &AdminCap,
        vault: &mut AssetVault,
    ) {
        vault.minting_enabled = false;
        
        event::emit(MintingToggled {
            symbol: vault.symbol,
            vault_id: object::id(vault),
            enabled: false,
        });
    }

   

   
    public(package) fun transfer_basset_to_user(
        vault: &mut AssetVault,
        user_registry: &mut UserRegistry,
        recipient: address,
        amount: u64,
        _ctx: &mut TxContext
    ) {
        // Only transfer from trading supply (for AMM trading operations)
        // This does NOT mint new tokens - only transfers existing ones
        assert!(vault.trading_supply >= amount, error::EInsufficientSupply());
        vault.trading_supply = vault.trading_supply - amount;
      
        let is_new_asset = !table::contains(&vault.user_balances, recipient);

      
        if (table::contains(&vault.user_balances, recipient)) {
            let current_balance = table::remove(&mut vault.user_balances, recipient);
            table::add(&mut vault.user_balances, recipient, current_balance + amount);
        } else {
            table::add(&mut vault.user_balances, recipient, amount);
        };

       
        if (is_new_asset) {
            user_accounts::track_asset_ownership(user_registry, recipient, vault.symbol);
        };

        event::emit(BAssetMinted {
            symbol: vault.symbol,
            recipient,
            amount,
            new_circulating_supply: vault.circulating_supply,
        });
    }

    /// Mint new tokens from treasury reserve (package-only for authorized modules like pack_system)
    public(package) fun mint_from_treasury(
        vault: &mut AssetVault,
        user_registry: &mut UserRegistry,
        recipient: address,
        amount: u64,
        ctx: &TxContext
    ) {
        assert!(vault.minting_enabled, error::EMintingDisabled());
        assert!(amount > 0, error::EZeroAmount());
        assert!(vault.circulating_supply + amount <= vault.supply_cap, error::EExceedsSupplyCap());
        
        // Mint new tokens from treasury reserve
        assert!(vault.treasury_reserve >= amount, error::EInsufficientSupply());
        vault.treasury_reserve = vault.treasury_reserve - amount;
        vault.circulating_supply = vault.circulating_supply + amount;
        
        // Create user account if it doesn't exist
        if (!user_accounts::has_account(user_registry, recipient)) {
            user_accounts::create_account(user_registry, ctx);
        };
      
        let is_new_asset = !table::contains(&vault.user_balances, recipient);

      
        if (table::contains(&vault.user_balances, recipient)) {
            let current_balance = table::remove(&mut vault.user_balances, recipient);
            table::add(&mut vault.user_balances, recipient, current_balance + amount);
        } else {
            table::add(&mut vault.user_balances, recipient, amount);
        };

       
        if (is_new_asset) {
            user_accounts::track_asset_ownership(user_registry, recipient, vault.symbol);
        };

        event::emit(BAssetMinted {
            symbol: vault.symbol,
            recipient,
            amount,
            new_circulating_supply: vault.circulating_supply,
        });
    }




  
    public fun get_user_balance(vault: &AssetVault, owner: address): u64 {
        if (table::contains(&vault.user_balances, owner)) {
            *table::borrow(&vault.user_balances, owner)
        } else {
            0
        }
    }


    public fun get_vault(registry: &AssetRegistry, symbol: String): &ID {
        assert!(table::contains(&registry.vaults, symbol), error::EAssetNotFound());
        table::borrow(&registry.vaults, symbol)
    }

 
    public fun get_trading_supply(vault: &AssetVault): u64 {
        vault.trading_supply
    }

    public fun get_treasury_reserve(vault: &AssetVault): u64 {
        vault.treasury_reserve
    }

    public fun get_current_price(vault: &AssetVault): u64 {
        vault.current_price
    }

    public(package) fun update_current_price(vault: &mut AssetVault, new_price: u64) {
        vault.current_price = new_price;
    }

   
    public(package) fun return_basset_to_treasury(
        vault: &mut AssetVault,
        user: address,
        amount: u64,
    ) {
        assert!(table::contains(&vault.user_balances, user), error::EAccountNotFound());
        let current_balance = table::remove(&mut vault.user_balances, user);
        assert!(current_balance >= amount, error::EInsufficientBalance());
        
        let new_balance = current_balance - amount;
        
       
        if (new_balance > 0) {
            table::add(&mut vault.user_balances, user, new_balance);
        };
      
        // Add tokens back to vault's trading supply for future trades
        vault.trading_supply = vault.trading_supply + amount;
    }

    public fun get_vault_info(vault: &AssetVault): (String, String, String, String, String, u64, u64, u64, u64, u64, bool) {
        (vault.symbol, vault.name, vault.description, vault.image_url, vault.category, vault.supply_cap, vault.circulating_supply, vault.trading_supply, vault.treasury_reserve, vault.usdc_reserve, vault.minting_enabled)
    }

    public fun is_minting_enabled(vault: &AssetVault): bool {
        vault.minting_enabled
    }

    public fun get_asset_info(asset: &Asset): (String, String, String, String, u64, ID, String) {
        (asset.symbol, asset.name, asset.description, asset.image_url, asset.supply_cap, asset.vault_id, asset.category)
    }

    public fun get_asset_symbols(registry: &AssetRegistry): vector<String> {
        registry.asset_symbols
    }

    public fun get_vault_id_by_symbol(registry: &AssetRegistry, symbol: String): ID {
    assert!(table::contains(&registry.vaults, symbol), error::EAssetNotFound());
        *table::borrow(&registry.vaults, symbol)
    }

    public fun get_asset_count(registry: &AssetRegistry): u64 {
        registry.asset_count
    }

    // Note: This function would need to be implemented differently in practice
    // since we can't access individual Asset objects from the registry
    // For now, this is a placeholder that would need to be implemented
    // by iterating through all assets and checking their categories
    #[allow(unused_variable)]
    public fun get_assets_by_category(_registry: &AssetRegistry, _category: &String): vector<String> {
        // This is a placeholder implementation
        // In practice, you'd need to iterate through all assets and check their categories
        vector::empty<String>()
    }

    //  Trading Helper Functions 

  
    public fun get_usdc_reserve(vault: &AssetVault): u64 {
        balance::value(&vault.usdc_balance)
    }

   
    public(package) fun add_usdc_balance(vault: &mut AssetVault, sui_balance: Balance<SUI>) {
        balance::join(&mut vault.usdc_balance, sui_balance);
        vault.usdc_reserve = balance::value(&vault.usdc_balance);
    }

    
    public(package) fun remove_usdc_balance(vault: &mut AssetVault, amount: u64): Balance<SUI> {
        assert!(balance::value(&vault.usdc_balance) >= amount, error::EInsufficientBalance());
        let extracted = balance::split(&mut vault.usdc_balance, amount);
        vault.usdc_reserve = balance::value(&vault.usdc_balance);
        extracted
    }

    
    public(package) fun increase_treasury_reserve(vault: &mut AssetVault, amount: u64) {
        vault.treasury_reserve = vault.treasury_reserve + amount;
    }

    
    public fun is_trading_enabled(vault: &AssetVault): bool {
        vault.trading_enabled
    }

    
    public(package) fun set_trading_enabled(vault: &mut AssetVault, enabled: bool) {
        vault.trading_enabled = enabled;
    }

    
    public fun get_base_fee_bps(vault: &AssetVault): u64 {
        vault.base_fee_bps
    }

    
    public fun get_dump_threshold_bps(vault: &AssetVault): u64 {
        vault.dump_threshold_bps
    }

    
    public fun get_dump_slope_bps(vault: &AssetVault): u64 {
        vault.dump_slope_bps
    }

    
    public fun get_max_dump_fee_bps(vault: &AssetVault): u64 {
        vault.max_dump_fee_bps
    }

    
    public fun get_surge_fee(vault: &AssetVault): (u64, u64) {
        (vault.surge_fee_bps, vault.surge_fee_expiry)
    }

    
    public(package) fun set_surge_fee(vault: &mut AssetVault, fee_bps: u64, expiry: u64) {
        vault.surge_fee_bps = fee_bps;
        vault.surge_fee_expiry = expiry;
    }

    
    public fun get_fee_distribution(vault: &AssetVault): (u64, u64) {
        (vault.prize_pool_bps, vault.team_bps)
    }

    
    public(package) fun add_accumulated_fees(vault: &mut AssetVault, prize_fee: u64, team_fee: u64) {
        vault.accumulated_prize_fees = vault.accumulated_prize_fees + prize_fee;
        vault.accumulated_team_fees = vault.accumulated_team_fees + team_fee;
    }

    
    public(package) fun update_fee_config(
        vault: &mut AssetVault,
        base_fee_bps: u64,
        dump_threshold_bps: u64,
        dump_slope_bps: u64,
        max_dump_fee_bps: u64,
    ) {
        vault.base_fee_bps = base_fee_bps;
        vault.dump_threshold_bps = dump_threshold_bps;
        vault.dump_slope_bps = dump_slope_bps;
        vault.max_dump_fee_bps = max_dump_fee_bps;
    }

    
    public(package) fun increment_trade_stats(vault: &mut AssetVault, usdc_volume: u64) {
        vault.total_volume_usdc = vault.total_volume_usdc + usdc_volume;
        vault.total_trades = vault.total_trades + 1;
    }

    
    public fun get_trade_stats(vault: &AssetVault): (u64, u64) {
        (vault.total_volume_usdc, vault.total_trades)
    }

    /// Get accumulated fees from a vault
    public fun get_accumulated_fees(vault: &AssetVault): (u64, u64) {
        (vault.accumulated_prize_fees, vault.accumulated_team_fees)
    }

    public(package) fun decrease_treasury_reserve(vault: &mut AssetVault, amount: u64) {
        assert!(vault.treasury_reserve >= amount, error::EInsufficientSupply());
        vault.treasury_reserve = vault.treasury_reserve - amount;
    }


    public(package) fun increase_circulating_supply(vault: &mut AssetVault, amount: u64) {
        vault.circulating_supply = vault.circulating_supply + amount;
    }

  
    public(package) fun decrease_circulating_supply(vault: &mut AssetVault, amount: u64) {
        assert!(vault.circulating_supply >= amount, error::EInsufficientSupply());
        vault.circulating_supply = vault.circulating_supply - amount;
    }

 
    public(package) fun decrease_user_balance(vault: &mut AssetVault, user: address, amount: u64) {
        let user_balance = table::borrow_mut(&mut vault.user_balances, user);
        assert!(*user_balance >= amount, error::EInsufficientBalance());
        *user_balance = *user_balance - amount;
    }

    entry fun withdraw_prize_fees(
        _admin_cap: &AdminCap,
        vault: &mut AssetVault,
        amount: u64,
        ctx: &mut TxContext
    ) {
        assert!(amount > 0, error::EZeroAmount());
        assert!(vault.accumulated_prize_fees >= amount, error::EInsufficientBalance());

        let withdrawn_balance = balance::split(&mut vault.usdc_balance, amount);
        let withdrawn_coin = coin::from_balance(withdrawn_balance, ctx);

    
        vault.accumulated_prize_fees = vault.accumulated_prize_fees - amount;

        
        transfer::public_transfer(withdrawn_coin, tx_context::sender(ctx));

        
        event::emit(FeeWithdrawn {
            symbol: vault.symbol,
            fee_type: string::utf8(b"prize"),
            amount,
            recipient: tx_context::sender(ctx),
        });
    }

 
    entry fun withdraw_team_fees(
        _admin_cap: &AdminCap,
        vault: &mut AssetVault,
        amount: u64,
        ctx: &mut TxContext
    ) {
        assert!(amount > 0, error::EZeroAmount());
        assert!(vault.accumulated_team_fees >= amount, error::EInsufficientBalance());

        let withdrawn_balance = balance::split(&mut vault.usdc_balance, amount);
        let withdrawn_coin = coin::from_balance(withdrawn_balance, ctx);

        vault.accumulated_team_fees = vault.accumulated_team_fees - amount;

        
        transfer::public_transfer(withdrawn_coin, tx_context::sender(ctx));

      
        event::emit(FeeWithdrawn {
            symbol: vault.symbol,
            fee_type: string::utf8(b"team"),
            amount,
            recipient: tx_context::sender(ctx),
        });
    }

    
    entry fun withdraw_all_fees(
        _admin_cap: &AdminCap,
        vault: &mut AssetVault,
        ctx: &mut TxContext
    ) {
        let total_fees = vault.accumulated_prize_fees + vault.accumulated_team_fees;
        assert!(total_fees > 0, error::EZeroAmount());

        let withdrawn_balance = balance::split(&mut vault.usdc_balance, total_fees);
        let withdrawn_coin = coin::from_balance(withdrawn_balance, ctx);

      
        vault.accumulated_prize_fees = 0;
        vault.accumulated_team_fees = 0;

        transfer::public_transfer(withdrawn_coin, tx_context::sender(ctx));

       
        event::emit(FeeWithdrawn {
            symbol: vault.symbol,
            fee_type: string::utf8(b"all"),
            amount: total_fees,
            recipient: tx_context::sender(ctx),
        });
    }

    // === Test Functions ===
    
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ASSET_REGISTRY {}, ctx);
    }

    #[test_only]
    public fun mint_from_treasury_for_testing(
        vault: &mut AssetVault,
        user_registry: &mut UserRegistry,
        recipient: address,
        amount: u64,
        ctx: &mut TxContext
    ) {
        mint_from_treasury(vault, user_registry, recipient, amount, ctx);
    }

    public fun add_treasury_balance_for_testing(vault: &mut AssetVault, amount: u64) {
        vault.treasury_reserve = vault.treasury_reserve + amount;
    }

    public fun set_trading_supply_for_testing(vault: &mut AssetVault, amount: u64) {
        vault.trading_supply = amount;
    }
}
