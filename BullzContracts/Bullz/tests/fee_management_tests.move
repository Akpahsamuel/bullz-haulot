#[test_only]
module bullz::fee_management_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::coin::{Self};
    use sui::sui::SUI;
    
    use bullz::fee_management::{Self, Treasury, TreasuryCap};

    // Test addresses
    const ADMIN: address = @0xAD;
    const USER1: address = @0x1;
    const USER2: address = @0x2;

    // Setup function
    fun setup_test(scenario: &mut Scenario) {
        ts::next_tx(scenario, ADMIN);
        {
            fee_management::init_for_testing(ts::ctx(scenario));
        };
    }

    #[test]
    fun test_collect_pack_payment() {
        let mut scenario = ts::begin(USER1);
        setup_test(&mut scenario);

        // Collect payment from USER1
        ts::next_tx(&mut scenario, USER1);
        {
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            
            fee_management::collect_payment(&mut treasury, payment, ts::ctx(&mut scenario));

            assert!(fee_management::get_treasury_balance(&treasury) == 1000, 0);
            assert!(fee_management::get_total_collected(&treasury) == 1000, 1);

            ts::return_shared(treasury);
        };

        // Collect another payment
        ts::next_tx(&mut scenario, USER2);
        {
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(500, ts::ctx(&mut scenario));
            
            fee_management::collect_payment(&mut treasury, payment, ts::ctx(&mut scenario));

            assert!(fee_management::get_treasury_balance(&treasury) == 1500, 2);
            assert!(fee_management::get_total_collected(&treasury) == 1500, 3);

            ts::return_shared(treasury);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_withdraw_from_treasury() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Collect some payments first
        ts::next_tx(&mut scenario, USER1);
        {
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            
            fee_management::collect_payment(&mut treasury, payment, ts::ctx(&mut scenario));

            ts::return_shared(treasury);
        };

        // Admin withdraws partial amount
        ts::next_tx(&mut scenario, ADMIN);
        {
            let treasury_cap = ts::take_from_sender<TreasuryCap>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            
            let withdrawn = fee_management::withdraw_from_treasury(
                &treasury_cap,
                &mut treasury,
                300,
                ts::ctx(&mut scenario)
            );

            assert!(coin::value(&withdrawn) == 300, 0);
            assert!(fee_management::get_treasury_balance(&treasury) == 700, 1);
            assert!(fee_management::get_total_collected(&treasury) == 1000, 2); // Total collected doesn't change

            coin::burn_for_testing(withdrawn);
            ts::return_to_sender(&scenario, treasury_cap);
            ts::return_shared(treasury);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_withdraw_all_from_treasury() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Collect payments
        ts::next_tx(&mut scenario, USER1);
        {
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(2000, ts::ctx(&mut scenario));
            
            fee_management::collect_payment(&mut treasury, payment, ts::ctx(&mut scenario));

            ts::return_shared(treasury);
        };

        // Admin withdraws everything
        ts::next_tx(&mut scenario, ADMIN);
        {
            let treasury_cap = ts::take_from_sender<TreasuryCap>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            
            let withdrawn = fee_management::withdraw_all_from_treasury(
                &treasury_cap,
                &mut treasury,
                ts::ctx(&mut scenario)
            );

            assert!(coin::value(&withdrawn) == 2000, 0);
            assert!(fee_management::get_treasury_balance(&treasury) == 0, 1);

            coin::burn_for_testing(withdrawn);
            ts::return_to_sender(&scenario, treasury_cap);
            ts::return_shared(treasury);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 7, location = bullz::fee_management)]
    fun test_withdraw_more_than_balance_fails() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Collect small payment
        ts::next_tx(&mut scenario, USER1);
        {
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(100, ts::ctx(&mut scenario));
            
            fee_management::collect_payment(&mut treasury, payment, ts::ctx(&mut scenario));

            ts::return_shared(treasury);
        };

        // Try to withdraw more than balance
        ts::next_tx(&mut scenario, ADMIN);
        {
            let treasury_cap = ts::take_from_sender<TreasuryCap>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            
            let withdrawn = fee_management::withdraw_from_treasury(
                &treasury_cap,
                &mut treasury,
                200, // More than available
                ts::ctx(&mut scenario)
            );

            coin::burn_for_testing(withdrawn);
            ts::return_to_sender(&scenario, treasury_cap);
            ts::return_shared(treasury);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 8, location = bullz::fee_management)]
    fun test_collect_zero_payment_fails() {
        let mut scenario = ts::begin(USER1);
        setup_test(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(0, ts::ctx(&mut scenario));
            
            fee_management::collect_payment(&mut treasury, payment, ts::ctx(&mut scenario));

            ts::return_shared(treasury);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 8, location = bullz::fee_management)]
    fun test_withdraw_zero_fails() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Collect payment
        ts::next_tx(&mut scenario, USER1);
        {
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            
            fee_management::collect_payment(&mut treasury, payment, ts::ctx(&mut scenario));

            ts::return_shared(treasury);
        };

        // Try to withdraw zero
        ts::next_tx(&mut scenario, ADMIN);
        {
            let treasury_cap = ts::take_from_sender<TreasuryCap>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            
            let withdrawn = fee_management::withdraw_from_treasury(
                &treasury_cap,
                &mut treasury,
                0,
                ts::ctx(&mut scenario)
            );

            coin::burn_for_testing(withdrawn);
            ts::return_to_sender(&scenario, treasury_cap);
            ts::return_shared(treasury);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_multiple_collections_and_withdrawals() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        // Multiple users make payments
        ts::next_tx(&mut scenario, USER1);
        {
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(500, ts::ctx(&mut scenario));
            fee_management::collect_payment(&mut treasury, payment, ts::ctx(&mut scenario));
            ts::return_shared(treasury);
        };

        ts::next_tx(&mut scenario, USER2);
        {
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(300, ts::ctx(&mut scenario));
            fee_management::collect_payment(&mut treasury, payment, ts::ctx(&mut scenario));
            ts::return_shared(treasury);
        };

        ts::next_tx(&mut scenario, USER1);
        {
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(200, ts::ctx(&mut scenario));
            fee_management::collect_payment(&mut treasury, payment, ts::ctx(&mut scenario));
            ts::return_shared(treasury);
        };

        // Check total collected
        ts::next_tx(&mut scenario, ADMIN);
        {
            let treasury = ts::take_shared<Treasury>(&scenario);
            assert!(fee_management::get_treasury_balance(&treasury) == 1000, 0);
            assert!(fee_management::get_total_collected(&treasury) == 1000, 1);
            ts::return_shared(treasury);
        };

        // Admin makes partial withdrawal
        ts::next_tx(&mut scenario, ADMIN);
        {
            let treasury_cap = ts::take_from_sender<TreasuryCap>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            
            let withdrawn = fee_management::withdraw_from_treasury(
                &treasury_cap,
                &mut treasury,
                400,
                ts::ctx(&mut scenario)
            );

            coin::burn_for_testing(withdrawn);
            ts::return_to_sender(&scenario, treasury_cap);
            ts::return_shared(treasury);
        };

        // More payments come in
        ts::next_tx(&mut scenario, USER2);
        {
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(150, ts::ctx(&mut scenario));
            fee_management::collect_payment(&mut treasury, payment, ts::ctx(&mut scenario));
            ts::return_shared(treasury);
        };

        // Final check
        ts::next_tx(&mut scenario, ADMIN);
        {
            let treasury = ts::take_shared<Treasury>(&scenario);
            assert!(fee_management::get_treasury_balance(&treasury) == 750, 2); // 600 + 150
            assert!(fee_management::get_total_collected(&treasury) == 1150, 3); // 1000 + 150
            ts::return_shared(treasury);
        };

        ts::end(scenario);
    }
}

