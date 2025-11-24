
module bullz::trading {
    use std::string::String;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;  // Using SUI as USDC placeholder later I must use usdc
    use sui::event;
    use sui::clock::{Clock};
    
    use bullz::error;
    use bullz::admin::AdminCap;
    use bullz::asset_registry::{Self, AssetVault};
    use bullz::user_accounts::{Self as user_accounts, UserRegistry};
   // use bullz::analytics::{Self, AnalyticsVault};
    use bullz::math;



    

    const BPS_SCALE: u64 = 10000;




    // === Events ===

    public struct TradingEnabled has copy, drop {
        asset_symbol: String,
        initial_basset_reserve: u64,
        initial_usdc_reserve: u64,
    }

    public struct SwapExecuted has copy, drop {
        asset_symbol: String,
        user: address,
        is_buy: bool,
        amount_in: u64,
        amount_out: u64,
        fee_paid: u64,
        fee_bps: u64,
        price: u64, 
    }


    public struct SurgeFeeActivated has copy, drop {
        asset_symbol: String,
        surge_fee_bps: u64,
        expiry_timestamp: u64,
    }

    public struct TokensLocked has copy, drop {
        asset_symbol: String,
        amount_locked: u64,
        new_circulating_supply: u64,
    }

    public struct TokensUnlocked has copy, drop {
        asset_symbol: String,
        amount_unlocked: u64,
        new_circulating_supply: u64,
    }


    
    
    entry fun add_liquidity_and_enable_trading(
        _admin_cap: &AdminCap,
        vault: &mut AssetVault,
        usdc: Coin<SUI>,
        _ctx: &mut TxContext
    ) {
        let usdc_amount = coin::value(&usdc);
        assert!(usdc_amount > 0, error::EZeroAmount());
        
        let (symbol, _, _, _, _, _, circulating_supply, _, _, _, _) = asset_registry::get_vault_info(vault);
        assert!(circulating_supply > 0, error::EInsufficientLiquidity());
        
        
        let usdc_balance = coin::into_balance(usdc);
        asset_registry::add_usdc_balance(vault, usdc_balance);
        
        
        asset_registry::set_trading_enabled(vault, true);
        
        event::emit(TradingEnabled {
            asset_symbol: symbol,
            initial_basset_reserve: circulating_supply,
            initial_usdc_reserve: usdc_amount,
        });
    }

    
    entry fun enable_trading(
        _admin_cap: &AdminCap,
        vault: &mut AssetVault,
    ) {
        asset_registry::set_trading_enabled(vault, true);
        
        let (symbol, _, _, _, _, _, _, _, _, _, _) = asset_registry::get_vault_info(vault);
        event::emit(TradingEnabled {
            asset_symbol: symbol,
            initial_basset_reserve: 0,
            initial_usdc_reserve: 0,
        });
    }

   
    entry fun unlock_treasury_tokens(
        _admin_cap: &AdminCap,
        vault: &mut AssetVault,
        amount: u64
    ) {
        let (symbol, _, _, _, _, _supply_cap, current_circulating, _, treasury_reserve, _, _) = asset_registry::get_vault_info(vault);
        
      
        assert!(treasury_reserve >= amount, error::EInsufficientSupply());
        
      
    
        asset_registry::decrease_treasury_reserve(vault, amount);
        asset_registry::increase_circulating_supply(vault, amount);
        
        event::emit(TokensUnlocked {
            asset_symbol: symbol,
            amount_unlocked: amount,
            new_circulating_supply: current_circulating + amount,
        });
    }

   
     entry fun disable_trading(
        _admin_cap: &AdminCap,
        vault: &mut AssetVault,
    ) {
        asset_registry::set_trading_enabled(vault, false);
    }

   
    entry fun lock_circulating_tokens(
        _admin_cap: &AdminCap,
        vault: &mut AssetVault,
        amount: u64
    ) {
        let (symbol, _, _, _, _, _, current_circulating, _, _, _, _) = asset_registry::get_vault_info(vault);
        assert!(current_circulating >= amount, error::EInsufficientSupply());
        

        asset_registry::decrease_circulating_supply(vault, amount);
        asset_registry::increase_treasury_reserve(vault, amount);
        
        event::emit(TokensLocked {
            asset_symbol: symbol,
            amount_locked: amount,
            new_circulating_supply: current_circulating - amount,
        });
    }

// I will later change to automatically set the surge fee based on the market volatility
     entry fun set_surge_fee(
        _admin_cap: &AdminCap,
        vault: &mut AssetVault,
        surge_fee_bps: u64,
        duration_ms: u64,
        clock: &sui::clock::Clock,
    ) {
        let now = sui::clock::timestamp_ms(clock);
        let expiry = now + duration_ms;
        
        asset_registry::set_surge_fee(vault, surge_fee_bps, expiry);
        
        let (symbol, _, _, _, _, _, _, _, _, _, _) = asset_registry::get_vault_info(vault);
        event::emit(SurgeFeeActivated {
            asset_symbol: symbol,
            surge_fee_bps,
            expiry_timestamp: expiry,
        });
    }

     entry fun update_fee_config(
        _admin_cap: &AdminCap,
        vault: &mut AssetVault,
        base_fee_bps: u64,
        dump_threshold_bps: u64,
        dump_slope_bps: u64,
        max_dump_fee_bps: u64,
    ) {
        asset_registry::update_fee_config(vault, base_fee_bps, dump_threshold_bps, dump_slope_bps, max_dump_fee_bps);
    }

    //  User Trading Functions 

   
     entry fun buy_basset_with_usdc(
        vault: &mut AssetVault,
      //  analytics_vault: &mut AnalyticsVault,
        user_registry: &mut UserRegistry,
        usdc_in: Coin<SUI>,
        min_basset_out: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        
        assert!(asset_registry::is_trading_enabled(vault), error::ETradingDisabled());
        
        let user = tx_context::sender(ctx);
        let usdc_amount = coin::value(&usdc_in);
        assert!(usdc_amount > 0, error::EZeroAmount());
        
        // Create user account if it doesn't exist
        if (!user_accounts::has_account(user_registry, user)) {
            user_accounts::create_account(user_registry, ctx);
        };
        
     
        let (symbol, _, _, _, _, _, _, _, _, _, _) = asset_registry::get_vault_info(vault);
        let basset_reserve = asset_registry::get_trading_supply(vault);
        let usdc_reserve = asset_registry::get_usdc_reserve(vault);
        
     
        let active_fee_bps = get_active_fee_bps(vault, 0, false, clock);
        let fee_amount = math::mul_div(usdc_amount, active_fee_bps, BPS_SCALE);
        let usdc_after_fee = usdc_amount - fee_amount;
        
        let basset_out = math::mul_div(
            basset_reserve,
            usdc_after_fee,
            usdc_reserve + usdc_after_fee
        );
        
        assert!(basset_out >= min_basset_out, error::ESlippageExceeded());
        assert!(basset_reserve >= basset_out, error::EInsufficientLiquidity());
        
        
        asset_registry::transfer_basset_to_user(vault, user_registry, user, basset_out, ctx);
        
        
        let usdc_balance = coin::into_balance(usdc_in);
        asset_registry::add_usdc_balance(vault, usdc_balance);
        
        
        distribute_fees(vault, fee_amount);
        
       
        asset_registry::increment_trade_stats(vault, usdc_amount);
       
        let price = calculate_price(basset_reserve - basset_out, usdc_reserve + usdc_amount);
        
        // Update current price in vault
        asset_registry::update_current_price(vault, price);
        
        // // Update analytics with new price and volume
        // let new_market_cap = (basset_reserve - basset_out) * price / 1_000_000_000;
        // let liquidity_depth = usdc_reserve + usdc_amount;
        // let liquidity_ratio = liquidity_depth * 1_000_000_000 / (basset_reserve - basset_out);
        
        // analytics::update_price_and_analytics(
        //     analytics_vault,
        //     price,
        //     usdc_amount,
        //     new_market_cap,
        //     liquidity_depth,
        //     liquidity_ratio,
        //     clock,
        // );
        
        event::emit(SwapExecuted {
            asset_symbol: symbol,
            user,
            is_buy: true,
            amount_in: usdc_amount,
            amount_out: basset_out,
            fee_paid: fee_amount,
            fee_bps: active_fee_bps,
            price,
        });
    }

   
     entry fun sell_basset_for_usdc(
        vault: &mut AssetVault,
       // analytics_vault: &mut AnalyticsVault,
        basset_amount: u64,
        min_usdc_out: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        
        assert!(asset_registry::is_trading_enabled(vault), error::ETradingDisabled());
        
        let user = tx_context::sender(ctx);
        assert!(basset_amount > 0, error::EZeroAmount());
        
        
        let user_balance = asset_registry::get_user_balance(vault, user);
        assert!(user_balance >= basset_amount, error::EInsufficientBalance());
        
     
        let (symbol, _, _, _, _, _, _, _, _, _, _) = asset_registry::get_vault_info(vault);
        let basset_reserve = asset_registry::get_trading_supply(vault);
        let usdc_reserve = asset_registry::get_usdc_reserve(vault);
        
        
        let active_fee_bps = get_active_fee_bps(vault, basset_amount, true, clock);
        let fee_amount = math::mul_div(basset_amount, active_fee_bps, BPS_SCALE);
        let basset_after_fee = basset_amount - fee_amount;
        
       
        let usdc_out = math::mul_div(
            usdc_reserve,
            basset_after_fee,
            basset_reserve + basset_after_fee
        );
        
        assert!(usdc_out >= min_usdc_out, error::ESlippageExceeded());
        assert!(usdc_reserve >= usdc_out, error::EInsufficientLiquidity());
        
       
        asset_registry::return_basset_to_treasury(vault, user, basset_amount);
        
        
        let usdc_balance = asset_registry::remove_usdc_balance(vault, usdc_out);
        let usdc_coin = coin::from_balance(usdc_balance, ctx);
        transfer::public_transfer(usdc_coin, user);
        
     
        distribute_fees(vault, fee_amount);
        
        
        asset_registry::increment_trade_stats(vault, usdc_out);
        
        let price = calculate_price(basset_reserve + basset_amount, usdc_reserve - usdc_out);
        
        // Update current price in vault
        asset_registry::update_current_price(vault, price);
        
        // // Update analytics with new price and volume
        // let new_market_cap = (basset_reserve + basset_amount) * price / 1_000_000_000;
        // let liquidity_depth = usdc_reserve - usdc_out;
        // let liquidity_ratio = liquidity_depth * 1_000_000_000 / (basset_reserve + basset_amount);
        
        // analytics::update_price_and_analytics(
        //     analytics_vault,
        //     price,
        //     usdc_out,
        //     new_market_cap,
        //     liquidity_depth,
        //     liquidity_ratio,
        //     clock,
        // );
        
        event::emit(SwapExecuted {
            asset_symbol: symbol,
            user,
            is_buy: false,
            amount_in: basset_amount,
            amount_out: usdc_out,
            fee_paid: fee_amount,
            fee_bps: active_fee_bps,
            price,
        });
    }

    // === View Functions ===

    
    public fun quote_buy(vault: &AssetVault, usdc_in: u64, clock: &sui::clock::Clock): u64 {
        if (usdc_in == 0) return 0;
        
        let (_symbol, _, _, _, _, _, _, _, _, _, _) = asset_registry::get_vault_info(vault);
        let basset_reserve = asset_registry::get_trading_supply(vault);
        let usdc_reserve = asset_registry::get_usdc_reserve(vault);
        
        let active_fee_bps = get_active_fee_bps(vault, 0, false, clock);
        let fee_amount = math::mul_div(usdc_in, active_fee_bps, BPS_SCALE);
        let usdc_after_fee = usdc_in - fee_amount;
        
        math::mul_div(basset_reserve, usdc_after_fee, usdc_reserve + usdc_after_fee)
    }

 
    public fun quote_sell(vault: &AssetVault, basset_in: u64, clock: &sui::clock::Clock): u64 {
        if (basset_in == 0) return 0;
        
        let (_symbol, _, _, _, _, _, _, _, _, _, _) = asset_registry::get_vault_info(vault);
        let basset_reserve = asset_registry::get_trading_supply(vault);
        let usdc_reserve = asset_registry::get_usdc_reserve(vault);
        
        let active_fee_bps = get_active_fee_bps(vault, basset_in, true, clock);
        let fee_amount = math::mul_div(basset_in, active_fee_bps, BPS_SCALE);
        let basset_after_fee = basset_in - fee_amount;
        
        math::mul_div(usdc_reserve, basset_after_fee, basset_reserve + basset_after_fee)
    }

    
    public fun get_price(vault: &AssetVault): u64 {
        let (_symbol, _, _, _, _, _, _, _, _, _, _) = asset_registry::get_vault_info(vault);
        let basset_reserve = asset_registry::get_trading_supply(vault);
        let usdc_reserve = asset_registry::get_usdc_reserve(vault);
        
        calculate_price(basset_reserve, usdc_reserve)
    }

    // Get current price from vault (updated on each trade)
    public fun get_current_price(vault: &AssetVault): u64 {
        asset_registry::get_current_price(vault)
    }

    // // === Analytics View Functions ===

    // public fun get_analytics_snapshot(analytics_vault: &AnalyticsVault): analytics::AnalyticsSnapshot {
    //     analytics::get_analytics_snapshot(analytics_vault)
    // }

    // public fun get_current_price_from_analytics(analytics_vault: &AnalyticsVault): u64 {
    //     analytics::get_current_price(analytics_vault)
    // }

    // public fun get_market_cap_from_analytics(analytics_vault: &AnalyticsVault): u64 {
    //     analytics::get_market_cap(analytics_vault)
    // }

    // public fun get_volume_24h_from_analytics(analytics_vault: &AnalyticsVault): u64 {
    //     analytics::get_volume_24h(analytics_vault)
    // }

    // public fun get_price_change_24h_from_analytics(analytics_vault: &AnalyticsVault): i64 {
    //     analytics::get_price_change_24h(analytics_vault)
    // }

    // public fun get_high_24h_from_analytics(analytics_vault: &AnalyticsVault): u64 {
    //     analytics::get_high_24h(analytics_vault)
    // }

    // public fun get_low_24h_from_analytics(analytics_vault: &AnalyticsVault): u64 {
    //     analytics::get_low_24h(analytics_vault)
    // }

    // public fun get_trades_24h_from_analytics(analytics_vault: &AnalyticsVault): u64 {
    //     analytics::get_trades_24h(analytics_vault)
    // }

    // public fun get_liquidity_depth_from_analytics(analytics_vault: &AnalyticsVault): u64 {
    //     analytics::get_liquidity_depth(analytics_vault)
    // }

    //  Internal Helper Functions 

   
    fun calculate_price(basset_reserve: u64, usdc_reserve: u64): u64 {
        if (basset_reserve == 0) return 0;
        math::mul_div(usdc_reserve, 1_000_000_000, basset_reserve)
    }

    
    fun get_active_fee_bps(
        vault: &AssetVault,
        amount_in: u64,
        is_sell: bool,
        clock: &sui::clock::Clock
    ): u64 {
        let base_fee = asset_registry::get_base_fee_bps(vault);
        let mut total_fee = base_fee;
        
        if (is_sell && amount_in > 0) {
            let (_symbol, _, _, _, _, _, _, _, _, _, _) = asset_registry::get_vault_info(vault);
        let basset_reserve = asset_registry::get_trading_supply(vault);
            let sell_share_bps = math::mul_div(amount_in, BPS_SCALE, basset_reserve);
            let dump_threshold = asset_registry::get_dump_threshold_bps(vault);
            
            if (sell_share_bps > dump_threshold) {
                let excess_share = sell_share_bps - dump_threshold;
                let dump_slope = asset_registry::get_dump_slope_bps(vault);
                let anti_dump_extra = math::mul_div(excess_share, dump_slope, BPS_SCALE);
                let anti_dump_total = base_fee + anti_dump_extra;
                let max_dump_fee = asset_registry::get_max_dump_fee_bps(vault);
                
                total_fee = if (anti_dump_total > max_dump_fee) { max_dump_fee } else { anti_dump_total };
            }
        };
        
        
        let (surge_fee, expiry) = asset_registry::get_surge_fee(vault);
        let now = sui::clock::timestamp_ms(clock);
        if (now < expiry && surge_fee > total_fee) {
            total_fee = surge_fee;
        };
        
        total_fee
    }

    
    fun distribute_fees(vault: &mut AssetVault, fee_amount: u64) {
        let (prize_bps, _team_bps) = asset_registry::get_fee_distribution(vault);
        let prize_fee = math::mul_div(fee_amount, prize_bps, BPS_SCALE);
        let team_fee = fee_amount - prize_fee;
        
        asset_registry::add_accumulated_fees(vault, prize_fee, team_fee);
    }

 
}
