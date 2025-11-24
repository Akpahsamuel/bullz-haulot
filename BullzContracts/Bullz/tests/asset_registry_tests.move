#[test_only]
module bullz::asset_registry_tests {
    use std::string::{Self, String};
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::coin;
    use sui::sui::SUI;
    
    use bullz::asset_registry::{Self, AssetRegistry, AssetVault};
    use bullz::admin::{Self, AdminCap};
    use bullz::user_accounts::{Self, UserRegistry};

    // Test addresses
    const ADMIN: address = @0xAD;
    const USER1: address = @0x1;
    const USER2: address = @0x2;

    // Helper to create asset symbol
    fun btc_symbol(): String { string::utf8(b"BTC") }
    fun eth_symbol(): String { string::utf8(b"ETH") }

    // Setup function
    fun setup_test(scenario: &mut Scenario) {
        // Initialize modules
        ts::next_tx(scenario, ADMIN);
        {
            admin::init_for_testing(ts::ctx(scenario));
            asset_registry::init_for_testing(ts::ctx(scenario));
            user_accounts::init_for_testing(ts::ctx(scenario));
        };
    }

    #[test]
    fun test_register_asset() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Register BTC asset
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<AssetRegistry>(&scenario);

            asset_registry::register_asset(
                &admin_cap,
                &mut registry,
                btc_symbol(),
                string::utf8(b"Bitcoin"),
                string::utf8(b"Bitcoin asset"),
                string::utf8(b"https://bitcoin.org/img/icons/opengraph.png"),
                1000000, // 1M supply cap
                0, // initial_circulating_supply
                string::utf8(b"Crypto"),
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(registry);
        };

        // Verify asset was registered
        ts::next_tx(&mut scenario, ADMIN);
        {
            let registry = ts::take_shared<AssetRegistry>(&scenario);
            let asset_count = asset_registry::get_asset_count(&registry);
            assert!(asset_count == 1, 0);

            let symbols = asset_registry::get_asset_symbols(&registry);
            assert!(vector::length(&symbols) == 1, 1);

            ts::return_shared(registry);
        };

        // Verify vault was created
        ts::next_tx(&mut scenario, ADMIN);
        {
            let vault = ts::take_shared<AssetVault>(&scenario);
            let (symbol, _, _, _, _, supply_cap, circulating, _, reserve, _, enabled) = asset_registry::get_vault_info(&vault);
            
            assert!(symbol == btc_symbol(), 2);
            assert!(supply_cap == 1000000, 3);
            assert!(circulating == 0, 4);
            assert!(reserve == 1000000, 5);
            assert!(enabled == true, 6);

            ts::return_shared(vault);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_transfer_basset_to_user() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Register asset
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<AssetRegistry>(&scenario);

            asset_registry::register_asset(
                &admin_cap,
                &mut registry,
                btc_symbol(),
                string::utf8(b"Bitcoin"),
                string::utf8(b"Bitcoin asset"),
                string::utf8(b"https://bitcoin.org/img/icons/opengraph.png"),
                1000000,
                0, // initial_circulating_supply
                string::utf8(b"Crypto"),
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(registry);
        };

        // Create user account first
        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // Mint assets to USER1 (simulating pack opening)
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut vault = ts::take_shared<AssetVault>(&scenario);
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            
            // This would normally be called by pack_system
            asset_registry::mint_from_treasury_for_testing(&mut vault, &mut user_registry, USER1, 100, ts::ctx(&mut scenario));

            // Check vault state - should mint from treasury
            let (_, _, _, _, _, _, circulating, _, reserve, _, _) = asset_registry::get_vault_info(&vault);
            assert!(circulating == 100, 0);  // circulating_supply increased
            assert!(reserve == 999900, 1);  // treasury_reserve decreased

            // Check user balance
            let balance = asset_registry::get_user_balance(&vault, USER1);
            assert!(balance == 100, 2);

            ts::return_shared(vault);
            ts::return_shared(user_registry);
        };

        // Mint more to same user (now using transfer from trading supply)
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut vault = ts::take_shared<AssetVault>(&scenario);
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            
            // Set up trading supply for testing transfer functionality
            asset_registry::set_trading_supply_for_testing(&mut vault, 200);
            
            asset_registry::transfer_basset_to_user(&mut vault, &mut user_registry, USER1, 50, ts::ctx(&mut scenario));

            let balance = asset_registry::get_user_balance(&vault, USER1);
            assert!(balance == 150, 3);

            ts::return_shared(vault);
            ts::return_shared(user_registry);
        };

        // Create USER2 account and mint to them
        ts::next_tx(&mut scenario, USER2);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut vault = ts::take_shared<AssetVault>(&scenario);
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            
            asset_registry::transfer_basset_to_user(&mut vault, &mut user_registry, USER2, 100, ts::ctx(&mut scenario));

            let balance1 = asset_registry::get_user_balance(&vault, USER1);
            let balance2 = asset_registry::get_user_balance(&vault, USER2);
            assert!(balance1 == 150, 4);
            assert!(balance2 == 100, 5);

            ts::return_shared(vault);
            ts::return_shared(user_registry);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_disable_enable_minting() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Register asset
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<AssetRegistry>(&scenario);

            asset_registry::register_asset(
                &admin_cap,
                &mut registry,
                btc_symbol(),
                string::utf8(b"Bitcoin"),
                string::utf8(b"Bitcoin asset"),
                string::utf8(b"https://bitcoin.org/img/icons/opengraph.png"),
                1000000,
                0, // initial_circulating_supply
                string::utf8(b"Crypto"),
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(registry);
        };

        // Disable minting
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut vault = ts::take_shared<AssetVault>(&scenario);

            asset_registry::disable_minting(&admin_cap, &mut vault);

            assert!(asset_registry::is_minting_enabled(&vault) == false, 0);

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(vault);
        };

        // Re-enable minting
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut vault = ts::take_shared<AssetVault>(&scenario);

            asset_registry::enable_minting(&admin_cap, &mut vault);

            assert!(asset_registry::is_minting_enabled(&vault) == true, 1);

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(vault);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 6, location = bullz::asset_registry)]
    fun test_mint_when_disabled_fails() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Register asset
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<AssetRegistry>(&scenario);

            asset_registry::register_asset(
                &admin_cap,
                &mut registry,
                btc_symbol(),
                string::utf8(b"Bitcoin"),
                string::utf8(b"Bitcoin asset"),
                string::utf8(b"https://bitcoin.org/img/icons/opengraph.png"),
                1000000,
                0, // initial_circulating_supply
                string::utf8(b"Crypto"),
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(registry);
        };

        // Disable minting
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut vault = ts::take_shared<AssetVault>(&scenario);

            asset_registry::disable_minting(&admin_cap, &mut vault);

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(vault);
        };

        // Create user account
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // Try to mint (should fail)
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut vault = ts::take_shared<AssetVault>(&scenario);
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            
            asset_registry::mint_from_treasury_for_testing(&mut vault, &mut user_registry, USER1, 100, ts::ctx(&mut scenario));

            ts::return_shared(vault);
            ts::return_shared(user_registry);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 32, location = bullz::asset_registry)]
    fun test_mint_exceeds_supply_fails() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Register asset with small supply
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<AssetRegistry>(&scenario);

            asset_registry::register_asset(
                &admin_cap,
                &mut registry,
                btc_symbol(),
                string::utf8(b"Bitcoin"),
                string::utf8(b"Bitcoin asset"),
                string::utf8(b"https://bitcoin.org/img/icons/opengraph.png"),
                100, // Only 100 supply
                0, // initial_circulating_supply
                string::utf8(b"Crypto"),
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(registry);
        };

        // Create user account
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // Try to mint more than supply cap (should fail)
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut vault = ts::take_shared<AssetVault>(&scenario);
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            
            // Try to mint 150 when supply cap is 100 (should fail)
            asset_registry::mint_from_treasury_for_testing(&mut vault, &mut user_registry, ADMIN, 150, ts::ctx(&mut scenario));

            ts::return_shared(vault);
            ts::return_shared(user_registry);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_multiple_assets() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Register BTC
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<AssetRegistry>(&scenario);

            asset_registry::register_asset(
                &admin_cap,
                &mut registry,
                btc_symbol(),
                string::utf8(b"Bitcoin"),
                string::utf8(b"Bitcoin asset"),
                string::utf8(b"https://bitcoin.org"),
                1000000,
                0, // initial_circulating_supply
                string::utf8(b"Crypto"),
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(registry);
        };

        // Register ETH
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<AssetRegistry>(&scenario);

            asset_registry::register_asset(
                &admin_cap,
                &mut registry,
                eth_symbol(),
                string::utf8(b"Ethereum"),
                string::utf8(b"Ethereum asset"),
                string::utf8(b"https://ethereum.org"),
                2000000,
                0, // initial_circulating_supply
                string::utf8(b"Crypto"),
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(registry);
        };

        // Verify both assets registered
        ts::next_tx(&mut scenario, ADMIN);
        {
            let registry = ts::take_shared<AssetRegistry>(&scenario);
            
            assert!(asset_registry::get_asset_count(&registry) == 2, 0);
            
            let symbols = asset_registry::get_asset_symbols(&registry);
            assert!(vector::length(&symbols) == 2, 1);

            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_admin_fee_withdrawal() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Register BTC asset
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<AssetRegistry>(&scenario);

            asset_registry::register_asset(
                &admin_cap,
                &mut registry,
                btc_symbol(),
                string::utf8(b"Bitcoin"),
                string::utf8(b"Bitcoin asset"),
                string::utf8(b"https://bitcoin.org/img/icons/opengraph.png"),
                1000000,
                500000, // initial circulating supply
                string::utf8(b"Crypto"),
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(registry);
        };

        // Add some fees to the vault (simulate trading fees) and add balance
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut vault = ts::take_shared<AssetVault>(&scenario);
            
            // Add prize and team fees
            asset_registry::add_accumulated_fees(&mut vault, 1000, 500); // 1000 prize, 500 team
            
            // Add SUI balance to the vault (for fee withdrawal)
            let sui_coin = coin::mint_for_testing<SUI>(5000, ts::ctx(&mut scenario));
            let sui_balance = coin::into_balance(sui_coin);
            asset_registry::add_usdc_balance(&mut vault, sui_balance);
            
            ts::return_shared(vault);
        };

        // Test withdrawing prize fees
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut vault = ts::take_shared<AssetVault>(&scenario);

            // Withdraw 500 prize fees
            asset_registry::withdraw_prize_fees(
                &admin_cap,
                &mut vault,
                500,
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(vault);
        };

        // Test withdrawing team fees
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut vault = ts::take_shared<AssetVault>(&scenario);

            // Withdraw all remaining team fees (500)
            asset_registry::withdraw_team_fees(
                &admin_cap,
                &mut vault,
                500,
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(vault);
        };

        // Add more fees and test withdrawing all fees
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut vault = ts::take_shared<AssetVault>(&scenario);
            
            // Add more fees
            asset_registry::add_accumulated_fees(&mut vault, 2000, 1000); // 2000 prize, 1000 team
            
            // Add balance for the new fees
            let sui_coin = coin::mint_for_testing<SUI>(3000, ts::ctx(&mut scenario));
            let sui_balance = coin::into_balance(sui_coin);
            asset_registry::add_usdc_balance(&mut vault, sui_balance);
            
            ts::return_shared(vault);
        };

        // Test withdrawing all fees at once
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut vault = ts::take_shared<AssetVault>(&scenario);

            // Withdraw all remaining fees (2000 prize + 1000 team = 3000 total)
            asset_registry::withdraw_all_fees(
                &admin_cap,
                &mut vault,
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(vault);
        };

        // Verify final state - all fees should be zero
        ts::next_tx(&mut scenario, ADMIN);
        {
            let vault = ts::take_shared<AssetVault>(&scenario);
            
            let (prize_fees, team_fees) = asset_registry::get_accumulated_fees(&vault);
            assert!(prize_fees == 0, 0);
            assert!(team_fees == 0, 1);

            ts::return_shared(vault);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_transfer_from_trading_supply() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Register asset with some initial supply
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<AssetRegistry>(&scenario);

            asset_registry::register_asset(
                &admin_cap,
                &mut registry,
                btc_symbol(),
                string::utf8(b"Bitcoin"),
                string::utf8(b"Bitcoin asset"),
                string::utf8(b"https://bitcoin.org/img/icons/opengraph.png"),
                1000000,
                1000, // initial_circulating_supply = 1000
                string::utf8(b"Crypto"),
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(registry);
        };

        // Enable trading (this should set trading_supply to circulating_supply)
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut vault = ts::take_shared<AssetVault>(&scenario);

            asset_registry::set_trading_enabled(&mut vault, true);

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(vault);
        };

        // Create user account
        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // Transfer from trading supply to user (simulating buy operation)
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut vault = ts::take_shared<AssetVault>(&scenario);
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            
            // This would normally be called by trading::buy_basset_with_usdc
            asset_registry::transfer_basset_to_user(&mut vault, &mut user_registry, USER1, 100, ts::ctx(&mut scenario));

            // Check vault state - should transfer from trading_supply, circulating stays same
            let (_, _, _, _, _, _, circulating, trading_supply, reserve, _, _) = asset_registry::get_vault_info(&vault);
            assert!(circulating == 1000, 0);     // circulating_supply unchanged
            assert!(trading_supply == 900, 1);   // trading_supply decreased
            assert!(reserve == 999000, 2);       // treasury_reserve unchanged

            // Check user balance
            let balance = asset_registry::get_user_balance(&vault, USER1);
            assert!(balance == 100, 3);

            ts::return_shared(vault);
            ts::return_shared(user_registry);
        };

        ts::end(scenario);
    }

}
