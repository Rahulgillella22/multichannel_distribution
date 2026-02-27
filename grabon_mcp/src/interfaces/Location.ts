export type RegionType = 'north' | 'south' | 'east' | 'west';
export type TierType = 'metro' | 'tier1' | 'tier2';

export interface Location {
    location_id: string;
    city: string;
    state: string;
    region: RegionType;
    tier: TierType;
}
