<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeliveryZone;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use App\Services\AdminActivityRecorder;
use Throwable;

class OrderController extends Controller
{
    public function store(Request $request, AdminActivityRecorder $activity): JsonResponse
    {
        $data = $request->validate([
            'customer_name' => ['required', 'string', 'min:2', 'max:160'],
            'customer_phone' => ['required', 'string', 'max:25', 'regex:/^(?:\+?221)?(?:70|75|76|77|78)[0-9]{7}$/'],
            'customer_email' => ['nullable', 'email:rfc', 'max:255'],
            'delivery_zone_id' => ['required', 'integer', Rule::exists('delivery_zones', 'id')->where('active', true)],
            'delivery_address' => ['required', 'string', 'min:4', 'max:1000'],
            'delivery_latitude' => ['nullable', 'numeric', 'between:-90,90', 'required_with:delivery_longitude'],
            'delivery_longitude' => ['nullable', 'numeric', 'between:-180,180', 'required_with:delivery_latitude'],
            'delivery_notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1', 'max:30'],
            'items.*.product_id' => ['required', 'integer', 'distinct', Rule::exists('products', 'id')->where('active', true)],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:20'],
            'payment_method' => ['nullable', Rule::in(['wave', 'orange_money'])],
            'payer_name' => ['required_with:payment_method', 'nullable', 'string', 'max:160'],
            'payer_phone' => ['required_with:payment_method', 'nullable', 'string', 'max:25', 'regex:/^(?:\+?221)?(?:70|75|76|77|78)[0-9]{7}$/'],
            'payment_reference' => ['nullable', 'string', 'max:100'],
            'proof' => ['required_with:payment_method', 'nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $zone = DeliveryZone::query()->whereKey($data['delivery_zone_id'])->where('active', true)->firstOrFail();
        $requestedProductIds = collect($data['items'])->pluck('product_id')->sort()->values()->all();
        $customerPhone = ClientAuthController::normalizePhone($data['customer_phone']);
        $user = $request->user();
        if ($user?->is_admin || $user?->phone !== $customerPhone) {
            $user = null;
        }
        $referralSettings = Setting::query()->find('referral')?->value ?? ['threshold' => 5, 'discount_percent' => 5];
        $discountPercent = (int) ($referralSettings['discount_percent'] ?? 5);
        $proofPath = null;

        try {
            $order = DB::transaction(function () use ($data, $zone, $requestedProductIds, $request, $user, $customerPhone, $discountPercent, &$proofPath): Order {
                $products = Product::query()
                    ->whereIn('id', $requestedProductIds)
                    ->where('active', true)
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id');

                if ($products->count() !== count($requestedProductIds)) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'items' => ['Un article de votre sélection n’est plus disponible.'],
                    ]);
                }

                foreach ($data['items'] as $item) {
                    $product = $products->get($item['product_id']);
                    if ($product->stock < $item['quantity']) {
                        $message = $product->stock === 0
                            ? "{$product->name} est en rupture de stock."
                            : "Il ne reste que {$product->stock} unité(s) de {$product->name}.";
                        throw \Illuminate\Validation\ValidationException::withMessages(['items' => [$message]]);
                    }
                }

                $subtotal = collect($data['items'])->sum(
                    fn (array $item): int => $products->get($item['product_id'])->price * $item['quantity'],
                );
                $lockedUser = $user ? User::query()->lockForUpdate()->find($user->id) : null;
                $appliedDiscount = $lockedUser?->referral_reward_earned_at
                    && ! $lockedUser->referral_reward_used_at
                    ? (int) floor($subtotal * $discountPercent / 100)
                    : 0;

                if ($request->hasFile('proof')) {
                    $proofPath = $request->file('proof')->store('payment-proofs', 'local');
                }

                foreach ($data['items'] as $item) {
                    $product = $products->get($item['product_id']);
                    $product->stock -= $item['quantity'];
                    $product->save();
                }

                $paymentSubmitted = isset($data['payment_method']);
                $order = Order::create([
                    'reference' => 'FS-'.now()->format('ymd').'-'.Str::upper(Str::random(6)),
                    'customer_name' => trim($data['customer_name']),
                    'customer_phone' => $customerPhone,
                    'customer_email' => $data['customer_email'] ?? null,
                    'user_id' => $lockedUser?->id,
                    'delivery_zone_id' => $zone->id,
                    'delivery_zone_name' => $zone->name,
                    'delivery_address' => trim($data['delivery_address']),
                    'delivery_latitude' => $data['delivery_latitude'] ?? null,
                    'delivery_longitude' => $data['delivery_longitude'] ?? null,
                    'delivery_notes' => isset($data['delivery_notes']) ? trim($data['delivery_notes']) : null,
                    'subtotal' => $subtotal,
                    'referral_discount_amount' => $appliedDiscount,
                    'referral_discount_percent' => $appliedDiscount > 0 ? $discountPercent : null,
                    'delivery_fee' => $zone->fee,
                    'total' => $subtotal - $appliedDiscount + $zone->fee,
                    'status' => 'pending',
                    'payment_method' => $data['payment_method'] ?? null,
                    'payment_status' => $paymentSubmitted ? 'submitted' : 'unpaid',
                    'payer_name' => $data['payer_name'] ?? null,
                    'payer_phone' => $data['payer_phone'] ?? null,
                    'payment_reference' => $data['payment_reference'] ?? null,
                    'payment_proof_path' => $proofPath,
                    'payment_submitted_at' => $paymentSubmitted ? now() : null,
                    'stock_reserved' => true,
                ]);

                foreach ($data['items'] as $item) {
                    $product = $products->get($item['product_id']);
                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'quantity' => $item['quantity'],
                        'unit_price' => $product->price,
                        'line_total' => $product->price * $item['quantity'],
                    ]);
                }

                if ($appliedDiscount > 0 && $lockedUser) {
                    $lockedUser->forceFill(['referral_reward_used_at' => now()])->save();
                }

                return $order;
            });
        } catch (Throwable $exception) {
            if ($proofPath) {
                Storage::disk('local')->delete($proofPath);
            }

            throw $exception;
        }

        if ($order->user_id === null) {
            $request->session()->put('client_claimable_order_id', $order->id);
        }

        $activity->record(
            $request,
            'order.created:'.$order->reference,
            $request->user(),
            201,
            $customerPhone,
        );

        return response()->json([
            'message' => 'Commande enregistrée. Fatou vous contactera pour la confirmer.',
            'order' => [
                'id' => $order->id,
                'reference' => $order->reference,
                'status' => $order->status,
                'payment_status' => $order->payment_status,
                'total' => $order->total,
                'referral_discount_amount' => $order->referral_discount_amount,
                'account_linked' => $order->user_id !== null,
            ],
        ], 201);
    }
}
