module bullz::admin {
    use sui::event;
    use sui::vec_set::{Self, VecSet};
    use bullz::error;

    public struct AdminCap has key, store {
        id: UID,
    }


    public struct AdminRegistry has key {
        id: UID,
        active_admins: VecSet<address>,
        revoked_caps: VecSet<address>,
        total_created: u64,
        total_revoked: u64,
    }

    public struct AdminCapCreated has copy, drop {
        cap_id: address,
        recipient: address,
        created_by: address,
    }

    public struct AdminCapRevoked has copy, drop {
        cap_id: address,
        revoked_by: address,
    }

            
    fun init(ctx: &mut TxContext) {
        let mut registry = AdminRegistry {
            id: object::new(ctx),
            active_admins: vec_set::empty(),
            revoked_caps: vec_set::empty(),
            total_created: 1,
            total_revoked: 0,
        };

    
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };

        let deployer = tx_context::sender(ctx);
        let cap_id = object::uid_to_address(&admin_cap.id);
        
     
        vec_set::insert(&mut registry.active_admins, deployer);
        
        event::emit(AdminCapCreated {
            cap_id,
            recipient: deployer,
            created_by: deployer,
        });

        transfer::transfer(admin_cap, deployer);
        transfer::share_object(registry);
    }

  
    entry fun create_admin_cap(
        _admin_cap: &AdminCap,
        registry: &mut AdminRegistry,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let new_admin_cap = AdminCap {
            id: object::new(ctx),
        };

        let cap_id = object::uid_to_address(&new_admin_cap.id);
        let sender = tx_context::sender(ctx);
        
     
        vec_set::insert(&mut registry.active_admins, recipient);
        registry.total_created = registry.total_created + 1;
        
        event::emit(AdminCapCreated {
            cap_id,
            recipient,
            created_by: sender,
        });

        transfer::transfer(new_admin_cap, recipient);
    }

   
    entry fun revoke_admin_cap(
        admin_cap: AdminCap,
        registry: &mut AdminRegistry,
        revoked_admin: address,
        ctx:  &TxContext
    ) {
        let AdminCap { id } = admin_cap;
        let cap_id = object::uid_to_address(&id);
        
     
    assert!(!vec_set::contains(&registry.revoked_caps, &cap_id), error::ECapAlreadyRevoked());
        

        if (vec_set::contains(&registry.active_admins, &revoked_admin)) {
            vec_set::remove(&mut registry.active_admins, &revoked_admin);
        };
        
      
        vec_set::insert(&mut registry.revoked_caps, cap_id);
        registry.total_revoked = registry.total_revoked + 1;
        
        event::emit(AdminCapRevoked {
            cap_id,
            revoked_by: tx_context::sender(ctx),
        });
        
        // Delete the capability
        object::delete(id);
    }



   
   
    public fun is_admin(registry: &AdminRegistry, addr: address): bool {
        vec_set::contains(&registry.active_admins, &addr)
    }

    public fun is_cap_revoked(registry: &AdminRegistry, cap_id: address): bool {
        vec_set::contains(&registry.revoked_caps, &cap_id)
    }

    
    public fun get_total_created(registry: &AdminRegistry): u64 {
        registry.total_created
    }

   
    public fun get_total_revoked(registry: &AdminRegistry): u64 {
        registry.total_revoked
    }

   
    public fun get_active_admin_count(registry: &AdminRegistry): u64 {
        vec_set::length(&registry.active_admins)
    }

   
    public fun get_cap_id(admin_cap: &AdminCap): address {
        object::uid_to_address(&admin_cap.id)
    }

    // === Test Functions ===
    
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
