module bullz::math {
    use bullz::error::{EDivisionByZero, EOverflow};
    


    const SCALE: u64 = 1_000_000_000;
    const MAX_U64: u64 = 0xFFFFFFFFFFFFFFFF;
    const MAX_U128: u128 = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
    const MAX_U256: u256 = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;

    

    /// Multiply two u64 numbers with scaling
    /// Returns (a * b) / SCALE to maintain precision
    public fun mul_div(a: u64, b: u64, divisor: u64): u64 {
        assert!(divisor != 0, EDivisionByZero());
        
        let result = ((a as u128) * (b as u128)) / (divisor as u128);
        assert!(result <= (MAX_U64 as u128), EOverflow());
        
        (result as u64)
    }

    /// Calculate percentage: (numerator / denominator) * 100
    /// Returns percentage with 2 decimal precision (e.g., 3333 = 33.33%)
    public fun percentage(numerator: u64, denominator: u64): u64 {
        assert!(denominator != 0, EDivisionByZero());
        
        // Multiply by 10000 to get 2 decimal places (e.g., 3333 = 33.33%)
        mul_div(numerator, 10000, denominator)
    }

    /// Calculate percentage with higher precision for probability
    /// Returns percentage * 100 (e.g., 5000 = 50.00%)
    public fun percentage_scaled(numerator: u64, denominator: u64): u64 {
        assert!(denominator != 0, EDivisionByZero());
        
        // Multiply by 10000 for precision, result is in basis points
        mul_div(numerator, 10000, denominator)
    }

    /// Safe division with rounding
    public fun div_round(numerator: u64, denominator: u64): u64 {
        assert!(denominator != 0, EDivisionByZero());
        
        // Add half of denominator for rounding
        (numerator + (denominator / 2)) / denominator
    }

    /// Safe multiplication that checks for overflow
    public fun safe_mul(a: u64, b: u64): u64 {
        let result = (a as u128) * (b as u128);
        assert!(result <= (MAX_U64 as u128), EOverflow());
        (result as u64)
    }

    /// Safe addition that checks for overflow
    public fun safe_add(a: u64, b: u64): u64 {
        let result = (a as u128) + (b as u128);
        assert!(result <= (MAX_U64 as u128), EOverflow());
        (result as u64)
    }

    /// Min of two values
    public fun min(a: u64, b: u64): u64 {
        if (a < b) a else b
    }

    /// Max of two values
    public fun max(a: u64, b: u64): u64 {
        if (a > b) a else b
    }

    /// Calculate average of two numbers
    public fun average(a: u64, b: u64): u64 {
        (a + b) / 2
    }

    /// Check if a value is within a range [min, max]
    public fun in_range(value: u64, min_val: u64, max_val: u64): bool {
        value >= min_val && value <= max_val
    }

    /// Calculate proportion: (part / whole) * target
    /// Used for distribution calculations
    public fun proportion(part: u64, whole: u64, target: u64): u64 {
        assert!(whole != 0, EDivisionByZero());
        mul_div(part, target, whole)
    }

    /// Clamp a value between min and max
    public fun clamp(value: u64, min_val: u64, max_val: u64): u64 {
        if (value < min_val) {
            min_val
        } else if (value > max_val) {
            max_val
        } else {
            value
        }
    }

    /// Calculate weighted average
    /// Returns (value1 * weight1 + value2 * weight2) / (weight1 + weight2)
    public fun weighted_average(value1: u64, weight1: u64, value2: u64, weight2: u64): u64 {
        let total_weight = weight1 + weight2;
        assert!(total_weight != 0, EDivisionByZero());
        
        let weighted_sum = safe_mul(value1, weight1) + safe_mul(value2, weight2);
        weighted_sum / total_weight
    }

    // === Constants Getters ===

    /// Get maximum u64 value
    public fun max_u64(): u64 {
        MAX_U64
    }

    /// Get maximum u128 value
    public fun max_u128(): u128 {
        MAX_U128
    }

    /// Get maximum u256 value
    public fun max_u256(): u256 {
        MAX_U256
    }

    /// Get scaling factor
    public fun scale(): u64 {
        SCALE
    }

    // === Test Functions ===

    #[test]
    fun test_constants() {
        // Test u64 max value
        assert!(max_u64() == 0xFFFFFFFFFFFFFFFF, 0);
        
        // Test u128 max value
        assert!(max_u128() == 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF, 1);
        
        // Test u256 max value  
        assert!(max_u256() == 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF, 2);
        
        // Test scale
        assert!(scale() == 1_000_000_000, 3);
    }

    #[test]
    fun test_percentage() {
        // 50 out of 100 = 50%
        assert!(percentage(50, 100) == 5000, 0);
        
        // 1 out of 3 = 33.33%
        assert!(percentage(1, 3) == 3333, 1);
        
        // 2 out of 3 = 66.66%
        assert!(percentage(2, 3) == 6666, 2);
    }

    #[test]
    fun test_mul_div() {
        // (100 * 50) / 10 = 500
        assert!(mul_div(100, 50, 10) == 500, 0);
        
        // (1000 * 3333) / 10000 = 333
        assert!(mul_div(1000, 3333, 10000) == 333, 1);
    }

    #[test]
    fun test_min_max() {
        assert!(min(5, 10) == 5, 0);
        assert!(max(5, 10) == 10, 1);
        assert!(min(10, 5) == 5, 2);
        assert!(max(10, 5) == 10, 3);
    }

    #[test]
    fun test_clamp() {
        assert!(clamp(5, 0, 10) == 5, 0);
        assert!(clamp(15, 0, 10) == 10, 1);
        assert!(clamp(0, 5, 10) == 5, 2);
    }

    #[test]
    fun test_proportion() {
        // 1/4 of 1000 = 250
        assert!(proportion(1, 4, 1000) == 250, 0);
        
        // 3/10 of 1000 = 300
        assert!(proportion(3, 10, 1000) == 300, 1);
    }
}
