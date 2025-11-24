#[test_only]
module bullz::weekly_competition_tests {
    use std::string::{Self, String};
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::clock::{Self, Clock};

    use bullz::admin::{Self, AdminCap};
    use bullz::asset_registry::{Self, AssetRegistry};
    use bullz::squad_management::{Self, SquadRegistry};
    use bullz::fee_management::{Self, Treasury};
    use bullz::user_accounts::{Self, UserRegistry};
    use bullz::weekly_competition::{Self as comp, CompetitionState};

    const ADMIN: address = @0xAD;
    const USER1: address = @0x1;
    const USER2: address = @0x2;

    fun btc_symbol(): String { string::utf8(b"BTC") }
    fun eth_symbol(): String { string::utf8(b"ETH") }
    fun sol_symbol(): String { string::utf8(b"SOL") }
    fun sui_symbol(): String { string::utf8(b"SUI") }
    fun ada_symbol(): String { string::utf8(b"ADA") }
    fun dot_symbol(): String { string::utf8(b"DOT") }
    fun avax_symbol(): String { string::utf8(b"AVAX") }

    fun setup_all(s: &mut Scenario) {
        // init core modules
        ts::next_tx(s, ADMIN);
        {
            admin::init_for_testing(ts::ctx(s));
            asset_registry::init_for_testing(ts::ctx(s));
            squad_management::init_for_testing(ts::ctx(s));
            fee_management::init_for_testing(ts::ctx(s));
            user_accounts::init_for_testing(ts::ctx(s));
            comp::init_for_testing(ts::ctx(s));
        };

        // register 7+ assets
        let symbols = vector[
            btc_symbol(), eth_symbol(), sol_symbol(), sui_symbol(),
            ada_symbol(), dot_symbol(), avax_symbol()
        ];
        let names = vector[
            string::utf8(b"Bitcoin"), string::utf8(b"Ethereum"), string::utf8(b"Solana"), string::utf8(b"Sui"),
            string::utf8(b"Cardano"), string::utf8(b"Polkadot"), string::utf8(b"Avalanche")
        ];
        let mut i = 0; while (i < vector::length(&symbols)) {
            ts::next_tx(s, ADMIN);
            {
                let admin_cap = ts::take_from_sender<AdminCap>(s);
                let mut registry = ts::take_shared<AssetRegistry>(s);
                asset_registry::register_asset(&admin_cap, &mut registry, *vector::borrow(&symbols, i), *vector::borrow(&names, i), string::utf8(b"Desc"), string::utf8(b"uri"), 1_000_000, 0, string::utf8(b"Crypto"), ts::ctx(s));
                ts::return_to_sender(s, admin_cap);
                ts::return_shared(registry);
            };
            i = i + 1;
        };

        // share clock
        ts::next_tx(s, ADMIN); { clock::share_for_testing(clock::create_for_testing(ts::ctx(s))); };

        // create two users with accounts and shill points so they can compete
        ts::next_tx(s, USER1);
        {
            let mut reg = ts::take_shared<UserRegistry>(s);
            user_accounts::create_account(&mut reg, ts::ctx(s));
            // grant 10 shill via admin
            ts::return_shared(reg);
        };
        ts::next_tx(s, USER2);
        {
            let mut reg = ts::take_shared<UserRegistry>(s);
            user_accounts::create_account(&mut reg, ts::ctx(s));
            ts::return_shared(reg);
        };

        // Use admin to grant shill points
        ts::next_tx(s, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(s);
            let mut reg = ts::take_shared<UserRegistry>(s);
            user_accounts::grant_shill_points(&admin_cap, &mut reg, USER1, 10);
            user_accounts::grant_shill_points(&admin_cap, &mut reg, USER2, 10);
            ts::return_shared(reg);
            ts::return_to_sender(s, admin_cap);
        };
    }

    fun create_squad_for(user: address, s: &mut Scenario) {
        ts::next_tx(s, user);
        {
            let mut squad_registry = ts::take_shared<SquadRegistry>(s);
            let mut user_registry = ts::take_shared<UserRegistry>(s);
            let asset_registry = ts::take_shared<AssetRegistry>(s);
            let mut treasury = ts::take_shared<Treasury>(s);
            let clock = ts::take_shared<Clock>(s);

            let basset_symbols = vector[
                btc_symbol(), eth_symbol(), sol_symbol(), sui_symbol(), ada_symbol(), dot_symbol(), avax_symbol()
            ];
            let basset_quantities = vector[10u64, 10u64, 10u64, 10u64, 10u64, 10u64, 10u64];
            // Payment is 1 SUI; reuse helper from fee tests pattern by minting and paying inside create_squad
            let payment = sui::coin::mint_for_testing<sui::sui::SUI>(1_000000000, ts::ctx(s));

            // Ensure the user is marked as owning each asset symbol so create_squad passes ownership checks
            let mut i = 0; let n = vector::length(&basset_symbols);
            while (i < n) {
                user_accounts::track_asset_ownership_for_testing(&mut user_registry, user, *vector::borrow(&basset_symbols, i));
                i = i + 1;
            };

            squad_management::create_squad(&mut squad_registry, &user_registry, &asset_registry, string::utf8(b"My Squad"), basset_symbols, string::utf8(b"default"), basset_quantities, payment, &mut treasury, &clock, ts::ctx(s));

            ts::return_shared(squad_registry);
            ts::return_shared(user_registry);
            ts::return_shared(asset_registry);
            ts::return_shared(treasury);
            ts::return_shared(clock);
        };
    }

    #[test]
    fun test_competition_end_to_end() {
        let mut scenario = ts::begin(ADMIN);
        setup_all(&mut scenario);

        // Prepare state handles
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut comp_state = ts::take_shared<CompetitionState>(&scenario);
            // start week 1 now..lock=100..end=200 (arbitrary ms)
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            comp::start_weekly_competition(&admin_cap, &mut comp_state, 1, 100, 200, &clock);
            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(comp_state);
            ts::return_shared(clock);
        };

        // Both users create one squad each
        create_squad_for(USER1, &mut scenario);
        create_squad_for(USER2, &mut scenario);

        // Enter competition before lock
        ts::next_tx(&mut scenario, USER1);
        {
            let comp_state = ts::take_shared<CompetitionState>(&scenario);
            let squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let user_registry = ts::take_shared<UserRegistry>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);

            // Squads are auto-captured, just need to lock participants after lock_ts
            ts::return_shared(comp_state);
            ts::return_shared(squad_registry);
            ts::return_shared(user_registry);
            ts::return_shared(clock);
        };

        // Wait until lock time and lock participants
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut comp_state = ts::take_shared<CompetitionState>(&scenario);
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let user_registry = ts::take_shared<UserRegistry>(&scenario);
            let mut clock = ts::take_shared<Clock>(&scenario);
            
            // Advance time to lock_ts (100ms from start)
            clock::increment_for_testing(&mut clock, 101);
            
            // Auto-lock all eligible squads
            comp::lock_participants(&admin_cap, &mut comp_state, &mut squad_registry, &user_registry, &clock);

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(comp_state);
            ts::return_shared(squad_registry);
            ts::return_shared(user_registry);
            ts::return_shared(clock);
        };

        ts::next_tx(&mut scenario, USER2);
        {
            let comp_state = ts::take_shared<CompetitionState>(&scenario);
            let squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let user_registry = ts::take_shared<UserRegistry>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);

            // Removed manual entry - squads are auto-captured
            ts::return_shared(comp_state);
            ts::return_shared(squad_registry);
            ts::return_shared(user_registry);
            ts::return_shared(clock);
        };

        // Admin pushes asset points
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut comp_state = ts::take_shared<CompetitionState>(&scenario);
            comp::push_asset_points(&admin_cap, &mut comp_state, btc_symbol(), 50);
            comp::push_asset_points(&admin_cap, &mut comp_state, eth_symbol(), 30);
            comp::push_asset_points(&admin_cap, &mut comp_state, sol_symbol(), 20);
            // Total per squad ~ (50+30+20 + points of other 4 assets which are 0) = 100
            ts::return_shared(comp_state);
            ts::return_to_sender(&scenario, admin_cap);
        };

        // Move end time to 0 so distribution is allowed with current clock (0 in tests)
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut comp_state = ts::take_shared<CompetitionState>(&scenario);
            comp::set_end_time_for_testing(&mut comp_state, 0);
            ts::return_shared(comp_state);
        };

        // Users claim their shill points before competition ends
        ts::next_tx(&mut scenario, USER1);
        {
            let mut comp_state = ts::take_shared<CompetitionState>(&scenario);
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            let squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            
            comp::claim_current_shill_points(&mut comp_state, &mut user_registry, &squad_registry, ts::ctx(&mut scenario));
            
            ts::return_shared(comp_state);
            ts::return_shared(user_registry);
            ts::return_shared(squad_registry);
        };

        ts::next_tx(&mut scenario, USER2);
        {
            let mut comp_state = ts::take_shared<CompetitionState>(&scenario);
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            let squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            
            comp::claim_current_shill_points(&mut comp_state, &mut user_registry, &squad_registry, ts::ctx(&mut scenario));
            
            ts::return_shared(comp_state);
            ts::return_shared(user_registry);
            ts::return_shared(squad_registry);
        };

        // Finalize competition (calculates alpha points for top performers)
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut comp_state = ts::take_shared<CompetitionState>(&scenario);
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);

            comp::finalize_competition(&admin_cap, &mut comp_state, &mut squad_registry, &clock);

            ts::return_shared(comp_state);
            ts::return_shared(squad_registry);
            ts::return_shared(clock);
            ts::return_to_sender(&scenario, admin_cap);
        };

        // Users redeem their alpha points
        ts::next_tx(&mut scenario, USER1);
        {
            let mut comp_state = ts::take_shared<CompetitionState>(&scenario);
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            
            comp::redeem_alpha_points(&mut comp_state, &mut user_registry, ts::ctx(&mut scenario));
            
            ts::return_shared(comp_state);
            ts::return_shared(user_registry);
        };

        ts::next_tx(&mut scenario, USER2);
        {
            let mut comp_state = ts::take_shared<CompetitionState>(&scenario);
            let mut user_registry = ts::take_shared<UserRegistry>(&scenario);
            
            comp::redeem_alpha_points(&mut comp_state, &mut user_registry, ts::ctx(&mut scenario));
            
            ts::return_shared(comp_state);
            ts::return_shared(user_registry);
        };

        // Verify points were distributed correctly
        ts::next_tx(&mut scenario, ADMIN);
        {
            let user_registry = ts::take_shared<UserRegistry>(&scenario);
            
            // Each user score is 100; shill reward = floor(100/2)=50; alpha top awards 100,60 (two users)
            let (alpha1, shill1) = user_accounts::get_point_balances(&user_registry, USER1);
            let (alpha2, shill2) = user_accounts::get_point_balances(&user_registry, USER2);
            assert!(shill1 >= 50 && shill2 >= 50, 0);
            assert!(alpha1 + alpha2 >= 160, 1);

            ts::return_shared(user_registry);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 13, location = bullz::weekly_competition)]
    fun test_cannot_lock_participants_twice() {
        let mut scenario = ts::begin(ADMIN);
        setup_all(&mut scenario);

        // Start comp
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut comp_state = ts::take_shared<CompetitionState>(&scenario);
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            comp::start_weekly_competition(&admin_cap, &mut comp_state, 1, 100, 200, &clock);
            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(comp_state);
            ts::return_shared(clock);
        };

        // User creates squad
        create_squad_for(USER1, &mut scenario);

        // Admin locks participants
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut comp_state = ts::take_shared<CompetitionState>(&scenario);
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let user_registry = ts::take_shared<UserRegistry>(&scenario);
            let mut clock = ts::take_shared<Clock>(&scenario);
            
            clock::increment_for_testing(&mut clock, 101);
            comp::lock_participants(&admin_cap, &mut comp_state, &mut squad_registry, &user_registry, &clock);

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(comp_state);
            ts::return_shared(squad_registry);
            ts::return_shared(user_registry);
            ts::return_shared(clock);
        };

        // Try to lock again -> should fail
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut comp_state = ts::take_shared<CompetitionState>(&scenario);
            let mut squad_registry = ts::take_shared<SquadRegistry>(&scenario);
            let user_registry = ts::take_shared<UserRegistry>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);

            comp::lock_participants(&admin_cap, &mut comp_state, &mut squad_registry, &user_registry, &clock);

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(comp_state);
            ts::return_shared(squad_registry);
            ts::return_shared(user_registry);
            ts::return_shared(clock);
        };

        ts::end(scenario);
    }
}
