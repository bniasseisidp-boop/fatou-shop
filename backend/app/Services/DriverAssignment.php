<?php

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class DriverAssignment
{
    public function assign(Order $order): ?User
    {
        if ($order->driver_id || ! in_array($order->status, ['confirmed', 'preparing', 'in_delivery'], true)) {
            return $order->driver;
        }

        $drivers = User::query()
            ->where('is_driver', true)
            ->where('driver_active', true)
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        foreach ($drivers as $driver) {
            $alreadyBusy = Order::query()
                ->where('driver_id', $driver->id)
                ->whereIn('status', ['confirmed', 'preparing', 'in_delivery'])
                ->exists();
            if ($alreadyBusy) {
                continue;
            }

            $order->forceFill(['driver_id' => $driver->id])->save();

            return $driver;
        }

        return null;
    }

    public function assignWaitingOrders(): void
    {
        $orderIds = Order::query()
            ->whereNull('driver_id')
            ->whereIn('status', ['confirmed', 'preparing', 'in_delivery'])
            ->orderBy('created_at')
            ->pluck('id');

        foreach ($orderIds as $orderId) {
            DB::transaction(function () use ($orderId): void {
                $order = Order::query()->lockForUpdate()->find($orderId);
                if ($order && ! $order->driver_id && in_array($order->status, ['confirmed', 'preparing', 'in_delivery'], true)) {
                    $this->assign($order);
                }
            });
        }
    }
}
