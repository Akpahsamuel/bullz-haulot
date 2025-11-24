module bullz::error {
    // Admin error codes
    public fun ECapAlreadyRevoked(): u64 { 1 }

    // Asset registry error codes
    public fun EAssetAlreadyExists(): u64 { 2 }
    public fun EAssetNotFound(): u64 { 3 }
    public fun EInsufficientSupply(): u64 { 4 }
    public fun EInvalidSupplyCap(): u64 { 5 }
    public fun EMintingDisabled(): u64 { 6 }
    public fun EExceedsSupplyCap(): u64 { 32 }

    // Fee management error codes
    public fun EInsufficientBalance(): u64 { 7 }
    public fun EZeroAmount(): u64 { 8 }

    // Pack system error codes
    public fun EPackAlreadyOpened(): u64 { 9 }
    public fun EInvalidPayment(): u64 { 10 }
    public fun ETemplateNotFound(): u64 { 11 }
    public fun ENotEnoughAssets(): u64 { 12 }
    public fun EInvalidQuantity(): u64 { 13 }
    public fun ENotPackOwner(): u64 { 14 }
    public fun ETemplateNotRegistered(): u64 { 15 }
    public fun ETemplateMismatch(): u64 { 16 }

    // User account error codes
    public fun EInsufficientAlphaPoints(): u64 { 17 }
    public fun EInsufficientShillPoints(): u64 { 18 }
    public fun ENoShillPointsCannotCompete(): u64 { 19 }
    public fun EAccountAlreadyExists(): u64 { 20 }
    public fun EAccountNotFound(): u64 { 21 }
    public fun EPackNotFound(): u64 { 22 }



    // Math error codes
    public fun EDivisionByZero(): u64 { 23 }
    public fun EOverflow(): u64 { 24 }


     // Squad management error codes
    public fun ENotSquadOwner(): u64 { 25 }
    public fun ESquadLocked(): u64 { 26 }
    public fun EAssetNotOwned(): u64 { 27 }
    public fun ESquadNotLocked(): u64 { 28 }

    // Trading / AMM error codes
    public fun ETradingDisabled(): u64 { 29 }
    public fun ESlippageExceeded(): u64 { 30 }
    public fun EInsufficientLiquidity(): u64 { 31 }
}

