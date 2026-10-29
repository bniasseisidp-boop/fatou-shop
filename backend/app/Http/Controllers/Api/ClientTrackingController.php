<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientTrackingController extends Controller
{
    public function show(Request $request, Order $order): JsonResponse
    {
        abort_unless($order->user_id === $request->user()->id, 404);

        $order->load('driver:id,name,current_latitude,current_longitude,location_updated_at');

        return response()->json([
            'status' => $order->status,
            'customer_location' => $order->delivery_latitude && $order->delivery_longitude ? [
                'latitude' => $order->delivery_latitude,
                'longitude' => $order->delivery_longitude,
            ] : null,
            'driver' => $order->driver ? [
                'name' => $order->driver->name,
                'location' => $order->driver->current_latitude !== null && $order->driver->current_longitude !== null
                    ? ['latitude' => $order->driver->current_latitude, 'longitude' => $order->driver->current_longitude]
                    : null,
                'location_updated_at' => $order->driver->location_updated_at,
            ] : null,
            'tracking' => $order->status === 'in_delivery',
        ]);
    }
}
