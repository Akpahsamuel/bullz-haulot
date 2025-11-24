
#[allow(unused_field, duplicate_alias)]
module bullz::alpha_chart {
    use std::string::String;
    use sui::object::UID;

    public struct AssetStats has key, store {
        id: UID,
        symbol: String,
        new_buyers_this_week: u64,
        total_holders: u64,
    }

    public fun update_alpha_chart() {}
    public fun get_alpha_chart(): vector<AssetStats> { vector[] }
}


