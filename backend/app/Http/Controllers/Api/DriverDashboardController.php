<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Setting;
use App\Models\User;
use App\Services\DriverAssignment;
use App\Services\ReferralQualification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DriverDashboardController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        /** @var User $driver */
        $driver = $request->user();
        $orders = Order::query()
            ->where('driver_id', $driver->id)
            ->whereIn('status', ['confirmed', 'preparing', 'in_delivery'])
            ->with('items:id,order_id,product_name,quantity')
            ->oldest()
            ->get()
            ->map(fn (Order $order): array => [
                'id' => $order->id,
                'reference' => $order->reference,
                'status' => $order->status,
                'customer_name' => $order->customer_name,
                'customer_phone' => $order->customer_phone,
                'delivery_zone_name' => $order->delivery_zone_name,
                'delivery_address' => $order->delivery_address,
                'delivery_notes' => $order->delivery_notes,
                'delivery_latitude' => $order->delivery_latitude,
                'delivery_longitude' => $order->delivery_longitude,
                'items' => $order->items,
            ]);
        $history = Order::query()
            ->where('driver_id', $driver->id)
            ->where('status', 'delivered')
            ->with('items:id,order_id,product_name,quantity')
            ->latest('delivered_at')
            ->limit(30)
            ->get()
            ->map(fn (Order $order): array => [
                'id' => $order->id,
                'reference' => $order->reference,
                'customer_name' => $order->customer_name,
                'delivery_zone_name' => $order->delivery_zone_name,
                'delivery_address' => $order->delivery_address,
                'delivered_at' => $order->delivered_at,
                'items' => $order->items,
            ]);

        return response()->json([
            'driver' => ['id' => $driver->id, 'name' => $driver->name],
            'store_location' => Setting::query()->find('store_location')?->value ?? [
                'latitude' => 14.712,
                'longitude' => -17.454,
            ],
            'location' => [
                'latitude' => $driver->current_latitude,
                'longitude' => $driver->current_longitude,
                'updated_at' => $driver->location_updated_at,
            ],
            'orders' => $orders,
            'history' => $history,
        ]);
    }

    public function updateLocation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);
        $driver = $request->user();
        $hasActiveDelivery = Order::query()->where('driver_id', $driver->id)->where('status', 'in_delivery')->exists();
        if (! $hasActiveDelivery) {
            throw ValidationException::withMessages(['location' => ['La position n’est acceptée que pendant une livraison active.']]);
        }

        $driver->forceFill([
            'current_latitude' => $data['latitude'],
            'current_longitude' => $data['longitude'],
            'location_updated_at' => now(),
        ])->save();

        return response()->json(['updated_at' => $driver->location_updated_at]);
    }

    public function start(Request $request, Order $order): JsonResponse
    {
        DB::transaction(function () use ($request, $order): void {
            $locked = Order::query()->lockForUpdate()->findOrFail($order->id);
            abort_unless($locked->driver_id === $request->user()->id, 404);
            if (! in_array($locked->status, ['confirmed', 'preparing'], true)) {
                throw ValidationException::withMessages(['status' => ['Cette commande ne peut pas commencer sa livraison.']]);
            }
            $locked->forceFill(['status' => 'in_delivery'])->save();
        });

        return response()->json(['message' => 'Livraison démarrée.']);
    }

    public function delivered(Request $request, Order $order): JsonResponse
    {
        $driverId = $request->user()->id;
        DB::transaction(function () use ($request, $order, $driverId): void {
            $locked = Order::query()->lockForUpdate()->findOrFail($order->id);
            abort_unless($locked->driver_id === $driverId, 404);
            if ($locked->status !== 'in_delivery') {
                throw ValidationException::withMessages(['status' => ['Seule une livraison en cours peut être marquée comme livrée.']]);
            }

            $locked->forceFill(['status' => 'delivered', 'delivered_at' => now()])->save();
            app(\App\Services\OrderStock::class)->markSold($locked);
            app(ReferralQualification::class)->qualify($locked);
            User::query()->lockForUpdate()->findOrFail($driverId)->forceFill([
                'current_latitude' => null,
                'current_longitude' => null,
                'location_updated_at' => null,
            ])->save();
        });

        app(DriverAssignment::class)->assignWaitingOrders();

        return response()->json(['message' => 'Commande marquée comme livrée.']);
    }
}
