module bullz::fee_management {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::event;
    use bullz::error::{EInsufficientBalance, EZeroAmount};
    
    
    public struct Treasury has key {
        id: UID,
        balance: Balance<SUI>,          
        total_collected: u64,           
    }

    
    public struct TreasuryCap has key, store {
        id: UID,
    }

    public struct PackPaymentCollected has copy, drop {
        amount: u64,
        payer: address,
    }

    public struct TreasuryWithdrawn has copy, drop {
        amount: u64,
        recipient: address,
    }


    fun init(ctx: &mut TxContext) {
        let treasury = Treasury {
            id: object::new(ctx),
            balance: balance::zero(),
            total_collected: 0,
        };

        let treasury_cap = TreasuryCap {
            id: object::new(ctx),
        };

        transfer::share_object(treasury);
        transfer::transfer(treasury_cap, tx_context::sender(ctx));
    }

    public  fun withdraw_from_treasury(
        _treasury_cap: &TreasuryCap,
        treasury: &mut Treasury,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<SUI> {
    assert!(amount > 0, EZeroAmount());
    assert!(balance::value(&treasury.balance) >= amount, EInsufficientBalance());

        let withdrawn = coin::from_balance(balance::split(&mut treasury.balance, amount), ctx);

        event::emit(TreasuryWithdrawn {
            amount,
            recipient: tx_context::sender(ctx),
        });

        withdrawn
    }

    public  fun withdraw_all_from_treasury(
        treasury_cap: &TreasuryCap,
        treasury: &mut Treasury,
        ctx: &mut TxContext
    ): Coin<SUI> {
        let amount = balance::value(&treasury.balance);
        withdraw_from_treasury(treasury_cap, treasury, amount, ctx)
    }

    
    public fun collect_payment(
        treasury: &mut Treasury,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let amount = coin::value(&payment);
    assert!(amount > 0, EZeroAmount());

        balance::join(&mut treasury.balance, coin::into_balance(payment));
        treasury.total_collected = treasury.total_collected + amount;

        event::emit(PackPaymentCollected {
            amount,
            payer: tx_context::sender(ctx),
        });
    }


 
    public fun get_treasury_balance(treasury: &Treasury): u64 {
        balance::value(&treasury.balance)
    }

    public fun get_total_collected(treasury: &Treasury): u64 {
        treasury.total_collected
    }
    
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
