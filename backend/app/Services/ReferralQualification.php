<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Setting;
use App\Models\User;

class ReferralQualification
{
    public function qualify(Order $order): void
    {
        if (! $order->user_id) {
            return;
        }

        $referredCustomer = User::query()->lockForUpdate()->find($order->user_id);
        if (! $referredCustomer || ! $referredCustomer->referred_by_user_id || $referredCustomer->referral_qualified_at) {
            return;
        }

        $referredCustomer->forceFill(['referral_qualified_at' => now()])->save();
        $referrer = User::query()->lockForUpdate()->find($referredCustomer->referred_by_user_id);
        if (! $referrer) {
            return;
        }

        $qualifiedCount = $referrer->qualified_referrals_count + 1;
        $settings = Setting::query()->find('referral')?->value ?? ['threshold' => 5];
        $threshold = max(1, (int) ($settings['threshold'] ?? 5));
        $referrer->forceFill([
            'qualified_referrals_count' => $qualifiedCount,
            'referral_reward_earned_at' => $qualifiedCount >= $threshold
                ? ($referrer->referral_reward_earned_at ?? now())
                : $referrer->referral_reward_earned_at,
        ])->save();
    }
}
