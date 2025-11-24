#[test_only]
module bullz::squad_management_tests {
    use std::string::{Self, String};
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::coin::{Self};
    use sui::sui::SUI;
    use sui::clock::{Self, Clock};

    use bullz::squad_management::{Self, SquadRegistry};
    use bullz::asset_registry::{Self, AssetRegistry};
    use bullz::fee_management::{Self, Treasury};
    use bullz::admin::{Self, AdminCap};
    use bullz::user_accounts::{Self, UserRegistry};

    // Test addresses
    const ADMIN: address = @0xAD;
    const USER1: address = @0x1;
    const USER2: address = @0x2;

    // Helper functions
    fun btc_symbol(): String { string::utf8(b"BTC") }
    fun eth_symbol(): String { string::utf8(b"ETH") }
    fun sol_symbol(): String { string::utf8(b"SOL") }
    fun sui_symbol(): String { string::utf8(b"SUI") }
    fun ada_symbol(): String { string::utf8(b"ADA") }
    fun dot_symbol(): String { string::utf8(b"DOT") }
    fun avax_symbol(): String { string::utf8(b"AVAX") }

    // Setup with asset registry
    fun setup_test(scenario: &mut Scenario) {
        // Initialize all modules
        ts::next_tx(scenario, ADMIN);
        {
            admin::init_for_testing(ts::ctx(scenario));
            asset_registry::init_for_testing(ts::ctx(scenario));
            squad_management::init_for_testing(ts::ctx(scenario));
            fee_management::init_for_testing(ts::ctx(scenario));
            user_accounts::init_for_testing(ts::ctx(scenario));
        };

        // Register 7 test assets (minimum for squad)
        let symbols = vector[btc_symbol(), eth_symbol(), sol_symbol(), sui_symbol(), ada_symbol(), dot_symbol(), avax_symbol()];
        let names = vector[
            string::utf8(b"Bitcoin"),
            string::utf8(b"Ethereum"),
            string::utf8(b"Solana"),
            string::utf8(b"Sui"),
            string::utf8(b"Cardano"),
            string::utf8(b"Polkadot"),
            string::utf8(b"Avalanche")
        ];

        let mut i = 0;
        while (i < vector::length(&symbols)) {
            ts::next_tx(scenario, ADMIN);
            {
                let admin_cap = ts::take_from_sender<AdminCap>(scenario);
                let mut registry = ts::take_shared<AssetRegistry>(scenario);

                asset_registry::register_asset(
                    &admin_cap,
                    &mut registry,
                    *vector::borrow(&symbols, i),
                    *vector::borrow(&names, i),
                    string::utf8(b"Description"),
                    string::utf8(b"https://example.com"),
                    1000000,
                    0, // initial_circulating_supply
                    string::utf8(b"Crypto"),
                    ts::ctx(scenario)
                );

                ts::return_to_sender(scenario, admin_cap);
                ts::return_shared(registry);
            };
            i = i + 1;
        };

        // Create clock
        ts::next_tx(scenario, ADMIN);
        {
            clock::share_for_testing(clock::create_for_testing(ts::ctx(scenario)));
        };
    }

    // Helper function to simulate user owning assets for testing
    fun give_user_assets(scenario: &mut Scenario, user: address) {
        ts::next_tx(scenario, ADMIN);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(scenario);

            // Track ownership of all test assets
            let symbols = vector[btc_symbol(), eth_symbol(), sol_symbol(), sui_symbol(), ada_symbol(), dot_symbol(), avax_symbol()];
            let mut i = 0;
            while (i < vector::length(&symbols)) {
                user_accounts::track_asset_ownership_for_testing(
                    &mut user_registry,
                    user,
                    *vector::borrow(&symbols, i)
                );
                i = i + 1;
            };

            ts::return_shared(user_registry);
        };
    }

    #[test]
    fun test_create_squad_success() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Create user account
        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // Give user assets
        give_user_assets(&mut scenario, USER1);

        // Create squad with 7 bassets
        ts::next_tx(&mut scenario, USER1);
        {
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let user_registry = ts::take_shared<UserRegistry>(&scenario);
            let asset_registry = ts::take_shared<AssetRegistry>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);

            let basset_symbols = vector[
                btc_symbol(), 
                eth_symbol(), 
                sol_symbol(), 
                sui_symbol(), 
                ada_symbol(), 
                dot_symbol(), 
                avax_symbol()
            ];
            let basset_quantities = vector[10u64, 15u64, 20u64, 25u64, 30u64, 35u64, 40u64];
            
            let payment = coin::mint_for_testing<SUI>(1_000000000, ts::ctx(&mut scenario)); // 1 SUI

            squad_management::create_squad(
                &mut squad_registry,
                &user_registry,
                &asset_registry,
                string::utf8(b"My First Squad"),
                basset_symbols,
                string::utf8(b"default"),
                basset_quantities,
                payment,
                &mut treasury,
                &clock,
                ts::ctx(&mut scenario)
            );

            // Verify squad was created
            let squad_count = squad_management::get_user_squad_count(&squad_registry, USER1);
            assert!(squad_count == 1, 0);

            // Verify total squads
            let total = squad_management::get_total_squads(&squad_registry);
            assert!(total == 1, 1);

            // Verify treasury received payment
            assert!(fee_management::get_treasury_balance(&treasury) == 1_000000000, 2);

            ts::return_shared(squad_registry);
            ts::return_shared(user_registry);
            ts::return_shared(asset_registry);
            ts::return_shared(treasury);
            ts::return_shared(clock);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 12, location = bullz::squad_management)] // ENotEnoughAssets
    fun test_create_squad_insufficient_bassets_fails() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // Give user assets
        give_user_assets(&mut scenario, USER1);

        // Give user assets
        give_user_assets(&mut scenario, USER1);

        // Try to create squad with only 3 bassets (need 7)
        ts::next_tx(&mut scenario, USER1);
        {
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let  user_registry = ts::take_shared<UserRegistry>(&scenario);
            let asset_registry = ts::take_shared<AssetRegistry>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);

            let basset_symbols = vector[btc_symbol(), eth_symbol(), sol_symbol()];
            let basset_quantities = vector[10u64, 15u64, 20u64];
            
            let payment = coin::mint_for_testing<SUI>(1_000000000, ts::ctx(&mut scenario));

            squad_management::create_squad(
                &mut squad_registry,
                &user_registry,
                &asset_registry,
                string::utf8(b"Test Squad"),
                basset_symbols,
                string::utf8(b"default"),
                basset_quantities,
                payment,
                &mut treasury,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(squad_registry);
            ts::return_shared(user_registry);
            ts::return_shared(asset_registry);
            ts::return_shared(treasury);
            ts::return_shared(clock);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 10, location = bullz::squad_management)] // EInvalidPayment
    fun test_create_squad_insufficient_payment_fails() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // Give user assets
        give_user_assets(&mut scenario, USER1);

        // Try to create squad with insufficient payment
        ts::next_tx(&mut scenario, USER1);
        {
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let  user_registry = ts::take_shared<UserRegistry>(&scenario);
            let asset_registry = ts::take_shared<AssetRegistry>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);

            let basset_symbols = vector[
                btc_symbol(), 
                eth_symbol(), 
                sol_symbol(), 
                sui_symbol(), 
                ada_symbol(), 
                dot_symbol(), 
                avax_symbol()
            ];
            let basset_quantities = vector[10u64, 15u64, 20u64, 25u64, 30u64, 35u64, 40u64];
            
            // Pay only 0.5 SUI instead of 1 SUI
            let payment = coin::mint_for_testing<SUI>(500000000, ts::ctx(&mut scenario));

            squad_management::create_squad(
                &mut squad_registry,
                &user_registry,
                &asset_registry,
                string::utf8(b"Payment Test Squad"),
                basset_symbols,
                string::utf8(b"default"),
                basset_quantities,
                payment,
                &mut treasury,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(squad_registry);
            ts::return_shared(user_registry);
            ts::return_shared(asset_registry);
            ts::return_shared(treasury);
            ts::return_shared(clock);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_lock_squad() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // Give user assets
        give_user_assets(&mut scenario, USER1);

        // Create squad
        ts::next_tx(&mut scenario, USER1);
        {
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let  user_registry = ts::take_shared<UserRegistry>(&scenario);
            let asset_registry = ts::take_shared<AssetRegistry>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);

            let basset_symbols = vector[
                btc_symbol(), eth_symbol(), sol_symbol(), sui_symbol(), 
                ada_symbol(), dot_symbol(), avax_symbol()
            ];
            let basset_quantities = vector[10u64, 15u64, 20u64, 25u64, 30u64, 35u64, 40u64];
            let payment = coin::mint_for_testing<SUI>(1_000000000, ts::ctx(&mut scenario));

            squad_management::create_squad(
                &mut squad_registry,
                &user_registry,
                &asset_registry,
                string::utf8(b"Lock Test Squad"),
                basset_symbols,
                string::utf8(b"default"),
                basset_quantities,
                payment,
                &mut treasury,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(squad_registry);
            ts::return_shared(user_registry);
            ts::return_shared(asset_registry);
            ts::return_shared(treasury);
            ts::return_shared(clock);
        };

        // Lock squad
        ts::next_tx(&mut scenario, USER1);
        {
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let squad_ids = squad_management::get_user_squads(&squad_registry, USER1);
            let squad_id = *vector::borrow(&squad_ids, 0);

            squad_management::lock_squad(&mut squad_registry, squad_id, ts::ctx(&mut scenario));

            ts::return_shared(squad_registry);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_delete_unlocked_squad() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // Give user assets
        give_user_assets(&mut scenario, USER1);

        // Create squad
        ts::next_tx(&mut scenario, USER1);
        {
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let  user_registry = ts::take_shared<UserRegistry>(&scenario);
            let asset_registry = ts::take_shared<AssetRegistry>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);

            let basset_symbols = vector[
                btc_symbol(), eth_symbol(), sol_symbol(), sui_symbol(), 
                ada_symbol(), dot_symbol(), avax_symbol()
            ];
            let basset_quantities = vector[10u64, 15u64, 20u64, 25u64, 30u64, 35u64, 40u64];
            let payment = coin::mint_for_testing<SUI>(1_000000000, ts::ctx(&mut scenario));

            squad_management::create_squad(
                &mut squad_registry,
                &user_registry,
                &asset_registry,
                string::utf8(b"Delete Test Squad"),
                basset_symbols,
                string::utf8(b"default"),
                basset_quantities,
                payment,
                &mut treasury,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(squad_registry);
            ts::return_shared(user_registry);
            ts::return_shared(asset_registry);
            ts::return_shared(treasury);
            ts::return_shared(clock);
        };

        // Delete squad
        ts::next_tx(&mut scenario, USER1);
        {
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let squad_ids = squad_management::get_user_squads(&squad_registry, USER1);
            let squad_id = *vector::borrow(&squad_ids, 0);

            squad_management::delete_squad(&mut squad_registry, squad_id, ts::ctx(&mut scenario));

            // Verify squad was deleted
            let new_count = squad_management::get_user_squad_count(&squad_registry, USER1);
            assert!(new_count == 0, 0);

            ts::return_shared(squad_registry);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 25, location = bullz::squad_management)] // ENotSquadOwner
    fun test_lock_squad_not_owner_fails() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Create accounts
        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // Give user assets
        give_user_assets(&mut scenario, USER1);

        ts::next_tx(&mut scenario, USER2);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // Give user assets
        give_user_assets(&mut scenario, USER1);

        // USER1 creates squad
        ts::next_tx(&mut scenario, USER1);
        {
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let  user_registry = ts::take_shared<UserRegistry>(&scenario);
            let asset_registry = ts::take_shared<AssetRegistry>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);

            let basset_symbols = vector[
                btc_symbol(), eth_symbol(), sol_symbol(), sui_symbol(), 
                ada_symbol(), dot_symbol(), avax_symbol()
            ];
            let basset_quantities = vector[10u64, 15u64, 20u64, 25u64, 30u64, 35u64, 40u64];
            let payment = coin::mint_for_testing<SUI>(1_000000000, ts::ctx(&mut scenario));

            squad_management::create_squad(
                &mut squad_registry,
                &user_registry,
                &asset_registry,
                string::utf8(b"Owner Test Squad"),
                basset_symbols,
                string::utf8(b"default"),
                basset_quantities,
                payment,
                &mut treasury,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(squad_registry);
            ts::return_shared(user_registry);
            ts::return_shared(asset_registry);
            ts::return_shared(treasury);
            ts::return_shared(clock);
        };

        // USER2 tries to lock USER1's squad (should fail)
        ts::next_tx(&mut scenario, USER2);
        {
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let squad_ids = squad_management::get_user_squads(&squad_registry, USER1);
            let squad_id = *vector::borrow(&squad_ids, 0);

            squad_management::lock_squad(&mut squad_registry, squad_id, ts::ctx(&mut scenario));

            ts::return_shared(squad_registry);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_multiple_squads() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // Give user assets
        give_user_assets(&mut scenario, USER1);

        // Create 2 squads
        ts::next_tx(&mut scenario, USER1);
        {
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let  user_registry = ts::take_shared<UserRegistry>(&scenario);
            let asset_registry = ts::take_shared<AssetRegistry>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);

            let basset_symbols = vector[
                btc_symbol(), eth_symbol(), sol_symbol(), sui_symbol(), 
                ada_symbol(), dot_symbol(), avax_symbol()
            ];
            let basset_quantities = vector[10u64, 15u64, 20u64, 25u64, 30u64, 35u64, 40u64];
            
            // Create first squad
            let payment1 = coin::mint_for_testing<SUI>(1_000000000, ts::ctx(&mut scenario));
            squad_management::create_squad(
                &mut squad_registry,
                &user_registry,
                &asset_registry,
                string::utf8(b"First Squad"),
                basset_symbols,
                string::utf8(b"default"),
                basset_quantities,
                payment1,
                &mut treasury,
                &clock,
                ts::ctx(&mut scenario)
            );

            // Create second squad
            let payment2 = coin::mint_for_testing<SUI>(1_000000000, ts::ctx(&mut scenario));
            squad_management::create_squad(
                &mut squad_registry,
                &user_registry,
                &asset_registry,
                string::utf8(b"Second Squad"),
                basset_symbols,
                string::utf8(b"default"),
                basset_quantities,
                payment2,
                &mut treasury,
                &clock,
                ts::ctx(&mut scenario)
            );

            // Verify user has 2 squads
            let squad_count = squad_management::get_user_squad_count(&squad_registry, USER1);
            assert!(squad_count == 2, 0);

            // Verify total squads
            let total = squad_management::get_total_squads(&squad_registry);
            assert!(total == 2, 1);

            ts::return_shared(squad_registry);
            ts::return_shared(user_registry);
            ts::return_shared(asset_registry);
            ts::return_shared(treasury);
            ts::return_shared(clock);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_edit_squad() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // Give user assets
        give_user_assets(&mut scenario, USER1);

        // Create squad
        ts::next_tx(&mut scenario, USER1);
        {
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let  user_registry = ts::take_shared<UserRegistry>(&scenario);
            let asset_registry = ts::take_shared<AssetRegistry>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);

            let basset_symbols = vector[
                btc_symbol(), eth_symbol(), sol_symbol(), sui_symbol(), 
                ada_symbol(), dot_symbol(), avax_symbol()
            ];
            let basset_quantities = vector[10u64, 15u64, 20u64, 25u64, 30u64, 35u64, 40u64];
            let payment = coin::mint_for_testing<SUI>(1_000000000, ts::ctx(&mut scenario));

            squad_management::create_squad(
                &mut squad_registry,
                &user_registry,
                &asset_registry,
                string::utf8(b"Original Name"),
                basset_symbols,
                string::utf8(b"default"),
                basset_quantities,
                payment,
                &mut treasury,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(squad_registry);
            ts::return_shared(user_registry);
            ts::return_shared(asset_registry);
            ts::return_shared(treasury);
            ts::return_shared(clock);
        };

        // Edit squad - change name and composition
        ts::next_tx(&mut scenario, USER1);
        {
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let  user_registry = ts::take_shared<UserRegistry>(&scenario);
            let asset_registry = ts::take_shared<AssetRegistry>(&scenario);
            let squad_ids = squad_management::get_user_squads(&squad_registry, USER1);
            let squad_id = *vector::borrow(&squad_ids, 0);

            let new_basset_symbols = vector[
                eth_symbol(), sol_symbol(), sui_symbol(), ada_symbol(), 
                dot_symbol(), avax_symbol(), btc_symbol()
            ];
            let new_basset_quantities = vector[5u64, 10u64, 15u64, 20u64, 25u64, 30u64, 35u64];

            squad_management::edit_squad(
                &mut squad_registry,
                &user_registry,
                &asset_registry,
                squad_id,
                option::some(string::utf8(b"Edited Name")),
                option::some(new_basset_symbols),
                option::some(new_basset_quantities),
                option::none(),
                ts::ctx(&mut scenario)
            );

            ts::return_shared(squad_registry);
            ts::return_shared(user_registry);
            ts::return_shared(asset_registry);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 25, location = bullz::squad_management)] // ENotSquadOwner
    fun test_edit_squad_not_owner_fails() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Create accounts
        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // Give user assets
        give_user_assets(&mut scenario, USER1);

        ts::next_tx(&mut scenario, USER2);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // Give user assets
        give_user_assets(&mut scenario, USER1);

        // USER1 creates squad
        ts::next_tx(&mut scenario, USER1);
        {
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let  user_registry = ts::take_shared<UserRegistry>(&scenario);
            let asset_registry = ts::take_shared<AssetRegistry>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);

            let basset_symbols = vector[
                btc_symbol(), eth_symbol(), sol_symbol(), sui_symbol(), 
                ada_symbol(), dot_symbol(), avax_symbol()
            ];
            let basset_quantities = vector[10u64, 15u64, 20u64, 25u64, 30u64, 35u64, 40u64];
            let payment = coin::mint_for_testing<SUI>(1_000000000, ts::ctx(&mut scenario));

            squad_management::create_squad(
                &mut squad_registry,
                &user_registry,
                &asset_registry,
                string::utf8(b"Squad Name"),
                basset_symbols,
                string::utf8(b"default"),
                basset_quantities,
                payment,
                &mut treasury,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(squad_registry);
            ts::return_shared(user_registry);
            ts::return_shared(asset_registry);
            ts::return_shared(treasury);
            ts::return_shared(clock);
        };

        // USER2 tries to edit USER1's squad (should fail)
        ts::next_tx(&mut scenario, USER2);
        {
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let  user_registry = ts::take_shared<UserRegistry>(&scenario);
            let asset_registry = ts::take_shared<AssetRegistry>(&scenario);
            let squad_ids = squad_management::get_user_squads(&squad_registry, USER1);
            let squad_id = *vector::borrow(&squad_ids, 0);

            let new_basset_symbols = vector[
                eth_symbol(), sol_symbol(), sui_symbol(), ada_symbol(), 
                dot_symbol(), avax_symbol(), btc_symbol()
            ];
            let new_basset_quantities = vector[5u64, 10u64, 15u64, 20u64, 25u64, 30u64, 35u64];

            squad_management::edit_squad(
                &mut squad_registry,
                &user_registry,
                &asset_registry,
                squad_id,
                option::some(string::utf8(b"Hacked Name")),
                option::some(new_basset_symbols),
                option::some(new_basset_quantities),
                option::none(),
                ts::ctx(&mut scenario)
            );

            ts::return_shared(squad_registry);
            ts::return_shared(user_registry);
            ts::return_shared(asset_registry);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_edit_squad_name_only() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // Give user assets
        give_user_assets(&mut scenario, USER1);

        // Create squad
        ts::next_tx(&mut scenario, USER1);
        {
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let  user_registry = ts::take_shared<UserRegistry>(&scenario);
            let asset_registry = ts::take_shared<AssetRegistry>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);

            let basset_symbols = vector[
                btc_symbol(), eth_symbol(), sol_symbol(), sui_symbol(), 
                ada_symbol(), dot_symbol(), avax_symbol()
            ];
            let basset_quantities = vector[10u64, 15u64, 20u64, 25u64, 30u64, 35u64, 40u64];
            let payment = coin::mint_for_testing<SUI>(1_000000000, ts::ctx(&mut scenario));

            squad_management::create_squad(
                &mut squad_registry,
                &user_registry,
                &asset_registry,
                string::utf8(b"Original Name"),
                basset_symbols,
                string::utf8(b"default"),
                basset_quantities,
                payment,
                &mut treasury,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(squad_registry);
            ts::return_shared(user_registry);
            ts::return_shared(asset_registry);
            ts::return_shared(treasury);
            ts::return_shared(clock);
        };

        // Edit only the name (pass empty vectors for bassets)
        ts::next_tx(&mut scenario, USER1);
        {
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let  user_registry = ts::take_shared<UserRegistry>(&scenario);
            let asset_registry = ts::take_shared<AssetRegistry>(&scenario);
            let squad_ids = squad_management::get_user_squads(&squad_registry, USER1);
            let squad_id = *vector::borrow(&squad_ids, 0);

            // Pass option::none() to keep existing bassets
            squad_management::edit_squad(
                &mut squad_registry,
                &user_registry,
                &asset_registry,
                squad_id,
                option::some(string::utf8(b"New Name Only")),
                option::none(),
                option::none(),
                option::none(),
                ts::ctx(&mut scenario)
            );

            ts::return_shared(squad_registry);
            ts::return_shared(user_registry);
            ts::return_shared(asset_registry);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_edit_squad_formation_only() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // Give user assets
        give_user_assets(&mut scenario, USER1);

        // Create squad
        ts::next_tx(&mut scenario, USER1);
        {
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let  user_registry = ts::take_shared<UserRegistry>(&scenario);
            let asset_registry = ts::take_shared<AssetRegistry>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);

            let basset_symbols = vector[
                btc_symbol(), eth_symbol(), sol_symbol(), sui_symbol(), 
                ada_symbol(), dot_symbol(), avax_symbol()
            ];
            let basset_quantities = vector[10u64, 15u64, 20u64, 25u64, 30u64, 35u64, 40u64];
            let payment = coin::mint_for_testing<SUI>(1_000000000, ts::ctx(&mut scenario));

            squad_management::create_squad(
                &mut squad_registry,
                &user_registry,
                &asset_registry,
                string::utf8(b"Formation Test Squad"),
                basset_symbols,
                string::utf8(b"4-3-3"),
                basset_quantities,
                payment,
                &mut treasury,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(squad_registry);
            ts::return_shared(user_registry);
            ts::return_shared(asset_registry);
            ts::return_shared(treasury);
            ts::return_shared(clock);
        };

        // Edit only the formation
        ts::next_tx(&mut scenario, USER1);
        {
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let  user_registry = ts::take_shared<UserRegistry>(&scenario);
            let asset_registry = ts::take_shared<AssetRegistry>(&scenario);
            let squad_ids = squad_management::get_user_squads(&squad_registry, USER1);
            let squad_id = *vector::borrow(&squad_ids, 0);

            // Pass option::some for formation only
            squad_management::edit_squad(
                &mut squad_registry,
                &user_registry,
                &asset_registry,
                squad_id,
                option::none(),
                option::none(),
                option::none(),
                option::some(string::utf8(b"3-5-2")),
                ts::ctx(&mut scenario)
            );

            ts::return_shared(squad_registry);
            ts::return_shared(user_registry);
            ts::return_shared(asset_registry);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_edit_squad_bassets_only() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // Give user assets
        give_user_assets(&mut scenario, USER1);

        // Create squad
        ts::next_tx(&mut scenario, USER1);
        {
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let  user_registry = ts::take_shared<UserRegistry>(&scenario);
            let asset_registry = ts::take_shared<AssetRegistry>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);

            let basset_symbols = vector[
                btc_symbol(), eth_symbol(), sol_symbol(), sui_symbol(), 
                ada_symbol(), dot_symbol(), avax_symbol()
            ];
            let basset_quantities = vector[10u64, 15u64, 20u64, 25u64, 30u64, 35u64, 40u64];
            let payment = coin::mint_for_testing<SUI>(1_000000000, ts::ctx(&mut scenario));

            squad_management::create_squad(
                &mut squad_registry,
                &user_registry,
                &asset_registry,
                string::utf8(b"Keep This Name"),
                basset_symbols,
                string::utf8(b"default"),
                basset_quantities,
                payment,
                &mut treasury,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(squad_registry);
            ts::return_shared(user_registry);
            ts::return_shared(asset_registry);
            ts::return_shared(treasury);
            ts::return_shared(clock);
        };

        // Edit only bassets (pass empty string for name)
        ts::next_tx(&mut scenario, USER1);
        {
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let  user_registry = ts::take_shared<UserRegistry>(&scenario);
            let asset_registry = ts::take_shared<AssetRegistry>(&scenario);
            let squad_ids = squad_management::get_user_squads(&squad_registry, USER1);
            let squad_id = *vector::borrow(&squad_ids, 0);

            let new_basset_symbols = vector[
                eth_symbol(), sol_symbol(), sui_symbol(), ada_symbol(), 
                dot_symbol(), avax_symbol(), btc_symbol()
            ];
            let new_basset_quantities = vector[5u64, 10u64, 15u64, 20u64, 25u64, 30u64, 35u64];

            // Pass option::none() to keep existing name
            squad_management::edit_squad(
                &mut squad_registry,
                &user_registry,
                &asset_registry,
                squad_id,
                option::none(),
                option::some(new_basset_symbols),
                option::some(new_basset_quantities),
                option::none(),
                ts::ctx(&mut scenario)
            );

            ts::return_shared(squad_registry);
            ts::return_shared(user_registry);
            ts::return_shared(asset_registry);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_edit_squad_no_changes() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // Give user assets
        give_user_assets(&mut scenario, USER1);

        // Create squad
        ts::next_tx(&mut scenario, USER1);
        {
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let  user_registry = ts::take_shared<UserRegistry>(&scenario);
            let asset_registry = ts::take_shared<AssetRegistry>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);

            let basset_symbols = vector[
                btc_symbol(), eth_symbol(), sol_symbol(), sui_symbol(), 
                ada_symbol(), dot_symbol(), avax_symbol()
            ];
            let basset_quantities = vector[10u64, 15u64, 20u64, 25u64, 30u64, 35u64, 40u64];
            let payment = coin::mint_for_testing<SUI>(1_000000000, ts::ctx(&mut scenario));

            squad_management::create_squad(
                &mut squad_registry,
                &user_registry,
                &asset_registry,
                string::utf8(b"Keep Everything"),
                basset_symbols,
                string::utf8(b"default"),
                basset_quantities,
                payment,
                &mut treasury,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(squad_registry);
            ts::return_shared(user_registry);
            ts::return_shared(asset_registry);
            ts::return_shared(treasury);
            ts::return_shared(clock);
        };

        // Edit with empty fields (no changes)
        ts::next_tx(&mut scenario, USER1);
        {
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let  user_registry = ts::take_shared<UserRegistry>(&scenario);
            let asset_registry = ts::take_shared<AssetRegistry>(&scenario);
            let squad_ids = squad_management::get_user_squads(&squad_registry, USER1);
            let squad_id = *vector::borrow(&squad_ids, 0);

            // Pass option::none() for all - nothing should change
            squad_management::edit_squad(
                &mut squad_registry,
                &user_registry,
                &asset_registry,
                squad_id,
                option::none(),
                option::none(),
                option::none(),
                option::none(),
                ts::ctx(&mut scenario)
            );

            ts::return_shared(squad_registry);
            ts::return_shared(user_registry);
            ts::return_shared(asset_registry);
        };

        ts::end(scenario);
    }
}


