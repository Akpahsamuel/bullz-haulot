#[test_only]
module bullz::pack_system_tests {
    use std::string::{Self, String};
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::coin::{Self};
    use sui::sui::SUI;
    use sui::clock::{Self, Clock};

    use bullz::pack_system::{Self, PackRegistry, PackTemplate};
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
    fun starter_pack(): String { string::utf8(b"Starter Pack") }

    // Setup with asset registry and pack system
    fun setup_test(scenario: &mut Scenario) {
        // Initialize all modules
        ts::next_tx(scenario, ADMIN);
        {
            admin::init_for_testing(ts::ctx(scenario));
            asset_registry::init_for_testing(ts::ctx(scenario));
            pack_system::init_for_testing(ts::ctx(scenario));
            fee_management::init_for_testing(ts::ctx(scenario));
            user_accounts::init_for_testing(ts::ctx(scenario));
        };

        // Register 4 test assets
        ts::next_tx(scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(scenario);
            let mut registry = ts::take_shared<AssetRegistry>(scenario);

            asset_registry::register_asset(
                &admin_cap,
                &mut registry,
                btc_symbol(),
                string::utf8(b"Bitcoin"),
                string::utf8(b"BTC asset"),
                string::utf8(b"https://bitcoin.org"),
                1000000,
                0, // initial_circulating_supply
                string::utf8(b"Crypto"),
                ts::ctx(scenario)
            );

            ts::return_to_sender(scenario, admin_cap);
            ts::return_shared(registry);
        };

        ts::next_tx(scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(scenario);
            let mut registry = ts::take_shared<AssetRegistry>(scenario);

            asset_registry::register_asset(
                &admin_cap,
                &mut registry,
                eth_symbol(),
                string::utf8(b"Ethereum"),
                string::utf8(b"ETH asset"),
                string::utf8(b"https://ethereum.org"),
                1000000,
                0, // initial_circulating_supply
                string::utf8(b"Crypto"),
                ts::ctx(scenario)
            );

            ts::return_to_sender(scenario, admin_cap);
            ts::return_shared(registry);
        };

        ts::next_tx(scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(scenario);
            let mut registry = ts::take_shared<AssetRegistry>(scenario);

            asset_registry::register_asset(
                &admin_cap,
                &mut registry,
                sol_symbol(),
                string::utf8(b"Solana"),
                string::utf8(b"SOL asset"),
                string::utf8(b"https://solana.com"),
                1000000,
                0, // initial_circulating_supply
                string::utf8(b"Crypto"),
                ts::ctx(scenario)
            );

            ts::return_to_sender(scenario, admin_cap);
            ts::return_shared(registry);
        };

        ts::next_tx(scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(scenario);
            let mut registry = ts::take_shared<AssetRegistry>(scenario);

            asset_registry::register_asset(
                &admin_cap,
                &mut registry,
                sui_symbol(),
                string::utf8(b"Sui"),
                string::utf8(b"SUI asset"),
                string::utf8(b"https://sui.io"),
                1000000,
                0, // initial_circulating_supply
                string::utf8(b"Crypto"),
                ts::ctx(scenario)
            );

            ts::return_to_sender(scenario, admin_cap);
            ts::return_shared(registry);
        };
    }

    #[test]
    fun test_create_pack_template() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Create pack template
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut pack_registry = ts::take_shared<PackRegistry>(&scenario);

            pack_system::create_pack_template(
                &admin_cap,
                &mut pack_registry,
                starter_pack(),
                20_000000000, // 20 SUI (in nanos)
                2000, // 2000 total shares
                4, // 4 assets per pack
                100, // 100 winning packs max (for raffle)
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(pack_registry);
        };

        // Verify template was created
        ts::next_tx(&mut scenario, ADMIN);
        {
            let template = ts::take_shared<PackTemplate>(&scenario);
            let (name, price, shares, num_assets, max_winning, total_sold) = pack_system::get_template_info(&template);
            
            assert!(name == starter_pack(), 0);
            assert!(price == 20_000000000, 1);
            assert!(shares == 2000, 2);
            assert!(num_assets == 4, 3);
            assert!(max_winning == 100, 4);
            assert!(total_sold == 0, 5);

            ts::return_shared(template);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_buy_pack() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Create pack template
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut pack_registry = ts::take_shared<PackRegistry>(&scenario);

            pack_system::create_pack_template(
                &admin_cap,
                &mut pack_registry,
                starter_pack(),
                20_000000000,
                2000,
                4,
                100,
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(pack_registry);
        };

        // Create clock
        ts::next_tx(&mut scenario, ADMIN);
        {
            clock::share_for_testing(clock::create_for_testing(ts::ctx(&mut scenario)));
        };

        // Create USER1 account first
        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // USER1 buys a pack
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pack_registry = ts::take_shared<PackRegistry>(&scenario);
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            let mut template = ts::take_shared<PackTemplate>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            
            let payment = coin::mint_for_testing<SUI>(20_000000000, ts::ctx(&mut scenario));

            pack_system::buy_pack(
                &mut pack_registry,
                &mut user_registry,
                &mut template,
                payment,
                &mut treasury,
                &clock,
                ts::ctx(&mut scenario)
            );

            // Check user has pack
            let pack_count = pack_system::get_user_pack_count(&user_registry, USER1);
            assert!(pack_count == 1, 0);

            // Check treasury received payment
            assert!(fee_management::get_treasury_balance(&treasury) == 20_000000000, 1);

            ts::return_shared(pack_registry);
            ts::return_shared(user_registry);
            ts::return_shared(template);
            ts::return_shared(treasury);
            ts::return_shared(clock);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_buy_pack_with_overpayment() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Create pack template
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut pack_registry = ts::take_shared<PackRegistry>(&scenario);

            pack_system::create_pack_template(
                &admin_cap,
                &mut pack_registry,
                starter_pack(),
                20_000000000,
                2000,
                4,
                100,
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(pack_registry);
        };

        // Create clock
        ts::next_tx(&mut scenario, ADMIN);
        {
            clock::share_for_testing(clock::create_for_testing(ts::ctx(&mut scenario)));
        };

        // Create user account
        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // USER1 buys with overpayment
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pack_registry = ts::take_shared<PackRegistry>(&scenario);
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            let mut template = ts::take_shared<PackTemplate>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            
            // Pay 25 SUI instead of 20 SUI
            let payment = coin::mint_for_testing<SUI>(25_000000000, ts::ctx(&mut scenario));

            pack_system::buy_pack(
                &mut pack_registry,
                &mut user_registry,
                &mut template,
                payment,
                &mut treasury,
                &clock,
                ts::ctx(&mut scenario)
            );

            // Treasury should only have exact price
            assert!(fee_management::get_treasury_balance(&treasury) == 20_000000000, 0);
            // Change should be returned to USER1 (checked via transfer in the function)

            ts::return_shared(pack_registry);
            ts::return_shared(user_registry);
            ts::return_shared(template);
            ts::return_shared(treasury);
            ts::return_shared(clock);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 10, location = bullz::pack_system)]
    fun test_buy_pack_insufficient_payment_fails() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Create pack template
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut pack_registry = ts::take_shared<PackRegistry>(&scenario);

            pack_system::create_pack_template(
                &admin_cap,
                &mut pack_registry,
                starter_pack(),
                20_000000000,
                2000,
                4,
                100,
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(pack_registry);
        };

        // Create clock
        ts::next_tx(&mut scenario, ADMIN);
        {
            clock::share_for_testing(clock::create_for_testing(ts::ctx(&mut scenario)));
        };

        // Create user account
        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // USER1 tries to buy with insufficient payment
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pack_registry = ts::take_shared<PackRegistry>(&scenario);
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            let mut template = ts::take_shared<PackTemplate>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            
            // Only pay 10 SUI instead of 20 SUI
            let payment = coin::mint_for_testing<SUI>(10_000000000, ts::ctx(&mut scenario));

            pack_system::buy_pack(
                &mut pack_registry,
                &mut user_registry,
                &mut template,
                payment,
                &mut treasury,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(pack_registry);
            ts::return_shared(user_registry);
            ts::return_shared(template);
            ts::return_shared(treasury);
            ts::return_shared(clock);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_update_pack_template() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Create pack template
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut pack_registry = ts::take_shared<PackRegistry>(&scenario);

            pack_system::create_pack_template(
                &admin_cap,
                &mut pack_registry,
                starter_pack(),
                20_000000000,
                2000,
                4,
                100,
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(pack_registry);
        };

        // Update template
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut template = ts::take_shared<PackTemplate>(&scenario);

            pack_system::update_pack_template(
                &admin_cap,
                &mut template,
                30_000000000, // New price
                3000, // New shares
                150, // New max winning packs
            );

            let (_, price, shares, _, max_winning, _) = pack_system::get_template_info(&template);
            assert!(price == 30_000000000, 0);
            assert!(shares == 3000, 1);
            assert!(max_winning == 150, 2);

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(template);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_multiple_users_buy_packs() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Create pack template
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut pack_registry = ts::take_shared<PackRegistry>(&scenario);

            pack_system::create_pack_template(
                &admin_cap,
                &mut pack_registry,
                starter_pack(),
                20_000000000,
                2000,
                4,
                100,
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(pack_registry);
        };

        // Create clock
        ts::next_tx(&mut scenario, ADMIN);
        {
            clock::share_for_testing(clock::create_for_testing(ts::ctx(&mut scenario)));
        };

        // Create user accounts
        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        ts::next_tx(&mut scenario, USER2);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // USER1 buys 2 packs
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pack_registry = ts::take_shared<PackRegistry>(&scenario);
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            let mut template = ts::take_shared<PackTemplate>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            
            let payment1 = coin::mint_for_testing<SUI>(20_000000000, ts::ctx(&mut scenario));
            pack_system::buy_pack(&mut pack_registry, &mut user_registry, &mut template, payment1, &mut treasury, &clock, ts::ctx(&mut scenario));

            let payment2 = coin::mint_for_testing<SUI>(20_000000000, ts::ctx(&mut scenario));
            pack_system::buy_pack(&mut pack_registry, &mut user_registry, &mut template, payment2, &mut treasury, &clock, ts::ctx(&mut scenario));

            assert!(pack_system::get_user_pack_count(&user_registry, USER1) == 2, 0);

            ts::return_shared(pack_registry);
            ts::return_shared(user_registry);
            ts::return_shared(template);
            ts::return_shared(treasury);
            ts::return_shared(clock);
        };

        // USER2 buys 1 pack
        ts::next_tx(&mut scenario, USER2);
        {
            let mut pack_registry = ts::take_shared<PackRegistry>(&scenario);
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            let mut template = ts::take_shared<PackTemplate>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            
            let payment = coin::mint_for_testing<SUI>(20_000000000, ts::ctx(&mut scenario));
            pack_system::buy_pack(&mut pack_registry, &mut user_registry, &mut template, payment, &mut treasury, &clock, ts::ctx(&mut scenario));

            assert!(pack_system::get_user_pack_count(&user_registry, USER2) == 1, 1);
            
            // Treasury should have 60 SUI total
            assert!(fee_management::get_treasury_balance(&treasury) == 60_000000000, 2);

            ts::return_shared(pack_registry);
            ts::return_shared(user_registry);
            ts::return_shared(template);
            ts::return_shared(treasury);
            ts::return_shared(clock);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_get_user_packs() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Create pack template
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut pack_registry = ts::take_shared<PackRegistry>(&scenario);

            pack_system::create_pack_template(
                &admin_cap,
                &mut pack_registry,
                starter_pack(),
                20_000000000,
                2000,
                4,
                100,
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(pack_registry);
        };

        // Create clock
        ts::next_tx(&mut scenario, ADMIN);
        {
            clock::share_for_testing(clock::create_for_testing(ts::ctx(&mut scenario)));
        };

        // Create user account
        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // USER1 buys packs
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pack_registry = ts::take_shared<PackRegistry>(&scenario);
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            let mut template = ts::take_shared<PackTemplate>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            
            let payment = coin::mint_for_testing<SUI>(20_000000000, ts::ctx(&mut scenario));
            pack_system::buy_pack(&mut pack_registry, &mut user_registry, &mut template, payment, &mut treasury, &clock, ts::ctx(&mut scenario));

            let pack_ids = pack_system::get_user_packs(&user_registry, USER1);
            assert!(vector::length(&pack_ids) == 1, 0);

            ts::return_shared(pack_registry);
            ts::return_shared(user_registry);
            ts::return_shared(template);
            ts::return_shared(treasury);
            ts::return_shared(clock);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_open_pack_and_mint_single_asset() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Create pack template with 100% win rate (max_winning = 1000, so first pack always wins)
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut pack_registry = ts::take_shared<PackRegistry>(&scenario);

            pack_system::create_pack_template(
                &admin_cap,
                &mut pack_registry,
                starter_pack(),
                20_000000000,
                2000,
                4,
                1000, // High number ensures winner
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(pack_registry);
        };

        // Create clock
        ts::next_tx(&mut scenario, ADMIN);
        {
            clock::share_for_testing(clock::create_for_testing(ts::ctx(&mut scenario)));
        };

        // Create USER1 account and buy pack
        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        ts::next_tx(&mut scenario, USER1);
        {
            let mut pack_registry = ts::take_shared<PackRegistry>(&scenario);
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            let mut template = ts::take_shared<PackTemplate>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            
            let payment = coin::mint_for_testing<SUI>(20_000000000, ts::ctx(&mut scenario));
            pack_system::buy_pack(&mut pack_registry, &mut user_registry, &mut template, payment, &mut treasury, &clock, ts::ctx(&mut scenario));

            ts::return_shared(pack_registry);
            ts::return_shared(user_registry);
            ts::return_shared(template);
            ts::return_shared(treasury);
            ts::return_shared(clock);
        };

        // Create Random object for testing (must be from @0x0)
        ts::next_tx(&mut scenario, @0x0);
        {
            sui::random::create_for_testing(ts::ctx(&mut scenario));
        };

        // Open pack
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pack_registry = ts::take_shared<PackRegistry>(&scenario);
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            let template = ts::take_shared<PackTemplate>(&scenario);
            let asset_registry = ts::take_shared<AssetRegistry>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            let random = ts::take_shared<sui::random::Random>(&scenario);

            let pack_ids = pack_system::get_user_packs(&user_registry, USER1);
            let pack_id = *vector::borrow(&pack_ids, 0);
            
            pack_system::open_pack(
                pack_id,
                &mut pack_registry,
                &mut user_registry,
                &template,
                &asset_registry,
                &random,
                &clock,
                ts::ctx(&mut scenario)
            );

            // Check pending mints were created
            let pending_count = pack_system::get_pending_mints_count(&pack_registry, USER1);
            assert!(pending_count == 4, 0); // Should have 4 pending mints

            ts::return_shared(pack_registry);
            ts::return_shared(user_registry);
            ts::return_shared(template);
            ts::return_shared(asset_registry);
            ts::return_shared(clock);
            ts::return_shared(random);
        };

        // Mint one asset
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pack_registry = ts::take_shared<PackRegistry>(&scenario);
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            let asset_registry = ts::take_shared<AssetRegistry>(&scenario);
            let pending_mints = pack_system::get_pending_mints(&pack_registry, USER1);
            let first_mint = vector::borrow(&pending_mints, 0);
            let (symbol, quantity, _timestamp) = pack_system::get_pending_mint_info(first_mint);

            // Get the vault for this symbol
            let vault_id = asset_registry::get_vault_id_by_symbol(&asset_registry, symbol);
            
            ts::return_shared(asset_registry);
            
            let mut vault = ts::take_shared_by_id<asset_registry::AssetVault>(&scenario, vault_id);

            // Mint the asset
            pack_system::mint_pack_assets(
                &mut pack_registry,
                &mut user_registry,
                symbol,
                &mut vault,
                ts::ctx(&mut scenario)
            );

            // Verify balance increased (need to get asset_registry again after minting)
            let balance = asset_registry::get_user_balance(&vault, USER1);
            assert!(balance == quantity, 0);

            // Verify pending mints decreased
            let new_pending_count = pack_system::get_pending_mints_count(&pack_registry, USER1);
            assert!(new_pending_count == 3, 1);

            ts::return_shared(pack_registry);
            ts::return_shared(user_registry);
            ts::return_shared(vault);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_open_pack_and_mint_all_assets() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Create pack template
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut pack_registry = ts::take_shared<PackRegistry>(&scenario);

            pack_system::create_pack_template(
                &admin_cap,
                &mut pack_registry,
                starter_pack(),
                20_000000000,
                2000,
                4,
                1000,
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(pack_registry);
        };

        // Setup clock and user
        ts::next_tx(&mut scenario, ADMIN);
        {
            clock::share_for_testing(clock::create_for_testing(ts::ctx(&mut scenario)));
        };

        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // Buy pack
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pack_registry = ts::take_shared<PackRegistry>(&scenario);
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            let mut template = ts::take_shared<PackTemplate>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            
            let payment = coin::mint_for_testing<SUI>(20_000000000, ts::ctx(&mut scenario));
            pack_system::buy_pack(&mut pack_registry, &mut user_registry, &mut template, payment, &mut treasury, &clock, ts::ctx(&mut scenario));

            ts::return_shared(pack_registry);
            ts::return_shared(user_registry);
            ts::return_shared(template);
            ts::return_shared(treasury);
            ts::return_shared(clock);
        };

        // Create Random object for testing (must be from @0x0)
        ts::next_tx(&mut scenario, @0x0);
        {
            sui::random::create_for_testing(ts::ctx(&mut scenario));
        };

        // Open pack
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pack_registry = ts::take_shared<PackRegistry>(&scenario);
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            let template = ts::take_shared<PackTemplate>(&scenario);
            let asset_registry = ts::take_shared<AssetRegistry>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            let random = ts::take_shared<sui::random::Random>(&scenario);

            let pack_ids = pack_system::get_user_packs(&user_registry, USER1);
            let pack_id = *vector::borrow(&pack_ids, 0);
            
            pack_system::open_pack(
                pack_id,
                &mut pack_registry,
                &mut user_registry,
                &template,
                &asset_registry,
                &random,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(pack_registry);
            ts::return_shared(user_registry);
            ts::return_shared(template);
            ts::return_shared(asset_registry);
            ts::return_shared(clock);
            ts::return_shared(random);
        };

        // Mint all assets at once
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pack_registry = ts::take_shared<PackRegistry>(&scenario);
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            let asset_registry = ts::take_shared<AssetRegistry>(&scenario);

            // Get all 4 vaults
            let mut vault1 = ts::take_shared_by_id<asset_registry::AssetVault>(&scenario, 
                asset_registry::get_vault_id_by_symbol(&asset_registry, btc_symbol()));
            let mut vault2 = ts::take_shared_by_id<asset_registry::AssetVault>(&scenario, 
                asset_registry::get_vault_id_by_symbol(&asset_registry, eth_symbol()));
            let mut vault3 = ts::take_shared_by_id<asset_registry::AssetVault>(&scenario, 
                asset_registry::get_vault_id_by_symbol(&asset_registry, sol_symbol()));
            let mut vault4 = ts::take_shared_by_id<asset_registry::AssetVault>(&scenario, 
                asset_registry::get_vault_id_by_symbol(&asset_registry, sui_symbol()));

            // Mint all assets
            pack_system::mint_all_pack_assets(
                &mut pack_registry,
                &mut user_registry,
                &mut vault1,
                &mut vault2,
                &mut vault3,
                &mut vault4,
                ts::ctx(&mut scenario)
            );

            // Verify all pending mints are gone
            let pending_count = pack_system::get_pending_mints_count(&pack_registry, USER1);
            assert!(pending_count == 0, 0);

            // Verify user has balances (at least one should be > 0)
            let balance1 = asset_registry::get_user_balance(&vault1, USER1);
            let balance2 = asset_registry::get_user_balance(&vault2, USER1);
            let balance3 = asset_registry::get_user_balance(&vault3, USER1);
            let balance4 = asset_registry::get_user_balance(&vault4, USER1);
            let total = balance1 + balance2 + balance3 + balance4;
            
            // Total should equal target_total_shares (2000)
            assert!(total == 2000, 1);

            ts::return_shared(pack_registry);
            ts::return_shared(user_registry);
            ts::return_shared(asset_registry);
            ts::return_shared(vault1);
            ts::return_shared(vault2);
            ts::return_shared(vault3);
            ts::return_shared(vault4);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_pending_mints_view_functions() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Create pack template
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut pack_registry = ts::take_shared<PackRegistry>(&scenario);

            pack_system::create_pack_template(
                &admin_cap,
                &mut pack_registry,
                starter_pack(),
                20_000000000,
                2000,
                4,
                1000,
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(pack_registry);
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            clock::share_for_testing(clock::create_for_testing(ts::ctx(&mut scenario)));
        };

        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        ts::next_tx(&mut scenario, USER1);
        {
            let mut pack_registry = ts::take_shared<PackRegistry>(&scenario);
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            let mut template = ts::take_shared<PackTemplate>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            
            let payment = coin::mint_for_testing<SUI>(20_000000000, ts::ctx(&mut scenario));
            pack_system::buy_pack(&mut pack_registry, &mut user_registry, &mut template, payment, &mut treasury, &clock, ts::ctx(&mut scenario));

            ts::return_shared(pack_registry);
            ts::return_shared(user_registry);
            ts::return_shared(template);
            ts::return_shared(treasury);
            ts::return_shared(clock);
        };

        // Create Random object for testing (must be from @0x0)
        ts::next_tx(&mut scenario, @0x0);
        {
            sui::random::create_for_testing(ts::ctx(&mut scenario));
        };

        // Open pack
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pack_registry = ts::take_shared<PackRegistry>(&scenario);
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            let template = ts::take_shared<PackTemplate>(&scenario);
            let asset_registry = ts::take_shared<AssetRegistry>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            let random = ts::take_shared<sui::random::Random>(&scenario);

            let pack_ids = pack_system::get_user_packs(&user_registry, USER1);
            let pack_id = *vector::borrow(&pack_ids, 0);
            
            pack_system::open_pack(
                pack_id,
                &mut pack_registry,
                &mut user_registry,
                &template,
                &asset_registry,
                &random,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(pack_registry);
            ts::return_shared(user_registry);
            ts::return_shared(template);
            ts::return_shared(asset_registry);
            ts::return_shared(clock);
            ts::return_shared(random);
        };

        // Test view functions
        ts::next_tx(&mut scenario, USER1);
        {
            let pack_registry = ts::take_shared<PackRegistry>(&scenario);

            // Test get_pending_mints_count
            let count = pack_system::get_pending_mints_count(&pack_registry, USER1);
            assert!(count == 4, 0);

            // Test get_pending_mints
            let pending = pack_system::get_pending_mints(&pack_registry, USER1);
            assert!(vector::length(&pending) == 4, 1);

            // Test get_pending_mint_info
            let first = vector::borrow(&pending, 0);
            let (symbol, quantity, timestamp) = pack_system::get_pending_mint_info(first);
            
            // Verify symbol is one of our assets
            assert!(
                symbol == btc_symbol() || 
                symbol == eth_symbol() || 
                symbol == sol_symbol() || 
                symbol == sui_symbol(), 
                2
            );
            assert!(quantity > 0, 3);
            // Timestamp should be >= 0 (Clock starts at 0 in tests)
            assert!(timestamp >= 0, 4);

            ts::return_shared(pack_registry);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 14, location = bullz::pack_system)] // ENotPackOwner
    fun test_mint_without_opening_pack_fails() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut user_registry, ts::ctx(&mut scenario));
            ts::return_shared(user_registry);
        };

        // Try to mint without opening a pack
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pack_registry = ts::take_shared<PackRegistry>(&scenario);
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            let asset_registry = ts::take_shared<AssetRegistry>(&scenario);
            let mut vault = ts::take_shared_by_id<asset_registry::AssetVault>(&scenario, 
                asset_registry::get_vault_id_by_symbol(&asset_registry, btc_symbol()));

            // This should fail - no pending mints
            pack_system::mint_pack_assets(
                &mut pack_registry,
                &mut user_registry,
                btc_symbol(),
                &mut vault,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(pack_registry);
            ts::return_shared(user_registry);
            ts::return_shared(asset_registry);
            ts::return_shared(vault);
        };

        ts::end(scenario);
    }
}


