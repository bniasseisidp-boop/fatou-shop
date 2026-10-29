<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomerAnnouncement;
use App\Models\Order;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ClientDashboardController extends Controller
{
    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->present($request->user())]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $orders = Order::query()
            ->where('user_id', $user->id)
            ->with('items:id,order_id,product_name,quantity,unit_price,line_total')
            ->latest()
            ->get();
        $settings = Setting::query()->find('referral')?->value ?? ['threshold' => 5, 'discount_percent' => 5];
        $paidOrders = fn (): Builder => Order::query()->where('user_id', $user->id)->where('payment_status', 'verified');

        return response()->json([
            'user' => $this->present($user),
            'store_location' => Setting::query()->find('store_location')?->value ?? [
                'latitude' => 14.712,
                'longitude' => -17.454,
            ],
            'metrics' => [
                'orders_count' => $orders->count(),
                'amount_paid' => (int) $orders->where('payment_status', 'verified')->sum('total'),
                'amount_paid_this_week' => (int) $paidOrders()->where('created_at', '>=', now()->startOfWeek())->sum('total'),
                'amount_paid_this_month' => (int) $paidOrders()->where('created_at', '>=', now()->startOfMonth())->sum('total'),
                'orders_delivered' => $orders->where('status', 'delivered')->count(),
                'orders_cancelled' => $orders->where('status', 'cancelled')->count(),
                'orders_in_progress' => $orders->whereIn('status', ['pending', 'confirmed', 'preparing', 'in_delivery'])->count(),
                'referrals_total' => $user->referrals()->count(),
                'referrals_qualified' => $user->qualified_referrals_count,
                'referrals_pending' => max(0, $user->referrals()->count() - $user->qualified_referrals_count),
            ],
            'orders' => $orders->map(fn (Order $order): array => [
                'id' => $order->id,
                'reference' => $order->reference,
                'created_at' => $order->created_at,
                'status' => $order->status,
                'delivery_latitude' => $order->delivery_latitude,
                'delivery_longitude' => $order->delivery_longitude,
                'driver_id' => $order->driver_id,
                'payment_method' => $order->payment_method,
                'payment_status' => $order->payment_status,
                'payment_reference' => $order->payment_reference,
                'payer_name' => $order->payer_name,
                'payer_phone' => $order->payer_phone,
                'payment_proof_url' => $order->payment_proof_path ? route('api.client.orders.proof', $order) : null,
                'subtotal' => $order->subtotal,
                'referral_discount_amount' => $order->referral_discount_amount,
                'delivery_fee' => $order->delivery_fee,
                'total' => $order->total,
                'items' => $order->items,
            ])->values(),
            'announcements' => CustomerAnnouncement::query()
                ->where('published', true)
                ->with('product')
                ->latest('published_at')
                ->get(['id', 'title', 'body', 'published_at', 'product_id', 'image_path'])
                ->map(fn (CustomerAnnouncement $announcement): array => [
                    'id' => $announcement->id,
                    'title' => $announcement->title,
                    'body' => $announcement->body,
                    'published_at' => $announcement->published_at,
                    'image_url' => $announcement->image_path
                        ? route('api.client.announcements.image', $announcement)
                        : null,
                    'product' => $announcement->product ? [
                        'id' => $announcement->product->id,
                        'name' => $announcement->product->name,
                        'category' => $announcement->product->category,
                        'description' => $announcement->product->description,
                        'price' => $announcement->product->price,
                        'image_url' => $announcement->product->image_url,
                        'stock' => $announcement->product->stock,
                        'in_stock' => $announcement->product->active && $announcement->product->stock > 0,
                        'low_stock' => $announcement->product->stock > 0
                            && $announcement->product->stock <= \App\Models\Product::LOW_STOCK_THRESHOLD,
                    ] : null,
                ]),
            'referral' => [
                'threshold' => (int) ($settings['threshold'] ?? 5),
                'discount_percent' => (int) ($settings['discount_percent'] ?? 5),
                'reward_available' => $user->referral_reward_earned_at !== null && $user->referral_reward_used_at === null,
                'reward_earned_at' => $user->referral_reward_earned_at,
            ],
        ]);
    }

    public function announcementImage(CustomerAnnouncement $announcement): BinaryFileResponse
    {
        abort_unless($announcement->published, 404);
        $path = $announcement->image_path;
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return response()->file(Storage::disk('local')->path($path), [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function proof(Request $request, Order $order): BinaryFileResponse|StreamedResponse
    {
        abort_unless($order->user_id === $request->user()->id, 404);
        $path = $order->payment_proof_path;
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, $order->reference.'-justificatif.'.pathinfo($path, PATHINFO_EXTENSION), [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    private function present(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'phone' => $user->phone,
            'referral_code' => $user->referral_code,
            'qualified_referrals_count' => $user->qualified_referrals_count,
            'referral_reward_available' => $user->referral_reward_earned_at !== null && $user->referral_reward_used_at === null,
            'photo_url' => $user->profile_photo_path ? route('api.client.photo') : null,
        ];
    }
}
