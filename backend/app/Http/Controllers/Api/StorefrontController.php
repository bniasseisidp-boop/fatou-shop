<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeliveryZone;
use App\Models\Product;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;

class StorefrontController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $settings = Setting::query()
            ->whereIn('key', ['brand', 'story', 'store_location'])
            ->get()
            ->mapWithKeys(fn (Setting $setting): array => [$setting->key => $setting->value]);

        $products = Product::query()
            ->where('active', true)
            ->orderBy('id')
            ->get()
            ->map(fn (Product $product): array => [
                'id' => $product->id,
                'name' => $product->name,
                'category' => $product->category,
                'price' => $product->price,
                'oldPrice' => $product->old_price,
                'label' => $product->label,
                'image' => $product->image_url,
                'alt' => $product->image_alt,
                'tone' => $product->tone,
                'description' => $product->description,
                'stock' => $product->stock,
                'in_stock' => $product->stock > 0,
                'low_stock' => $product->stock > 0 && $product->stock <= Product::LOW_STOCK_THRESHOLD,
            ]);

        return response()->json([
            'products' => $products,
            'delivery_zones' => DeliveryZone::query()
                ->where('active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'fee']),
            'settings' => [
                'brand' => $settings->get('brand'),
                'story' => $settings->get('story'),
                'store_location' => $settings->get('store_location') ?? [
                    'latitude' => 14.712,
                    'longitude' => -17.454,
                ],
            ],
        ]);
    }
}
