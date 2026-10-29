<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Validation\ValidationException;

class OrderStock
{
    public function reserve(Order $order): void
    {
        if ($order->stock_reserved) {
            return;
        }

        $quantities = $order->items()->get()
            ->filter(fn ($item): bool => $item->product_id !== null)
            ->groupBy('product_id')
            ->map(fn ($items): int => (int) $items->sum('quantity'));
        $productIds = $quantities->keys()->sort()->values();
        $products = Product::query()->whereIn('id', $productIds)->orderBy('id')->lockForUpdate()->get()->keyBy('id');

        foreach ($quantities as $productId => $quantity) {
            $product = $products->get($productId);
            if (! $product || ! $product->active || $product->stock < $quantity) {
                $available = $product?->stock ?? 0;
                $message = $product
                    ? ($available === 0 ? "{$product->name} est en rupture de stock." : "Il ne reste que {$available} unité(s) de {$product->name}.")
                    : "Un article de cette commande n’est plus disponible.";
                throw ValidationException::withMessages(['status' => [$message]]);
            }
        }

        foreach ($quantities as $productId => $quantity) {
            $products->get($productId)->decrement('stock', $quantity);
        }

        $order->forceFill(['stock_reserved' => true])->save();
    }

    public function release(Order $order): void
    {
        if (! $order->stock_reserved) {
            return;
        }

        $quantities = $order->items()->get()
            ->filter(fn ($item): bool => $item->product_id !== null)
            ->groupBy('product_id')
            ->map(fn ($items): int => (int) $items->sum('quantity'));
        $productIds = $quantities->keys()->sort()->values();
        $products = Product::query()->whereIn('id', $productIds)->orderBy('id')->lockForUpdate()->get()->keyBy('id');

        foreach ($quantities as $productId => $quantity) {
            $product = $products->get($productId);
            if ($product) {
                $product->increment('stock', $quantity);
            }
        }

        $order->forceFill(['stock_reserved' => false])->save();
    }

    public function markSold(Order $order): void
    {
        if ($order->stock_reserved) {
            $order->forceFill(['stock_reserved' => false])->save();
        }
    }
}
