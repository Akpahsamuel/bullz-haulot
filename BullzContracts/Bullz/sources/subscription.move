module bullz::subscription {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::table::{Self, Table};
   
    use bullz::admin::AdminCap;
    use bullz::error;
    use bullz::fee_management::{Self, Treasury};

   
    const SUBSCRIPTION_PRICE: u64 = 10000000; // 0.01 SUI in MIST
    const DEFAULT_DURATION_MS: u64 = 300000; // 5 minutes in milliseconds (for testing)

       
   
    public struct SubscriptionRegistry has key {
        id: UID,
        subscriptions: Table<address, Subscription>,
        treasury: ID, 
    }


    public struct Subscription has store {
        subscriber: address,
        start_time_ms: u64,
        end_time_ms: u64,
        active: bool,
    }

    
    public struct SubscriptionConfig has key {
        id: UID,
        price: u64, 
        duration_ms: u64, 
        free_access_list: Table<address, bool>, 
    }

    
    
    public struct SubscriptionPurchased has copy, drop {
        subscriber: address,
        start_time_ms: u64,
        end_time_ms: u64,
        price: u64,
    }

    public struct SubscriptionRenewed has copy, drop {
        subscriber: address,
        new_end_time_ms: u64,
        price: u64,
    }

    public struct FreeAccessGranted has copy, drop {
        address: address,
    }

    public struct FreeAccessRevoked has copy, drop {
        address: address,
    }

       
    
    public  fun init_subscription_registry(
        treasury_id: ID,
        ctx: &mut TxContext
    ) {
        let registry = SubscriptionRegistry {
            id: object::new(ctx),
            subscriptions: table::new(ctx),
            treasury: treasury_id,
        };

        let config = SubscriptionConfig {
            id: object::new(ctx),
            price: SUBSCRIPTION_PRICE,
            duration_ms: DEFAULT_DURATION_MS,
            free_access_list: table::new(ctx),
        };

        transfer::share_object(registry);
        transfer::share_object(config);
    }

       

        public  fun purchase_subscription(
        registry: &mut SubscriptionRegistry,
        config: &SubscriptionConfig,
        treasury: &mut Treasury,
        clock: &Clock,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let subscriber = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);
        
        if (table::contains(&config.free_access_list, subscriber)) {
            transfer::public_transfer(payment, subscriber);
            return
        };

        let payment_amount = coin::value(&payment);
        assert!(payment_amount >= config.price, error::EInsufficientBalance());
        
        let end_time = now + config.duration_ms;
        
        if (table::contains(&registry.subscriptions, subscriber)) {
            let existing_sub = table::borrow_mut(&mut registry.subscriptions, subscriber);
            
            if (existing_sub.active && existing_sub.end_time_ms > now) {
                let new_end_time = existing_sub.end_time_ms + config.duration_ms;
                existing_sub.end_time_ms = new_end_time;
                
                event::emit(SubscriptionRenewed {
                    subscriber,
                    new_end_time_ms: new_end_time,
                    price: config.price,
                });
            } else {
                existing_sub.subscriber = subscriber;
                existing_sub.start_time_ms = now;
                existing_sub.end_time_ms = end_time;
                existing_sub.active = true;
                
                event::emit(SubscriptionPurchased {
                    subscriber,
                    start_time_ms: now,
                    end_time_ms: end_time,
                    price: config.price,
                });
            };
        } else {
            let subscription = Subscription {
                subscriber,
                start_time_ms: now,
                end_time_ms: end_time,
                active: true,
            };
            
            table::add(&mut registry.subscriptions, subscriber, subscription);
            
            event::emit(SubscriptionPurchased {
                subscriber,
                start_time_ms: now,
                end_time_ms: end_time,
                price: config.price,
            });
        };

        fee_management::collect_payment(treasury, payment, ctx);
    }

    public fun has_access(
        registry: &SubscriptionRegistry,
        config: &SubscriptionConfig,
        user: address,
        clock: &Clock
    ): bool {
        if (table::contains(&config.free_access_list, user)) {
            return true
        };

        if (!table::contains(&registry.subscriptions, user)) {
            return false
        };

        let subscription = table::borrow(&registry.subscriptions, user);
        let now = clock::timestamp_ms(clock);
        
        subscription.active && subscription.end_time_ms > now
    }

    public fun get_subscription_status(
        registry: &SubscriptionRegistry,
        config: &SubscriptionConfig,
        user: address,
        clock: &Clock
    ): (bool, u64, u64) {
        if (table::contains(&config.free_access_list, user)) {
            return (true, 0, 0) 
        };

        if (!table::contains(&registry.subscriptions, user)) {
            return (false, 0, 0) 
        };

        let subscription = table::borrow(&registry.subscriptions, user);
        let now = clock::timestamp_ms(clock);
        let is_active = subscription.active && subscription.end_time_ms > now;
        
        (is_active, subscription.start_time_ms, subscription.end_time_ms)
    }

       
     entry fun grant_free_access(
        _admin: &AdminCap,
        config: &mut SubscriptionConfig,
        address: address,
    ) {
        if (!table::contains(&config.free_access_list, address)) {
            table::add(&mut config.free_access_list, address, true);
            event::emit(FreeAccessGranted { address });
        };
    }

     entry fun revoke_free_access(
        _admin: &AdminCap,
        config: &mut SubscriptionConfig,
        address: address,
    ) {
        if (table::contains(&config.free_access_list, address)) {
            table::remove(&mut config.free_access_list, address);
            event::emit(FreeAccessRevoked { address });
        };
    }

        
     entry fun update_subscription_price(
        _admin: &AdminCap,
        config: &mut SubscriptionConfig,
        new_price: u64,
    ) {
        assert!(new_price > 0, error::EInvalidQuantity());
        config.price = new_price;
    }

     entry fun update_subscription_duration(
        _admin: &AdminCap,
        config: &mut SubscriptionConfig,
        new_duration_ms: u64,
    ) {
        assert!(new_duration_ms > 0, error::EInvalidQuantity());
        config.duration_ms = new_duration_ms;
    }

       
    public fun get_subscription_price(config: &SubscriptionConfig): u64 {
        config.price
    }

    public fun get_subscription_duration(config: &SubscriptionConfig): u64 {
        config.duration_ms
    }
}

