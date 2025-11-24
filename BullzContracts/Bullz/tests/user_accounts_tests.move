#[test_only]
module bullz::user_accounts_tests {
    use std::string;
    use sui::test_scenario::{Self as ts, Scenario};
    
    use bullz::user_accounts::{Self, UserRegistry};
    use bullz::admin::{Self, AdminCap};

    const ADMIN: address = @0xAD;
    const USER1: address = @0x1;

    fun setup_test(scenario: &mut Scenario) {
        ts::next_tx(scenario, ADMIN);
        {
            admin::init_for_testing(ts::ctx(scenario));
            user_accounts::init_for_testing(ts::ctx(scenario));
        };
    }

    #[test]
    fun test_create_account() {
        let mut scenario = ts::begin(USER1);
        setup_test(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut registry, ts::ctx(&mut scenario));
            
            assert!(user_accounts::has_account(&registry, USER1), 0);
            assert!(user_accounts::get_alpha_points(&registry, USER1) == 0, 1);
            assert!(user_accounts::get_shill_points(&registry, USER1) == 1000, 2);

            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_award_and_spend_alpha_points() {
        let mut scenario = ts::begin(USER1);
        setup_test(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut registry, ts::ctx(&mut scenario));
            
            user_accounts::award_alpha_points(&mut registry, USER1, 1000, string::utf8(b"Test"));
            assert!(user_accounts::get_alpha_points(&registry, USER1) == 1000, 0);
            
            user_accounts::spend_alpha_points(&mut registry, USER1, 300, string::utf8(b"Pack"));
            assert!(user_accounts::get_alpha_points(&registry, USER1) == 700, 1);

            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_shill_points_and_compete() {
        let mut scenario = ts::begin(USER1);
        setup_test(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut registry, ts::ctx(&mut scenario));
            
            // New accounts start with 1000 shill points, so they can compete
            assert!(user_accounts::can_compete(&registry, USER1) == true, 0);
            
            // Award additional points
            user_accounts::award_shill_points_for_testing(&mut registry, USER1, 100, string::utf8(b"Test"));
            assert!(user_accounts::can_compete(&registry, USER1) == true, 1);

            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_admin_grant_points() {
        let mut scenario = ts::begin(USER1);
        setup_test(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<UserRegistry>(&scenario);
            user_accounts::create_account(&mut registry, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<UserRegistry>(&scenario);
            
            user_accounts::grant_alpha_points(&admin_cap, &mut registry, USER1, 5000);
            assert!(user_accounts::get_alpha_points(&registry, USER1) == 5000, 0);

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(registry);
        };

        ts::end(scenario);
    }
}

