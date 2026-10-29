<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReferralController extends Controller
{
    public function index(): JsonResponse
    {
        $settings = Setting::query()->find('referral')?->value ?? ['threshold' => 5, 'discount_percent' => 5];
        $customerQuery = User::query()
            ->where('is_admin', false)
            ->where('is_driver', false)
            ->whereNotNull('phone')
            ->withCount(['referrals', 'orders'])
            ->withCount(['referrals as referrals_qualified_count' => fn ($query) => $query->whereNotNull('referral_qualified_at')])
            ->withSum(['orders as amount_paid' => fn ($query) => $query->where('payment_status', 'verified')], 'total');
        $presentCustomer = fn (User $user): array => [
            'id' => $user->id,
            'name' => $user->name,
            'phone' => $user->phone,
            'referral_code' => $user->referral_code,
            'referrals_total' => $user->referrals_count,
            'referrals_qualified' => $user->referrals_qualified_count,
            'reward_available' => $user->referral_reward_earned_at !== null && $user->referral_reward_used_at === null,
            'orders_count' => $user->orders_count,
            'amount_paid' => (int) ($user->amount_paid ?? 0),
        ];
        $customers = (clone $customerQuery)
            ->orderByDesc('qualified_referrals_count')
            ->limit(100)
            ->get();
        $topCustomers = (clone $customerQuery)
            ->whereHas('orders', fn ($query) => $query->where('payment_status', 'verified'))
            ->orderByDesc('amount_paid')
            ->limit(10)
            ->get()
            ->map($presentCustomer);
        $topInvites = (clone $customerQuery)
            ->whereHas('referrals')
            ->orderByDesc('referrals_count')
            ->limit(10)
            ->get()
            ->map($presentCustomer);

        return response()->json([
            'settings' => [
                'threshold' => (int) ($settings['threshold'] ?? 5),
                'discount_percent' => (int) ($settings['discount_percent'] ?? 5),
            ],
            'customers' => $customers->map($presentCustomer)->values(),
            'top_invites' => $topInvites->values(),
            'top_customers' => $topCustomers->values(),
            'metrics' => [
                'customers_count' => User::query()->where('is_admin', false)->where('is_driver', false)->whereNotNull('phone')->count(),
                'referrals_qualified' => (int) User::query()->where('is_admin', false)->where('is_driver', false)->sum('qualified_referrals_count'),
                'rewards_available' => User::query()->where('is_admin', false)->where('is_driver', false)->whereNotNull('referral_reward_earned_at')->whereNull('referral_reward_used_at')->count(),
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'threshold' => ['required', 'integer', 'min:1', 'max:1000'],
            'discount_percent' => ['required', 'integer', 'min:1', 'max:100'],
        ]);

        Setting::updateOrCreate(['key' => 'referral'], ['value' => $data]);
        User::query()
            ->where('is_admin', false)
            ->where('is_driver', false)
            ->whereNull('referral_reward_earned_at')
            ->where('qualified_referrals_count', '>=', $data['threshold'])
            ->update(['referral_reward_earned_at' => now()]);

        return $this->index();
    }
}
